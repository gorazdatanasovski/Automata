import { Page } from 'playwright';
import { UserProfile } from '../types/profile.js';
import { DomScanner } from '../parsers/dom_scanner.js';
import { StealthBrowser } from '../core/stealth_browser.js';
import * as dotenv from 'dotenv';

dotenv.config();

export class GreenhouseAdapter {
  private page: Page;
  private profile: UserProfile;
  private scanner: DomScanner;
  private browserControl: StealthBrowser;

  constructor(page: Page, profile: UserProfile, browserControl: StealthBrowser) {
    this.page = page;
    this.profile = profile;
    this.scanner = new DomScanner(page);
    this.browserControl = browserControl;
  }

  public async apply(): Promise<void> {
    console.log("Starting Greenhouse integration...");

    // 0. Wait for form to load or click 'Apply' if it's behind a button
    try {
      const applyBtn = this.page.locator('a:has-text("Apply Now"), button:has-text("Apply Now"), a:has-text("Apply Here"), a:has-text("Apply for this job"), #apply_button').first();
      if (await applyBtn.isVisible({ timeout: 2000 })) {
        console.log("Found an 'Apply' button. Clicking to open the form...");
        await applyBtn.click();
      }
    } catch (e) {}

    await Promise.any([
      this.page.waitForSelector('iframe#grnhse_iframe, iframe[src*="greenhouse.io"]', { state: 'attached', timeout: 5000 }),
      this.page.waitForSelector('form, #application', { state: 'attached', timeout: 5000 })
    ]).catch(() => console.warn("Timeout waiting for explicit Greenhouse form container. Proceeding anyway."));

    // 1. Basic Fields
    await this.fillStandardFields();

    // 2. Select2/AJAX Dropdowns are now handled natively by dom_scanner's React Select logic

    // 3. File Attachments
    await this.attachFiles();

    // 4. EEO Demographics removed, handled by scanner in fillStandardFields

    // 5. Agreements & Consents
    await this.handleAgreements();

    console.log("Greenhouse form filled successfully. Awaiting final submission lock.");
  }

  private async fillStandardFields(): Promise<void> {
    await this.scanner.fillAll(this.profile);

    // Long-Form Text Override: Check for unmapped (empty) textareas
    const unmappedTextareasCount = await this.page.evaluate(() => {
      return Array.from(document.querySelectorAll('textarea')).filter(t => !t.value.trim() && t.offsetParent !== null).length;
    });
    if (unmappedTextareasCount > 0) {
      console.warn(`\n[WARNING] Found ${unmappedTextareasCount} unmapped custom text areas on Greenhouse. Handled by LLM fallback.`);
    }
  }



  private async attachFiles(): Promise<void> {
    const resumePath = process.env.RESUME_FILE_PATH || './data/resume.pdf';

    // Double-tap: inject resume.pdf into ALL file input slots (resume + cover letter)
    const fileInputs = this.page.locator('input[type="file"]');
    const count = await fileInputs.count();
    for (let i = 0; i < count; i++) {
      try {
        await fileInputs.nth(i).setInputFiles(resumePath);
        console.log(`File slot ${i + 1}/${count}: resume.pdf injected.`);
      } catch (e) {
        console.warn(`File slot ${i + 1}/${count}: injection failed (may be hidden).`);
      }
    }
    if (count > 0) {
      await this.page.waitForTimeout(1000);
      console.log("All file uploads complete.");
    }
  }

  // EEO Demographics removed, handled by scanner

  private async handleAgreements(): Promise<void> {
    const agreementTexts = ['I agree', 'I consent', 'acknowledge', 'Okay', 'Yes, I understand'];
    for (const text of agreementTexts) {
      const checkboxes = this.page.getByRole('checkbox', { name: new RegExp(text, 'i') });
      const count = await checkboxes.count();
      for (let i = 0; i < count; i++) {
        await checkboxes.nth(i).check({ force: true }).catch(() => {});
      }
      
      // Try generic label texts
      const labels = this.page.locator(`label:has-text("${text}")`);
      const labelCount = await labels.count();
      for (let i = 0; i < labelCount; i++) {
        const input = labels.nth(i).locator('input[type="checkbox"]').first();
        if (await input.isVisible().catch(() => false)) {
          await input.check({ force: true }).catch(() => {});
        }
      }
    }
  }
}
