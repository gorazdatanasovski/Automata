export type FieldType = 'text' | 'radio' | 'select' | 'checkbox' | 'textarea' | 'file';

export interface FieldMapping {
  logicalName: string;
  type: FieldType;
  keywords: string[];
  valueMap?: Record<string, string[]>;
}

export const DICTIONARY: FieldMapping[] = [
  // PERSONAL — text inputs
  {
    logicalName: 'first_name',
    type: 'text',
    keywords: ['first name', 'given name', 'legal first name', 'first', 'applicant first name', 'your first name'],
  },
  {
    logicalName: 'last_name',
    type: 'text',
    keywords: ['last name', 'family name', 'surname', 'legal last name', 'applicant last name', 'your last name'],
  },
  {
    logicalName: 'middle_name',
    type: 'text',
    keywords: ['middle name', 'middle initial', 'middle'],
  },
  {
    logicalName: 'preferred_name',
    type: 'text',
    keywords: ['preferred name', 'preferred first name', 'nickname', 'name you go by', 'what should we call you'],
  },
  {
    logicalName: 'email',
    type: 'text',
    keywords: ['email', 'email address', 'e-mail', 'contact email', 'your email', 'applicant email'],
  },
  {
    logicalName: 'phone',
    type: 'text',
    keywords: ['phone', 'phone number', 'telephone', 'mobile', 'cell phone', 'contact number', 'phone no', 'mobile number', 'cell number'],
  },
  {
    logicalName: 'linkedin',
    type: 'text',
    keywords: ['linkedin', 'linkedin profile', 'linkedin url', 'linkedin profile url', 'linkedin profile link'],
  },
  {
    logicalName: 'website',
    type: 'text',
    keywords: ['portfolio', 'website', 'personal website', 'personal site', 'website url', 'website uid', 'portfolio url', 'link', 'personal page'],
  },
  {
    logicalName: 'github',
    type: 'text',
    keywords: ['github', 'github profile', 'github url', 'github username', 'repositories', 'code repository'],
  },
  {
    logicalName: 'pronouns',
    type: 'text',
    keywords: ['pronouns', 'gender pronoun', 'preferred pronouns', 'preferred gender pronoun', 'what are your pronouns'],
  },
  // ADDRESS — text inputs
  {
    logicalName: 'location',
    type: 'text',
    keywords: ['location', 'city', 'city and state', 'city, state', 'where are you located', 'current location', 'city, state, country', 'where do you currently live'],
  },
  {
    logicalName: 'street_address',
    type: 'text',
    keywords: ['street address', 'address', 'street', 'address line 1', 'mailing address', 'home address'],
  },
  {
    logicalName: 'city',
    type: 'text',
    keywords: ['city', 'town', 'municipality'],
  },
  {
    logicalName: 'state',
    type: 'select',
    keywords: ['state', 'state / province', 'state/province', 'province', 'state or province'],
  },
  {
    logicalName: 'phone_country_code',
    type: 'select',
    keywords: ['phone country code', 'country code', 'phone code', 'dialing code', 'device country code'],
    valueMap: { 'United States': ['United States', 'US', 'United States+1', 'US+1'] },
  },
  {
    logicalName: 'zip',
    type: 'text',
    keywords: ['zip', 'zip code', 'postal code', 'postcode'],
  },
  {
    logicalName: 'country',
    type: 'select',
    keywords: ['country', 'country of residence', 'current country', 'country where you reside'],
    valueMap: { 'United States': ['United States', 'US', 'USA', 'United States of America'] },
  },
  // EDUCATION
  {
    logicalName: 'school_name',
    type: 'text',
    keywords: ['school', 'university', 'college', 'institution', 'school name', 'university name', 'college name', 'name of institution', 'where do you attend', 'where did you attend', 'educational institution'],
  },
  {
    logicalName: 'degree_type',
    type: 'select',
    keywords: ['degree type', 'level of education', 'degree', 'highest degree', 'education level', 'highest level of education', 'degree level', 'type of degree'],
    valueMap: { 'Bachelor of Business Administration': ["Bachelor's Degree", "Bachelor's", 'B.B.A.', 'BBA', "Bachelor's Degree (B.A./B.S.)", 'Undergraduate'] },
  },
  {
    logicalName: 'current_education_level',
    type: 'select',
    keywords: ['current education level', 'current level of education', 'current degree', 'current academic level'],
    valueMap: { 'Undergraduate': ['Undergraduate', 'Bachelor', "Currently pursuing Bachelor's"] },
  },
  {
    logicalName: 'major',
    type: 'text',
    keywords: ['major', 'field of study', 'area of study', 'concentration', 'primary major', 'your major', 'subject', 'discipline'],
  },
  {
    logicalName: 'minor',
    type: 'text',
    keywords: ['minor', 'secondary major', 'second major', 'double major'],
  },
  {
    logicalName: 'gpa',
    type: 'text',
    keywords: ['gpa', 'grade point average', 'cumulative gpa', 'overall gpa', 'academic gpa', 'your gpa', 'gpa (4.0 scale)'],
  },
  {
    logicalName: 'education_start_month',
    type: 'select',
    keywords: ['start date month', 'enrollment month', 'education start month', 'start month (education)', 'education'],
  },
  {
    logicalName: 'education_start_year',
    type: 'text',
    keywords: ['start date year', 'enrollment year', 'education start year', 'start year (education)', 'year enrolled', 'education'],
  },
  {
    logicalName: 'education_end_month',
    type: 'select',
    keywords: ['end date month', 'graduation month', 'end month', 'month of graduation', 'expected graduation month', 'education'],
  },
  {
    logicalName: 'education_end_year',
    type: 'text',
    keywords: ['end date year', 'graduation year', 'end year', 'year of graduation', 'expected graduation year', 'anticipated graduation year', 'graduation year (expected)', 'education'],
  },
  // EMPLOYMENT
  {
    logicalName: 'company_name',
    type: 'text',
    keywords: ['company name', 'employer name', 'employer', 'company'],
  },
  {
    logicalName: 'job_title',
    type: 'text',
    keywords: ['title', 'job title', 'position', 'role'],
  },
  {
    logicalName: 'employment_start_month',
    type: 'select',
    keywords: ['start date month', 'employment start month', 'employment'],
  },
  {
    logicalName: 'employment_start_year',
    type: 'text',
    keywords: ['start date year', 'employment start year', 'employment'],
  },
  {
    logicalName: 'employment_end_month',
    type: 'select',
    keywords: ['end date month', 'employment end month', 'employment'],
  },
  {
    logicalName: 'employment_end_year',
    type: 'text',
    keywords: ['end date year', 'employment end year', 'employment'],
  },
  {
    logicalName: 'hs_grad_year',
    type: 'select',
    keywords: ['year you graduate high school', 'graduated high school', 'high school graduation year', 'year of high school graduation', 'when did you graduate high school', 'when did you graduate from high school', 'graduate from high school'],
  },
  // WORK AUTHORIZATION
  {
    logicalName: 'work_authorization',
    type: 'radio',
    keywords: ['legally authorized to work', 'authorized to work in the united states', 'right to work', 'authorized to work', 'work authorization', 'eligible to work', 'permitted to work', 'legal right to work', 'authorized to work in the us', 'lawfully authorized'],
    valueMap: { 'yes': ['Yes', 'Yes, I am authorized', 'I am authorized', 'Authorized'], 'no': ['No', 'No, I am not authorized'] },
  },
  {
    logicalName: 'requires_sponsorship_current',
    type: 'radio',
    keywords: ['require sponsorship', 'require visa sponsorship', 'visa sponsorship', 'will you now require sponsorship', 'do you currently require sponsorship', 'immigration sponsorship', 'currently require', 'sponsorship to work in the united states', 'will you now or in the future require sponsorship', 'requires sponsorship'],
    valueMap: { 'no': ['No', 'I will not require', 'No, I will not require', "No, I won't require"], 'yes': ['Yes', 'I will require', 'Yes, I will require'] },
  },
  {
    logicalName: 'requires_sponsorship_future',
    type: 'radio',
    keywords: ['future sponsorship', 'will you in the future require sponsorship', 'future visa sponsorship', 'future immigration sponsorship'],
    valueMap: { 'yes': ['Yes', 'I will require', 'Yes, I will require'], 'no': ['No', 'I will not require'] },
  },
  {
    logicalName: 'us_citizen',
    type: 'radio',
    keywords: ['us citizen', 'united states citizen', 'citizen of the united states', 'are you a us citizen', 'american citizen', 'citizenship status'],
    valueMap: { 'no': ['No', 'Not a US Citizen', 'Non-citizen'], 'yes': ['Yes', 'I am a US citizen', 'US Citizen'] },
  },
  {
    logicalName: 'permanent_resident',
    type: 'radio',
    keywords: ['permanent resident', 'green card', 'lawful permanent resident', 'us permanent resident', 'are you a permanent resident'],
    valueMap: { 'no': ['No'], 'yes': ['Yes'] },
  },
  // APPLICATION DETAILS
  {
    logicalName: 'source',
    type: 'select',
    keywords: ['how did you hear about us', 'how did you find this job', 'how did you learn about this position', 'referral source', 'source', 'how you heard about us', 'where did you hear', 'how did you hear about this role', 'how did you hear about this opening'],
    valueMap: { 'LinkedIn': ['LinkedIn', 'LinkedIn Job Posting', 'LinkedIn.com'], 'Handshake': ['Handshake'], 'Company Website': ['Company Website', "Company's Website", 'Firm website'], 'Referral': ['Referral', 'Employee Referral', 'Friend Referral'], 'Campus': ['Campus Recruiting', 'On-Campus', 'University Career Fair'], 'Indeed': ['Indeed'], 'Other': ['Other'] },
  },
  {
    logicalName: 'interviewed_before',
    type: 'radio',
    keywords: ['interviewed with jane street before', 'previously interviewed with us', 'previously interviewed', 'interviewed with us before', 'have you previously applied', 'applied before', 'previous application', 'previously applied to', 'have you ever interviewed', 'applied to this company before'],
    valueMap: { 'No': ['No'], 'Yes': ['Yes'] },
  },
  {
    logicalName: 'currently_student',
    type: 'radio',
    keywords: ['currently a student', 'are you currently a student', 'currently enrolled', 'full-time student', 'currently attending school', 'enrolled in school'],
    valueMap: { 'yes': ['Yes', 'Yes, I am a current student', 'Yes, currently enrolled'], 'no': ['No', 'No, I am not currently a student'] },
  },
  {
    logicalName: 'has_other_offers',
    type: 'radio',
    keywords: ['other offers', 'competing offers', 'pending offers', 'do you have other offers', 'any other offers', 'other job offers'],
    valueMap: { 'No': ['No'], 'Yes': ['Yes'] },
  },
  {
    logicalName: 'start_month',
    type: 'select',
    keywords: ['start month', 'available to start month', 'earliest start month', 'when can you start (month)', 'availability start month'],
  },
  {
    logicalName: 'start_year',
    type: 'select',
    keywords: ['start year', 'available to start year', 'earliest start year', 'when can you start (year)', 'availability start year'],
  },
  {
    logicalName: 'ft_employment_year',
    type: 'text',
    keywords: ['begin full time employment', 'expected full-time start', 'when do you expect to begin full time employment', 'full time start year', 'full-time employment year', 'when will you be available full time'],
  },
  {
    logicalName: 'willing_to_relocate',
    type: 'radio',
    keywords: ['willing to relocate', 'open to relocation', 'able to relocate', 'relocation', 'are you willing to relocate', 'willing to move', 'can you relocate'],
    valueMap: { 'yes': ['Yes', 'Yes, I am willing to relocate'], 'no': ['No', 'No, I am not willing to relocate'] },
  },
  {
    logicalName: 'preferred_location',
    type: 'text',
    keywords: ['preferred location', 'desired location', 'preferred office location', 'office location preference', 'preferred work location'],
  },
  {
    logicalName: 'remote_preference',
    type: 'select',
    keywords: ['work preference', 'on-site or remote', 'remote or in-office', 'worksite preference', 'in-person or remote', 'hybrid or remote', 'office or remote'],
  },
  {
    logicalName: 'salary_expectation',
    type: 'text',
    keywords: ['salary expectation', 'desired salary', 'expected salary', 'compensation expectation', 'salary requirement', 'expected compensation', 'desired compensation', 'what are your salary expectations'],
  },
  {
    logicalName: 'notice_period',
    type: 'text',
    keywords: ['notice period', 'weeks notice', 'days notice', 'how much notice', 'how soon can you start', 'available to start', 'earliest availability'],
  },
  {
    logicalName: 'non_compete',
    type: 'text',
    keywords: ['non-compete', 'non compete', 'noncompete', 'restrictive covenant', 'restrictive covenants', 'subject to any non-compete', 'non-solicitation'],
  },
  {
    logicalName: 'non_compete_comments',
    type: 'text',
    keywords: ['non-compete comments', 'non compete explanation', 'restrictive covenant details', 'please explain non-compete', 'describe your non-compete', 'non-compete details'],
  },
  {
    logicalName: 'age_18_plus',
    type: 'radio',
    keywords: ['are you 18 or older', 'at least 18 years of age', '18 years of age', 'over 18', 'minimum age'],
    valueMap: { 'yes': ['Yes', 'Yes, I am 18 or older'], 'no': ['No'] },
  },
  {
    logicalName: 'felony',
    type: 'radio',
    keywords: ['convicted of a felony', 'felony conviction', 'criminal conviction', 'criminal record', 'convicted of any crime'],
    valueMap: { 'no': ['No'], 'yes': ['Yes'] },
  },
  // LONG-FORM TEXT
  {
    logicalName: 'why_interested',
    type: 'textarea',
    keywords: ["why you're interested", 'why you are interested', 'why are you interested', 'why interested', 'why do you want to work here', 'why this firm', 'what interests you about this role', 'why this company', 'why do you want to join', 'what draws you to', 'motivation for applying', 'why apply'],
  },
  {
    logicalName: 'cover_letter_text',
    type: 'textarea',
    keywords: ['cover letter', 'cover note', 'personal statement', 'message to hiring manager', 'additional information', 'tell us about yourself', 'about yourself', 'additional comments', 'anything else', 'additional notes'],
  },
  {
    logicalName: 'job_change_reason',
    type: 'textarea',
    keywords: ['reason for job change', 'why are you looking', 'why are you leaving', 'reason for leaving', 'why are you looking for a new role'],
  },
  {
    logicalName: 'languages',
    type: 'text',
    keywords: ['languages spoken', 'languages', 'language skills', 'what languages do you speak', 'languages you speak', 'spoken languages', 'fluent in'],
  },
  // FILES
  {
    logicalName: 'resume_upload',
    type: 'file',
    keywords: ['resume', 'cv', 'upload resume', 'attach resume', 'resume upload', 'upload cv', 'attach cv', 'upload your resume', 'resume / cv'],
  },
  {
    logicalName: 'cover_letter_upload',
    type: 'file',
    keywords: ['cover letter upload', 'upload cover letter', 'attach cover letter', 'cover letter file'],
  },
  // EEO / DIVERSITY
  {
    logicalName: 'gender',
    type: 'select',
    keywords: ['gender', 'gender identity', 'what is your gender', 'identify as', 'how do you identify', 'i identify as', 'gender identification'],
    valueMap: {
      'Decline': ['I prefer not to answer', 'Decline to Self-Identify', 'Decline To Self Identify', 'Prefer not to say', 'I do not wish to answer', 'Choose not to identify', 'Decline to self-identify'],
      'Male': ['Male', 'Man'],
    },
  },
  {
    logicalName: 'hispanic_latino',
    type: 'radio',
    keywords: ['hispanic or latino', 'are you hispanic', 'hispanic/latino', 'hispanic or latino?'],
    valueMap: {
      'No': ['No', 'No, I am not Hispanic or Latino', 'Not Hispanic or Latino', 'No, I am not Hispanic/Latino'],
      'Yes': ['Yes', 'Yes, I am Hispanic or Latino', 'Hispanic or Latino', 'Yes, I am Hispanic/Latino']
    },
  },
  {
    logicalName: 'race_ethnicity',
    type: 'select',
    keywords: ['race', 'ethnicity', 'race / ethnicity', 'racial category', 'race and ethnicity', 'identify as', 'how do you identify', 'i identify as'],
    valueMap: {
      'Decline': ['I prefer not to answer', 'Decline to Self-Identify', 'Decline To Self Identify', 'Prefer not to answer', 'Decline to self-identify', 'I do not wish to disclose'],
      'White': ['White', 'White (Not Hispanic or Latino)', 'Caucasian'],
    },
  },
  {
    logicalName: 'veteran_status',
    type: 'select',
    keywords: ['veteran status', 'veteran', 'are you a veteran', 'military status', 'protected veteran', 'military veteran'],
    valueMap: {
      'Not a veteran': ['I am not a protected veteran', 'I am not a veteran', 'Not a Protected Veteran', 'Non-veteran', 'Not a Veteran'],
    },
  },
  {
    logicalName: 'disability_status',
    type: 'select',
    keywords: ['disability', 'disability status', 'do you have a disability', 'person with a disability', 'disabled', 'disability disclosure', 'reasonable accommodation'],
    valueMap: {
      'No': ['I do not have a disability', 'No, I do not have a disability', 'Not disabled', 'No disability', 'I don\'t have a disability'],
    },
  },
];
