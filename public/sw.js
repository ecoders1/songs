const CACHE_NAME = 'faarfannaa-v1';
const AUDIO_CACHE = 'faarfannaa-audio-v1';
const STATIC_ASSETS = [
  '/',
  '/home',
  '/library',
  '/playlist',
  '/settings',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== AUDIO_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for assets, special for audio
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Cache audio files
  if (url.pathname.match(/\.(mp3|m4a|ogg|wav|aac)$/i) || url.hostname.includes('supabase')) {
    event.respondWith(
      caches.open(AUDIO_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const response = await fetch(event.request.clone());
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        } catch {
          return cached || new Response('Offline', { status: 503 });
        }
      })
    );
    return;
  }

  // API routes: network only
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request).catch(() => new Response('Offline', { status: 503 })));
    return;
  }

  // Everything else: network first, fallback to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || new Response('Offline', { status: 503 })))
  );
});

// Background sync for downloads
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_AUDIO') {
    const { url } = event.data;
    caches.open(AUDIO_CACHE).then((cache) => {
      fetch(url).then((response) => {
        if (response.ok) cache.put(url, response);
      });
    });
  }
});
