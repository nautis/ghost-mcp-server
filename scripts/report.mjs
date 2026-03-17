import fs from 'fs';

const results = JSON.parse(fs.readFileSync('url_results.json', 'utf8'));

const nonOk = results.filter(r => r.status !== 'ok');
const byStatus = {};
for (const r of nonOk) {
  if (!byStatus[r.status]) byStatus[r.status] = [];
  byStatus[r.status].push(r);
}

for (const [status, items] of Object.entries(byStatus).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n=== ${status.toUpperCase()} (${items.length} sightings) ===`);
  const seen = new Set();
  for (const r of items) {
    const url = r.cleaned_url || r.original_url;
    if (seen.has(url)) continue;
    seen.add(url);
    const fawIds = items.filter(x => (x.cleaned_url || x.original_url) === url).map(x => x.faw_id);
    console.log(`  faw_ids: [${fawIds.join(', ')}]`);
    console.log(`  url: ${url}`);
    console.log(`  http_status: ${r.http_status || 'N/A'}`);
    if (r.error) console.log(`  error: ${r.error}`);
    if (r.page_title) console.log(`  page_title: ${r.page_title}`);
    if (r.note) console.log(`  note: ${r.note}`);
    console.log('');
  }
}

// Also show the "other" status HTTP codes breakdown
const others = results.filter(r => r.status === 'other');
if (others.length > 0) {
  const byCodes = {};
  for (const r of others) {
    const key = r.http_status || r.note || 'unknown';
    if (!byCodes[key]) byCodes[key] = [];
    byCodes[key].push(r);
  }
  console.log('\n=== "OTHER" STATUS BREAKDOWN BY HTTP CODE ===');
  for (const [code, items] of Object.entries(byCodes).sort((a, b) => b[1].length - a[1].length)) {
    const urls = [...new Set(items.map(r => r.cleaned_url || r.original_url))];
    console.log(`  HTTP ${code}: ${items.length} sightings (${urls.length} unique URLs)`);
    for (const url of urls.slice(0, 3)) {
      console.log(`    - ${url}`);
    }
    if (urls.length > 3) console.log(`    ... and ${urls.length - 3} more`);
  }
}
