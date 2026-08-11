/* NOVAIQ service worker.

   Two goals, no build step:
   · SPEED — every repeat visit serves the app's own hashed assets (JS/CSS/fonts/images)
     straight from the cache, so the install "opens fast" instead of re-downloading.
   · OFFLINE — previously visited pages keep working with no connection at all.

   Deliberately runtime-caching only (network-first navigations / stale-while-revalidate
   for assets) rather than a generated precache list: the built filenames are content-hashed,
   and this worker doesn't need to know them at build time. Bump `CACHE_VERSION` to force old
   caches to be purged after a deploy. */

const CACHE_VERSION = 'novaiq-v1';
const CACHE = CACHE_VERSION;
const SHELL = '/index.html';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return; // firebase / translate / fonts stay untouched

  // App shell: try the network first so a deploy is visible immediately; when offline,
  // fall back to the last cached index.html so the installed app still opens.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(SHELL, copy));
          return res;
        })
        .catch(() => caches.match(SHELL).then((cached) => cached || fetch(request)))
    );
    return;
  }

  // Everything else same-origin: cache-first, then refresh the cache in the background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const refresh = fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || refresh;
    })
  );
});