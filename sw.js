/* FILE: /sw.js */
// Bright Cup Creator — Stable PWA Service Worker
// Focus:
// - avoid stale cache
// - reduce white screen caused by old/inconsistent cache
// - keep updates silent and predictable
// - Safari/iOS/PWA safe

const CACHE_VERSION = 'bcc-v2-stable';
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

function isCacheableResponse(response) {
  if (!response) return false;
  if (response.status !== 200) return false;

  try {
    if (response.type && response.type !== 'basic' && response.type !== 'default') {
      return false;
    }
  } catch (e) {
    return false;
  }

  return true;
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

async function clearOldCaches() {
  var keys = await caches.keys();
  await Promise.all(keys.map(function(key) {
    if (key !== CACHE_NAME) return caches.delete(key);
    return Promise.resolve(false);
  }));
}

async function getNavigationCacheFallback(cache, request) {
  var candidates = [];
  var cached;
  var i;

  candidates.push(request);
  candidates.push('./');
  candidates.push('/');
  candidates.push(self.location.origin + '/');

  for (i = 0; i < candidates.length; i += 1) {
    try {
      cached = await cache.match(candidates[i]);
      if (cached) return cached;
    } catch (e) {}
  }

  return null;
}

self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

self.addEventListener('activate', function(event) {
  event.waitUntil((async function() {
    await clearOldCaches();
    await self.clients.claim();
  })());
});

self.addEventListener('message', function(event) {
  var data = event && event.data ? event.data : {};
  var type = data && data.type ? String(data.type) : '';

  if (type === 'BCC_SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (type === 'BCC_CLEAR_RUNTIME_CACHES') {
    event.waitUntil(clearOldCaches());
  }
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
        if (isCacheableResponse(fresh)) {
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
      var cached = await cache.match(request);
      var fresh;

      try {
        fresh = await fetch(request, { cache: 'no-store' });

        if (isCacheableResponse(fresh)) {
          cache.put(request, fresh.clone());
          return fresh;
        }

        if (cached) return cached;

        if (request.mode === 'navigate') {
          var navFallback = await getNavigationCacheFallback(cache, request);
          if (navFallback) return navFallback;
        }

        return fresh || makeFallbackResponse(request);
      } catch (e) {
        if (cached) return cached;

        if (request.mode === 'navigate') {
          var navigationFallback = await getNavigationCacheFallback(cache, request);
          if (navigationFallback) return navigationFallback;
        }

        return makeFallbackResponse(request);
      }
    })());
    return;
  }

  event.respondWith((async function() {
    var cache = await caches.open(CACHE_NAME);
    var cached = await cache.match(request);

    if (cached) return cached;

    try {
      var fresh = await fetch(request);
      if (isCacheableResponse(fresh)) {
        cache.put(request, fresh.clone());
      }
      return fresh || makeFallbackResponse(request);
    } catch (e) {
      return cached || makeFallbackResponse(request);
    }
  })());
});
