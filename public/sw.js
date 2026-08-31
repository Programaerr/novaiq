/* NUVAIQ service worker.

   Two goals, no build step:
   · SPEED — every repeat visit serves the app's own hashed assets (JS/CSS/fonts/images)
     straight from the cache, so the install "opens fast" instead of re-downloading.
   · OFFLINE — previously visited pages keep working with no connection at all.

   Deliberately runtime-caching only (network-first navigations / stale-while-revalidate
   for assets) rather than a generated precache list: the built filenames are content-hashed,
   and this worker doesn't need to know them at build time. Bump `CACHE_VERSION` to force old
   caches to be purged after a deploy. */

const CACHE_VERSION = 'nuvaiq-v1';
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
        // كانت الحلقة أعلاه تُرجع Promise قد يُرفَض (لا Response) لو فشل fetch(request) الثاني
        // أيضاً (لا يوجد كاش بعد + الشبكة لا تزال غير جاهزة، بالضبط ما حدث أثناء أول زيارة
        // للدومين الجديد قبل اكتمال DNS) — وrespondWith يتطلب Response دائماً، فرَفضُه يظهر
        // للزائر كـ"خطأ شبكة" حتى لو كانت المشكلة مؤقتة بحتة. شبكة أمان أخيرة تضمن Response
        // حقيقياً في كل الأحوال، فلا يتعطل service worker نفسه بشكل دائم بعد فشل عابر واحد.
        .catch(
          () =>
            new Response('<h1>تعذّر الاتصال</h1><p>تحقق من الإنترنت وأعد المحاولة.</p>', {
              status: 503,
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
            })
        )
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
        // نفس الخلل: لو `cached` غير موجود (أول طلب لهذا المورد) وفشلت الشبكة أيضاً، كان هذا
        // يُرجع `cached` (= undefined) بدل Response حقيقي — وrespondWith لا يقبل undefined.
        .catch(() => cached || new Response('', { status: 504 }));
      return cached || refresh;
    })
  );
});