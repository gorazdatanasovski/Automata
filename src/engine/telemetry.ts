import * as fs from 'fs';
import * as path from 'path';

export type OutcomeStatus = 'SUCCESS' | 'SELECTOR_FAILURE' | 'CAPTCHA_BLOCKED' | 'ABORTED_BY_USER' | 'SERVER_HANG';

export class TelemetryLedger {
  private ledgerPath: string;

  constructor() {
    this.ledgerPath = path.resolve(process.cwd(), 'data/ledger.csv');
    this.initializeLedger();
  }

  private initializeLedger() {
    const dir = path.dirname(this.ledgerPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (!fs.existsSync(this.ledgerPath)) {
      const headers = "Timestamp,Target_Company,Target_Role,Platform,Outcome_Status,Execution_Time_Seconds\n";
      fs.writeFileSync(this.ledgerPath, headers, 'utf8');
    }
  }

  public logExecution(
    company: string, 
    role: string, 
    platform: string, 
    outcome: OutcomeStatus, 
    execTimeSeconds: number
  ) {
    const timestamp = new Date().toISOString();
    const row = `${timestamp},"${company}","${role}","${platform}","${outcome}",${execTimeSeconds.toFixed(2)}\n`;
    fs.appendFileSync(this.ledgerPath, row, 'utf8');
  }
}
