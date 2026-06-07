import { ProfileParser } from './parsers/profile_parser.js';
import { loadTargets, filterCompletedTargets, randomCooldown, ApplicationTarget } from './engine/orchestrator.js';
import { ExecutionEngine } from './engine/submitter.js';
import { StealthBrowser } from './core/stealth_browser.js';
import { GreenhouseAdapter } from './platforms/greenhouse.js';
import { LeverAdapter } from './platforms/lever.js';
import { WorkdayAdapter } from './platforms/workday.js';
import { TelemetryLedger } from './engine/telemetry.js';
import { UserProfile } from './types/profile.js';
import * as dotenv from 'dotenv';

dotenv.config();

const HARD_KILL_TIMEOUT_MS = 5000;

async function executeApplication(target: ApplicationTarget, profile: UserProfile): Promise<void> {
  const platform = target.platform.toLowerCase();

  // Patch 3: Persistent Auth — inject Workday session state if available
  const storageStatePath = platform === 'workday'
    ? WorkdayAdapter.getAuthStatePathFor(target.company)
    : undefined;

  const browserControl = new StealthBrowser();
  const engine = new ExecutionEngine();

  try {
    const page = await browserControl.initialize(storageStatePath);

    await engine.runWithSafetyWrapper(
      page,
      target.company,
      target.role,
      target.platform,
      async () => {
        // Patch 4: Hard-Kill Timeout — Promise.race against server hang
        console.log(`\n[SYSTEM] Navigating to ${target.url}...`);
        const navigationResult = await Promise.race([
          page.goto(target.url, { waitUntil: 'networkidle', timeout: HARD_KILL_TIMEOUT_MS }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('SERVER_HANG')), HARD_KILL_TIMEOUT_MS)
          )
        ]);

        // Pre-Flight Location Check (US-Only Enforcer)
        if (target.url.includes('eu.greenhouse.io')) {
          throw new Error('NON_US_LOCATION: EU Job Board detected.');
        }
        
        let locationText = '';
        try {
          if (platform === 'greenhouse') locationText = await page.locator('.location').first().innerText();
          else if (platform === 'lever') locationText = await page.locator('.location, .posting-category').first().innerText();
        } catch(e) {}
        
        if (locationText && locationText.match(/london|amsterdam|sydney|hong|singapore|paris|frankfurt|zurich|dublin|aarhus|uk|eu|asia|tokyo/i)) {
          throw new Error(`NON_US_LOCATION: Detected foreign location string: ${locationText}`);
        }

        // Patch 2: Cookie Banner Demolition — pre-flight hook
        await browserControl.demolishCookieBanners();

        if (platform === 'greenhouse') {
          const adapter = new GreenhouseAdapter(page, profile, browserControl);
          await adapter.apply();
        } else if (platform === 'lever') {
          const adapter = new LeverAdapter(page, profile, browserControl);
          await adapter.apply();
        } else if (platform === 'workday') {
          const adapter = new WorkdayAdapter(page, profile, browserControl, target.company);
          await adapter.apply();
        } else {
          console.warn(`[WARNING] Unsupported platform: ${target.platform}. Skipping.`);
          return;
        }

        // Safety Gate — freeze at the final review screen
        await engine.executeSafetyGate(page, target.company);
      }
    );
  } finally {
    await browserControl.close();
  }
}

async function ignite() {
  console.log('[SYSTEM] Initializing Master Profile...');
  const parser = new ProfileParser();
  const profile = parser.parse();

  console.log('[SYSTEM] Loading Target Manifest...');
  const allTargets = loadTargets('./data/targets.csv');
  const targets = filterCompletedTargets(allTargets, './data/ledger.csv');

  console.log(`[SYSTEM] Target lock acquired. ${targets.length} applications queued (Skipped ${allTargets.length - targets.length}).`);

  if (targets.length === 0) {
    console.log('[SYSTEM] No targets remaining. Campaign complete.');
    return;
  }

  const CONCURRENCY_LIMIT = 3;
  for (let i = 0; i < targets.length; i += CONCURRENCY_LIMIT) {
    const chunk = targets.slice(i, i + CONCURRENCY_LIMIT);
    
    await Promise.all(chunk.map(async (target, chunkIndex) => {
      const globalIndex = i + chunkIndex;
      let retryCount = 0;
      let hardFail = false;
      let success = false;

      while (retryCount <= 1 && !success && !hardFail) {
        try {
          console.log(`\n[EXECUTION ${globalIndex + 1}/${targets.length}] Processing: ${target.company} — ${target.role} (Attempt ${retryCount + 1})`);
          await executeApplication(target, profile);
          success = true;
        } catch (err: any) {
          console.error(`[ERROR] ${err.message}`);
          // Hard failures — no retry
          if (err.message.includes('ABORTED') || err.message.includes('CAPTCHA') || err.message.includes('NON_US_LOCATION')) {
            hardFail = true;
          }
          // Server hang — log and pivot instantly
          else if (err.message.includes('SERVER_HANG')) {
            console.warn(`[HARD-KILL] ${target.company} server hung for ${HARD_KILL_TIMEOUT_MS / 1000}s. Pivoting to next target.`);
            hardFail = true;
          }
          // Soft failures — single retry
          else {
            retryCount++;
            if (retryCount <= 1) {
              console.log(`[SYSTEM] Queuing ${target.company} for single retry...`);
            } else {
              console.log(`[SYSTEM] Target ${target.company} burned after max retries.`);
            }
          }
        }
      }
    }));

    if (i + CONCURRENCY_LIMIT < targets.length) {
      const minDelay = parseInt(process.env.GLOBAL_DELAY_MIN_MS || '15000');
      const maxDelay = parseInt(process.env.GLOBAL_DELAY_MAX_MS || '45000');
      await randomCooldown(minDelay, maxDelay);
    }
  }

  console.log('\n[SYSTEM] Campaign Complete. Review data/ledger.csv for execution states.');
}

ignite();
