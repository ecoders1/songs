/**
 * upload-ashu-adola-songs.js
 *
 * Uploads all 14 Ashu Adola MP3 files to Supabase Storage (audio bucket)
 * and inserts song records into the songs table.
 *
 * Source files: E:\songs\Apostolic songs\Afaan oromoo\Ashu Adola\
 * Storage path: Ashu Adolaa/<filename>
 *
 * Run from the faarfannaa-app directory:
 *   node scripts/upload-ashu-adola-songs.js
 */

const fs   = require('fs');
const path = require('path');
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
const ARTIST_ID  = '00000000-0000-0000-0000-000000000014';
const SOURCE_DIR = path.join(__dirname, '..', 'supabase', 'Ashu Adola');

const SONGS = [
  { filename: '01 Track 1.mp3',  title: 'Track 1',  track: 1  },
  { filename: '02 Track 2.mp3',  title: 'Track 2',  track: 2  },
  { filename: '03 Track 3.mp3',  title: 'Track 3',  track: 3  },
  { filename: '04 Track 4.mp3',  title: 'Track 4',  track: 4  },
  { filename: '05 Track 5.mp3',  title: 'Track 5',  track: 5  },
  { filename: '06 Track 6.mp3',  title: 'Track 6',  track: 6  },
  { filename: '07 Track 7.mp3',  title: 'Track 7',  track: 7  },
  { filename: '08 Track 8.mp3',  title: 'Track 8',  track: 8  },
  { filename: '09 Track 9.mp3',  title: 'Track 9',  track: 9  },
  { filename: '10 Track 10.mp3', title: 'Track 10', track: 10 },
  { filename: '11 Track 11.mp3', title: 'Track 11', track: 11 },
  { filename: '12 Track 12.mp3', title: 'Track 12', track: 12 },
  { filename: '13 Track 13.mp3', title: 'Track 13', track: 13 },
  { filename: 'Assu (9).mp3',    title: 'Assu',     track: 14 },
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
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey':        SERVICE_ROLE_KEY,
        'Content-Type':  'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Prefer':        'return=minimal',
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
  console.log(`\n🎵  Uploading ${SONGS.length} Ashu Adola songs to Supabase...\n`);

  let ok = 0, fail = 0;

  for (const song of SONGS) {
    const filePath    = path.join(SOURCE_DIR, song.filename);
    const storagePath = `Ashu Adolaa/${song.filename.replace(/ /g, '_')}`;

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
