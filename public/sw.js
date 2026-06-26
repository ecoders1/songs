// ─── Cache names ─────────────────────────────────────────────────────────────
// IMPORTANT: AUDIO_CACHE, API_CACHE, IMAGE_CACHE never change version
// so cached songs/data survive app updates forever.
const VERSION     = 'v8';
const CACHE_NAME  = `faarfannaa-${VERSION}`;   // app shell — versioned
const AUDIO_CACHE = 'faarfannaa-audio';        // audio files — permanent
const API_CACHE   = 'faarfannaa-api';          // API responses — permanent
const IMAGE_CACHE = 'faarfannaa-img';          // cover images — permanent

// Persistent caches that must NEVER be deleted on update
const PERMANENT_CACHES = [AUDIO_CACHE, API_CACHE, IMAGE_CACHE];

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
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

// ─── Activate: ONLY delete old versioned app shell caches ────────────────────
// Permanent caches (audio/api/image) are NEVER touched here
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => {
            // Keep current shell cache
            if (k === CACHE_NAME) return false;
            // NEVER delete permanent caches
            if (PERMANENT_CACHES.includes(k)) return false;
            // Delete only old versioned shell caches
            return k.startsWith('faarfannaa-v');
          })
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isSupabaseAudio(url) {
  return (
    url.hostname.includes('supabase') &&
    url.pathname.includes('/storage/') &&
    (url.pathname.includes('/audio/') ||
     url.pathname.match(/\.(mp3|m4a|ogg|wav|aac|flac)$/i))
  );
}

function isSupabaseImage(url) {
  return (
    url.hostname.includes('supabase') &&
    url.pathname.includes('/storage/') &&
    (url.pathname.includes('/images/') ||
     url.pathname.match(/\.(jpg|jpeg|png|webp|gif)$/i))
  );
}

function isLocalAudio(url) {
  return url.pathname.match(/\.(mp3|m4a|ogg|wav|aac|flac)$/i);
}

function isSongsOrArtistsApi(url) {
  return (
    url.pathname.startsWith('/api/songs') ||
    url.pathname.startsWith('/api/artists')
  );
}

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // ── 1. Audio (Supabase storage or direct URL) → cache-first ─────────────────
  if (isSupabaseAudio(url) || isLocalAudio(url)) {
    event.respondWith(
      caches.open(AUDIO_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const response = await fetch(event.request.clone());
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        } catch {
          // Return a proper audio response if we somehow missed caching
          return cached || new Response('', {
            status: 503,
            statusText: 'Audio unavailable offline',
          });
        }
      })
    );
    return;
  }

  // ── 2. Cover images (Supabase) → cache-first ────────────────────────────────
  if (isSupabaseImage(url)) {
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

  // ── 3. Songs & Artists API → network-first, MERGE with cache offline ─────────
  // When online: always fetch fresh + update cache (so new songs appear)
  // When offline: serve cached response (previously fetched data stays)
  if (isSongsOrArtistsApi(url)) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        try {
          const response = await fetch(event.request.clone());
          if (response.ok) {
            // Always update cache with latest data when online
            cache.put(event.request, response.clone());
          }
          return response;
        } catch {
          // Offline — serve last known good response
          const cached = await cache.match(event.request);
          if (cached) return cached;
          // No cache yet — return empty but valid response
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

  // ── 4. Admin API routes → network only (never cache) ────────────────────────
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

  // ── 5. Navigation requests → network-first, cache fallback ──────────────────
  if (event.request.mode === 'navigate') {
    event.respondWith(
      Promise.race([
        fetch(event.request.clone()).then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((c) => c.put(event.request, response.clone()));
          }
          return response;
        }),
        // 4 second timeout before falling back to cache
        new Promise((_, reject) => setTimeout(() => reject('timeout'), 4000)),
      ]).catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        // Fall back to /home shell for any unmatched navigation
        const home = await caches.match('/home');
        return home || new Response('<h1>Offline</h1>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        });
      })
    );
    return;
  }

  // ── 6. Static assets (JS/CSS/fonts/icons) → stale-while-revalidate ──────────
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      const networkFetch = fetch(event.request.clone())
        .then((response) => {
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        })
        .catch(() => cached);
      // Serve cache immediately; update in background
      return cached || networkFetch;
    })
  );
});

// ─── Messages from app ────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {

  // Cache a single audio file (called when song is played)
  if (event.data?.type === 'CACHE_AUDIO') {
    const { url } = event.data;
    if (!url) return;
    caches.open(AUDIO_CACHE).then(async (cache) => {
      const existing = await cache.match(url);
      if (existing) return; // already cached
      fetch(url)
        .then((r) => { if (r.ok) cache.put(url, r); })
        .catch(() => {});
    });
  }

  // Pre-cache ALL songs and images in background (called from library page)
  if (event.data?.type === 'CACHE_ALL_SONGS') {
    const { songs } = event.data;
    if (!Array.isArray(songs)) return;

    Promise.all([
      caches.open(AUDIO_CACHE),
      caches.open(IMAGE_CACHE),
    ]).then(([audioCache, imgCache]) => {
      for (const song of songs) {
        // Audio
        if (song.audio_url) {
          audioCache.match(song.audio_url).then((existing) => {
            if (!existing) {
              fetch(song.audio_url)
                .then((r) => { if (r.ok) audioCache.put(song.audio_url, r); })
                .catch(() => {});
            }
          });
        }
        // Image
        if (song.image_url) {
          imgCache.match(song.image_url).then((existing) => {
            if (!existing) {
              fetch(song.image_url)
                .then((r) => { if (r.ok) imgCache.put(song.image_url, r); })
                .catch(() => {});
            }
          });
        }
      }
    });
  }

  // Force new SW to take control (called after updatefound)
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
