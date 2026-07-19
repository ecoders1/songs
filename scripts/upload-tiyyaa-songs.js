/**
 * upload-tiyyaa-songs.js
 * Uploads all Tiyyaa Abbabaa audio files to Supabase Storage and inserts song records.
 * Run: node --use-system-ca scripts/upload-tiyyaa-songs.js
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

// ── Tiyyaa Abbabaa artist ID from schema.sql ──────────────────────────────────
const ARTIST_ID = '00000000-0000-0000-0000-000000000010';
const AUDIO_DIR = path.join(__dirname, '..', 'supabase', 'Tiyyaa Abbabaa');

const SONGS = [
  { filename: 'galata.aac',                       title: 'Galata',                   track: 1  },
  { filename: 'hin dhaamin ibsaan ko.aac',         title: 'Hin Dhaamin Ibsaa Koo',    track: 2  },
  { filename: 'jabaatee.aac',                      title: 'Jabaatee',                 track: 3  },
  { filename: 'siif jiraachuun .aac',              title: 'Siif Jiraachuun',          track: 4  },
  { filename: 'wangeela abboonni koo itti.aac',    title: 'Wangeela Abboonni Koo',    track: 5  },
  { filename: 'Uumamni hundinuu.m4a',              title: 'Uumamni Hundinuu',         track: 6  },
  { filename: 'waldaan ergamootaa.mp3',            title: 'Waldaan Ergamootaa',       track: 7  },
  { filename: '20260410_165141.aac',               title: 'Faarfannaa 8',             track: 8  },
  { filename: '20260410_165141 (1).aac',           title: 'Faarfannaa 9',             track: 9  },
];

// ── HTTPS helpers ─────────────────────────────────────────────────────────────
function mimeFor(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (ext === 'wav')  return 'audio/wav';
  if (ext === 'm4a')  return 'audio/m4a';
  if (ext === 'aac')  return 'audio/aac';
  return 'audio/mpeg';
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
    category:     'new',
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
  console.log(`\n🎵  Uploading ${SONGS.length} Tiyyaa Abbabaa songs to Supabase...\n`);
  let ok = 0, fail = 0;

  for (const song of SONGS) {
    const filePath    = path.join(AUDIO_DIR, song.filename);
    const storagePath = `tiyyaa-abbabaa/${song.filename.replace(/ /g, '_')}`;
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
