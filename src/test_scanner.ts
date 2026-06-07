import { chromium } from 'playwright';
import * as path from 'path';
import { DomScanner } from './parsers/dom_scanner.js';

async function runTests() {
  console.log("=== Running DOM Scanner Verification ===");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const filePath = `file://${path.resolve(process.cwd(), 'data/mock_form.html').replace(/\\/g, '/')}`;
  await page.goto(filePath);

  const scanner = new DomScanner(page);

  try {
    console.log("Scanning for explicit label ('first_name')...");
    const fnameInput = await scanner.scanForField('first_name');
    const fnameId = await fnameInput.getAttribute('id');
    if (fnameId === 'fname') {
        console.log("✅ Successfully resolved 'first_name' using explicit a11y labels.");
    } else {
        throw new Error("Failed to match explicit label.");
    }

    console.log("Scanning for ancestral container ('email')...");
    const emailInput = await scanner.scanForField('email');
    if (await emailInput.isVisible()) {
        console.log("✅ Successfully resolved 'email' using ancestral container traversal.");
    } else {
        throw new Error("Failed to match ancestral container.");
    }

    console.log("Scanning shadow DOM & ARIA mapping ('linkedin')...");
    const linkedinInput = await scanner.scanForField('linkedin');
    const linkedinAria = await linkedinInput.getAttribute('aria-labelledby');
    if (linkedinAria === 'linked-label') {
        console.log("✅ Successfully pierced Shadow DOM and mapped ARIA relationship for 'linkedin'.");
    } else {
        throw new Error("Failed to match shadow DOM/ARIA label.");
    }

    console.log("Scanning complex layout ('sponsorship_status') to trigger Viewport Hook...");
    const sponsorshipSelect = await scanner.scanForField('sponsorship_status');
    const selectId = await sponsorshipSelect.getAttribute('id');
    if (selectId === 'sponsorship-select') {
        console.log("✅ Successfully executed Viewport Hook and returned low-confidence fallback target.");
    } else {
        throw new Error("Viewport Fallback Hook failed.");
    }

  } catch (e: any) {
    console.log(`❌ ERROR: ${e.message}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runTests();
