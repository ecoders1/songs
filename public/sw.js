// ─── Cache version: bump this string on every deploy to force update ──────────
const VERSION = 'v6';
const CACHE_NAME = `faarfannaa-${VERSION}`;
const AUDIO_CACHE = 'faarfannaa-audio-v1'; // audio cache is version-independent

const STATIC_ASSETS = [
  '/',
  '/home',
  '/library',
  '/playlist',
  '/settings',
  '/icons/icon.svg',
  '/manifest.json',
];

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // addAll failures are non-fatal
      cache.addAll(STATIC_ASSETS).catch(() => {})
    )
  );
  // Take over immediately — don't wait for old SW to expire
  self.skipWaiting();
});

// ─── Activate: wipe ALL old page caches ──────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          // delete any page cache that isn't the current version
          // but keep audio cache forever (user downloaded songs)
          .filter((k) => k !== CACHE_NAME && k !== AUDIO_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Audio files & Supabase storage → cache-first (offline playback)
  const isAudio =
    url.pathname.match(/\.(mp3|m4a|ogg|wav|aac|flac)$/i) ||
    (url.hostname.includes('supabase') && url.pathname.includes('/storage/'));

  if (isAudio) {
    event.respondWith(
      caches.open(AUDIO_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const response = await fetch(event.request.clone());
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        } catch {
          return new Response('Audio unavailable offline', { status: 503 });
        }
      })
    );
    return;
  }

  // 2. API routes → network only, never cache
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

  // 3. HTML navigation requests → network-first, short timeout
  //    This ensures users always get the latest page when online.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      Promise.race([
        fetch(event.request.clone()).then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) =>
              cache.put(event.request, response.clone())
            );
          }
          return response;
        }),
        // 4 second timeout — fall back to cache if network is slow
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 4000)
        ),
      ]).catch(() =>
        caches.match(event.request).then(
          (cached) => cached || caches.match('/') || new Response('Offline', { status: 503 })
        )
      )
    );
    return;
  }

  // 4. Static assets (JS, CSS, images, fonts) → stale-while-revalidate
  //    Serve cache immediately, update in background for next visit.
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      const fetchPromise = fetch(event.request.clone())
        .then((response) => {
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        })
        .catch(() => cached);
      // Return cached immediately if available, otherwise wait for network
      return cached || fetchPromise;
    })
  );
});

// ─── Messages from app ────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  // Cache audio for offline playback
  if (event.data?.type === 'CACHE_AUDIO') {
    const { url } = event.data;
    caches.open(AUDIO_CACHE).then(async (cache) => {
      const existing = await cache.match(url);
      if (existing) return; // already cached
      fetch(url).then((response) => {
        if (response.ok) cache.put(url, response);
      }).catch(() => {});
    });
  }

  // Force skip waiting (triggered when app detects new SW waiting)
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
