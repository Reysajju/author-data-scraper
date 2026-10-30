// start_author_scraper.js - Master Orchestrator for Authors & Book Writers Lead Mining
// USA & Canada Lead Discovery, Social Media Extraction (LinkedIn, FB, IG, X), FastBackgroundCheck & 100-Lead AI Batching

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

  const allLeadsMap = new Map();

  // 1. Read existing CSV leads to maintain master cumulative list
  if (existsSync(MASTER_CSV)) {
    try {
      const lines = readFileSync(MASTER_CSV, 'utf8').split('\n');
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split('","').map(c => c.replace(/^"|"$/g, ''));
        if (cols.length >= 2 && cols[1]) {
          const lead = {};
          HEADERS.forEach((h, idx) => {
            lead[h.key] = cols[idx] || '';
          });
          allLeadsMap.set(lead.email.toLowerCase(), lead);
        }
      }
    } catch {}
  }

  // Add newly cleaned leads to map
  for (const l of newCleanedLeads) {
    if (l.email && l.email.includes('@')) {
      const existing = allLeadsMap.get(l.email.toLowerCase()) || {};
      // Merge and enrich fields if existing
      allLeadsMap.set(l.email.toLowerCase(), {
        ...existing,
        ...l,
        linkedin: l.linkedin || existing.linkedin || '',
        facebook: l.facebook || existing.facebook || '',
        instagram: l.instagram || existing.instagram || '',
        twitter: l.twitter || existing.twitter || '',
        bgPhone: l.bgPhone || existing.bgPhone || '',
        fastBackgroundCheckUrl: l.fastBackgroundCheckUrl || existing.fastBackgroundCheckUrl || ''
      });
      sharedEmails.add(l.email.toLowerCase());
      if (l.name) sharedNames.add(l.name.toLowerCase());
    }
  }

  const allLeads = Array.from(allLeadsMap.values());
  const usaLeads = allLeads.filter(l => l.country === 'US');
  const canadaLeads = allLeads.filter(l => l.country === 'CA');
  const socialLeads = allLeads.filter(l => l.linkedin || l.instagram || l.facebook || l.twitter);

  // 2. Write Master CSV
  const csvHeader = HEADERS.map(h => `"${h.header}"`).join(',') + '\n';
  const csvBody = allLeads.map(l => HEADERS.map(h => csvCell(l[h.key])).join(',')).join('\n') + '\n';
  await fs.writeFile(MASTER_CSV, csvHeader + csvBody, 'utf8');

  // 3. Write Master Multi-Tab Excel
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Autonomous Author & Writer Scraper';

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

  // Tab 4: Authors with Socials (LinkedIn, IG, FB, X)
  const wsSocial = wb.addWorksheet('Authors with Socials');
  wsSocial.columns = HEADERS;
  wsSocial.getRow(1).font = { bold: true };
  wsSocial.views = [{ state: 'frozen', ySplit: 1 }];
  socialLeads.forEach(lead => wsSocial.addRow(lead));

  // Tab 5: Summary by Genre
  const genreCounts = {};
  for (const lead of allLeads) {
    const g = lead.genre || 'Other';
    genreCounts[g] = (genreCounts[g] || 0) + 1;
  }
  const wsGenre = wb.addWorksheet('Summary by Genre');
  wsGenre.columns = [
    { header: 'Book Genre / Category', key: 'genre', width: 34 },
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
  log(`💾 Saved ${allLeads.length} total authors to Master Excel & CSV (USA: ${usaLeads.length}, Canada: ${canadaLeads.length}, With Socials: ${socialLeads.length})`);
}

// ---------------------------------------------------------------- CONTACT & SOCIAL EXTRACTION
function extractEmailFromText(text) {
  if (!text) return '';
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  const matches = text.match(emailRegex) || [];
  const invalid = ['example.com', 'w3.org', 'schema.org', 'domain.com', 'sentry.io', 'wordpress', 'cloudflare', 'gravatar', 'github'];

  const filtered = matches.filter(e => {
    const low = e.toLowerCase();
    return !invalid.some(inv => low.includes(inv)) && !low.endsWith('.png') && !low.endsWith('.jpg');
  });

  const personal = filtered.find(e => !e.startsWith('info@') && !e.startsWith('contact@') && !e.startsWith('press@'));
  return personal || filtered[0] || '';
}

function extractPhoneFromText(text) {
  if (!text) return '';
  const phoneMatch = text.match(/(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/);
  return phoneMatch ? phoneMatch[0].trim() : '';
}

function extractSocialsFromUrls(urls) {
  const socials = {
    linkedin: '',
    facebook: '',
    instagram: '',
    twitter: '',
    substackGoodreads: ''
  };

  for (const rawUrl of urls) {
    if (!rawUrl || typeof rawUrl !== 'string') continue;
    const u = rawUrl.trim();

    if (!socials.linkedin && /linkedin\.com\/(?:in|pub)\/[a-zA-Z0-9_-]+/i.test(u)) {
      socials.linkedin = u.split('?')[0];
    } else if (!socials.instagram && /instagram\.com\/[a-zA-Z0-9_.]+/i.test(u) && !/instagram\.com\/(?:p|explore|reels|stories|accounts)/i.test(u)) {
      socials.instagram = u.split('?')[0];
    } else if (!socials.facebook && /facebook\.com\/[a-zA-Z0-9_.]+/i.test(u) && !/facebook\.com\/(?:sharer|share|login|policies|dialog)/i.test(u)) {
      socials.facebook = u.split('?')[0];
    } else if (!socials.twitter && /(?:twitter\.com|x\.com)\/[a-zA-Z0-9_]+/i.test(u) && !/(?:twitter\.com|x\.com)\/(?:intent|share|home|search)/i.test(u)) {
      socials.twitter = u.split('?')[0];
    } else if (!socials.substackGoodreads && (/\.substack\.com/i.test(u) || /goodreads\.com\/author\/show/i.test(u))) {
      socials.substackGoodreads = u.split('?')[0];
    }
  }

  return socials;
}

// ---------------------------------------------------------------- BROWSER SCRAPING
async function deepInspectAuthorPage(page, targetUrl) {
  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 16000 });
    await sleep(rand(300, 600));

    const pageData = await page.evaluate(() => {
      const bodyText = document.body?.innerText || '';
      const title = document.title || '';

      const links = Array.from(document.querySelectorAll('a[href]')).map(a => a.href);
      const contactLink = links.find(h => /contact|about|press|media|author/i.test(h) && h.startsWith('http')) || '';

      return { bodyText, title, links, contactLink };
    });

    let email = extractEmailFromText(pageData.bodyText);
    let phone = extractPhoneFromText(pageData.bodyText);
    const socials = extractSocialsFromUrls(pageData.links);

    // If no email on landing page, visit contact page
    if (!email && pageData.contactLink && !pageData.contactLink.includes('twitter') && !pageData.contactLink.includes('facebook')) {
      try {
        await page.goto(pageData.contactLink, { waitUntil: 'domcontentloaded', timeout: 12000 });
        await sleep(rand(300, 500));
        const contactData = await page.evaluate(() => {
          const bodyText = document.body?.innerText || '';
          const links = Array.from(document.querySelectorAll('a[href]')).map(a => a.href);
          return { bodyText, links };
        });
        email = extractEmailFromText(contactData.bodyText);
        if (!phone) phone = extractPhoneFromText(contactData.bodyText);
        const contactSocials = extractSocialsFromUrls(contactData.links);
        socials.linkedin = socials.linkedin || contactSocials.linkedin;
        socials.facebook = socials.facebook || contactSocials.facebook;
        socials.instagram = socials.instagram || contactSocials.instagram;
        socials.twitter = socials.twitter || contactSocials.twitter;
        socials.substackGoodreads = socials.substackGoodreads || contactSocials.substackGoodreads;
      } catch {}
    }

    return {
      email,
      phone,
      socials,
      title: pageData.title,
      snippet: pageData.bodyText.slice(0, 1000)
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- MAIN SEARCH LOOP
async function main() {
  log('========================================================================');
  log('  📚 AUTONOMOUS BOOK AUTHORS & WRITERS SCRAPER (USA & CANADA)');
  log('  🌐 Social Media Extraction: LinkedIn, Instagram, Facebook, Twitter/X');
  log('  🔍 US Public Records & FastBackgroundCheck Enrichment');
  log('  🤖 Integrated with 100-Lead AI Batch Cleaning');
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

            // Direct social classification if URL is a social network
            const directSocials = extractSocialsFromUrls([res.url]);

            let email = extractEmailFromText(res.snippet);
            let phone = extractPhoneFromText(res.snippet);
            let bgPhone = '';
            let fastBgUrl = '';
            let snippet = res.snippet;
            let pageSocials = { ...directSocials };

            // Check if result is from FastBackgroundCheck / FastPeopleSearch
            if (res.url.includes('fastbackgroundcheck.com') || res.url.includes('fastpeoplesearch.com')) {
              fastBgUrl = res.url;
              bgPhone = extractPhoneFromText(res.snippet);
            }

            // If not found in snippet and not a social login wall, inspect the page
            if (!email && !res.url.includes('linkedin.com/in') && !res.url.includes('facebook.com')) {
              const detail = await deepInspectAuthorPage(detailPage, res.url);
              if (detail) {
                if (detail.email) email = detail.email;
                if (detail.phone) phone = detail.phone;
                if (detail.snippet) snippet = detail.snippet;
                pageSocials.linkedin = pageSocials.linkedin || detail.socials.linkedin;
                pageSocials.facebook = pageSocials.facebook || detail.socials.facebook;
                pageSocials.instagram = pageSocials.instagram || detail.socials.instagram;
                pageSocials.twitter = pageSocials.twitter || detail.socials.twitter;
                pageSocials.substackGoodreads = pageSocials.substackGoodreads || detail.socials.substackGoodreads;
              }
            }

            // If a valid email is found and not duplicate
            if (email && !sharedEmails.has(email.toLowerCase())) {
              sharedEmails.add(email.toLowerCase());

              // Clean author name from title
              let cleanName = res.title
                .split(/[-|•–:]/)[0]
                .replace(/\(.*?\)/g, '')
                .replace(/@\S+/g, '')
                .trim() || 'Author';

              const rawLead = {
                name: cleanName,
                email: email.toLowerCase(),
                phone: phone,
                bgPhone: bgPhone,
                genre: genre,
                country: loc.country,
                location: `${loc.name}, ${loc.country}`,
                website: res.url.includes('linkedin.com') || res.url.includes('instagram.com') ? '' : res.url,
                linkedin: pageSocials.linkedin,
                facebook: pageSocials.facebook,
                instagram: pageSocials.instagram,
                twitter: pageSocials.twitter,
                substackGoodreads: pageSocials.substackGoodreads,
                fastBackgroundCheckUrl: fastBgUrl,
                sourceUrl: res.url,
                snippet: snippet
              };

              rawLeadsBuffer.push(rawLead);
              state.totalScraped++;

              const socialTags = [
                rawLead.linkedin ? 'LI' : '',
                rawLead.instagram ? 'IG' : '',
                rawLead.facebook ? 'FB' : '',
                rawLead.twitter ? 'X' : ''
              ].filter(Boolean).join('/');

              log(`  ★ CANDIDATE #${state.totalScraped} BUFFERED: "${rawLead.name}" | ✉️ ${rawLead.email} | 📍 ${loc.name} (${loc.country}) | ${socialTags ? `📱 [${socialTags}] | ` : ''}${genre} (Buffer: ${rawLeadsBuffer.length}/${AI_BATCH_SIZE})`);

              // TRIGGER AI CLEANING WHEN BUFFER REACHES BATCH SIZE (100 LEADS)
              if (rawLeadsBuffer.length >= AI_BATCH_SIZE) {
                log(`\n🚀 Buffer reached ${AI_BATCH_SIZE} leads! Triggering AI Batch Cleaner...`);
                const batchToClean = [...rawLeadsBuffer];
                rawLeadsBuffer = [];
                const cleanedLeads = await cleanBatchWithAI(batchToClean);
                await updateMasterFiles(cleanedLeads);
              }
            }

            await sleep(rand(350, 700));
          }
        } catch (err) {
          log('! Query error:', err.message.split('\n')[0]);
          await sleep(2000);
        }

        // Save progress state checkpoint
        await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
        await sleep(rand(800, 1600));
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
