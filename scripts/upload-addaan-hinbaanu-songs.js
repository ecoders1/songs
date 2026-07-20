/**
 * upload-addaan-hinbaanu-songs.js
 * Uploads 12 Addaan Hinbaanu MP3s to Supabase Storage and inserts song rows.
 * Run: node scripts/upload-addaan-hinbaanu-songs.js
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

const ARTIST_ID  = 'f602c2a3-1ff0-4927-ac7e-3f93ecd59b68';
const SOURCE_DIR = path.join(__dirname, '..', 'supabase', 'Addaan hinbaanu');

const SONGS = [
  { filename: '1 (2).mp3',        title: 'Track 1',        track: 1  },
  { filename: '3 (2).mp3',        title: 'Track 3',        track: 2  },
  { filename: '4 (2).mp3',        title: 'Track 4',        track: 3  },
  { filename: '5 (2).mp3',        title: 'Track 5',        track: 4  },
  { filename: '6 (2).mp3',        title: 'Track 6',        track: 5  },
  { filename: '7 (2).mp3',        title: 'Track 7',        track: 6  },
  { filename: '8 (2).mp3',        title: 'Track 8',        track: 7  },
  { filename: '9 (2).mp3',        title: 'Track 9',        track: 8  },
  { filename: '10 (2).mp3',       title: 'Track 10',       track: 9  },
  { filename: '11 (2).mp3',       title: 'Track 11',       track: 10 },
  { filename: '12 koya.mp3',      title: 'Koya',           track: 11 },
  { filename: '13 ati waqaa.mp3', title: 'Ati Waqaa',      track: 12 },
];

function safeKey(f) {
  return f.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x00-\x7F]/g,'')
          .replace(/[%@#&,'()]/g,'').replace(/\s+/g,'_').replace(/_+/g,'_');
}

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

async function uploadFile(filePath, storagePath) {
  const buf = fs.readFileSync(filePath);
  const p = new URL(`${SUPABASE_URL}/storage/v1/object/audio/${storagePath}`);
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname:p.hostname, path:p.pathname, port:443, method:'POST',
      rejectUnauthorized:false, headers:{ 'Authorization':`Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type':'audio/mpeg', 'Content-Length':buf.length, 'x-upsert':'true' }},
      res => { const c=[]; res.on('data',d=>c.push(d)); res.on('end',()=>{
        if(res.statusCode>=200&&res.statusCode<300) resolve(`${SUPABASE_URL}/storage/v1/object/public/audio/${storagePath}`);
        else reject(new Error(`Upload failed (${res.statusCode}): ${Buffer.concat(c).toString()}`));
      }); });
    req.on('error', reject); req.write(buf); req.end();
  });
}

async function uploadWithRetry(fp, sp, n=3) {
  for (let i=1;i<=n;i++) { try { return await uploadFile(fp,sp); }
    catch(e) { if(i===n) throw e; process.stdout.write(` ⟳${i}...`); await new Promise(r=>setTimeout(r,2000*i)); } }
}

async function insertSong({ title, track, audio_url }) {
  const body = JSON.stringify({ title, artist_id:ARTIST_ID, audio_url, track_number:track, category:'group', language:'oromo' });
  const r = await httpsReq(`${SUPABASE_URL}/rest/v1/songs`,
    { method:'POST', headers:{ 'Authorization':`Bearer ${SERVICE_ROLE_KEY}`, 'apikey':SERVICE_ROLE_KEY,
        'Content-Type':'application/json', 'Content-Length':Buffer.byteLength(body), 'Prefer':'return=minimal' }}, body);
  if (r.status<200||r.status>=300) throw new Error(`DB insert failed (${r.status}): ${r.body}`);
}

(async () => {
  console.log(`\n🎵  Uploading ${SONGS.length} Addaan Hinbaanu songs...\n`);
  let ok=0, skip=0, fail=0;
  for (const song of SONGS) {
    const fp = path.join(SOURCE_DIR, song.filename);
    const sp = `Addaan-Hinbaanu/${safeKey(song.filename)}`;
    if (!fs.existsSync(fp)) { console.error(`  ⚠️   Not found: ${song.filename}`); fail++; continue; }
    if (await existsInDB(song.title)) { console.log(`  ⏭️   [${song.track}] ${song.title} — skip`); skip++; continue; }
    process.stdout.write(`  ⬆️   [${song.track}/${SONGS.length}] ${song.title} (${(fs.statSync(fp).size/1024/1024).toFixed(2)}MB)...`);
    try { await insertSong({ title:song.title, track:song.track, audio_url: await uploadWithRetry(fp,sp) }); console.log(' ✅'); ok++; }
    catch(e) { console.log(' ❌'); console.error(`       ${e.message}`); fail++; }
  }
  console.log(`\n✅ ${ok} uploaded  ⏭️  ${skip} skipped  ❌ ${fail} failed\n`);
  if (fail>0) process.exit(1);
})();
