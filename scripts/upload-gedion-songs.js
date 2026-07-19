/**
 * upload-gedion-songs.js
 *
 * Uploads the 8 Gedion Dabalaa MP3 files to Supabase Storage (audio bucket)
 * and inserts song records into the songs table.
 *
 * Run from the faarfannaa-app directory:
 *   node scripts/upload-gedion-songs.js
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
const ARTIST_ID   = '00000000-0000-0000-0000-000000000003';
const SUPABASE_DIR = path.join(__dirname, '..', 'supabase');

const SONGS = [
  { filename: 'Far_Gedion_Dabala_Burqaa_kooW_Er_D_Doolloo_+251_925_50_95_69_.mp3',   title: 'Burqaa Koo',          track: 1 },
  { filename: 'Far_Gedion_Dabala_itti_hi_baacinaa_W_Er_D_Doolloo_+251_925_50_95.mp3', title: 'Itti Hibaacinaa',     track: 2 },
  { filename: 'Far_Gedion_Dabala_Jiraachuu_koof_W_Er_D_Doolloo_+251_925_50_95_69.mp3',title: 'Jiraachuu Koof',      track: 3 },
  { filename: 'Far_Gedion_Dabalaa_Kan_akkasaa_W_Er_D_Doolloo_+251_925_50_95_69_.mp3', title: 'Kan Akkasaa',         track: 4 },
  { filename: 'Far_Gedion_Dabalaa_kan_sidhibu_W_Er_D_Doolloo_+251_925_50_95_69_.mp3', title: 'Kan Sidhibu',         track: 5 },
  { filename: 'Far_Gedion_Dabalaa_Madda_fayyina_koo_W_Er_D_Doolloo_+251_925_50.mp3',  title: 'Madda Fayyina Koo',   track: 6 },
  { filename: 'Far_Gedion_Dabalaa_Nabeekta_uumaako_W_Er_D_Doolloo_+251_925_50_95.mp3',title: 'Na Beekta Uumaa Koo', track: 7 },
  { filename: 'Far.Gedion Dabalaa.Tsiyoon.W.Er.D.Doolloo +251 925 50 95 69..mp3',     title: 'Tsiyoon',             track: 8 },
];

// ── HTTPS helper ──────────────────────────────────────────────────────────────
function httpsRequest(urlStr, options, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const reqOptions = {
      hostname: parsed.hostname,
      path:     parsed.pathname + (parsed.search || ''),
      port:     443,
      method:   options.method || 'GET',
      headers:  options.headers || {},
      rejectUnauthorized: false,
    };
    if (body) reqOptions.headers['Content-Length'] = Buffer.byteLength(body);

    const req = https.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ── Upload a file to Supabase Storage ────────────────────────────────────────
async function uploadFile(filePath, storagePath) {
  const fileBuffer  = fs.readFileSync(filePath);
  const urlStr      = `${SUPABASE_URL}/storage/v1/object/audio/${storagePath}`;
  const parsed      = new URL(urlStr);

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
    category:     'new',
    language:     'oromo',
  });

  const result = await httpsRequest(
    `${SUPABASE_URL}/rest/v1/songs`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey':        SERVICE_ROLE_KEY,
        'Content-Type':  'application/json',
        'Prefer':        'return=minimal',
      },
    },
    body
  );

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`DB insert failed (${result.status}): ${result.body}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n🎵  Uploading ${SONGS.length} Gedion Dabalaa songs to Supabase...\n`);

  let ok = 0, fail = 0;

  for (const song of SONGS) {
    const filePath    = path.join(SUPABASE_DIR, song.filename);
    const storagePath = `gedion-dabalaa/${song.filename.replace(/ /g, '_')}`;

    if (!fs.existsSync(filePath)) {
      console.error(`  ⚠️   File not found: ${song.filename} — skipping`);
      fail++;
      continue;
    }

    const sizeMB = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);
    process.stdout.write(`  ⬆️   [${song.track}/8] ${song.title} (${sizeMB} MB)...`);

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
