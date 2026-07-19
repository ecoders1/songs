/**
 * upload-bishop-songs.js
 * Uploads all Bishop Kumesa audio files to Supabase Storage and inserts song records.
 * Run: node --use-system-ca scripts/upload-bishop-songs.js
 */

const fs    = require('fs');
const path  = require('path');
const https = require('https');
const { URL } = require('url');

// ── Env vars ──────────────────────────────────────────────────────────────────
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
  console.error('❌  Missing env vars'); process.exit(1);
}

// ── Bishop Kumesa artist ID from schema.sql ───────────────────────────────────
const ARTIST_ID = '00000000-0000-0000-0000-000000000012';
const AUDIO_DIR = path.join(__dirname, '..', 'supabase', 'Bishop Kumesa');

const SONGS = [
  { filename: 'track 1.mp3',   title: 'Track 1',        track: 1,  storeName: 'track_1.mp3'        },
  { filename: 'track 2.mp3',   title: 'Track 2',        track: 2,  storeName: 'track_2.mp3'        },
  { filename: 'track 3.mp3',   title: 'Track 3',        track: 3,  storeName: 'track_3.mp3'        },
  { filename: 'track 4.mp3',   title: 'Track 4',        track: 4,  storeName: 'track_4.mp3'        },
  { filename: 'track 5.mp3',   title: 'Track 5',        track: 5,  storeName: 'track_5.mp3'        },
  { filename: 'track 6.mp3',   title: 'Track 6',        track: 6,  storeName: 'track_6.mp3'        },
  { filename: 'ቢር መዱማ.mp3',   title: 'Birr Meduma',    track: 7,  storeName: 'birr_meduma.mp3'    },
  { filename: 'ባዬዳ.mp3',       title: 'Bayeda',         track: 8,  storeName: 'bayeda.mp3'         },
  { filename: 'አኖ.mp3',         title: 'Ano',            track: 9,  storeName: 'ano.mp3'            },
  { filename: 'ፋዪሳኮ.mp3',      title: 'Fayisako',       track: 10, storeName: 'fayisako.mp3'       },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function mimeFor(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (ext === 'wav')  return 'audio/wav';
  if (ext === 'm4a')  return 'audio/m4a';
  if (ext === 'aac')  return 'audio/aac';
  if (ext === 'ogg')  return 'audio/ogg';
  if (ext === 'flac') return 'audio/flac';
  return 'audio/mpeg';
}

function safeName(filename) {
  // Replace spaces and keep Unicode chars — Supabase handles UTF-8 paths fine
  return filename.replace(/ /g, '_');
}

function httpsRequest(urlStr, options, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const opts = {
      hostname: parsed.hostname,
      path:     parsed.pathname + (parsed.search || ''),
      port:     443,
      method:   options.method || 'GET',
      headers:  options.headers || {},
      rejectUnauthorized: false,
    };
    if (body) opts.headers['Content-Length'] = Buffer.byteLength(body);
    const req = https.request(opts, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function uploadFile(filePath, storagePath, mime) {
  const fileBuffer = fs.readFileSync(filePath);
  const parsed     = new URL(`${SUPABASE_URL}/storage/v1/object/audio/${storagePath}`);

  return new Promise((resolve, reject) => {
    const opts = {
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
    const req = https.request(opts, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(`${SUPABASE_URL}/storage/v1/object/public/audio/${storagePath}`);
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

async function insertSong({ title, track, audio_url }) {
  const body = JSON.stringify({
    title,
    artist_id:    ARTIST_ID,
    audio_url,
    track_number: track,
    category:     'single',
    language:     'oromo',
  });
  const r = await httpsRequest(`${SUPABASE_URL}/rest/v1/songs`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey':        SERVICE_ROLE_KEY,
      'Content-Type':  'application/json',
      'Prefer':        'return=minimal',
    },
  }, body);
  if (r.status < 200 || r.status >= 300)
    throw new Error(`DB insert failed (${r.status}): ${r.body}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n🎵  Uploading ${SONGS.length} Bishop Kumesa songs to Supabase...\n`);
  let ok = 0, fail = 0;

  for (const song of SONGS) {
    const filePath    = path.join(AUDIO_DIR, song.filename);
    const storagePath = `bishop-kumesa/${song.storeName}`;
    const mime        = mimeFor(song.filename);

    if (!fs.existsSync(filePath)) {
      console.error(`  ⚠️   Not found: ${song.filename} — skipping`);
      fail++; continue;
    }

    const sizeMB = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);
    process.stdout.write(`  ⬆️   [${song.track}/${SONGS.length}] ${song.title} (${sizeMB} MB)...`);

    try {
      const publicUrl = await uploadFile(filePath, storagePath, mime);
      await insertSong({ title: song.title, track: song.track, audio_url: publicUrl });
      console.log(' ✅');
      ok++;
    } catch (err) {
      console.log(' ❌');
      console.error(`       ${err.message}`);
      fail++;
    }
  }

  console.log(`\n${ok === SONGS.length ? '✅' : '⚠️ '}  ${ok}/${SONGS.length} songs uploaded.\n`);
  if (fail > 0) process.exit(1);
})();
