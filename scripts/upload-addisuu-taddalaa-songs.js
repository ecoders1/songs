/**
 * upload-addisuu-taddalaa-songs.js
 *
 * Uploads all 7 Addisuu Taddalaa audio files to Supabase Storage (audio bucket)
 * and inserts song records into the songs table.
 *
 * Source files: e:\songs\faarfannaa-app\supabase\Addisuu Taddalaa\
 * Storage path: Addisuu-Taddalaa/<filename>
 *
 * Run from the faarfannaa-app directory:
 *   node scripts/upload-addisuu-taddalaa-songs.js
 */

const fs    = require('fs');
const path  = require('path');
const https = require('https');
const { URL } = require('url');

// ── Load env vars from .env.local ─────────────────────────────────────────────
const envPath = path.join(__dirname, '..', '.env.local');
const envVars = fs.readFileSync(envPath, 'utf8')
  .split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .reduce((acc, line) => {
    const [key, ...rest] = line.split('=');
    acc[key.trim()] = rest.join('=').trim();
    return acc;
  }, {});

const SUPABASE_URL     = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const SERVICE_ROLE_KEY = envVars['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// ── Song definitions ──────────────────────────────────────────────────────────
const ARTIST_ID  = '00000000-0000-0000-0000-000000000013';
const SOURCE_DIR = path.join(__dirname, '..', 'supabase', 'Addisuu Taddalaa');

const SONGS = [
  { filename: 'A%T_Waami Yesus Haa Dhufani@.wav', title: 'Waami Yesus Haa Dhufani', track: 1, mime: 'audio/wav'  },
  { filename: 'Audio_016 (1).mp3',                title: 'Audio 016',               track: 2, mime: 'audio/mpeg' },
  { filename: 'Audio_033 (1).mp3',                title: 'Audio 033',               track: 3, mime: 'audio/mpeg' },
  { filename: 'Audio_040 (1).mp3',                title: 'Audio 040',               track: 4, mime: 'audio/mpeg' },
  { filename: 'JABADHA (1).mp3',                  title: 'Jabadha',                 track: 5, mime: 'audio/mpeg' },
  { filename: 'Kasikaasii_Ijake_Kasi_Namarra (1).mp3', title: 'Kasikaasii Ijake Kasi Namarra', track: 6, mime: 'audio/mpeg' },
  { filename: 'Wangellii_Kunii (1).mp3',          title: 'Wangellii Kunii',         track: 7, mime: 'audio/mpeg' },
];

// ── Sanitize a filename into a safe storage key ───────────────────────────────
function safeKey(filename) {
  return filename
    .replace(/%/g, '')   // remove %
    .replace(/@/g, '')   // remove @
    .replace(/\s+/g, '_'); // spaces → underscores
}

// ── Upload a file to Supabase Storage ────────────────────────────────────────
async function uploadFile(filePath, storagePath, mime) {
  const fileBuffer = fs.readFileSync(filePath);
  const urlStr     = `${SUPABASE_URL}/storage/v1/object/audio/${storagePath}`;
  const parsed = new URL(urlStr);

  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: parsed.hostname,
      path:     parsed.pathname,
      port:     443,
      method:   'POST',
      rejectUnauthorized: false,
      headers: {
        'Authorization':  `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type':   mime,
        'Content-Length': fileBuffer.length,
        'x-upsert':       'true',
      },
    };

    const req = https.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/audio/${storagePath}`;
          resolve(publicUrl);
        } else {
          reject(new Error(`Upload failed (${res.statusCode}): ${text}`));
        }
      });
    });
    req.on('error', reject);
    req.write(fileBuffer);
    req.end();
  });
}

// ── Insert song record into DB ────────────────────────────────────────────────
async function insertSong({ title, track, audio_url }) {
  const body = JSON.stringify({
    title,
    artist_id:    ARTIST_ID,
    audio_url,
    track_number: track,
    category:     'old',
    language:     'oromo',
  });

  return new Promise((resolve, reject) => {
    const parsed = new URL(`${SUPABASE_URL}/rest/v1/songs`);
    const reqOptions = {
      hostname: parsed.hostname,
      path:     parsed.pathname,
      port:     443,
      method:   'POST',
      rejectUnauthorized: false,
      headers: {
        'Authorization':  `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey':         SERVICE_ROLE_KEY,
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Prefer':         'return=minimal',
      },
    };

    const req = https.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`DB insert failed (${res.statusCode}): ${text}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Upload with retry ─────────────────────────────────────────────────────────
async function uploadWithRetry(filePath, storagePath, mime, retries = 3) {
  for (let i = 1; i <= retries; i++) {
    try {
      return await uploadFile(filePath, storagePath, mime);
    } catch (err) {
      if (i === retries) throw err;
      process.stdout.write(` ⟳retry${i}...`);
      await new Promise(r => setTimeout(r, 2000 * i));
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n🎵  Uploading ${SONGS.length} Addisuu Taddalaa songs to Supabase...\n`);

  let ok = 0, fail = 0;

  for (const song of SONGS) {
    const filePath    = path.join(SOURCE_DIR, song.filename);
    const storagePath = `Addisuu-Taddalaa/${safeKey(song.filename)}`;

    if (!fs.existsSync(filePath)) {
      console.error(`  ⚠️   File not found: ${song.filename} — skipping`);
      fail++;
      continue;
    }

    const sizeMB = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);
    process.stdout.write(`  ⬆️   [${song.track}/${SONGS.length}] ${song.title} (${sizeMB} MB)...`);

    try {
      const publicUrl = await uploadWithRetry(filePath, storagePath, song.mime);
      await insertSong({ title: song.title, track: song.track, audio_url: publicUrl });
      console.log(` ✅`);
      ok++;
    } catch (err) {
      console.log(` ❌`);
      console.error(`       ${err.message}`);
      fail++;
    }
  }

  console.log(`\n${ok === SONGS.length ? '✅' : '⚠️ '}  ${ok}/${SONGS.length} songs uploaded successfully.\n`);
  if (fail > 0) process.exit(1);
})();
