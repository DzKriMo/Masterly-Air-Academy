const CACHE = 'maa-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// ── Install: precache static assets ──────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ───────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  e.waitUntil(self.clients.claim());
});

// ── Fetch: network-first for API, cache-first for pages/static ──
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Don't cache API calls — let the sync queue handle offline data
  if (url.pathname.startsWith('/api/')) return;

  // Skip non-GET
  if (e.request.method !== 'GET') return;

  // Cache-first for page navigations and static assets
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) {
        // Return cached, but update cache in background
        fetch(e.request).then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put(e.request, res));
        }).catch(() => {});
        return cached;
      }
      return fetch(e.request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      }).catch(() => {
        // Offline fallback — return cached page
        return caches.match('/') || new Response('Offline', { status: 503 });
      });
    })
  );
});
