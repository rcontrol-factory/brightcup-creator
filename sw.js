/* FILE: /sw.js */
/* Bright Cup Creator — Service Worker (offline-first, iOS Safari SAFE) */

const CACHE = "bcc-v2.0.2"; // HOTFIX cache bump

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
  "./js/core/wordsearch_gen.js",
  './js/modules/coloring.js',
  './js/modules/covers.js',
  './js/modules/wordsearch.js',
  './js/modules/crossword.js',
  './js/modules/mandala.js',
  './js/modules/settings.js',
  "./js/modules/cultural_agent.js",
  "./js/modules/cultural_book_builder.js",
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

function isAppShell(req) {
  const url = new URL(req.url);
  if (url.origin !== location.origin) return false;
  const p = url.pathname;

  // navegação / HTML
  if (req.mode === 'navigate') return true;

  // arquivos que NÃO podem ficar presos no cache no iOS
  if (p.endsWith('.js')) return true;
  if (p.endsWith('.css')) return true;
  if (p.endsWith('.json')) return true;

  // index explícito
  if (p.endsWith('/') || p.endsWith('/index.html')) return true;

  return false;
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req, { cache: 'no-store' });
    // guarda cópia para offline
    cache.put(req, res.clone());
    return res;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  cache.put(req, res.clone());
  return res;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Cross-origin (ex: ComfyUI): sempre network
  if (url.origin !== location.origin) {
    event.respondWith((async () => {
      try { return await fetch(req); }
      catch { return new Response('Offline', { status: 503, statusText: 'Offline' }); }
    })());
    return;
  }

  // App shell: network-first (pra não prender JS velho no Safari)
  if (isAppShell(req)) {
    event.respondWith(networkFirst(req));
    return;
  }

  // resto: cache-first
  event.respondWith(cacheFirst(req));
});
