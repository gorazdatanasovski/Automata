import { Page } from 'playwright';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { TelemetryLedger, OutcomeStatus } from './telemetry.js';

export class ExecutionEngine {
  private ledger: TelemetryLedger;

  constructor() {
    this.ledger = new TelemetryLedger();
  }

  public async runWithSafetyWrapper(
    page: Page,
    company: string,
    role: string,
    platform: string,
    coreLoop: () => Promise<void>
  ): Promise<void> {
    const startTime = Date.now();
    let outcome: OutcomeStatus = 'SUCCESS';

    try {
      await coreLoop();
    } catch (e: any) {
      if (e.message && e.message.includes('ABORTED_BY_USER')) {
        outcome = 'ABORTED_BY_USER';
        console.log("\n[ABORTED] User aborted the submission.");
      } else if (e.message && e.message.includes('SERVER_HANG')) {
        outcome = 'SERVER_HANG';
        console.log("\n[SERVER_HANG] Target server unresponsive. Pivoting.");
      } else {
        outcome = 'SELECTOR_FAILURE';
        console.error(`\n[CRASH] Execution failed: ${e.message}`);
        await this.diagnosticDump(page);
      }
    } finally {
      const execTime = (Date.now() - startTime) / 1000;
      this.ledger.logExecution(company, role, platform, outcome, execTime);
      console.log(`\nExecution logged to telemetry ledger: ${outcome} (${execTime.toFixed(2)}s)`);
    }
  }

  private async diagnosticDump(page: Page): Promise<void> {
    try {
      const crashDir = path.resolve(process.cwd(), 'logs/crashes');
      if (!fs.existsSync(crashDir)) fs.mkdirSync(crashDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const dumpPath = path.join(crashDir, `error_dom_${timestamp}.html`);
      const content = await page.content();
      fs.writeFileSync(dumpPath, content, 'utf8');
      console.log(`[DIAGNOSTIC] Raw DOM state dumped to: ${dumpPath}`);
    } catch (e) {
      console.error("[DIAGNOSTIC] Failed to dump DOM state:", e);
    }
  }

  public async executeSafetyGate(page: Page, companyName: string): Promise<void> {
    console.log(`\n[SAFETY GATE] Application populated for ${companyName}. Please review the Chromium window.`);

    // Visual Border target
    const submitBtn = page.locator('button:has-text("Submit"), button:has-text("Apply"), [data-automation-id="bottom-navigation-submit-button"]').last();
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.evaluate((el: HTMLElement) => el.style.border = '5px solid red');
    }

    // Screenshot
    const reviewsDir = path.resolve(process.cwd(), 'logs/reviews');
    if (!fs.existsSync(reviewsDir)) fs.mkdirSync(reviewsDir, { recursive: true });
    
    const screenshotPath = path.join(reviewsDir, `${companyName.replace(/\\s+/g, '_')}_review.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    while (true) {
      try {
        // Inject overlay
        await page.evaluate(() => {
          if (document.getElementById('ag-overlay-container')) return; // Already injected
          const overlay = document.createElement('div');
          overlay.id = 'ag-overlay-container';
          overlay.style.position = 'fixed';
          overlay.style.bottom = '20px';
          overlay.style.right = '20px';
          overlay.style.zIndex = '2147483647';
          overlay.style.backgroundColor = 'rgba(0,0,0,0.85)';
          overlay.style.padding = '20px';
          overlay.style.borderRadius = '8px';
          overlay.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
          overlay.style.border = '1px solid #444';
          overlay.innerHTML = `
            <div style="color: white; margin-bottom: 15px; font-family: sans-serif; font-size: 15px;"><strong>Bot Paused:</strong> Review or fill missing fields.</div>
            <button id="ag-skip" style="background: #dc3545; color: white; padding: 10px 15px; font-weight: bold; cursor: pointer; border: none; border-radius: 4px;">Abort Target</button>
            <div style="color: #aaa; margin-top: 10px; font-family: sans-serif; font-size: 11px;">Manually click the website's submit button.<br/>Close the window when finished.</div>
          `;
          document.body.appendChild(overlay);
        });

        const choice = await page.evaluate(() => {
          return new Promise<string>((resolve) => {
            const skipBtn = document.getElementById('ag-skip');
            if (skipBtn) skipBtn.onclick = () => { resolve('N'); };
          });
        });

        if (choice === 'N') {
          throw new Error("ABORTED_BY_USER");
        }
      } catch (e: any) {
        if (e.message && (e.message.includes('Target closed') || e.message.includes('browser has been closed') || e.message.includes('Target page'))) {
          console.log(`[SUBMISSION COMPLETE] User manually closed the window for ${companyName}. Assuming manual success.`);
          return;
        } else if (e.message && (e.message.includes('Execution context was destroyed') || e.message.includes('navigated'))) {
          // Page navigated (could be validation error reload, or success page)
          // The user explicitly requested to NEVER close the window until they close it manually.
          console.log(`[STATUS] Page navigated for ${companyName}. Waiting for user to manually close the window.`);
          await page.waitForTimeout(2000);
          continue; // Re-inject on the new page and wait again!
        } else {
          throw e;
        }
      }
    }
  }
}
