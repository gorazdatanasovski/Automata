import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { UserProfile } from '../types/profile.js';

dotenv.config();

export class ProfileParser {
  private profilePath: string;

  constructor(customPath?: string) {
    this.profilePath = customPath || process.env.PROFILE_DATA_PATH || './data/profile.json';
  }

  public parse(): UserProfile {
    let rawData: string;
    try {
      rawData = fs.readFileSync(path.resolve(process.cwd(), this.profilePath), 'utf-8');
    } catch (error) {
      throw new Error(`[FATAL] Profile Initialization Failed: Could not read file at ${this.profilePath}`);
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(rawData);
    } catch (error) {
      throw new Error(`[FATAL] Profile Initialization Failed: Invalid JSON syntax in ${this.profilePath}`);
    }

    this.validateAndSanitize(parsedData);
    
    return parsedData as UserProfile;
  }

  private validateAndSanitize(data: any): void {
    if (!data.personal) throw new Error('[FATAL] Profile Initialization Failed: Missing personal profile section');
    if (!data.legal) throw new Error('[FATAL] Profile Initialization Failed: Missing legal profile section');
    if (!data.metadata) throw new Error('[FATAL] Profile Initialization Failed: Missing metadata profile section');

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.personal.email || !emailRegex.test(data.personal.email)) {
      throw new Error(`[FATAL] Profile Initialization Failed: Invalid or missing email format (${data.personal.email})`);
    }

    // Phone sanitization and validation
    if (!data.personal.phone) {
      throw new Error('[FATAL] Profile Initialization Failed: Missing phone number');
    }
    const originalPhone = data.personal.phone;
    data.personal.phone = data.personal.phone.replace(/[^\d+]/g, '');
    const digitCount = data.personal.phone.replace(/\D/g, '').length;
    if (digitCount < 10) {
      throw new Error(`[FATAL] Profile Initialization Failed: Phone number must be at least 10 digits (${originalPhone})`);
    }

    // Legal validations
    const validSponsorshipOptions = ['yes', 'no'];
    if (!validSponsorshipOptions.includes(data.legal.requires_sponsorship_future)) {
      throw new Error(`[FATAL] Profile Initialization Failed: legal.requires_sponsorship_future is undefined or invalid (${data.legal.requires_sponsorship_future})`);
    }

    // Removed visa_type_current validation as it is obsolete
  }
}
