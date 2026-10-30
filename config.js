// config.js - Configuration for Autonomous Book Authors & Writers Lead Mining
// USA & Canada Lead Discovery with Social Media & FastBackgroundCheck Enrichment
import path from 'node:path';

export const OUTPUT_DIR = path.resolve('output');
export const MASTER_XLSX = path.join(OUTPUT_DIR, 'Authors_USA_Canada_Master.xlsx');
export const MASTER_CSV = path.join(OUTPUT_DIR, 'Authors_USA_Canada_Master.csv');
export const STATE_FILE = path.join(OUTPUT_DIR, 'scraper_state.json');
export const DEDUP_FILE = path.join(OUTPUT_DIR, 'authors_dedup.json');
export const LOG_FILE = path.join(OUTPUT_DIR, 'author_search_activity.log');

// AI Batch Processing Configuration
export const AI_BATCH_SIZE = 100; // Process 100 leads at a time via AI
export const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
export const FREE_AI_MODELS = [
  'google/gemini-2.0-flash-exp:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'deepseek/deepseek-chat:free',
  'qwen/qwen-2.5-72b-instruct:free'
];

// Target Genres
export const GENRES = [
  'Fiction & Literature',
  'Romance',
  'Mystery & Thriller',
  'Science Fiction & Fantasy',
  'Self-Help & Personal Development',
  'Business & Entrepreneurship',
  'Memoir & Autobiography',
  'Historical Fiction',
  'Health & Wellness',
  'Children & Young Adult (YA)',
  'Horror & Dark Fiction',
  'Non-Fiction & Essays'
];

// Target Geographic Locations: USA & Canada
export const TARGET_LOCATIONS = [
  // Major US States & Metro Hubs
  { name: 'New York', code: 'NY', country: 'US' },
  { name: 'California', code: 'CA', country: 'US' },
  { name: 'Texas', code: 'TX', country: 'US' },
  { name: 'Illinois', code: 'IL', country: 'US' },
  { name: 'Massachusetts', code: 'MA', country: 'US' },
  { name: 'Washington', code: 'WA', country: 'US' },
  { name: 'Florida', code: 'FL', country: 'US' },
  { name: 'Colorado', code: 'CO', country: 'US' },
  { name: 'Oregon', code: 'OR', country: 'US' },
  { name: 'Pennsylvania', code: 'PA', country: 'US' },
  { name: 'Georgia', code: 'GA', country: 'US' },
  { name: 'North Carolina', code: 'NC', country: 'US' },
  { name: 'Ohio', code: 'OH', country: 'US' },
  { name: 'Michigan', code: 'MI', country: 'US' },
  { name: 'Virginia', code: 'VA', country: 'US' },
  { name: 'Minnesota', code: 'MN', country: 'US' },
  { name: 'Tennessee', code: 'TN', country: 'US' },
  { name: 'Arizona', code: 'AZ', country: 'US' },
  { name: 'Missouri', code: 'MO', country: 'US' },
  { name: 'Maryland', code: 'MD', country: 'US' },
  { name: 'Wisconsin', code: 'WI', country: 'US' },
  { name: 'Connecticut', code: 'CT', country: 'US' },

  // Canada Provinces & Major Hubs
  { name: 'Ontario', code: 'ON', country: 'CA' },
  { name: 'British Columbia', code: 'BC', country: 'CA' },
  { name: 'Quebec', code: 'QC', country: 'CA' },
  { name: 'Alberta', code: 'AB', country: 'CA' },
  { name: 'Manitoba', code: 'MB', country: 'CA' },
  { name: 'Nova Scotia', code: 'NS', country: 'CA' },
  { name: 'Saskatchewan', code: 'SK', country: 'CA' }
];

// Expanded Search Dorks: Including LinkedIn, Instagram, Facebook, Substack, FastBackgroundCheck & Directories
export const SEARCH_TEMPLATES = [
  // 1. LinkedIn Author Profiles (USA & Canada)
  'site:linkedin.com/in ("author" OR "book writer" OR "published author") ("@gmail.com" OR "contact" OR "email") "{LOCATION}"',
  'site:linkedin.com/in "author of" "{GENRE}" ("United States" OR "Canada") "@gmail.com"',

  // 2. Instagram Author Bios (USA & Canada)
  'site:instagram.com ("author of" OR "book writer" OR "published author") ("@gmail.com" OR "contact" OR "linktr.ee") "{LOCATION}"',
  'site:instagram.com "novelist" "{GENRE}" ("@gmail.com" OR "email me") "{LOCATION}"',

  // 3. Facebook Author Pages
  'site:facebook.com ("author of" OR "book author") ("@gmail.com" OR "email") "{LOCATION}"',

  // 4. Twitter / X Author Bios
  'site:x.com ("author of" OR "published novelist" OR "book writer") ("@gmail.com" OR "contact") "{LOCATION}"',

  // 5. Substack Author Newsletters
  'site:substack.com "published author" "contact" "{LOCATION}"',
  'site:substack.com "author of" "email" "{GENRE}"',
  'site:substack.com "book writer" "{LOCATION}" "contact me"',

  // 6. Goodreads Author Directories
  'site:goodreads.com/author "lives in {LOCATION}" "{GENRE}"',
  'site:goodreads.com/author "author of" "website" "{LOCATION}"',

  // 7. Author Websites & Direct Media Portfolios
  '"author of" "contact" "email" "{GENRE}" "{LOCATION}"',
  '"published author" "media kit" "contact" "@gmail.com" "{LOCATION}"',
  '"book author" "press inquiries" "email" "{LOCATION}"',
  '"debut novel" "author" "contact" "{LOCATION}"',
  '"bestselling author" "representation" OR "contact" "email" "{LOCATION}"',

  // 8. Public Background Check & People Search Records for US Authors
  'site:fastbackgroundcheck.com ("author" OR "writer") "{LOCATION}"',
  'site:fastpeoplesearch.com ("author" OR "writer") "{LOCATION}"'
];

// Master Excel & CSV Headers (Comprehensive 19-Column Schema)
export const HEADERS = [
  { header: 'Author Full Name', key: 'name', width: 28 },
  { header: 'Verified Email', key: 'email', width: 32 },
  { header: 'Phone Number', key: 'phone', width: 18 },
  { header: 'Verified US Phone (Background Check)', key: 'bgPhone', width: 22 },
  { header: 'Primary Genre / Niche', key: 'genre', width: 26 },
  { header: 'Latest Book / Work Title', key: 'bookTitle', width: 34 },
  { header: 'Country', key: 'country', width: 10 },
  { header: 'State / Province / City', key: 'location', width: 24 },
  { header: 'Official Website / Blog', key: 'website', width: 36 },
  { header: 'LinkedIn Profile', key: 'linkedin', width: 34 },
  { header: 'Facebook Profile', key: 'facebook', width: 30 },
  { header: 'Instagram Profile', key: 'instagram', width: 30 },
  { header: 'Twitter / X', key: 'twitter', width: 28 },
  { header: 'Goodreads / Substack', key: 'substackGoodreads', width: 36 },
  { header: 'FastBackgroundCheck Record', key: 'fastBackgroundCheckUrl', width: 40 },
  { header: 'US/Canada Residency Confirmed', key: 'residencyConfirmed', width: 24 },
  { header: 'Lead Quality Score (1-10)', key: 'qualityScore', width: 22 },
  { header: 'Profile / Source Link', key: 'sourceUrl', width: 42 },
  { header: 'Scraped & Verified At', key: 'scrapedAt', width: 22 }
];
