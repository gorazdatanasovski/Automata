import { StealthBrowser } from './core/stealth_browser.js';
import { GreenhouseAdapter } from './platforms/greenhouse.js';
import { LeverAdapter } from './platforms/lever.js';
import { ProfileParser } from './parsers/profile_parser.js';

import * as fs from 'fs';
import * as path from 'path';

async function testAdapters() {
  console.log("=== Running Platform Adapter Diagnostics ===");
  
  // 1. Initialize Profile
  const parser = new ProfileParser();
  const profile = parser.parse();

  // Create dummy resume for upload test
  const dir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dir)){ fs.mkdirSync(dir); }
  fs.writeFileSync(path.join(dir, 'resume.pdf'), 'dummy resume content');

  const browserEngine = new StealthBrowser();
  
  try {
    // We are forcing HEADFUL mode so the developer can visually observe
    process.env.HEADLESS = 'false';
    const page = await browserEngine.initialize();

    console.log("\n--- Testing Greenhouse ---");
    // Navigate to a real, live mock Greenhouse board (often used for testing integrations)
    // Or a well known public company's generic application if mock is unavailable
    await page.goto('https://boards.greenhouse.io/twitch/jobs/5224349002'); // Example public URL (Twitch)
    await page.waitForLoadState('networkidle');
    
    const greenhouse = new GreenhouseAdapter(page, profile, browserEngine);
    await greenhouse.apply();
    
    console.log("\n--- Testing Lever ---");
    // Navigate to a Lever test board
    await page.goto('https://jobs.lever.co/leverdemo/ecb9dcb9-4a0b-4bd4-acc2-6fdbffc85a1a/apply'); // Lever public demo
    await page.waitForLoadState('networkidle');

    const lever = new LeverAdapter(page, profile, browserEngine);
    await lever.apply();

  } catch (err: any) {
    console.error(`\n❌ ERROR during diagnostic execution: ${err.message}`);
  } finally {
    await browserEngine.close();
  }
}

testAdapters();
