/* RideNite service worker. Version is injected at build time from the bundle hash.
   Network-first for navigations and app assets; the cache is used only when offline.
   No API calls exist (dummy data only). */
const VERSION = '__BUILD_VERSION__';
const CACHE = `ridenite-${VERSION}`;
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/apple-touch-icon.png', '/venue/maison-cheryl-window.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('ridenite-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (e) => { if (e.data === 'version') e.source && e.source.postMessage({ version: VERSION }); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // The unlisted /pitch/ page and its video are served straight from the network (range requests for video).
  if (new URL(req.url).pathname.startsWith('/pitch')) return;
  e.respondWith(
    fetch(req, { cache: 'no-store' })
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: req.mode === 'navigate' })
        .then((hit) => hit || (req.mode === 'navigate' ? caches.match('/index.html') : Response.error()))),
  );
});
