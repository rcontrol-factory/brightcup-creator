/* FILE: /sw.js
   Bright Cup Creator — SW HARD RESET (iOS/PWA SAFE)
   Goal: eliminate mixed-cache boots that freeze UI (menu/copy dead).
*/
const SW_VERSION = "bcc-reset-2026-03-01-1908";
const CACHE_NAME = `bcc-${SW_VERSION}`;
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.json",
  "./js/app.js",
  "./js/core/storage.js",
  "./js/core/wordsearch_gen.js",
  "./js/core/prompt_engine.js",
  "./js/core/comfy.js",
  "./js/core/comfy_client.js",
  "./js/modules/cultural_agent.js",
  "./js/modules/cultural_book_builder.js",
  "./js/modules/wordsearch.js",
  "./js/modules/coloring.js",
  "./js/modules/crossword.js",
  "./js/modules/mandala.js",
  "./js/modules/covers.js",
  "./js/modules/settings.js",
  "./data/themes.json",
  "./assets/icon-192.png",
  "./assets/icon-512.png"
];

// Install: pre-cache core
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_ASSETS.map(u => new Request(u, {cache: "reload"})));
  })());
});

// Activate: HARD clean all old caches, claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME) ? caches.delete(k) : Promise.resolve()));
    await self.clients.claim();
    // Tell open clients to hard-reload once (prevents “stuck shell”)
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    clients.forEach(c => {
      try { c.postMessage({ type: "SW_ACTIVATED", version: SW_VERSION }); } catch {}
    });
  })());
});

// Message: allow manual skipWaiting from UI if you ever add it
self.addEventListener("message", (event) => {
  if (event?.data?.type === "SKIP_WAITING") {
    try { self.skipWaiting(); } catch {}
  }
});

// Fetch strategy (iOS-safe):
// - HTML navigations: network-first (fallback cache)
// - JS/CSS/JSON: network-first with NO-STORE, then update cache (prevents mixed versions)
// - Images/fonts: cache-first
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (!req || req.method !== "GET") return;

  const url = new URL(req.url);
  // only handle same-origin
  if (url.origin !== self.location.origin) return;

  const accept = req.headers.get("accept") || "";
  const isNav = req.mode === "navigate" || accept.includes("text/html");
  const isCode = url.pathname.endsWith(".js") || url.pathname.endsWith(".css") || url.pathname.endsWith(".json");
  const isAsset = url.pathname.match(/\.(png|jpg|jpeg|webp|svg|gif|ico|woff2?|ttf)$/i);

  if (isNav) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: "no-store" });
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        const cached = await caches.match(req);
        return cached || caches.match("./index.html");
      }
    })());
    return;
  }

  if (isCode) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: "no-store" });
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        const cached = await caches.match(req);
        return cached || Response.error();
      }
    })());
    return;
  }

  if (isAsset) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        return cached || Response.error();
      }
    })());
    return;
  }

  // default: try cache then network
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const fresh = await fetch(req);
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, fresh.clone());
      return fresh;
    } catch (e) {
      return cached || Response.error();
    }
  })());
});
