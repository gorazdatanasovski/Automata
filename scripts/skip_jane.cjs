const fs = require('fs');
const targets = fs.readFileSync('./data/targets.csv', 'utf8').split('\n');
let ledger = fs.existsSync('./data/ledger.csv') ? fs.readFileSync('./data/ledger.csv', 'utf8') : 'Company,Role,URL,Status,Timestamp\n';

let skippedCount = 0;
for (let i = 1; i < targets.length; i++) {
  const line = targets[i].trim();
  if (!line) continue;
  const parts = line.split('","');
  const company = parts[0].replace('"', '');
  const role = parts[1];
  const url = parts[2];
  
  if (company === 'Jane Street' && !ledger.includes(url)) {
    ledger += `"${company}","${role}","${url}","ABORTED_BY_USER","${new Date().toISOString()}"\n`;
    skippedCount++;
  }
}

fs.writeFileSync('./data/ledger.csv', ledger);
console.log(`Injected ${skippedCount} Jane Street skips into ledger.`);
