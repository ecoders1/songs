/**
 * upload-asaafa-culuuqqe-songs.js
 * Uploads 13 Asaafa Culuuqqe MP3s to Supabase Storage and inserts song rows.
 * Also uploads the artist cover image.
 * Run: node scripts/upload-asaafa-culuuqqe-songs.js
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');

const envVars = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8')
  .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
  .reduce((a, l) => { const [k, ...v] = l.split('='); a[k.trim()] = v.join('=').trim(); return a; }, {});

const SUPABASE_URL     = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const SERVICE_ROLE_KEY = envVars['SUPABASE_SERVICE_ROLE_KEY'];
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) { console.error('❌  Missing env vars'); process.exit(1); }

const ARTIST_ID  = '83d3ace2-6f62-4240-bd73-8bfe6b04231f';
const SOURCE_DIR = path.join(__dirname, '..', 'supabase', 'Asaafa Culuuqqe');

const SONGS = [
  { filename: '2.mp3',  title: 'Track 2',  track: 1  },
  { filename: '3.mp3',  title: 'Track 3',  track: 2  },
  { filename: '4.mp3',  title: 'Track 4',  track: 3  },
  { filename: '5.mp3',  title: 'Track 5',  track: 4  },
  { filename: '6.mp3',  title: 'Track 6',  track: 5  },
  { filename: '7.mp3',  title: 'Track 7',  track: 6  },
  { filename: '8.mp3',  title: 'Track 8',  track: 7  },
  { filename: '10.mp3', title: 'Track 10', track: 8  },
  { filename: '11.mp3', title: 'Track 11', track: 9  },
  { filename: '12.mp3', title: 'Track 12', track: 10 },
  { filename: '13.mp3', title: 'Track 13', track: 11 },
  { filename: '14.mp3', title: 'Track 14', track: 12 },
  { filename: '15.mp3', title: 'Track 15', track: 13 },
];

const IMAGE_FILE = 'photo_2026-04-25_11-47-39.jpg';

function httpsReq(urlStr, opts, body) {
  return new Promise((resolve, reject) => {
    const p = new URL(urlStr);
    const req = https.request({ hostname:p.hostname, path:p.pathname+(p.search||''),
      port:443, method:opts.method||'GET', headers:opts.headers||{}, rejectUnauthorized:false },
      res => { const c=[]; res.on('data',d=>c.push(d)); res.on('end',()=>resolve({status:res.statusCode,body:Buffer.concat(c).toString()})); });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function existsInDB(title) {
  const r = await httpsReq(`${SUPABASE_URL}/rest/v1/songs?artist_id=eq.${ARTIST_ID}&title=eq.${encodeURIComponent(title)}&select=id`,
    { method:'GET', headers:{ 'Authorization':`Bearer ${SERVICE_ROLE_KEY}`, 'apikey':SERVICE_ROLE_KEY }});
  return JSON.parse(r.body).length > 0;
}

async function uploadFile(filePath, storagePath, mime) {
  const buf = fs.readFileSync(filePath);
  const p = new URL(`${SUPABASE_URL}/storage/v1/object/${storagePath}`);
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname:p.hostname, path:p.pathname, port:443, method:'POST',
      rejectUnauthorized:false, headers:{ 'Authorization':`Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type':mime, 'Content-Length':buf.length, 'x-upsert':'true' }},
      res => { const c=[]; res.on('data',d=>c.push(d)); res.on('end',()=>{
        if(res.statusCode>=200&&res.statusCode<300) resolve(`${SUPABASE_URL}/storage/v1/object/public/${storagePath}`);
        else reject(new Error(`Upload failed (${res.statusCode}): ${Buffer.concat(c).toString()}`));
      }); });
    req.on('error', reject); req.write(buf); req.end();
  });
}

async function uploadWithRetry(fp, sp, mime='audio/mpeg', n=3) {
  for (let i=1;i<=n;i++) { try { return await uploadFile(fp,sp,mime); }
    catch(e) { if(i===n) throw e; process.stdout.write(` ⟳${i}...`); await new Promise(r=>setTimeout(r,2000*i)); } }
}

async function insertSong({ title, track, audio_url }) {
  const body = JSON.stringify({ title, artist_id:ARTIST_ID, audio_url, track_number:track, category:'old', language:'oromo' });
  const r = await httpsReq(`${SUPABASE_URL}/rest/v1/songs`,
    { method:'POST', headers:{ 'Authorization':`Bearer ${SERVICE_ROLE_KEY}`, 'apikey':SERVICE_ROLE_KEY,
        'Content-Type':'application/json', 'Content-Length':Buffer.byteLength(body), 'Prefer':'return=minimal' }}, body);
  if (r.status<200||r.status>=300) throw new Error(`DB insert failed (${r.status}): ${r.body}`);
}

async function updateArtistImage(imageUrl) {
  const body = JSON.stringify({ image_url: imageUrl });
  const r = await httpsReq(`${SUPABASE_URL}/rest/v1/artists?id=eq.${ARTIST_ID}`,
    { method:'PATCH', headers:{ 'Authorization':`Bearer ${SERVICE_ROLE_KEY}`, 'apikey':SERVICE_ROLE_KEY,
        'Content-Type':'application/json', 'Content-Length':Buffer.byteLength(body), 'Prefer':'return=minimal' }}, body);
  if (r.status<200||r.status>=300) throw new Error(`Image update failed (${r.status}): ${r.body}`);
}

(async () => {
  console.log(`\n🎵  Uploading ${SONGS.length} Asaafa Culuuqqe songs...\n`);

  // Upload cover image first
  const imgPath = path.join(SOURCE_DIR, IMAGE_FILE);
  if (fs.existsSync(imgPath)) {
    process.stdout.write(`  🖼️   Uploading cover image...`);
    try {
      const imgUrl = await uploadWithRetry(imgPath, `images/Asaafa-Culuuqqe/${IMAGE_FILE}`, 'image/jpeg');
      await updateArtistImage(imgUrl);
      console.log(' ✅');
    } catch(e) { console.log(` ❌ ${e.message}`); }
  }

  let ok=0, skip=0, fail=0;
  for (const song of SONGS) {
    const fp = path.join(SOURCE_DIR, song.filename);
    const sp = `audio/Asaafa-Culuuqqe/${song.filename}`;
    if (!fs.existsSync(fp)) { console.error(`  ⚠️   Not found: ${song.filename}`); fail++; continue; }
    if (await existsInDB(song.title)) { console.log(`  ⏭️   [${song.track}] ${song.title} — skip`); skip++; continue; }
    process.stdout.write(`  ⬆️   [${song.track}/${SONGS.length}] ${song.title} (${(fs.statSync(fp).size/1024/1024).toFixed(2)}MB)...`);
    try { await insertSong({ title:song.title, track:song.track, audio_url: await uploadWithRetry(fp, sp) }); console.log(' ✅'); ok++; }
    catch(e) { console.log(' ❌'); console.error(`       ${e.message}`); fail++; }
  }
  console.log(`\n✅ ${ok} uploaded  ⏭️  ${skip} skipped  ❌ ${fail} failed\n`);
  if (fail>0) process.exit(1);
})();
