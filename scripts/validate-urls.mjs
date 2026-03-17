import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT = path.join(__dirname, 'source_urls.json');
const OUTPUT = path.join(__dirname, 'url_results.json');
const PROGRESS = path.join(__dirname, 'progress.log');

// Config
const TIMEOUT_MS = 15000;
const DOMAIN_DELAY_MS = 1000; // 1s between requests to same domain
const CONCURRENCY = 10; // max parallel requests across different domains
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Track last request time per domain
const domainLastRequest = new Map();

function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function cleanUrl(rawUrl) {
  // Handle HTML-wrapped URLs like: <a href="https://...">text</a>
  const hrefMatch = rawUrl.match(/href="([^"]+)"/);
  if (hrefMatch) return hrefMatch[1];
  return rawUrl.trim();
}

async function waitForDomain(domain) {
  const last = domainLastRequest.get(domain) || 0;
  const elapsed = Date.now() - last;
  if (elapsed < DOMAIN_DELAY_MS) {
    await new Promise(r => setTimeout(r, DOMAIN_DELAY_MS - elapsed));
  }
  domainLastRequest.set(domain, Date.now());
}

async function checkUrl(entry) {
  const rawUrl = entry.source_url;
  const url = cleanUrl(rawUrl);
  const domain = getDomain(url);

  const result = {
    faw_id: entry.faw_id,
    original_url: rawUrl,
    cleaned_url: url !== rawUrl ? url : undefined,
    domain,
  };

  // Check if URL is valid
  if (!domain) {
    result.status = 'malformed';
    result.error = 'Could not parse URL';
    return result;
  }

  // Rate limit per domain
  await waitForDomain(domain);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    clearTimeout(timer);
    result.http_status = response.status;
    result.final_url = response.url;
    result.redirected = response.url !== url;

    if (response.status >= 200 && response.status < 300) {
      result.status = 'ok';
    } else if (response.status === 403) {
      // Some sites block HEAD, retry with GET
      result.status = 'retry_get';
    } else if (response.status === 404 || response.status === 410) {
      result.status = 'not_found';
    } else if (response.status === 405) {
      // Method not allowed — retry with GET
      result.status = 'retry_get';
    } else if (response.status >= 500) {
      result.status = 'server_error';
    } else if (response.status >= 300 && response.status < 400) {
      result.status = 'redirect_unresolved';
    } else {
      result.status = 'other';
    }
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      result.status = 'timeout';
      result.error = `No response in ${TIMEOUT_MS}ms`;
    } else if (err.cause?.code === 'ENOTFOUND') {
      result.status = 'dead_domain';
      result.error = `DNS lookup failed for ${domain}`;
    } else if (err.cause?.code === 'ECONNREFUSED') {
      result.status = 'connection_refused';
      result.error = `Connection refused by ${domain}`;
    } else if (err.cause?.code === 'ECONNRESET') {
      result.status = 'connection_reset';
      result.error = `Connection reset by ${domain}`;
    } else if (err.message?.includes('certificate') || err.cause?.code === 'ERR_TLS_CERT_ALTNAME_INVALID') {
      result.status = 'ssl_error';
      result.error = err.message;
    } else {
      result.status = 'error';
      result.error = err.message || String(err);
    }
  }

  return result;
}

async function retryWithGet(result) {
  const url = result.cleaned_url || result.original_url;
  const domain = getDomain(url);
  await waitForDomain(domain);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    clearTimeout(timer);
    result.http_status = response.status;
    result.final_url = response.url;
    result.redirected = response.url !== url;
    result.retry_method = 'GET';

    if (response.status >= 200 && response.status < 300) {
      // Read a small chunk to check for soft 404 indicators
      const text = await response.text();
      const lower = text.substring(0, 5000).toLowerCase();
      const titleMatch = text.match(/<title[^>]*>(.*?)<\/title>/is);
      result.page_title = titleMatch ? titleMatch[1].trim().substring(0, 200) : null;

      const soft404Patterns = [
        'page not found',
        '404',
        'not found',
        'no longer available',
        'page doesn\'t exist',
        'page does not exist',
        'this page isn\'t available',
        'we couldn\'t find',
        'content has been removed',
        'article not found',
      ];

      const isSoft404 = soft404Patterns.some(p => lower.includes(p));
      // Only flag as soft 404 if the title also suggests it (avoid false positives)
      const titleLower = (result.page_title || '').toLowerCase();
      const titleSuggests404 = ['404', 'not found', 'page not found', 'error'].some(p => titleLower.includes(p));

      if (isSoft404 && titleSuggests404) {
        result.status = 'soft_404';
      } else {
        result.status = 'ok';
      }
    } else if (response.status === 403) {
      result.status = 'blocked';
    } else if (response.status === 404 || response.status === 410) {
      result.status = 'not_found';
    } else if (response.status >= 500) {
      result.status = 'server_error';
    } else {
      result.status = 'other';
      result.note = `HTTP ${response.status}`;
    }
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      result.status = 'timeout';
      result.error = `No response in ${TIMEOUT_MS}ms (GET retry)`;
    } else {
      result.status = 'error';
      result.error = `GET retry failed: ${err.message}`;
    }
  }

  return result;
}

async function main() {
  const entries = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
  console.log(`Loaded ${entries.length} URLs to validate`);

  // Deduplicate URLs — check each unique URL once, map results back
  const urlToEntries = new Map();
  for (const e of entries) {
    const url = cleanUrl(e.source_url);
    if (!urlToEntries.has(url)) urlToEntries.set(url, []);
    urlToEntries.get(url).push(e);
  }
  console.log(`${urlToEntries.size} unique URLs to check`);

  // Create one check entry per unique URL
  const uniqueEntries = [];
  for (const [url, group] of urlToEntries) {
    uniqueEntries.push({ faw_id: group[0].faw_id, source_url: group[0].source_url, all_faw_ids: group.map(e => e.faw_id) });
  }

  const results = [];
  let completed = 0;

  // Process in batches for concurrency control
  for (let i = 0; i < uniqueEntries.length; i += CONCURRENCY) {
    const batch = uniqueEntries.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(e => checkUrl(e)));

    // Retry GET for entries that need it
    for (const r of batchResults) {
      if (r.status === 'retry_get') {
        await retryWithGet(r);
      }
    }

    // Expand results back to all faw_ids that share this URL
    for (let j = 0; j < batchResults.length; j++) {
      const r = batchResults[j];
      const entry = batch[j];
      for (const faw_id of entry.all_faw_ids) {
        results.push({ ...r, faw_id, all_faw_ids: undefined });
      }
    }

    completed += batch.length;
    const pct = ((completed / uniqueEntries.size || completed / uniqueEntries.length) * 100).toFixed(1);
    const line = `[${new Date().toISOString()}] ${completed}/${uniqueEntries.length} unique URLs checked (${pct}%)`;
    console.log(line);
    fs.appendFileSync(PROGRESS, line + '\n');

    // Save intermediate results
    fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2));
  }

  // Final summary
  const summary = {};
  for (const r of results) {
    summary[r.status] = (summary[r.status] || 0) + 1;
  }
  console.log('\n=== FINAL SUMMARY ===');
  console.log(`Total URLs checked: ${results.length} (${uniqueEntries.length} unique)`);
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
