import { ProfileParser } from './parsers/profile_parser.js';

function runTests() {
  console.log("=== Running Profile Parser Verification ===");

  try {
    console.log("Testing with broken profile...");
    const brokenParser = new ProfileParser('./data/profile_broken.json');
    brokenParser.parse();
    console.log("❌ ERROR: Broken profile did not throw an exception.");
    process.exit(1);
  } catch (err: any) {
    console.log(`✅ Expected Failure Triggered: ${err.message}`);
  }

  try {
    console.log("\nTesting with production profile...");
    const prodParser = new ProfileParser('./data/profile.json');
    const profile = prodParser.parse();
    console.log(`✅ Production profile loaded successfully!`);
    console.log(`   Sanitized Phone: ${profile.personal.phone}`);
    console.log(`   Email: ${profile.personal.email}`);
  } catch (err: any) {
    console.log(`❌ ERROR: Production profile failed to load: ${err.message}`);
    process.exit(1);
  }
}

runTests();
