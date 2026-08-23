/* Кабинет должен открываться даже без интернета — например, если связь пропала
   посреди занятия. Поэтому страница и значки хранятся в браузере.
   Саму страницу берём сначала из сети: так обновления видны сразу,
   а копия из памяти выручает только когда сети нет. */
const CACHE = 'tochka-2026-08';
const CORE = ['./', './index.html', './icon-192.png', './icon-512.png', './icon-maskable.png', './manifest.webmanifest'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => n !== CACHE).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;          // шрифты и прочее — как обычно

  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  if (isPage) {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const copy = fresh.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return fresh;
      } catch (err) {
        return (await caches.match(req)) || (await caches.match('./index.html')) || Response.error();
      }
    })());
  } else {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
  }
});
