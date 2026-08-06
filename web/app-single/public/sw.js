const CACHE = 'maa-v3';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// ── Install: precache static assets ──────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch(() => {})
        )
      )
    )
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ───────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() =>
      self.clients.matchAll().then((clients) =>
        clients.forEach((client) => client.postMessage({ type: 'SW_UPDATED' }))
      )
    )
  );
  e.waitUntil(self.clients.claim());
});

// ── Fetch ────────────────────────────────────────────────────
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Never cache API calls or cross-origin requests
  if (url.pathname.startsWith('/api/')) return;
  if (url.origin !== self.location.origin) return;
  if (e.request.method !== 'GET') return;

  // Network-first for page navigations — always try fresh server content
  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request).then(cached => cached || caches.match('/')).then(cached => cached || new Response('Offline — please check your connection.', { status: 503, headers: { 'Content-Type': 'text/plain' } })))
    );
    return;
  }

  // Stale-while-revalidate for static assets (JS/CSS/images/fonts).
  // Serves the cached copy instantly, then updates it in the background so
  // new deploys appear without a hard refresh.
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached)
        .then(res => res || new Response('Offline', { status: 503 }));
      return cached || network;
    })
  );
});