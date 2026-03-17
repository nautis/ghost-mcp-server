import fs from 'fs';

const results = JSON.parse(fs.readFileSync('puppeteer_results.json', 'utf8'));

const nonOk = results.filter(r => r.status !== 'ok');
const byStatus = {};
for (const r of nonOk) {
  if (!byStatus[r.status]) byStatus[r.status] = [];
  byStatus[r.status].push(r);
}

for (const [status, items] of Object.entries(byStatus).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n=== ${status.toUpperCase()} (${items.length} unique URLs, ${items.reduce((s, r) => s + (r.all_faw_ids?.length || 1), 0)} sightings) ===`);
  for (const r of items) {
    console.log(`  faw_ids: [${(r.all_faw_ids || [r.faw_id]).join(', ')}]`);
    console.log(`  url: ${r.url}`);
    console.log(`  http_status: ${r.http_status || 'N/A'}`);
    if (r.page_title) console.log(`  page_title: ${r.page_title}`);
    if (r.error) console.log(`  error: ${r.error}`);
    if (r.note) console.log(`  note: ${r.note}`);
    console.log('');
  }
}

// Show how many bamfstyle resolved to ok
const bamf = results.filter(r => r.url.includes('bamfstyle.com'));
const bamfOk = bamf.filter(r => r.status === 'ok');
console.log(`\n=== BAMFSTYLE SUMMARY ===`);
console.log(`${bamfOk.length}/${bamf.length} bamfstyle.com URLs confirmed OK with Puppeteer`);
const bamfNotOk = bamf.filter(r => r.status !== 'ok');
if (bamfNotOk.length > 0) {
  console.log('Still not OK:');
  for (const r of bamfNotOk) {
    console.log(`  ${r.status} (HTTP ${r.http_status}) - ${r.url}`);
    if (r.page_title) console.log(`    title: ${r.page_title}`);
  }
}
