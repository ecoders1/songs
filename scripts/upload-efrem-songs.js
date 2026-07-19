/**
 * upload-efrem-songs.js
 *
 * Uploads all 8 Efrem Mulgeta MP3 files to Supabase Storage (audio bucket)
 * and inserts song records into the songs table.
 * Skips songs already in the DB (dedup by artist_id + title).
 *
 * Run from the faarfannaa-app directory:
 *   node scripts/upload-efrem-songs.js
 */

const fs    = require('fs');
const path  = require('path');
const https = require('https');
const { URL } = require('url');

// ── Load env vars ─────────────────────────────────────────────────────────────
const envPath = path.join(__dirname, '..', '.env.local');
const envVars = fs.readFileSync(envPath, 'utf8')
  .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
  .reduce((acc, line) => { const [k, ...v] = line.split('='); acc[k.trim()] = v.join('=').trim(); return acc; }, {});

const SUPABASE_URL     = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const SERVICE_ROLE_KEY = envVars['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) { console.error('❌  Missing env vars'); process.exit(1); }

// ── Config ────────────────────────────────────────────────────────────────────
const ARTIST_ID  = '00000000-0000-0000-0000-000000000001';
const SOURCE_DIR = path.join(__dirname, '..', 'supabase', 'Efrem Mulgeta');

const SONGS = [
  { filename: 'Ati Anaaf Abdii Kooti አንቴ ለኔ ተስፋዬ ነው.mp3', title: 'Ati Anaaf Abdii Kooti',          track: 1 },
  { filename: 'Audio_010_001.mp3',                           title: 'Audio 010',                       track: 2 },
  { filename: 'Ephrem Mulgeta #1.mp3',                       title: 'Ephrem Mulgeta 1',                track: 3 },
  { filename: 'Ephrem Mulgeta,2.mp3',                        title: 'Ephrem Mulgeta 2',                track: 4 },
  { filename: 'Erga waamte lubbu ko.mp3',                    title: 'Erga Waamte Lubbu Ko',            track: 5 },
  { filename: 'Erga wamtee fayiftee.mp3',                    title: 'Erga Wamtee Fayiftee',            track: 6 },
  { filename: 'Gaayilloo_Eebbifamaadha.mp3',                 title: 'Gaayilloo Eebbifamaadha',         track: 7 },
  { filename: 'Hundumtu ni geeddarama.mp3',                  title: 'Hundumtu Ni Geeddarama',          track: 8 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function safeKey(filename) {
  return filename
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    // strip non-ASCII (Ethiopic script etc.)
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/[%@#&,'()]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');
}

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

async function existsInDB(title) {
  const res = await httpsRequest(
    `${SUPABASE_URL}/rest/v1/songs?artist_id=eq.${ARTIST_ID}&title=eq.${encodeURIComponent(title)}&select=id`,
    { method: 'GET', headers: { 'Authorization': `Bearer ${SERVICE_ROLE_KEY}`, 'apikey': SERVICE_ROLE_KEY } }
  );
  const rows = JSON.parse(res.body);
  return Array.isArray(rows) && rows.length > 0;
}

async function uploadFile(filePath, storagePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const parsed     = new URL(`${SUPABASE_URL}/storage/v1/object/audio/${storagePath}`);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: parsed.hostname, path: parsed.pathname, port: 443, method: 'POST',
      rejectUnauthorized: false,
      headers: { 'Authorization': `Bearer ${SERVICE_ROLE_KEY}`, 'Content-Type': 'audio/mpeg',
                 'Content-Length': fileBuffer.length, 'x-upsert': 'true' },
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300)
          resolve(`${SUPABASE_URL}/storage/v1/object/public/audio/${storagePath}`);
        else reject(new Error(`Upload failed (${res.statusCode}): ${Buffer.concat(chunks).toString()}`));
      });
    });
    req.on('error', reject);
    req.write(fileBuffer);
    req.end();
  });
}

async function uploadWithRetry(filePath, storagePath, retries = 3) {
  for (let i = 1; i <= retries; i++) {
    try { return await uploadFile(filePath, storagePath); }
    catch (err) {
      if (i === retries) throw err;
      process.stdout.write(` ⟳retry${i}...`);
      await new Promise(r => setTimeout(r, 2000 * i));
    }
  }
}

async function insertSong({ title, track, audio_url }) {
  const body = JSON.stringify({ title, artist_id: ARTIST_ID, audio_url,
    track_number: track, category: 'single', language: 'oromo' });
  const res = await httpsRequest(`${SUPABASE_URL}/rest/v1/songs`,
    { method: 'POST', headers: { 'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY, 'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body), 'Prefer': 'return=minimal' } }, body);
  if (res.status < 200 || res.status >= 300) throw new Error(`DB insert failed (${res.status}): ${res.body}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n🎵  Uploading ${SONGS.length} Efrem Mulgeta songs to Supabase...\n`);
  let ok = 0, skip = 0, fail = 0;

  for (const song of SONGS) {
    const filePath    = path.join(SOURCE_DIR, song.filename);
    const storagePath = `Efrem-Mulgeta/${safeKey(song.filename)}`;

    if (!fs.existsSync(filePath)) {
      console.error(`  ⚠️   File not found: ${song.filename} — skipping`); fail++; continue;
    }

    // Dedup check
    if (await existsInDB(song.title)) {
      console.log(`  ⏭️   [${song.track}/${SONGS.length}] ${song.title} — already in DB, skipping`);
      skip++; continue;
    }

    const sizeMB = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);
    process.stdout.write(`  ⬆️   [${song.track}/${SONGS.length}] ${song.title} (${sizeMB} MB)...`);

    try {
      const publicUrl = await uploadWithRetry(filePath, storagePath);
      await insertSong({ title: song.title, track: song.track, audio_url: publicUrl });
      console.log(' ✅'); ok++;
    } catch (err) {
      console.log(' ❌'); console.error(`       ${err.message}`); fail++;
    }
  }

  console.log(`\n✅  ${ok} uploaded, ⏭️  ${skip} skipped (already exist), ❌ ${fail} failed\n`);
  if (fail > 0) process.exit(1);
})();
