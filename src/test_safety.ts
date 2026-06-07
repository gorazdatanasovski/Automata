import { StealthBrowser } from './core/stealth_browser.js';
import { ExecutionEngine } from './engine/submitter.js';
import * as fs from 'fs';
import * as path from 'path';

async function testSafetyGate() {
  console.log("=== Running Safety Gate & Telemetry Verification ===");
  const browserEngine = new StealthBrowser();
  const engine = new ExecutionEngine();
  
  try {
    process.env.HEADLESS = 'false';
    const page = await browserEngine.initialize();

    // Create a mock review page
    await page.setContent(`
        <div style="padding: 20px;">
            <h1>Application Review</h1>
            <p>Please review your answers before submitting.</p>
            <button id="submit">Submit</button>
        </div>
    `);

    // We will simulate user input to 'C' (Pause) then 'N' (Abort)
    // using Node's stdin injection for the diagnostic
    
    // Set a timeout to mock terminal input
    setTimeout(() => {
        process.stdin.emit('data', 'C\n');
        
        setTimeout(() => {
            process.stdin.emit('data', '\n'); // Press enter to resume
            
            setTimeout(() => {
                process.stdin.emit('data', 'N\n'); // Abort
            }, 1000);
            
        }, 1000);
        
    }, 2000);

    // Run the execution engine
    await engine.runWithSafetyWrapper(page, "TestCompany", "Software Engineer", "MockPlatform", async () => {
        // Execute the safety gate explicitly
        await engine.executeSafetyGate(page, "TestCompany");
    });
    
    // Verify Ledger
    console.log("\nVerifying Ledger Output...");
    const ledgerContent = fs.readFileSync(path.resolve(process.cwd(), 'data/ledger.csv'), 'utf8');
    console.log(ledgerContent);
    
    if (ledgerContent.includes('ABORTED_BY_USER')) {
        console.log("✅ Safety Gate successfully trapped the abort state and telemetry ledger was written correctly.");
    } else {
        console.log("❌ Ledger did not record the correct abort state.");
    }

  } catch (err: any) {
    console.error(`\n❌ ERROR: ${err.message}`);
  } finally {
    await browserEngine.close();
    process.exit(0);
  }
}

testSafetyGate();
