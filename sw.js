/* FILE: /sw.js */
// Bright Cup Creator — Stable PWA Service Worker
// Goal: avoid stale-cache white screens on Safari/iOS/PWA

const CACHE_VERSION = 'bcc-v1';
const CACHE_NAME = 'brightcup-cache-' + CACHE_VERSION;

function isSameOrigin(requestUrl) {
  try {
    return new URL(requestUrl).origin === self.location.origin;
  } catch (e) {
    return false;
  }
}

function isImageRequest(request) {
  var url = '';
  try { url = new URL(request.url).pathname; } catch (e) {}
  return /\.(png|jpg|jpeg|webp|gif|svg|ico)$/i.test(url);
}

function isNetworkFirstRequest(request) {
  var url = '';
  var accept = '';

  try { url = new URL(request.url).pathname; } catch (e) {}
  try { accept = request.headers.get('accept') || ''; } catch (e2) {}

  if (request.mode === 'navigate') return true;
  if (accept.indexOf('text/html') !== -1) return true;
  if (/\.js$/i.test(url)) return true;
  if (/\.json$/i.test(url)) return true;
  if (/\.html$/i.test(url)) return true;

  return false;
}

function makeFallbackResponse(request) {
  var accept = '';
  try { accept = request.headers.get('accept') || ''; } catch (e) {}

  if (request.mode === 'navigate' || accept.indexOf('text/html') !== -1) {
    return new Response(
      '<!doctype html><html><head><meta charset="utf-8"><title>Offline</title></head><body>Offline</body></html>',
      {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      }
    );
  }

  if (accept.indexOf('application/json') !== -1 || /\.json$/i.test(request.url)) {
    return new Response('{}', {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

  if (/\.js$/i.test(request.url)) {
    return new Response('', {
      status: 200,
      headers: { 'Content-Type': 'application/javascript; charset=utf-8' }
    });
  }

  return new Response('', { status: 200 });
}

self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

self.addEventListener('activate', function(event) {
  event.waitUntil((async function() {
    var keys = await caches.keys();
    await Promise.all(keys.map(function(key) {
      if (key !== CACHE_NAME) return caches.delete(key);
      return Promise.resolve(false);
    }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', function(event) {
  var request = event.request;

  if (!request || request.method !== 'GET') return;
  if (!isSameOrigin(request.url)) return;

  if (isImageRequest(request)) {
    event.respondWith((async function() {
      var cache = await caches.open(CACHE_NAME);
      var cached = await cache.match(request);

      if (cached) return cached;

      try {
        var fresh = await fetch(request);
        if (fresh && fresh.ok) {
          cache.put(request, fresh.clone());
        }
        return fresh || makeFallbackResponse(request);
      } catch (e) {
        return cached || makeFallbackResponse(request);
      }
    })());
    return;
  }

  if (isNetworkFirstRequest(request)) {
    event.respondWith((async function() {
      var cache = await caches.open(CACHE_NAME);

      try {
        var fresh = await fetch(request, { cache: 'no-store' });
        if (fresh && fresh.ok) {
          cache.put(request, fresh.clone());
        }
        return fresh || makeFallbackResponse(request);
      } catch (e) {
        var cached = await cache.match(request);
        return cached || makeFallbackResponse(request);
      }
    })());
    return;
  }

  event.respondWith((async function() {
    var cache = await caches.open(CACHE_NAME);

    try {
      var fresh = await fetch(request);
      if (fresh && fresh.ok) {
        cache.put(request, fresh.clone());
      }
      return fresh || makeFallbackResponse(request);
    } catch (e) {
      var cached = await cache.match(request);
      return cached || makeFallbackResponse(request);
    }
  })());
});
