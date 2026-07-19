/**
 * remove-duplicate-songs.js
 *
 * Finds duplicate songs (same artist_id + title) and deletes all but the
 * earliest-created row for each group.
 *
 * Run from the faarfannaa-app directory:
 *   node scripts/remove-duplicate-songs.js
 */

const https = require('https');
const { URL } = require('url');
const fs   = require('fs');
const path = require('path');

// ── Load env vars ─────────────────────────────────────────────────────────────
const envPath = path.join(__dirname, '..', '.env.local');
const envVars = fs.readFileSync(envPath, 'utf8')
  .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
  .reduce((acc, line) => { const [k, ...v] = line.split('='); acc[k.trim()] = v.join('=').trim(); return acc; }, {});

const SUPABASE_URL     = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const SERVICE_ROLE_KEY = envVars['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) { console.error('❌  Missing env vars'); process.exit(1); }

function httpsRequest(urlStr, options, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const req = https.request({
      hostname: parsed.hostname, path: parsed.pathname + (parsed.search || ''),
      port: 443, method: options.method || 'GET', headers: options.headers || {},
      rejectUnauthorized: false,
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

(async () => {
  console.log('\n🔍  Fetching all songs from Supabase...\n');

  // Fetch all songs ordered by created_at ascending
  const res = await httpsRequest(
    `${SUPABASE_URL}/rest/v1/songs?select=id,title,artist_id,created_at&order=created_at.asc&limit=1000`,
    { method: 'GET', headers: { 'Authorization': `Bearer ${SERVICE_ROLE_KEY}`, 'apikey': SERVICE_ROLE_KEY } }
  );

  const songs = JSON.parse(res.body);
  if (!Array.isArray(songs)) { console.error('❌  Unexpected response:', res.body); process.exit(1); }

  console.log(`   Found ${songs.length} total song rows\n`);

  // Group by artist_id + title
  const seen  = new Map();  // key → first id (keep)
  const dupes = [];         // ids to delete

  for (const song of songs) {
    const key = `${song.artist_id}::${song.title.trim().toLowerCase()}`;
    if (seen.has(key)) {
      dupes.push(song.id);
    } else {
      seen.set(key, song.id);
    }
  }

  if (dupes.length === 0) {
    console.log('✅  No duplicates found — nothing to delete.\n');
    return;
  }

  console.log(`🗑️   Found ${dupes.length} duplicate rows to remove:\n`);

  let deleted = 0;
  for (const id of dupes) {
    const song = songs.find(s => s.id === id);
    process.stdout.write(`   Deleting "${song?.title}" (${id})...`);
    const delRes = await httpsRequest(
      `${SUPABASE_URL}/rest/v1/songs?id=eq.${id}`,
      { method: 'DELETE', headers: { 'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY, 'Prefer': 'return=minimal' } }
    );
    if (delRes.status >= 200 && delRes.status < 300) {
      console.log(' ✅'); deleted++;
    } else {
      console.log(` ❌ (${delRes.status}): ${delRes.body}`);
    }
  }

  console.log(`\n✅  Removed ${deleted}/${dupes.length} duplicate songs.\n`);
})();
