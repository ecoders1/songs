// ─── Cache version: bump on every deploy ─────────────────────────────────────
const VERSION = 'v7';
const CACHE_NAME = `faarfannaa-${VERSION}`;
const AUDIO_CACHE = 'faarfannaa-audio-v1';   // persists across versions
const API_CACHE   = 'faarfannaa-api-v1';     // persists across versions
const IMAGE_CACHE = 'faarfannaa-img-v1';     // persists across versions

const STATIC_ASSETS = [
  '/',
  '/home',
  '/library',
  '/playlist',
  '/settings',
  '/player',
  '/icons/icon.svg',
  '/manifest.json',
];

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(STATIC_ASSETS).catch(() => {})
    )
  );
  self.skipWaiting();
});

// ─── Activate: clean old PAGE caches, keep audio/api/image caches ────────────
self.addEventListener('activate', (event) => {
  const KEEP = [CACHE_NAME, AUDIO_CACHE, API_CACHE, IMAGE_CACHE];
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isAudioUrl(url) {
  return (
    url.pathname.match(/\.(mp3|m4a|ogg|wav|aac|flac)$/i) ||
    (url.hostname.includes('supabase') && url.pathname.includes('/storage/') && url.pathname.includes('/audio/'))
  );
}

function isImageUrl(url) {
  return (
    url.pathname.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i) ||
    (url.hostname.includes('supabase') && url.pathname.includes('/storage/') && url.pathname.includes('/images/'))
  );
}

function isApiUrl(url) {
  return url.pathname.startsWith('/api/songs') || url.pathname.startsWith('/api/artists');
}

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Audio — cache-first (offline playback)
  if (isAudioUrl(url)) {
    event.respondWith(
      caches.open(AUDIO_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const response = await fetch(event.request.clone());
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        } catch {
          return cached || new Response('Audio unavailable offline', { status: 503 });
        }
      })
    );
    return;
  }

  // 2. Images from Supabase — cache-first
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
          return cached || new Response('Image unavailable offline', { status: 503 });
        }
      })
    );
    return;
  }

  // 3. Songs/Artists API — network-first, fallback to API cache
  if (isApiUrl(url)) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        try {
          const response = await fetch(event.request.clone());
          if (response.ok) {
            // Cache with 24h max-age hint
            cache.put(event.request, response.clone());
          }
          return response;
        } catch {
          // Offline — serve from cache
          const cached = await cache.match(event.request);
          if (cached) return cached;
          return new Response(JSON.stringify({ songs: [], artists: [], error: 'offline' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'X-Offline': 'true' },
          });
        }
      })
    );
    return;
  }

  // 4. Other admin API routes — network only
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

  // 5. HTML navigation — network-first, fast timeout, cache fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      Promise.race([
        fetch(event.request.clone()).then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
          }
          return response;
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
      ]).catch(() =>
        caches.match(event.request)
          .then((cached) => cached || caches.match('/home') || caches.match('/'))
          .then((cached) => cached || new Response('Offline', { status: 503 }))
      )
    );
    return;
  }

  // 6. Static assets — stale-while-revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      const fetchPromise = fetch(event.request.clone())
        .then((response) => {
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// ─── Messages ─────────────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  // Cache a single audio file
  if (event.data?.type === 'CACHE_AUDIO') {
    const { url } = event.data;
    caches.open(AUDIO_CACHE).then(async (cache) => {
      const existing = await cache.match(url);
      if (existing) return;
      fetch(url).then((r) => { if (r.ok) cache.put(url, r); }).catch(() => {});
    });
  }

  // Pre-cache all song audio + images for full offline use
  if (event.data?.type === 'CACHE_ALL_SONGS') {
    const { songs } = event.data;
    if (!Array.isArray(songs)) return;

    caches.open(AUDIO_CACHE).then((audioCache) => {
      caches.open(IMAGE_CACHE).then((imgCache) => {
        songs.forEach((song) => {
          // Cache audio
          if (song.audio_url) {
            audioCache.match(song.audio_url).then((existing) => {
              if (!existing) {
                fetch(song.audio_url).then((r) => { if (r.ok) audioCache.put(song.audio_url, r); }).catch(() => {});
              }
            });
          }
          // Cache cover image
          if (song.image_url) {
            imgCache.match(song.image_url).then((existing) => {
              if (!existing) {
                fetch(song.image_url).then((r) => { if (r.ok) imgCache.put(song.image_url, r); }).catch(() => {});
              }
            });
          }
        });
      });
    });
  }

  // Force update
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
