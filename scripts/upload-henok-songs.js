/**
 * upload-henok-songs.js
 *
 * Uploads all 10 Henok Tesfaye MP3 files to Supabase Storage (audio bucket)
 * and inserts song records into the songs table.
 * Skips songs already in the DB (dedup by artist_id + title).
 *
 * Run from the faarfannaa-app directory:
 *   node scripts/upload-henok-songs.js
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
const ARTIST_ID  = 'dfbfd99b-da0c-495d-8702-61049fab842f';
const SOURCE_DIR = path.join(__dirname, '..', 'supabase', 'Henok Tesfaye');

const SONGS = [
  { filename: 'DHEEBUUF BELUN .mp3',                          title: 'Dheebuuf Belun',                    track: 1  },
  { filename: 'Eeynutu_jabaataHenokT172.mp3',                 title: 'Eeynutu Jabaata',                   track: 2  },
  { filename: 'Henok 04.mp3',                                 title: 'Henok 04',                          track: 3  },
  { filename: 'Henok_Daimuma_KoS815.mp3',                    title: 'Daimuma Ko',                        track: 4  },
  { filename: 'Henok_Track_09 (1).mp3',                      title: 'Track 09',                          track: 5  },
  { filename: 'HIN JIRU YESUS KOO GUDDAN AKKA KEE.mp3',      title: 'Hin Jiru Yesus Koo Guddan Akka Kee',track: 6  },
  { filename: "Inni bu,aa hafuuri qulqulluun.mp3",           title: "Inni Bu'aa Hafuuri Qulqulluun",     track: 7  },
  { filename: 'Innin Manaa Baheef .mp3',                     title: 'Innin Manaa Baheef',                track: 8  },
  { filename: "Ka'ii Ka'ii(Olifen, Henok, Tigist & Gobane).mp3", title: "Ka'ii Ka'ii",                  track: 9  },
  { filename: 'NA BAATTE .mp3',                              title: 'Na Baatte',                         track: 10 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function safeKey(filename) {
  return filename
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[%@#&,'()]/g, '')
    .replace(/\s+/g, '_');
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
  console.log(`\n🎵  Uploading ${SONGS.length} Henok Tesfaye songs to Supabase...\n`);
  let ok = 0, skip = 0, fail = 0;

  for (const song of SONGS) {
    const filePath    = path.join(SOURCE_DIR, song.filename);
    const storagePath = `Henok-Tesfaye/${safeKey(song.filename)}`;

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
