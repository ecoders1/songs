/**
 * upload-didha-songs.js
 * Uploads all Didha Benya audio files to Supabase Storage and inserts song records.
 * Run: node --use-system-ca scripts/upload-didha-songs.js
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

// ── Didha Benya artist ID from schema.sql ─────────────────────────────────────
const ARTIST_ID  = '00000000-0000-0000-0000-000000000011';
const AUDIO_DIR  = path.join(__dirname, '..', 'supabase', 'didha benya');

// All 15 files — track names derived from file names
const SONGS = [
  { filename: 'track 1.mp3',       title: 'Track 1',      track: 1  },
  { filename: 'track 2.mp3',       title: 'Track 2',      track: 2  },
  { filename: 'track 3.mp3',       title: 'Track 3',      track: 3  },
  { filename: 'track 4.mp3',       title: 'Track 4',      track: 4  },
  { filename: 'track 5.mp3',       title: 'Track 5',      track: 5  },
  { filename: 'track 6.mp3',       title: 'Track 6',      track: 6  },
  { filename: 'track 7.mp3',       title: 'Track 7',      track: 7  },
  { filename: 'track 8.mp3',       title: 'Track 8',      track: 8  },
  { filename: 'track 9.mp3',       title: 'Track 9',      track: 9  },
  { filename: 'track 10.mp3',      title: 'Track 10',     track: 10 },
  { filename: 'track 11.mp3',      title: 'Track 11',     track: 11 },
  { filename: 'DHUGUMA (1).MP3',   title: 'Dhuguma',      track: 12 },
  { filename: 'HIN.mp3',           title: 'Hin',          track: 13 },
  { filename: 'Wamika.wav',        title: 'Wamika',       track: 14 },
  { filename: 'YAA QULQULLU.MP3',  title: 'Yaa Qulqullu', track: 15 },
];

// ── HTTPS helpers ─────────────────────────────────────────────────────────────
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

function mimeFor(filename) {
  if (filename.toLowerCase().endsWith('.wav')) return 'audio/wav';
  return 'audio/mpeg';
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
  console.log(`\n🎵  Uploading ${SONGS.length} Didha Benya songs to Supabase...\n`);
  let ok = 0, fail = 0;

  for (const song of SONGS) {
    const filePath    = path.join(AUDIO_DIR, song.filename);
    const storagePath = `didha-benya/${song.filename.replace(/ /g, '_')}`;
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
