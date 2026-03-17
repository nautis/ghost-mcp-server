#!/usr/bin/env node
/**
 * Find Watches in Film Stills
 *
 * Pipeline:
 *   1. Discover live-action films from TMDB (popular, top rated, by genre)
 *   2. Fetch stills (backdrops) for each film
 *   3. Two-pass Claude Sonnet Vision: scan → verify
 *   4. Download only confirmed watch images (original resolution)
 *
 * Usage:
 *   TMDB_API_KEY=... ANTHROPIC_API_KEY=... node find-watches-in-stills.mjs
 *
 * Options (env vars):
 *   TARGET_STILLS=5000   Total stills to scan (default: 5000)
 *   STILLS_PER_FILM=30   Max stills per film (default: 30)
 *   CONCURRENCY=3        Parallel Claude Vision calls (default: 3)
 *   OUTPUT_DIR=./watch-stills   Where to save hits (default: ./watch-stills)
 *   RESUME=1             Resume from existing manifest (default: 0)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Configuration ---
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const TARGET_STILLS = parseInt(process.env.TARGET_STILLS || '5000', 10);
const STILLS_PER_FILM = parseInt(process.env.STILLS_PER_FILM || '30', 10);
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '3', 10);
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(__dirname, 'watch-stills');
const RESUME = process.env.RESUME === '1';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/';

// TMDB genre ID for Animation
const ANIMATION_GENRE_ID = 16;

if (!TMDB_API_KEY) { console.error('ERROR: TMDB_API_KEY is required'); process.exit(1); }
if (!ANTHROPIC_API_KEY) { console.error('ERROR: ANTHROPIC_API_KEY is required'); process.exit(1); }

// --- TMDB API ---
async function tmdbFetch(endpoint) {
  const url = `https://api.themoviedb.org/3${endpoint}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${TMDB_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${await res.text()}`);
  return res.json();
}

/**
 * Discover live-action films from TMDB across multiple sources.
 * Yields films one at a time, skipping animation.
 */
async function* discoverFilms() {
  const seen = new Set();

  // Source 1: Popular movies (pages 1-20)
  for (let page = 1; page <= 20; page++) {
    const data = await tmdbFetch(`/movie/popular?page=${page}&language=en-US`);
    for (const m of data.results || []) {
      if (seen.has(m.id)) continue;
      if ((m.genre_ids || []).includes(ANIMATION_GENRE_ID)) continue;
      seen.add(m.id);
      yield { tmdb_id: m.id, title: m.title, year: (m.release_date || '').slice(0, 4) };
    }
  }

  // Source 2: Top rated (pages 1-20)
  for (let page = 1; page <= 20; page++) {
    const data = await tmdbFetch(`/movie/top_rated?page=${page}&language=en-US`);
    for (const m of data.results || []) {
      if (seen.has(m.id)) continue;
      if ((m.genre_ids || []).includes(ANIMATION_GENRE_ID)) continue;
      seen.add(m.id);
      yield { tmdb_id: m.id, title: m.title, year: (m.release_date || '').slice(0, 4) };
    }
  }

  // Source 3: Discover by genre — action, thriller, crime, drama, sci-fi
  const genres = [28, 53, 80, 18, 878];
  for (const genre of genres) {
    for (let page = 1; page <= 10; page++) {
      const data = await tmdbFetch(`/discover/movie?with_genres=${genre}&without_genres=${ANIMATION_GENRE_ID}&sort_by=popularity.desc&page=${page}&language=en-US`);
      for (const m of data.results || []) {
        if (seen.has(m.id)) continue;
        seen.add(m.id);
        yield { tmdb_id: m.id, title: m.title, year: (m.release_date || '').slice(0, 4) };
      }
    }
  }
}

async function getFilmCast(tmdbId) {
  try {
    const data = await tmdbFetch(`/movie/${tmdbId}/credits`);
    return (data.cast || []).slice(0, 15).map(c => c.name);
  } catch (e) {
    return [];
  }
}

async function getFilmStills(tmdbId) {
  const data = await tmdbFetch(`/movie/${tmdbId}/images`);
  const backdrops = (data.backdrops || [])
    .filter(img => !img.iso_639_1 || img.iso_639_1 === 'en')
    .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
    .slice(0, STILLS_PER_FILM);

  return backdrops.map(img => ({
    file_path: img.file_path,
    url_w1280: `${TMDB_IMAGE_BASE}w1280${img.file_path}`,
    url_original: `${TMDB_IMAGE_BASE}original${img.file_path}`,
    width: img.width,
    height: img.height,
    vote_average: img.vote_average,
  }));
}

// --- Claude Vision API ---
async function callClaude(model, imageUrl, prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: imageUrl } },
          { type: 'text', text: prompt },
        ],
      }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text || '';

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch (e) { /* fall through */ }

  return null;
}

const SCAN_PROMPT = `Examine this film still carefully.

Is there a WRISTWATCH clearly visible on someone's wrist in this image?

IMPORTANT — Be extremely conservative. You must follow these rules:
- Only answer true if you can literally SEE a watch face, band, or case on a person's wrist
- Bracelets, bangles, fitness bands, and cuffs are NOT watches
- A dark smudge or shadow on a wrist is NOT a watch — you need to see actual watch features
- If the wrist is too far away, blurry, or obscured to confirm it's a watch, answer false
- When in doubt, answer false
- Do NOT infer a watch exists based on the movie or character — only what is VISIBLE in this specific image

Respond with JSON ONLY (no markdown, no explanation outside the JSON):
{
  "watch_visible": true/false,
  "description": "What exactly do you see that made you say true/false? Be specific about the visual evidence."
}`;

function buildVerifyPrompt(castNames) {
  const castHint = castNames.length > 0
    ? `\n\nThe cast of this film includes: ${castNames.join(', ')}. Use this to help identify the actor wearing the watch, but ONLY if you can visually match a face.`
    : '';

  return `You are verifying whether a wristwatch is genuinely visible in this film still.

A previous scan flagged this image as containing a visible wristwatch. Your job is to CONFIRM or REJECT that finding.

Look very carefully. Is there ACTUALLY a wristwatch on someone's wrist?

Rules:
- You must be able to see at least TWO of: watch face/dial, watch case, watch band/strap, crown/buttons
- The object must clearly be ON a human wrist (not on a table, not in a box, not a clock on a wall)
- Bracelets, cuffs, bangles, hair ties, and shadows are NOT watches
- If you're less than 80% sure, say false
- Describe EXACTLY what you see that confirms or denies this is a watch
- Identify the actor wearing the watch if you can recognize them${castHint}

Respond with JSON ONLY:
{
  "watch_confirmed": true/false,
  "confidence": "high"/"medium",
  "actor_name": "Name of the actor wearing the watch, or null if unrecognizable",
  "description": "Exactly what visual evidence confirms or denies a watch — be specific about what you see on the wrist",
  "close_enough_to_identify": true/false,
  "watch_details": "If confirmed: any details about the watch — color, size, band type, dial shape, any visible markings. If not confirmed: null"
}`;
}

async function analyzeImageForWatch(imageUrl, castNames) {
  // Pass 1: Sonnet scan
  const scan = await callClaude('claude-sonnet-4-6', imageUrl, SCAN_PROMPT);
  if (!scan || !scan.watch_visible) {
    return { watch_visible: false, description: scan?.description || 'No watch detected', pass: 'scan' };
  }

  // Pass 2: Sonnet verify (with cast info for actor ID)
  const verify = await callClaude('claude-sonnet-4-6', imageUrl, buildVerifyPrompt(castNames));
  if (!verify || !verify.watch_confirmed) {
    return {
      watch_visible: false,
      description: `Scan said yes: "${scan.description}" — Verify said no: "${verify?.description || 'unknown'}"`,
      pass: 'verify_rejected',
    };
  }

  return {
    watch_visible: true,
    confidence: verify.confidence,
    actor_name: verify.actor_name || null,
    description: verify.description,
    close_enough_to_identify: verify.close_enough_to_identify || false,
    watch_details: verify.watch_details || null,
    pass: 'confirmed',
  };
}

// --- Parallel execution with concurrency limit ---
async function parallelMap(items, fn, concurrency) {
  const results = [];
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

// --- Download image ---
async function downloadImage(url, filepath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filepath, buffer);
  return buffer.length;
}

// --- Main ---
async function main() {
  console.log('=== Watch Finder in Film Stills ===');
  console.log(`Target stills: ${TARGET_STILLS}`);
  console.log(`Stills per film: ${STILLS_PER_FILM}`);
  console.log(`Concurrency: ${CONCURRENCY}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Resume: ${RESUME}\n`);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Load existing manifest if resuming
  const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
  let allHits = [];
  const scannedFilms = new Set();

  if (RESUME && fs.existsSync(manifestPath)) {
    allHits = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    // Track already-scanned films by tmdb_id
    for (const hit of allHits) scannedFilms.add(hit.tmdb_id);
    console.log(`Resuming: ${allHits.length} existing hits from ${scannedFilms.size} films\n`);
  }

  let totalScanned = 0;
  let totalHits = allHits.length;
  let filmsScanned = scannedFilms.size;
  let totalRejected = 0;
  const startTime = Date.now();

  for await (const film of discoverFilms()) {
    if (totalScanned >= TARGET_STILLS) break;
    if (scannedFilms.has(film.tmdb_id)) continue;

    filmsScanned++;
    scannedFilms.add(film.tmdb_id);

    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log(`\n[${totalScanned}/${TARGET_STILLS} stills, ${elapsed}min] --- ${film.title} (${film.year}) [TMDB#${film.tmdb_id}] ---`);

    let stills, castNames;
    try {
      [stills, castNames] = await Promise.all([
        getFilmStills(film.tmdb_id),
        getFilmCast(film.tmdb_id),
      ]);
    } catch (err) {
      console.log(`  ERROR fetching stills: ${err.message}`);
      continue;
    }

    if (stills.length === 0) {
      console.log(`  No stills available, skipping`);
      continue;
    }

    // Cap to not exceed target
    const remaining = TARGET_STILLS - totalScanned;
    const batch = stills.slice(0, Math.min(stills.length, remaining));
    console.log(`  Analyzing ${batch.length} stills (cast: ${castNames.slice(0, 5).join(', ')}${castNames.length > 5 ? '...' : ''})...`);

    const results = await parallelMap(
      batch,
      async (still, idx) => {
        totalScanned++;
        const num = `${idx + 1}/${batch.length}`;
        try {
          const result = await analyzeImageForWatch(still.url_original, castNames);
          if (result.watch_visible) {
            const actor = result.actor_name || 'Unknown actor';
            console.log(`  ✅ [${num}] ${actor} — ${result.watch_details?.slice(0, 80) || result.description?.slice(0, 80) || ''}`);
          } else if (result.pass === 'verify_rejected') {
            totalRejected++;
            console.log(`  ❌ [${num}] REJECTED by verify`);
          } else {
            // no watch — silent for cleaner output at scale
          }
          return { still, result };
        } catch (err) {
          console.log(`  ✗  [${num}] ERROR: ${err.message.slice(0, 80)}`);
          return { still, result: { watch_visible: false, error: err.message } };
        }
      },
      CONCURRENCY,
    );

    // Collect and download hits
    const hits = results.filter(r => r.result.watch_visible);
    if (hits.length > 0) {
      console.log(`  → ${hits.length} watch(es) confirmed`);
    }

    // Track duplicate actor+film combos for numbering
    const actorCounts = {};

    for (const hit of hits) {
      const actor = hit.result.actor_name;
      if (!actor || actor === 'Unknown' || actor.toLowerCase() === 'unknown') {
        console.log(`  ⏭  Skipping — actor not identified`);
        continue;
      }
      totalHits++;
      const key = `${actor}_${film.title}_${film.year}`;
      actorCounts[key] = (actorCounts[key] || 0) + 1;
      const suffix = actorCounts[key] > 1 ? ` ${actorCounts[key]}` : '';

      const filename = `${actor} in ${film.title} (${film.year})${suffix}.jpg`
        .replace(/[/:*?"<>|]/g, ''); // strip filesystem-unsafe chars
      const filepath = path.join(OUTPUT_DIR, filename);

      try {
        const bytes = await downloadImage(hit.still.url_original, filepath);
        const mb = (bytes / 1024 / 1024).toFixed(1);
        console.log(`  ↓ ${filename} (${mb} MB)`);
      } catch (err) {
        console.log(`  ✗ Download failed: ${err.message}`);
      }

      allHits.push({
        actor: hit.result.actor_name || null,
        film: film.title,
        year: film.year,
        tmdb_id: film.tmdb_id,
        image_url: hit.still.url_original,
        dimensions: `${hit.still.width}x${hit.still.height}`,
        local_file: filename,
        analysis: hit.result,
      });
    }

    // Save manifest incrementally (every film) so we can resume
    fs.writeFileSync(manifestPath, JSON.stringify(allHits, null, 2));

    // Rate limit: small delay between films for TMDB
    await new Promise(r => setTimeout(r, 300));
  }

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  console.log('\n=== Summary ===');
  console.log(`Time: ${elapsed} minutes`);
  console.log(`Films scanned: ${filmsScanned}`);
  console.log(`Stills analyzed: ${totalScanned}`);
  console.log(`Watches confirmed: ${totalHits}`);
  console.log(`Rejected by verify: ${totalRejected}`);
  console.log(`Hit rate: ${totalScanned > 0 ? ((totalHits / totalScanned) * 100).toFixed(1) : 0}%`);
  console.log(`Results: ${OUTPUT_DIR}/`);
  console.log(`Manifest: ${manifestPath}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
