import { StealthBrowser } from './core/stealth_browser.js';
import { WorkdayAdapter } from './platforms/workday.js';
import { ProfileParser } from './parsers/profile_parser.js';

async function testWorkdayAdapter() {
  console.log("=== Running Workday State Machine Diagnostics ===");
  
  // 1. Initialize Profile
  const parser = new ProfileParser();
  const profile = parser.parse();

  const browserEngine = new StealthBrowser();
  
  try {
    // We are forcing HEADFUL mode so the developer can visually observe
    process.env.HEADLESS = 'false';
    const page = await browserEngine.initialize();

    console.log("\n--- Testing Workday (Target 1) ---");
    // This is a dummy URL meant to simulate navigating to a generic Workday tenant portal.
    // In a real environment, we'd navigate to the exact tenant login or apply link.
    // We simulate the flow by navigating to a generic test site and logging output.
    
    // Simulate Workday Flow context for diagnostic purposes:
    await page.setContent(`
        <input type="email" data-automation-id="email" />
        <input type="password" data-automation-id="password" />
        <div data-automation-id="signInSubmitButton">Sign In</div>
        <div data-automation-id="pageHeader">My Information</div>
        <div data-automation-id="bottom-navigation-next-button">Next</div>
    `);

    const workday = new WorkdayAdapter(page, profile, browserEngine);
    await workday.apply();

  } catch (err: any) {
    console.error(`\n❌ ERROR during diagnostic execution: ${err.message}`);
  } finally {
    await browserEngine.close();
  }
}

testWorkdayAdapter();
