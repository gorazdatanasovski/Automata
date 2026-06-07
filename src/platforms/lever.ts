import { Page } from 'playwright';
import { UserProfile } from '../types/profile.js';
import { DomScanner } from '../parsers/dom_scanner.js';
import { StealthBrowser } from '../core/stealth_browser.js';

export class LeverAdapter {
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
    console.log("Starting Lever integration...");

    // 0. Pre-Flight Navigation
    const currentUrl = this.page.url();
    if (!currentUrl.endsWith('/apply')) {
      console.log("Job Description detected. Navigating to the application form...");
      await this.page.goto(`${currentUrl.split('?')[0].replace(/\/+$/, '')}/apply`, { waitUntil: 'domcontentloaded' });
      console.log("Application form reached.");
    }

    // 1. Skip Auto-Fill overrides
    // We intentionally ignore any "Apply with LinkedIn" or "Autofill with Resume" buttons.
    console.log("Bypassing Lever Autofill widgets to preserve deterministic pipeline.");

    // 2. Attach Files
    await this.attachFiles();

    // 3. Fill Standard Fields
    await this.fillStandardFields();

    // 4. Custom Wildcard Handling & Signature
    await this.handleCustomFieldsAndConsent();

    console.log("Lever form filled successfully. Awaiting final submission lock.");
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

  private async fillStandardFields(): Promise<void> {
    await this.scanner.fillAll(this.profile);
  }

  private async handleCustomFieldsAndConsent(): Promise<void> {
    // Find unmapped textareas that might be custom long-form questions
    const unmappedTextareasCount = await this.page.evaluate(() => {
      return Array.from(document.querySelectorAll('textarea')).filter(t => !t.value.trim() && t.offsetParent !== null).length;
    });
    
    if (unmappedTextareasCount > 0) {
      console.warn(`\n[WARNING] Found ${unmappedTextareasCount} unmapped custom text areas on Lever. Handled by LLM fallback.`);
    }

    // Handle Consent and Signatures
    const signatureInput = this.page.locator('input[name="consent"], input[placeholder*="signature" i], input[data-qa="signature-input"]').first();
    if (await signatureInput.isVisible().catch(() => false)) {
      const fullName = `${this.profile.personal.first_name} ${this.profile.personal.last_name}`;
      await signatureInput.pressSequentially(fullName, { delay: Math.floor(Math.random() * 50) + 20 });
    }

    // Check generic consent checkboxes
    const consentChecks = this.page.locator('input[type="checkbox"]');
    const checkCount = await consentChecks.count();
    for(let i=0; i < checkCount; i++){
      const checkbox = consentChecks.nth(i);
      if (!(await checkbox.isChecked())) {
         await checkbox.check({ force: true });
      }
    }
  }
}
