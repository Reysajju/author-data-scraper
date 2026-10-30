// start_author_scraper.js - Master Orchestrator for Authors & Book Writers Lead Mining
// Autonomous search, deep email verification, and 100-lead AI batch cleaning for USA & Canada.

import { chromium } from 'playwright';
import ExcelJS from 'exceljs';
import fs from 'node:fs/promises';
import { existsSync, readFileSync, appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import 'dotenv/config';

import {
  OUTPUT_DIR,
  MASTER_XLSX,
  MASTER_CSV,
  STATE_FILE,
  DEDUP_FILE,
  LOG_FILE,
  AI_BATCH_SIZE,
  GENRES,
  TARGET_LOCATIONS,
  SEARCH_TEMPLATES,
  HEADERS
} from './config.js';

import { cleanBatchWithAI } from './ai_cleaner.js';

// Ensure output directories exist
if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (a, b) => Math.floor(a + Math.random() * (b - a));

function log(...msgs) {
  const time = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const line = `[AUTHOR ENGINE] ${time} ${msgs.join(' ')}`;
  console.log(line);
  try {
    appendFileSync(LOG_FILE, line + '\n');
  } catch {}
}

// ---------------------------------------------------------------- DEDUPLICATION
let sharedEmails = new Set();
let sharedUrls = new Set();
let sharedNames = new Set();

function loadDedup() {
  if (existsSync(DEDUP_FILE)) {
    try {
      const data = JSON.parse(readFileSync(DEDUP_FILE, 'utf8'));
      sharedEmails = new Set(data.emails || []);
      sharedUrls = new Set(data.urls || []);
      sharedNames = new Set(data.names || []);
    } catch {}
  }
}

async function saveDedup() {
  try {
    await fs.writeFile(
      DEDUP_FILE,
      JSON.stringify({
        emails: [...sharedEmails],
        urls: [...sharedUrls],
        names: [...sharedNames]
      }, null, 2)
    );
  } catch {}
}

// ---------------------------------------------------------------- EXCEL & CSV
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

async function updateMasterFiles(newCleanedLeads) {
  if (!newCleanedLeads || newCleanedLeads.length === 0) return;

  // 1. Read existing CSV leads to maintain master list
  const allLeadsMap = new Map();
  if (existsSync(MASTER_CSV)) {
    try {
      const lines = readFileSync(MASTER_CSV, 'utf8').split('\n');
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split('","').map(c => c.replace(/^"|"$/g, ''));
        if (cols.length >= 7 && cols[1]) {
          const lead = {
            name: cols[0],
            email: cols[1],
            phone: cols[2] || '',
            genre: cols[3] || '',
            bookTitle: cols[4] || '',
            country: cols[5] || 'US',
            location: cols[6] || '',
            website: cols[7] || '',
            sourceUrl: cols[8] || '',
            roleConfirmed: cols[9] || 'Yes - Verified Author',
            qualityScore: cols[10] || 8,
            scrapedAt: cols[11] || ''
          };
          allLeadsMap.set(lead.email.toLowerCase(), lead);
        }
      }
    } catch {}
  }

  // Add new leads to map
  for (const l of newCleanedLeads) {
    if (l.email && l.email.includes('@')) {
      allLeadsMap.set(l.email.toLowerCase(), l);
      sharedEmails.add(l.email.toLowerCase());
      if (l.name) sharedNames.add(l.name.toLowerCase());
    }
  }

  const allLeads = Array.from(allLeadsMap.values());
  const usaLeads = allLeads.filter(l => l.country === 'US');
  const canadaLeads = allLeads.filter(l => l.country === 'CA');

  // 2. Write Master CSV
  const csvHeader = HEADERS.map(h => `"${h.header}"`).join(',') + '\n';
  const csvBody = allLeads.map(l => HEADERS.map(h => csvCell(l[h.key])).join(',')).join('\n') + '\n';
  await fs.writeFile(MASTER_CSV, csvHeader + csvBody, 'utf8');

  // 3. Write Master Excel Workbook with Tabs
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Autonomous Author Scraper';

  // Tab 1: All Authors
  const wsAll = wb.addWorksheet('All Authors');
  wsAll.columns = HEADERS;
  wsAll.getRow(1).font = { bold: true };
  wsAll.views = [{ state: 'frozen', ySplit: 1 }];
  allLeads.forEach(lead => wsAll.addRow(lead));

  // Tab 2: USA Authors
  const wsUSA = wb.addWorksheet('USA Authors');
  wsUSA.columns = HEADERS;
  wsUSA.getRow(1).font = { bold: true };
  wsUSA.views = [{ state: 'frozen', ySplit: 1 }];
  usaLeads.forEach(lead => wsUSA.addRow(lead));

  // Tab 3: Canada Authors
  const wsCA = wb.addWorksheet('Canada Authors');
  wsCA.columns = HEADERS;
  wsCA.getRow(1).font = { bold: true };
  wsCA.views = [{ state: 'frozen', ySplit: 1 }];
  canadaLeads.forEach(lead => wsCA.addRow(lead));

  // Tab 4: Summary by Genre
  const genreCounts = {};
  for (const lead of allLeads) {
    const g = lead.genre || 'Other';
    genreCounts[g] = (genreCounts[g] || 0) + 1;
  }
  const wsGenre = wb.addWorksheet('Summary by Genre');
  wsGenre.columns = [
    { header: 'Book Genre / Category', key: 'genre', width: 32 },
    { header: 'Verified Authors Count', key: 'count', width: 24 }
  ];
  wsGenre.getRow(1).font = { bold: true };
  for (const [g, count] of Object.entries(genreCounts).sort((a, b) => b[1] - a[1])) {
    wsGenre.addRow({ genre: g, count });
  }

  const tmpXlsx = `${MASTER_XLSX}.tmp`;
  await wb.xlsx.writeFile(tmpXlsx);
  try {
    await fs.rename(tmpXlsx, MASTER_XLSX);
  } catch {
    await fs.copyFile(tmpXlsx, MASTER_XLSX);
    await fs.unlink(tmpXlsx).catch(() => {});
  }

  await saveDedup();
  log(`💾 Saved ${allLeads.length} total authors to Master Excel & CSV (USA: ${usaLeads.length}, Canada: ${canadaLeads.length})`);
}

// ---------------------------------------------------------------- CONTACT EXTRACTION
function extractEmailFromText(text) {
  if (!text) return '';
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  const matches = text.match(emailRegex) || [];
  const invalid = ['example.com', 'w3.org', 'schema.org', 'domain.com', 'sentry.io', 'wordpress', 'cloudflare', 'gravatar', 'github'];
  
  const filtered = matches.filter(e => {
    const low = e.toLowerCase();
    return !invalid.some(inv => low.includes(inv)) && !low.endsWith('.png') && !low.endsWith('.jpg');
  });

  // Prefer direct personal email over generic
  const personal = filtered.find(e => !e.startsWith('info@') && !e.startsWith('contact@') && !e.startsWith('press@'));
  return personal || filtered[0] || '';
}

function extractPhoneFromText(text) {
  if (!text) return '';
  const phoneMatch = text.match(/(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/);
  return phoneMatch ? phoneMatch[0].trim() : '';
}

// ---------------------------------------------------------------- BROWSER SCRAPING
async function deepInspectAuthorPage(page, targetUrl) {
  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 16000 });
    await sleep(rand(400, 700));

    const pageData = await page.evaluate(() => {
      const txt = (el) => el?.innerText?.replace(/\s+/g, ' ').trim() || '';
      const bodyText = document.body?.innerText || '';
      const title = document.title || '';

      // Look for contact/about page links
      const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({
        href: a.href,
        text: a.innerText.toLowerCase()
      }));

      const contactLink = links.find(l => /contact|about|press|media|author/i.test(l.text) && l.href.startsWith('http'))?.href || '';
      return { bodyText, title, contactLink };
    });

    let email = extractEmailFromText(pageData.bodyText);
    let phone = extractPhoneFromText(pageData.bodyText);

    // If no email on homepage, visit the contact/about page if found
    if (!email && pageData.contactLink && !pageData.contactLink.includes('twitter') && !pageData.contactLink.includes('facebook')) {
      try {
        await page.goto(pageData.contactLink, { waitUntil: 'domcontentloaded', timeout: 12000 });
        await sleep(rand(300, 500));
        const contactBody = await page.evaluate(() => document.body?.innerText || '');
        email = extractEmailFromText(contactBody);
        if (!phone) phone = extractPhoneFromText(contactBody);
      } catch {}
    }

    return { email, phone, title: pageData.title, snippet: pageData.bodyText.slice(0, 1000) };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- MAIN SEARCH LOOP
async function main() {
  log('========================================================================');
  log('  📚 AUTONOMOUS BOOK AUTHORS & WRITERS SCRAPER (USA & CANADA)');
  log('  🤖 Integrated with 100-Lead AI Batch Cleaning & Multi-Site Verification');
  log('  📁 Output Directory: "output/"');
  log('========================================================================\n');

  loadDedup();

  let state = {
    locIdx: 0,
    genreIdx: 0,
    templateIdx: 0,
    totalScraped: 0
  };

  if (existsSync(STATE_FILE)) {
    try {
      state = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
    } catch {}
  }

  let rawLeadsBuffer = [];

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });

  const ctx = await browser.newContext({
    locale: 'en-US',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
  });

  // Block images and heavy media for lightning-fast speed
  await ctx.route('**/*', (route) => {
    const type = route.request().resourceType();
    if (['image', 'media', 'font'].includes(type)) return route.abort();
    return route.continue();
  });

  const searchPage = await ctx.newPage();
  searchPage.setDefaultTimeout(22000);

  const detailPage = await ctx.newPage();
  detailPage.setDefaultTimeout(18000);

  let stopping = false;
  const shutdown = async () => {
    stopping = true;
    log('Graceful stop requested. Cleaning remaining buffer with AI and saving...');
    if (rawLeadsBuffer.length > 0) {
      const cleaned = await cleanBatchWithAI(rawLeadsBuffer);
      await updateMasterFiles(cleaned);
    }
    await browser.close().catch(() => {});
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Runtime limiter (for GitHub Actions CI/CD)
  const maxMinutes = parseInt(process.env.MAX_RUN_MINUTES || '0', 10);
  if (maxMinutes > 0) {
    log(`⏱️ Auto-exit timer armed for ${maxMinutes} minutes (GitHub Actions mode).`);
    setTimeout(shutdown, maxMinutes * 60 * 1000);
  }

  // Iterate over locations and genres
  for (; state.locIdx < TARGET_LOCATIONS.length && !stopping; state.locIdx++, state.genreIdx = 0) {
    const loc = TARGET_LOCATIONS[state.locIdx];

    for (; state.genreIdx < GENRES.length && !stopping; state.genreIdx++, state.templateIdx = 0) {
      const genre = GENRES[state.genreIdx];

      for (; state.templateIdx < SEARCH_TEMPLATES.length && !stopping; state.templateIdx++) {
        const query = SEARCH_TEMPLATES[state.templateIdx]
          .replace('{LOCATION}', loc.name)
          .replace('{GENRE}', genre);

        log(`🔍 [${loc.name} (${loc.country}) | ${genre}] Query: "${query}"`);

        try {
          const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en&num=25`;
          await searchPage.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
          await sleep(rand(1200, 2000));

          // Extract candidate search results
          const results = await searchPage.evaluate(() => {
            const items = [];
            document.querySelectorAll('div.g, div[data-hveid]').forEach((card) => {
              const a = card.querySelector('a[href^="http"]');
              const titleEl = card.querySelector('h3');
              const snippetEl = card.querySelector('div[style*="-webkit-line-clamp"], div.VwiC3b');
              if (a && titleEl && !a.href.includes('google.com')) {
                items.push({
                  url: a.href,
                  title: titleEl.innerText.trim(),
                  snippet: snippetEl?.innerText?.trim() || ''
                });
              }
            });
            return items;
          });

          log(`   Found ${results.length} candidate URLs for query`);

          for (const res of results) {
            if (stopping) break;
            if (sharedUrls.has(res.url)) continue;
            sharedUrls.add(res.url);

            // Quick check if email is already visible in search snippet
            let email = extractEmailFromText(res.snippet);
            let phone = extractPhoneFromText(res.snippet);
            let detailTitle = res.title;
            let snippet = res.snippet;

            // If not in snippet, inspect the author's page directly
            if (!email) {
              const detail = await deepInspectAuthorPage(detailPage, res.url);
              if (detail) {
                if (detail.email) email = detail.email;
                if (detail.phone) phone = detail.phone;
                if (detail.snippet) snippet = detail.snippet;
              }
            }

            // If a valid email is found and not duplicate
            if (email && !sharedEmails.has(email.toLowerCase())) {
              sharedEmails.add(email.toLowerCase());

              const rawLead = {
                name: res.title.split(/[-|•–:]/)[0].trim() || 'Author',
                email: email.toLowerCase(),
                phone: phone,
                genre: genre,
                country: loc.country,
                location: `${loc.name}, ${loc.country}`,
                website: res.url,
                sourceUrl: res.url,
                snippet: snippet
              };

              rawLeadsBuffer.push(rawLead);
              state.totalScraped++;

              log(`  ★ CANDIDATE #${state.totalScraped} BUFFERED: "${rawLead.name}" | ✉️ ${rawLead.email} | 📍 ${loc.name} (${loc.country}) | ${genre} (Buffer: ${rawLeadsBuffer.length}/${AI_BATCH_SIZE})`);

              // TRIGGER AI CLEANING WHEN BUFFER REACHES BATCH SIZE (100 LEADS)
              if (rawLeadsBuffer.length >= AI_BATCH_SIZE) {
                log(`\n🚀 Buffer reached ${AI_BATCH_SIZE} leads! Triggering AI Batch Cleaner...`);
                const batchToClean = [...rawLeadsBuffer];
                rawLeadsBuffer = [];
                const cleanedLeads = await cleanBatchWithAI(batchToClean);
                await updateMasterFiles(cleanedLeads);
              }
            }

            await sleep(rand(400, 800));
          }
        } catch (err) {
          log('! Query error:', err.message.split('\n')[0]);
          await sleep(2500);
        }

        // Save progress state checkpoint
        await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
        await sleep(rand(1000, 2000));
      }
    }
  }

  // Final flush of remaining buffer
  if (rawLeadsBuffer.length > 0) {
    log(`Flushing final remaining ${rawLeadsBuffer.length} buffer leads with AI cleaner...`);
    const cleaned = await cleanBatchWithAI(rawLeadsBuffer);
    await updateMasterFiles(cleaned);
  }

  await browser.close();
  log(`All search matrices complete! Total authors mined: ${state.totalScraped}`);
}

main().catch((err) => {
  console.error('[FATAL ERROR]:', err);
  process.exit(1);
});
