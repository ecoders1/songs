/**
 * upload-lookoo-songs.js
 *
 * Uploads all 10 Lookoo MP3 files to Supabase Storage (audio bucket)
 * and inserts song records into the songs table.
 *
 * Source files: e:\songs\faarfannaa-app\supabase\Lookoo\
 * Storage path: Lookoo/<filename>
 *
 * Run from the faarfannaa-app directory:
 *   node scripts/upload-lookoo-songs.js
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
const ARTIST_ID  = '00000000-0000-0000-0000-000000000015';
const SOURCE_DIR = path.join(__dirname, '..', 'supabase', 'Lookoo');

const SONGS = [
  { filename: '04_ Loko__Nuuf_keeni_jalala.mp3',    title: 'Nuuf Keeni Jalala',    track: 1  },
  { filename: '05_Loko__Iyyesusittii_Deebiaa.mp3',  title: 'Iyyesusittii Deebiaa', track: 2  },
  { filename: '06_Loko__Addee_qada_Waaqa.mp3',      title: 'Addee Qada Waaqa',     track: 3  },
  { filename: '07_Loko__Barri_kiyyaa.mp3',          title: 'Barri Kiyyaa',         track: 4  },
  { filename: '08_Loko__iyyesuus_malee.mp3',        title: 'Iyyesuus Malee',       track: 5  },
  { filename: '09_Loko__Eebba_tiyya.mp3',           title: 'Eebba Tiyya',          track: 6  },
  { filename: '10_Loko__Durreesa_waaqii.mp3',       title: 'Durreesa Waaqii',      track: 7  },
  { filename: '11_Loko__Yesuus_Maleyyu.mp3',        title: 'Yesuus Maleyyu',       track: 8  },
  { filename: '12_Loko__Hi_Waaqonfama.mp3',         title: 'Hi Waaqonfama',        track: 9  },
  { filename: '13_Loko__Atumma_Nugargari.mp3',      title: 'Atumma Nugargari',     track: 10 },
];

// ── Upload a file to Supabase Storage ────────────────────────────────────────
async function uploadFile(filePath, storagePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const urlStr     = `${SUPABASE_URL}/storage/v1/object/audio/${storagePath}`;
  const parsed     = new URL(urlStr);

  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: parsed.hostname,
      path:     parsed.pathname,
      port:     443,
      method:   'POST',
      rejectUnauthorized: false,
      headers: {
        'Authorization':  `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type':   'audio/mpeg',
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

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n🎵  Uploading ${SONGS.length} Lookoo songs to Supabase...\n`);

  let ok = 0, fail = 0;

  for (const song of SONGS) {
    const filePath    = path.join(SOURCE_DIR, song.filename);
    const storagePath = `Lookoo/${song.filename}`;

    if (!fs.existsSync(filePath)) {
      console.error(`  ⚠️   File not found: ${song.filename} — skipping`);
      fail++;
      continue;
    }

    const sizeMB = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);
    process.stdout.write(`  ⬆️   [${song.track}/${SONGS.length}] ${song.title} (${sizeMB} MB)...`);

    try {
      const publicUrl = await uploadFile(filePath, storagePath);
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
