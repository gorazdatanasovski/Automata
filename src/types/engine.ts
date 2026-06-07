export type PlatformType = 'greenhouse' | 'lever' | 'workday' | 'unsupported';

export type JobApplicationStatus = 
  | 'QUEUED' 
  | 'PROCESSING' 
  | 'SUCCESS' 
  | 'CAPTCHA_BLOCKED' 
  | 'SELECTOR_FAILURE' 
  | 'SCREENING_QUESTION_HALT';

export interface AutomatedSessionState {
  targetUrl: string;
  platform: PlatformType;
  status: JobApplicationStatus;
  timestamp: string;
  errorLog?: string;
  screenshotPath?: string;
}
