import fs from 'fs';

const firstPass = JSON.parse(fs.readFileSync('url_results.json', 'utf8'));
const puppeteer = JSON.parse(fs.readFileSync('puppeteer_results.json', 'utf8'));

// Build puppeteer lookup by URL
const puppeteerByUrl = new Map();
for (const r of puppeteer) {
  puppeteerByUrl.set(r.url, r);
}

// Merge: use puppeteer result if available, otherwise first pass
const finalByUrl = new Map();
for (const r of firstPass) {
  const url = r.cleaned_url || r.original_url;
  if (finalByUrl.has(url)) {
    // Add faw_id to existing
    finalByUrl.get(url).faw_ids.push(r.faw_id);
    continue;
  }
  const pResult = puppeteerByUrl.get(url);
  if (pResult) {
    finalByUrl.set(url, {
      url,
      original_url: r.original_url,
      status: pResult.status,
      http_status: pResult.http_status,
      page_title: pResult.page_title,
      error: pResult.error,
      note: pResult.note,
      faw_ids: [r.faw_id],
    });
  } else {
    finalByUrl.set(url, {
      url,
      original_url: r.original_url,
      status: r.status,
      http_status: r.http_status,
      page_title: r.page_title,
      error: r.error,
      faw_ids: [r.faw_id],
    });
  }
}

// Collect all non-ok
const problems = [];
for (const [url, data] of finalByUrl) {
  if (data.status !== 'ok') {
    problems.push(data);
  }
}

// Sort by status then faw_id
problems.sort((a, b) => {
  if (a.status !== b.status) return a.status.localeCompare(b.status);
  return a.faw_ids[0] - b.faw_ids[0];
});

// Group by status
const byStatus = {};
for (const p of problems) {
  if (!byStatus[p.status]) byStatus[p.status] = [];
  byStatus[p.status].push(p);
}

for (const [status, items] of Object.entries(byStatus).sort((a, b) => b[1].length - a[1].length)) {
  const totalSightings = items.reduce((s, i) => s + i.faw_ids.length, 0);
  console.log(`\n=== ${status.toUpperCase()} (${items.length} URLs, ${totalSightings} sightings) ===\n`);
  for (const item of items) {
    console.log(`faw_ids: [${item.faw_ids.join(', ')}]`);
    console.log(`url: ${item.url}`);
    if (item.url !== item.original_url) console.log(`original_in_db: ${item.original_url}`);
    console.log(`http_status: ${item.http_status || 'N/A'}`);
    if (item.page_title) console.log(`page_title: ${item.page_title}`);
    if (item.error) console.log(`error: ${item.error}`);
    if (item.note) console.log(`note: ${item.note}`);
    console.log('');
  }
}
