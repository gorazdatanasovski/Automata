import * as fs from 'fs';

export interface ApplicationTarget {
  company: string;
  role: string;
  url: string;
  platform: string;
}

export function loadTargets(csvPath: string): ApplicationTarget[] {
  if (!fs.existsSync(csvPath)) return [];
  const lines = fs.readFileSync(csvPath, 'utf-8').split('\n').filter(l => l.trim().length > 0);
  const targets: ApplicationTarget[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const parts = parseCSVLine(lines[i]);
    if (parts.length >= 4) {
      targets.push({
        company: parts[0],
        role: parts[1],
        url: parts[2],
        platform: parts[3]
      });
    }
  }
  return targets;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

export function filterCompletedTargets(targets: ApplicationTarget[], ledgerPath: string): ApplicationTarget[] {
  if (!fs.existsSync(ledgerPath)) return targets;
  
  const ledgerContent = fs.readFileSync(ledgerPath, 'utf-8');
  
  return targets.filter(target => {
    const regexSuccess = new RegExp(`"${target.company}".*"SUCCESS"`);
    const regexAborted = new RegExp(`"${target.company}".*"ABORTED_BY_USER"`);
    if (regexSuccess.test(ledgerContent) || regexAborted.test(ledgerContent)) {
      return false; 
    }
    return true; 
  });
}

export function randomCooldown(minMs: number, maxMs: number): Promise<void> {
  return Promise.resolve();
}
