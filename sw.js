/* Bright Cup Creator — Service Worker (offline-first) */
const CACHE = 'bcc-v2.0.0';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './sw.js',
  './data/themes.json',
  './js/app.js',
  './js/core/storage.js',
  './js/core/prompt_engine.js',
  './js/core/comfy.js',
  './js/modules/coloring.js',
  './js/modules/covers.js',
  './js/modules/wordsearch.js',
  './js/modules/crossword.js',
  './js/modules/mandala.js',
  './js/modules/settings.js',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k === CACHE ? Promise.resolve() : caches.delete(k))));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  // Same-origin: cache-first
  if (url.origin === location.origin) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      const res = await fetch(req);
      const cache = await caches.open(CACHE);
      cache.put(req, res.clone());
      return res;
    })());
    return;
  }
  // Cross-origin (ex: ComfyUI): network-first
  event.respondWith((async () => {
    try {
      return await fetch(req);
    } catch {
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    }
  })());
});
