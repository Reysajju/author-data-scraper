// audit_authors.js - Status Audit & Telemetry for Author Data Scraper
import fs from 'node:fs';
import path from 'node:path';

const outputDir = path.resolve('output');
const masterCsv = path.join(outputDir, 'Authors_USA_Canada_Master.csv');
const masterXlsx = path.join(outputDir, 'Authors_USA_Canada_Master.xlsx');
const stateFile = path.join(outputDir, 'scraper_state.json');
const dedupFile = path.join(outputDir, 'authors_dedup.json');

console.log('\n=================== 📚 AUTHOR DATA SCRAPER AUDIT ===================');

let totalLeads = 0;
let usaCount = 0;
let caCount = 0;
let socialCount = 0;
let bgCount = 0;
const byGenre = {};

if (fs.existsSync(masterCsv)) {
  const lines = fs.readFileSync(masterCsv, 'utf8').trim().split('\n');
  totalLeads = Math.max(0, lines.length - 1);

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('","').map(c => c.replace(/^"|"$/g, ''));
    if (cols.length >= 7) {
      const genre = cols[4] || 'Other';
      const country = cols[6] || '';
      const linkedin = cols[9] || '';
      const fb = cols[10] || '';
      const ig = cols[11] || '';
      const twitter = cols[12] || '';
      const bg = cols[14] || '';

      if (country === 'US') usaCount++;
      else if (country === 'CA') caCount++;
      if (linkedin || fb || ig || twitter) socialCount++;
      if (bg) bgCount++;
      byGenre[genre] = (byGenre[genre] || 0) + 1;
    }
  }
}

console.log(`📁 Target Directory:           ${outputDir}`);
console.log(`📊 Total Verified Authors:     ${totalLeads}`);
console.log(`🇺🇸 USA Authors:                ${usaCount}`);
console.log(`🇨🇦 Canada Authors:             ${caCount}`);
console.log(`📱 Authors with Social Links:  ${socialCount} (LinkedIn/IG/FB/X)`);
console.log(`🔍 FastBackgroundCheck Linked: ${bgCount}`);

if (fs.existsSync(masterXlsx)) {
  const stat = fs.statSync(masterXlsx);
  console.log(`📗 Master Excel (.xlsx):       ${masterXlsx} (${Math.round(stat.size / 1024)} KB, updated ${stat.mtime.toLocaleTimeString()})`);
} else {
  console.log(`📗 Master Excel (.xlsx):       Generating upon first batch output...`);
}

console.log('\n--- 📖 Breakdown by Genre ---');
const sortedGenres = Object.entries(byGenre).sort((a, b) => b[1] - a[1]);
if (sortedGenres.length > 0) {
  for (const [g, count] of sortedGenres) {
    console.log(`   • ${g.padEnd(30)}: ${count} authors`);
  }
} else {
  console.log('   (Collecting initial author leads...)');
}

// Check state progress
if (fs.existsSync(stateFile)) {
  try {
    const s = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    console.log(`\n⚙️ Current Progress:           Location #${s.locIdx + 1}, Genre #${s.genreIdx + 1}`);
  } catch {}
}

// Deduplication
if (fs.existsSync(dedupFile)) {
  try {
    const d = JSON.parse(fs.readFileSync(dedupFile, 'utf8'));
    console.log('\n--- 🛡️ Deduplication Stats ---');
    console.log(`   Unique Emails Collected:    ${d.emails?.length || 0}`);
    console.log(`   Unique URLs Scanned:        ${d.urls?.length || 0}`);
  } catch {}
}

console.log('=====================================================================\n');
