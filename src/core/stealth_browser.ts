import { chromium, Browser, BrowserContext, Page } from 'playwright';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

export class StealthBrowser {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  public async initialize(storageStatePath?: string): Promise<Page> {
    const isHeadless = process.env.HEADLESS !== 'false';
    const proxyConfig = process.env.USE_PROXY === 'true' && process.env.PROXY_SERVER !== 'unspecified'
      ? {
          server: process.env.PROXY_SERVER!,
          username: process.env.PROXY_USERNAME !== 'unspecified' ? process.env.PROXY_USERNAME : undefined,
          password: process.env.PROXY_PASSWORD !== 'unspecified' ? process.env.PROXY_PASSWORD : undefined,
        }
      : undefined;

    this.browser = await chromium.launch({
      headless: isHeadless,
      proxy: proxyConfig,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--use-fake-ui-for-media-stream',
        '--no-sandbox',
        '--disable-infobars',
        '--window-size=1920,1080'
      ]
    });

    const contextOptions: any = {
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    };

    // Persistent Authentication State injection
    if (storageStatePath && fs.existsSync(storageStatePath)) {
      contextOptions.storageState = storageStatePath;
      console.log(`[AUTH] Injecting persistent session from ${storageStatePath}`);
    }

    this.context = await this.browser.newContext(contextOptions);

    // Signature Eradication
    await this.context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });

    this.page = await this.context.newPage();
    
    // Globally cap all action and navigation timeouts to 5 seconds per user request
    this.page.setDefaultTimeout(5000);
    this.page.setDefaultNavigationTimeout(5000);
    
    return this.page;
  }

  public async saveStorageState(outputPath: string): Promise<void> {
    if (!this.context) throw new Error('Browser context is not initialized.');
    const dir = outputPath.substring(0, outputPath.lastIndexOf('/') >= 0 ? outputPath.lastIndexOf('/') : outputPath.lastIndexOf('\\'));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    await this.context.storageState({ path: outputPath });
    console.log(`[AUTH] Session state persisted to ${outputPath}`);
  }

  public async demolishCookieBanners(): Promise<void> {
    if (!this.page) return;
    const bannerSelectors = [
      '#onetrust-accept-btn-handler',
      '[id*="truste-consent-button"]',
      'button[data-testid="cookie-policy-manage-dialog-accept-button"]',
      '.cc-accept', '.cc-dismiss',
      'button:has-text("Accept All")',
      'button:has-text("Accept Cookies")',
      'button:has-text("Accept")',
      'button:has-text("I Accept")',
      'button:has-text("Agree")',
      'button:has-text("OK")',
      'button:has-text("Got it")',
    ];
    for (const sel of bannerSelectors) {
      try {
        const btn = this.page.locator(sel).first();
        if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
          await btn.click({ force: true });
          console.log(`[COOKIE] Demolished consent banner via: ${sel}`);
          await new Promise(r => setTimeout(r, 500));
          return;
        }
      } catch { /* next selector */ }
    }
  }

  public async humanType(selector: string, text: string): Promise<void> {
    if (!this.page) throw new Error("Browser page is not initialized.");
    
    await this.page.focus(selector);
    
    for (const char of text) {
      // Randomized delay between 15ms and 75ms
      let delay = Math.floor(Math.random() * (75 - 15 + 1)) + 15;
      
      // Add slight variance for spaces
      if (char === ' ') {
        delay += Math.floor(Math.random() * 20) + 10;
      }

      await this.page.locator(selector).pressSequentially(char, { delay });
    }
  }

  public async humanScroll(targetY: number): Promise<void> {
    if (!this.page) throw new Error("Browser page is not initialized.");
    
    let currentY = await this.page.evaluate(() => window.scrollY);
    const distance = targetY - currentY;
    const steps = Math.floor(Math.random() * 10) + 15; // 15-25 steps
    const stepSize = distance / steps;

    for (let i = 0; i < steps; i++) {
      currentY += stepSize;
      await this.page.evaluate((y) => window.scrollTo(0, y), currentY);
      
      // Delay between 20ms and 50ms per step
      const delay = Math.floor(Math.random() * 30) + 20;
      await new Promise(r => setTimeout(r, delay));
    }
  }

  public async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }
}
