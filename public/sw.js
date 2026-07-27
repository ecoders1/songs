// ─── Version — updated on every deploy via next.config.ts header injection ───
// Falls back to a timestamp so every new deploy gets a unique cache name.
// The app page reads /sw-version.json to detect when a new SW is available.
const VERSION     = self.__SW_VERSION__ || 'v13-' + Date.now();
const CACHE_NAME  = `faarfannaa-${VERSION}`;
const AUDIO_CACHE = 'faarfannaa-audio';   // permanent — never cleared on update
const API_CACHE   = 'faarfannaa-api';     // permanent
const IMAGE_CACHE = 'faarfannaa-img';     // permanent

const PERMANENT_CACHES = [AUDIO_CACHE, API_CACHE, IMAGE_CACHE];

const STATIC_ASSETS = [
  '/',
  '/home',
  '/library',
  '/playlist',
  '/settings',
  '/player',
  '/icons/icon-192.png',
  '/manifest.json',
];

// ─── Install: cache shell, then immediately activate ─────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  // Take control immediately — don't wait for old SW to die
  self.skipWaiting();
});

// ─── Activate: delete old versioned caches, take control of all tabs ─────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => {
              if (k === CACHE_NAME) return false;          // keep current
              if (PERMANENT_CACHES.includes(k)) return false; // keep audio/api/img
              return k.startsWith('faarfannaa-');           // delete old versioned caches
            })
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())  // take control of all open tabs NOW
      .then(() => {
        // Notify all open tabs that the app was updated so they can reload
        self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: 'SW_UPDATED', version: VERSION });
          });
        });
      })
  );
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isAudioUrl(url) {
  // Explicit audio file extensions
  if (url.pathname.match(/\.(mp3|m4a|ogg|wav|aac|flac|mp4|opus|webm)$/i)) return true;
  // Supabase storage audio bucket — any file under /storage/v1/object/*/audio/*
  if (url.hostname.includes('supabase') && url.pathname.includes('/storage/')) {
    if (url.pathname.includes('/audio/')) return true;
    if (url.pathname.match(/\.(mp3|m4a|ogg|wav|aac|flac|mp4|opus|webm)$/i)) return true;
  }
  return false;
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
 * Handle audio range requests (seeking support).
 * Stores the full blob, slices on demand for HTTP 206.
 */
async function handleAudioRequest(request) {
  const cache = await caches.open(AUDIO_CACHE);
  const rangeHeader = request.headers.get('Range');
  const cachedFull = await cache.match(request.url);

  if (cachedFull) {
    return rangeHeader ? serveRange(cachedFull, rangeHeader) : cachedFull;
  }

  try {
    const fullRequest = new Request(request.url, {
      method: 'GET',
      headers: { 'Accept': request.headers.get('Accept') || '*/*' },
    });
    const networkResponse = await fetch(fullRequest);
    if (networkResponse.ok) {
      cache.put(request.url, networkResponse.clone()).catch(() => {});
      return rangeHeader ? serveRange(networkResponse, rangeHeader) : networkResponse;
    }
    return networkResponse;
  } catch {
    return new Response('Audio not available offline', { status: 503 });
  }
}

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

  const start      = match[1] !== '' ? parseInt(match[1], 10) : totalBytes - parseInt(match[2], 10);
  const end        = match[2] !== '' ? parseInt(match[2], 10) : totalBytes - 1;
  const clampedEnd = Math.min(end, totalBytes - 1);
  const chunk      = arrayBuffer.slice(start, clampedEnd + 1);

  return new Response(chunk, {
    status: 206,
    headers: {
      'Content-Type':   fullResponse.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range':  `bytes ${start}-${clampedEnd}/${totalBytes}`,
      'Content-Length': String(clampedEnd - start + 1),
      'Accept-Ranges':  'bytes',
    },
  });
}

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 1. Audio — cache-first with range support
  if (isAudioUrl(url)) {
    event.respondWith(handleAudioRequest(event.request));
    return;
  }

  // 2. Supabase images — cache-first
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
          return new Response('', { status: 503 });
        }
      })
    );
    return;
  }

  // 3. Songs & Artists API — network-first, fall back to SW cache, then empty
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
          // Return null body so the client knows to fall back to IDB
          const key = url.pathname.startsWith('/api/songs') ? 'songs' : 'artists';
          return new Response(
            JSON.stringify({ [key]: [], _offline: true, _no_cache: true }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
      })
    );
    return;
  }

  // 4. All other API routes — network only
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

  // 5. Navigation — network-first, fall back to cached shell
  if (event.request.mode === 'navigate') {
    event.respondWith(
      Promise.race([
        fetch(event.request.clone()).then((response) => {
          if (response.ok)
            caches.open(CACHE_NAME).then((c) => c.put(event.request, response.clone()));
          return response;
        }),
        new Promise((_, reject) => setTimeout(() => reject('timeout'), 5000)),
      ]).catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        const home = await caches.match('/home');
        if (home) return home;
        return new Response('<h1>Offline</h1>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        });
      })
    );
    return;
  }

  // 6. Static assets — stale-while-revalidate
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

  if (event.data?.type === 'CACHE_IMAGES') {
    const { urls } = event.data;
    if (!Array.isArray(urls)) return;
    caches.open(IMAGE_CACHE).then(async (cache) => {
      for (const url of urls) {
        const exists = await cache.match(url);
        if (!exists) {
          try {
            const r = await fetch(url);
            if (r.ok) cache.put(url, r);
          } catch { /* offline */ }
          await new Promise(r => setTimeout(r, 100)); // gentle pacing
        }
      }
    });
  }

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
    (async () => {
      const [audioCache, imgCache] = await Promise.all([
        caches.open(AUDIO_CACHE),
        caches.open(IMAGE_CACHE),
      ]);
      for (const song of songs) {
        if (song.audio_url) {
          const exists = await audioCache.match(song.audio_url);
          if (!exists) {
            try {
              const r = await fetch(new Request(song.audio_url));
              if (r.ok) await audioCache.put(song.audio_url, r);
            } catch { /* offline */ }
          }
        }
        if (song.image_url) {
          const exists = await imgCache.match(song.image_url);
          if (!exists) {
            try {
              const r = await fetch(song.image_url);
              if (r.ok) await imgCache.put(song.image_url, r);
            } catch { /* ignore */ }
          }
        }
        await new Promise((r) => setTimeout(r, 40));
      }
    })();
  }

  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
