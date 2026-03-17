import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_FILE = path.join(__dirname, 'url_results.json');
const OUTPUT = path.join(__dirname, 'puppeteer_results.json');

const TIMEOUT_MS = 20000;
const DOMAIN_DELAY_MS = 2000; // be extra polite with real browser
const domainLastRequest = new Map();

function getDomain(url) {
  try { return new URL(url).hostname; } catch { return null; }
}

async function waitForDomain(domain) {
  const last = domainLastRequest.get(domain) || 0;
  const elapsed = Date.now() - last;
  if (elapsed < DOMAIN_DELAY_MS) {
    await new Promise(r => setTimeout(r, DOMAIN_DELAY_MS - elapsed));
  }
  domainLastRequest.set(domain, Date.now());
}

async function checkWithBrowser(page, entry) {
  const url = entry.cleaned_url || entry.original_url;
  const domain = getDomain(url);
  const result = {
    faw_id: entry.faw_id,
    url,
    original_status: entry.status,
    original_http_status: entry.http_status,
  };

  await waitForDomain(domain);

  try {
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: TIMEOUT_MS,
    });

    result.http_status = response ? response.status() : null;
    result.final_url = page.url();
    result.redirected = page.url() !== url;

    // Get page title
    const title = await page.title().catch(() => null);
    result.page_title = title ? title.substring(0, 200) : null;

    // Check for 404/not-found indicators in the page
    const bodyText = await page.evaluate(() => {
      return document.body ? document.body.innerText.substring(0, 3000).toLowerCase() : '';
    }).catch(() => '');

    const titleLower = (title || '').toLowerCase();

    const is404Status = result.http_status === 404 || result.http_status === 410;
    const soft404Indicators = [
      'page not found',
      '404',
      'not found',
      'no longer available',
      'this page isn\'t available',
      'we couldn\'t find',
      'content has been removed',
      'does not exist',
      'doesn\'t exist',
    ];

    const bodyHas404 = soft404Indicators.some(p => bodyText.includes(p));
    const titleHas404 = ['404', 'not found', 'page not found', 'error'].some(p => titleLower.includes(p));

    if (is404Status) {
      result.status = 'not_found';
    } else if (bodyHas404 && titleHas404) {
      result.status = 'soft_404';
    } else if (result.http_status >= 200 && result.http_status < 400) {
      result.status = 'ok';
    } else if (result.http_status === 403) {
      // Still blocked even with real browser
      result.status = 'blocked';
    } else if (result.http_status >= 500) {
      result.status = 'server_error';
    } else {
      result.status = 'other';
      result.note = `HTTP ${result.http_status}`;
    }

    // Check if we landed on a Cloudflare challenge
    if (bodyText.includes('checking your browser') || bodyText.includes('cloudflare') && bodyText.includes('ray id')) {
      result.status = 'cloudflare_challenge';
    }

  } catch (err) {
    if (err.message.includes('timeout') || err.message.includes('Timeout')) {
      result.status = 'timeout';
      result.error = `No response in ${TIMEOUT_MS}ms`;
    } else if (err.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
      result.status = 'dead_domain';
      result.error = 'DNS lookup failed';
    } else if (err.message.includes('net::ERR_CONNECTION_REFUSED')) {
      result.status = 'connection_refused';
      result.error = 'Connection refused';
    } else {
      result.status = 'error';
      result.error = err.message.substring(0, 300);
    }
  }

  return result;
}

async function main() {
  const allResults = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));

  // Get unique URLs that were 403 or 429 (in "other" with 429, or "blocked" with 403)
  const toRecheck = [];
  const seenUrls = new Set();

  for (const r of allResults) {
    if (r.status !== 'blocked' && r.status !== 'other') continue;
    const url = r.cleaned_url || r.original_url;
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);
    toRecheck.push(r);
  }

  console.log(`Rechecking ${toRecheck.length} unique URLs with Puppeteer`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1280, height: 800 });

  const results = [];
  let completed = 0;

  for (const entry of toRecheck) {
    const result = await checkWithBrowser(page, entry);
    results.push(result);
    completed++;

    // Map back to all faw_ids with this URL
    const url = entry.cleaned_url || entry.original_url;
    const allFawIds = allResults
      .filter(r => (r.cleaned_url || r.original_url) === url)
      .map(r => r.faw_id);
    result.all_faw_ids = allFawIds;

    const pct = ((completed / toRecheck.length) * 100).toFixed(1);
    console.log(`[${completed}/${toRecheck.length}] (${pct}%) ${result.status} - ${url.substring(0, 80)}...`);

    // Save intermediate
    fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2));
  }

  await browser.close();

  // Summary
  const summary = {};
  let totalSightings = 0;
  for (const r of results) {
    const count = r.all_faw_ids ? r.all_faw_ids.length : 1;
    summary[r.status] = (summary[r.status] || 0) + count;
    totalSightings += count;
  }
  console.log(`\n=== PUPPETEER SUMMARY ===`);
  console.log(`Unique URLs checked: ${results.length}`);
  console.log(`Total sightings covered: ${totalSightings}`);
  for (const [status, count] of Object.entries(summary).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${status}: ${count}`);
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to ${OUTPUT}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
