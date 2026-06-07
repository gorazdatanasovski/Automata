import { StealthBrowser } from './core/stealth_browser.js';

async function runTests() {
  console.log("=== Running Stealth Browser Verification ===");
  const browser = new StealthBrowser();
  
  try {
    const page = await browser.initialize();
    console.log("✅ Browser initialized with stealth signatures.");

    console.log("Navigating to bot detection test (sannysoft)...");
    await page.goto('https://bot.sannysoft.com/', { waitUntil: 'networkidle' });
    
    const webdriverStatus = await page.evaluate(() => navigator.webdriver);
    if (webdriverStatus === undefined) {
      console.log("✅ Signature Eradication Verified: navigator.webdriver is undefined.");
    } else {
      console.log(`❌ ERROR: navigator.webdriver is ${webdriverStatus}`);
    }

    const userAgent = await page.evaluate(() => navigator.userAgent);
    console.log(`✅ User-Agent: ${userAgent}`);

    console.log("Testing humanized typing delay...");
    // Go to a simple test page for typing
    await page.goto('https://example.com');
    await page.setContent('<input type="text" id="test-input" />');
    
    const startTime = Date.now();
    await browser.humanType('#test-input', 'Humanized typing test');
    const endTime = Date.now();
    
    const typedText = await page.locator('#test-input').inputValue();
    if (typedText === 'Humanized typing test') {
       console.log(`✅ Typing successfully completed in ${endTime - startTime}ms without blocking or dropping characters.`);
    } else {
       console.log(`❌ ERROR: Typed text mismatch. Got: ${typedText}`);
    }

    console.log("Testing humanized scrolling...");
    await page.setContent('<div style="height: 5000px;"></div>');
    await browser.humanScroll(2000);
    const scrollY = await page.evaluate(() => window.scrollY);
    console.log(`✅ Smooth scroll completed. Current Y: ${Math.round(scrollY)}`);

  } catch (err: any) {
    console.log(`❌ ERROR during stealth verification: ${err.message}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runTests();
