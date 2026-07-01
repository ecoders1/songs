// ─── Cache names ─────────────────────────────────────────────────────────────
const VERSION     = 'v10';
const CACHE_NAME  = `faarfannaa-${VERSION}`;
const AUDIO_CACHE = 'faarfannaa-audio';   // permanent — never deleted
const API_CACHE   = 'faarfannaa-api';     // permanent
const IMAGE_CACHE = 'faarfannaa-img';     // permanent

const PERMANENT_CACHES = [AUDIO_CACHE, API_CACHE, IMAGE_CACHE];

const STATIC_ASSETS = [
  '/', '/home', '/library', '/playlist', '/settings', '/player',
  '/auth', '/pending',
  '/icons/icon.svg', '/manifest.json',
];

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => {
            if (k === CACHE_NAME) return false;
            if (PERMANENT_CACHES.includes(k)) return false;
            return k.startsWith('faarfannaa-v');
          })
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isAudioUrl(url) {
  return (
    url.pathname.match(/\.(mp3|m4a|ogg|wav|aac|flac)$/i) ||
    (url.hostname.includes('supabase') && url.pathname.includes('/storage/') &&
      (url.pathname.includes('/audio/') ||
       url.pathname.match(/\.(mp3|m4a|ogg|wav|aac|flac)$/i)))
  );
}

function isImageUrl(url) {
  return (
    url.pathname.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i) &&
    url.hostname.includes('supabase')
  );
}

function isSongsOrArtistsApi(url) {
  return (
    url.pathname.startsWith('/api/songs') ||
    url.pathname.startsWith('/api/artists')
  );
}

/**
 * Handle audio range requests from the browser's media element.
 * The browser sends Range: bytes=X-Y headers for seeking/streaming.
 * We store the FULL audio blob in cache and slice it on demand.
 * This makes seeking and every-second progress work fully offline.
 */
async function handleAudioRequest(request) {
  const cache = await caches.open(AUDIO_CACHE);
  const rangeHeader = request.headers.get('Range');

  // Try to get the full cached response
  const cachedFull = await cache.match(request.url);

  if (cachedFull) {
    // Serve range from cached full response
    if (rangeHeader) {
      return serveRange(cachedFull, rangeHeader);
    }
    return cachedFull;
  }

  // Not cached — fetch from network
  try {
    // Always fetch the full file (no range) so we can cache it completely
    const fullRequest = new Request(request.url, {
      method: 'GET',
      headers: { 'Accept': request.headers.get('Accept') || '*/*' },
    });
    const networkResponse = await fetch(fullRequest);

    if (networkResponse.ok) {
      // Clone and store full response in cache
      const responseToCache = networkResponse.clone();
      cache.put(request.url, responseToCache).catch(() => {});

      // If browser wanted a range, serve it from the network response
      if (rangeHeader) {
        return serveRange(networkResponse, rangeHeader);
      }
      return networkResponse;
    }
    return networkResponse;
  } catch {
    // Completely offline and not cached
    return new Response('Audio not available offline', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/**
 * Slice a full cached Response to satisfy a Range: bytes=start-end request.
 * This is what enables seeking and real-time progress while offline.
 */
async function serveRange(fullResponse, rangeHeader) {
  const arrayBuffer = await fullResponse.clone().arrayBuffer();
  const totalBytes  = arrayBuffer.byteLength;

  const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
  if (!match) {
    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': fullResponse.headers.get('Content-Type') || 'audio/mpeg',
        'Content-Length': String(totalBytes),
        'Accept-Ranges': 'bytes',
      },
    });
  }

  const start = match[1] !== '' ? parseInt(match[1], 10) : totalBytes - parseInt(match[2], 10);
  const end   = match[2] !== '' ? parseInt(match[2], 10) : totalBytes - 1;
  const clampedEnd = Math.min(end, totalBytes - 1);
  const length = clampedEnd - start + 1;

  const chunk = arrayBuffer.slice(start, clampedEnd + 1);

  return new Response(chunk, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type':  fullResponse.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': `bytes ${start}-${clampedEnd}/${totalBytes}`,
      'Content-Length': String(length),
      'Accept-Ranges': 'bytes',
    },
  });
}

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // ── 1. Audio → cache-first with full range support ───────────────────────
  if (isAudioUrl(url)) {
    event.respondWith(handleAudioRequest(event.request));
    return;
  }

  // ── 2. Cover images → cache-first ────────────────────────────────────────
  if (isImageUrl(url)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const response = await fetch(event.request.clone());
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        } catch {
          return cached || new Response('', { status: 503 });
        }
      })
    );
    return;
  }

  // ── 3. Songs & Artists API → network-first, cache offline ────────────────
  if (isSongsOrArtistsApi(url)) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        try {
          const response = await fetch(event.request.clone());
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        } catch {
          const cached = await cache.match(event.request);
          if (cached) return cached;
          const key = url.pathname.startsWith('/api/songs') ? 'songs' : 'artists';
          return new Response(
            JSON.stringify({ [key]: [], _offline: true }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
      })
    );
    return;
  }

  // ── 4. Auth API → network only, graceful offline ──────────────────────────
  if (url.pathname.startsWith('/api/auth/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'Offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // ── 5. Other API routes → network only ───────────────────────────────────
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'Offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // ── 6. Navigation → network-first, shell fallback ─────────────────────────
  if (event.request.mode === 'navigate') {
    event.respondWith(
      Promise.race([
        fetch(event.request.clone()).then((response) => {
          if (response.ok)
            caches.open(CACHE_NAME).then((c) => c.put(event.request, response.clone()));
          return response;
        }),
        new Promise((_, reject) => setTimeout(() => reject('timeout'), 4000)),
      ]).catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        const home = await caches.match('/home');
        return home || new Response('<h1>Offline</h1>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        });
      })
    );
    return;
  }

  // ── 7. Static assets → stale-while-revalidate ─────────────────────────────
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      const networkFetch = fetch(event.request.clone())
        .then((response) => {
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});

// ─── Messages from app ────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {

  if (event.data?.type === 'CACHE_AUDIO') {
    const { url } = event.data;
    if (!url) return;
    caches.open(AUDIO_CACHE).then(async (cache) => {
      const existing = await cache.match(url);
      if (existing) return;
      fetch(new Request(url)).then((r) => { if (r.ok) cache.put(url, r); }).catch(() => {});
    });
  }

  if (event.data?.type === 'CACHE_ALL_SONGS') {
    const { songs } = event.data;
    if (!Array.isArray(songs)) return;

    // Process sequentially in small batches to avoid saturating the connection.
    // A 40ms gap between fetches keeps memory pressure low on mobile devices.
    (async () => {
      const [audioCache, imgCache] = await Promise.all([
        caches.open(AUDIO_CACHE),
        caches.open(IMAGE_CACHE),
      ]);

      for (const song of songs) {
        // Audio — skip if already cached
        if (song.audio_url) {
          const exists = await audioCache.match(song.audio_url);
          if (!exists) {
            try {
              const r = await fetch(new Request(song.audio_url));
              if (r.ok) await audioCache.put(song.audio_url, r);
            } catch { /* offline — will cache next time */ }
          }
        }

        // Image
        if (song.image_url) {
          const exists = await imgCache.match(song.image_url);
          if (!exists) {
            try {
              const r = await fetch(song.image_url);
              if (r.ok) await imgCache.put(song.image_url, r);
            } catch { /* ignore */ }
          }
        }

        // Small yield between songs to keep SW responsive
        await new Promise((r) => setTimeout(r, 40));
      }
    })();
  }

  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
