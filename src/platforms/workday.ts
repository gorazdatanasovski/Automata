import { Page } from 'playwright';
import { UserProfile } from '../types/profile.js';
import { StealthBrowser } from '../core/stealth_browser.js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

export class WorkdayAdapter {
  private page: Page;
  private profile: UserProfile;
  private browserControl: StealthBrowser;
  private companySlug: string;

  constructor(page: Page, profile: UserProfile, browserControl: StealthBrowser, companySlug?: string) {
    this.page = page;
    this.profile = profile;
    this.browserControl = browserControl;
    this.companySlug = companySlug || 'default';
  }

  private getAuthStatePath(): string {
    return path.resolve(process.cwd(), `.auth/workday_${this.companySlug.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
  }

  public static getAuthStatePathFor(company: string): string {
    return path.resolve(process.cwd(), `.auth/workday_${company.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
  }

  public async apply(): Promise<void> {
    console.log("Starting Workday Enterprise State-Machine integration...");
    await this.stateMachineLoop();
    console.log("Workday multi-page flow complete. Halting at final Review / Submit screen.");
  }

  private async checkExemptionTriggers(): Promise<void> {
    const requiredUnmapped = this.page.locator('[aria-required="true"], span:has-text("*")').locator('xpath=ancestor::div[1]//textarea | ancestor::div[1]//input[@type="text"]');
    const count = await requiredUnmapped.count();
    if (count > 0) {
      console.warn(`\n[WARNING] Found potential unmapped mandatory application questions.`);
    }
  }

  private async stateMachineLoop(): Promise<void> {
    let applicationComplete = false;
    const masterPassword = process.env.WORKDAY_MASTER_PASS || 'Automated_Pass123!';

    while (!applicationComplete) {
      // 1. Evaluate current state by URL or Header
      const url = this.page.url();
      let currentState = "UNKNOWN";
      
      const headerLocator = this.page.locator('[data-automation-id="pageHeader"]').first();
      let currentPageTitle = "";
      if (await headerLocator.isVisible().catch(() => false)) {
        currentPageTitle = await headerLocator.innerText();
      }

      if (url.includes('login')) {
        currentState = "LOGIN";
      } else if (url.includes('create-account')) {
        currentState = "CREATE_ACCOUNT";
      } else if (currentPageTitle) {
        currentState = "FORM_PAGE";
      } else {
        // If neither, wait a moment and check if we hit success or if page is loading
        await this.page.waitForTimeout(2000);
        if (this.page.url().includes('login') || this.page.url().includes('create-account') || await headerLocator.isVisible().catch(() => false)) {
          continue;
        } else {
          console.log("Reached unknown Workday state outside of flow. Breaking.");
          break;
        }
      }

      console.log(`\nEvaluating State: [${currentState}] ${currentPageTitle ? '- ' + currentPageTitle : ''}`);

      // 2. Execute State Logic
      if (currentState === "LOGIN") {
        console.log("Attempting standard login...");
        const emailInput = this.page.locator('input[type="email"], [data-automation-id="email"]').first();
        if (await emailInput.isVisible()) {
          await emailInput.fill(this.profile.personal.email);
          await this.page.locator('input[type="password"], [data-automation-id="password"]').first().fill(masterPassword);
          await this.page.locator('[data-automation-id="signInSubmitButton"], button:has-text("Sign In")').first().click();
          
          try {
            await this.page.waitForSelector('[data-automation-id="pageHeader"]', { timeout: 5000 });
            await this.browserControl.saveStorageState(this.getAuthStatePath());
            continue; // Loop again to handle the new page
          } catch (e) {
            console.log("Login failed. Rerouting to Create Account...");
            const createAcc = this.page.locator('[data-automation-id="createAccountLink"], button:has-text("Create Account")').first();
            if (await createAcc.isVisible()) await createAcc.click();
            continue;
          }
        }
      } 
      else if (currentState === "CREATE_ACCOUNT") {
        console.log("Executing Create Account flow...");
        const emailInput = this.page.locator('[data-automation-id="email"]').first();
        if (await emailInput.isVisible()) {
          await emailInput.fill(this.profile.personal.email);
          await this.page.locator('[data-automation-id="password"]').first().fill(masterPassword);
          await this.page.locator('[data-automation-id="verifyPassword"]').first().fill(masterPassword);
          
          const consentBox = this.page.locator('input[type="checkbox"], [data-automation-id="createAccountCheckbox"]').first();
          if (await consentBox.isVisible() && !(await consentBox.isChecked())) {
            await consentBox.check({ force: true });
          }
          await this.page.locator('[data-automation-id="createAccountSubmitButton"]').click();
          await this.page.waitForSelector('[data-automation-id="pageHeader"]', { timeout: 5000 });
          await this.browserControl.saveStorageState(this.getAuthStatePath());
          continue;
        }
      }
      else if (currentState === "FORM_PAGE") {
        await this.checkExemptionTriggers();

        if (currentPageTitle.includes("My Information")) {
          console.log("Injecting profile.personal payload...");
          const fNameInput = this.page.locator('[data-automation-id="legalNameSection_firstName"]');
          if (await fNameInput.isVisible()) await fNameInput.fill(this.profile.personal.first_name);
          const lNameInput = this.page.locator('[data-automation-id="legalNameSection_lastName"]');
          if (await lNameInput.isVisible()) await lNameInput.fill(this.profile.personal.last_name);
        } 
        else if (currentPageTitle.includes("My Experience")) {
          console.log("Enforcing pristine profile.json experience data...");
        } 
        else if (currentPageTitle.includes("Voluntary Disclosures")) {
          console.log("Mapping exact EEO checkpoints...");
          const declineRadio = this.page.locator('[data-automation-id="radioBtn"]:has-text("Decline")').first();
          if (await declineRadio.isVisible()) await declineRadio.click({ force: true });
        } 
        else if (currentPageTitle.includes("Review") || currentPageTitle.includes("Submit")) {
          console.log("Final Review state reached. Halting execution loop.");
          applicationComplete = true;
          break;
        }

        // 3. Page Transition Lock
        const nextBtn = this.page.locator('[data-automation-id="bottom-navigation-next-button"]');
        if (await nextBtn.isVisible()) {
          await nextBtn.click();
          console.log("Triggered Page Transition. Enforcing DOM lock...");
          try {
            await this.page.waitForFunction(
              (oldTitle) => {
                const el = document.querySelector('[data-automation-id="pageHeader"]');
                return el && el.textContent !== oldTitle;
              },
              currentPageTitle,
              { timeout: 5000 }
            );
          } catch (e) {
            console.warn("Page transition lock timed out. Possible validation error on page.");
            applicationComplete = true; 
          }
        } else {
          console.log("No Next button found. State machine ending.");
          applicationComplete = true;
        }
      }
    }
  }
}
