/* FILE: /js/core/boot_cache_guard.js */
// Bright Cup Creator — Boot Cache Guard v0.2 SAFE
// Technical invisible guard to reduce white screen caused by stale cache,
// stale service worker state, and stuck technical markers in Safari-like runtimes.
// - no DOM
// - no overlay
// - no popup
// - no canvas
// - no external dependencies
// - Safari/iOS/PWA safe
// - preserves user/project/config data

var BOOT_CACHE_GUARD_VERSION = 'bcc-boot-cache-guard-v1';

var SESSION_RUNTIME_KEYS = [
  'bcc:boot:running',
  'bcc:view:rendering',
  'bcc:view:pending',
  'bcc:navigation:pending',
  'bcc:last_route_attempt',
  'bcc:last_render_error',
  'bcc:route:pending',
  'bcc:route:last_error',
  'bcc:render:pending',
  'bcc:render:last_error'
];

var LOCAL_RUNTIME_KEYS = [
  'bcc:view:rendering',
  'bcc:view:pending',
  'bcc:navigation:pending',
  'bcc:last_route_attempt',
  'bcc:last_render_error',
  'bcc:route:pending',
  'bcc:route:last_error',
  'bcc:render:pending',
  'bcc:render:last_error'
];

var GUARD_KEYS = {
  LAST_RUN_AT: 'bcc:boot_cache_guard:last_run_at',
  LAST_RUN_VERSION: 'bcc:boot_cache_guard:last_run_version',
  LAST_REASON: 'bcc:boot_cache_guard:last_reason'
};

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (e) {
    return '';
  }
}

function safeSessionGet(key, fallback) {
  try {
    var value = sessionStorage.getItem(String(key));
    return value == null ? fallback : value;
  } catch (e) {
    return fallback;
  }
}

function safeSessionSet(key, value) {
  try {
    sessionStorage.setItem(String(key), String(value));
    return true;
  } catch (e) {
    return false;
  }
}

function safeSessionRemove(key) {
  try {
    sessionStorage.removeItem(String(key));
    return true;
  } catch (e) {
    return false;
  }
}

function safeLocalGet(key, fallback) {
  try {
    var value = localStorage.getItem(String(key));
    return value == null ? fallback : value;
  } catch (e) {
    return fallback;
  }
}

function safeLocalSet(key, value) {
  try {
    localStorage.setItem(String(key), String(value));
    return true;
  } catch (e) {
    return false;
  }
}

function safeLocalRemove(key) {
  try {
    localStorage.removeItem(String(key));
    return true;
  } catch (e) {
    return false;
  }
}

function toIntSafe(value, fallback) {
  var n = parseInt(value, 10);
  if (!isFinite(n)) return typeof fallback === 'number' ? fallback : 0;
  return n;
}

function hasNavigator() {
  return typeof navigator !== 'undefined' && !!navigator;
}

function hasCachesApi() {
  return typeof caches !== 'undefined' && !!caches && typeof caches.keys === 'function';
}

function hasServiceWorkerApi() {
  return hasNavigator() && !!navigator.serviceWorker;
}

function safeUserAgent() {
  try {
    return hasNavigator() ? String(navigator.userAgent || '') : '';
  } catch (e) {
    return '';
  }
}

function safeVendor() {
  try {
    return hasNavigator() ? String(navigator.vendor || '') : '';
  } catch (e) {
    return '';
  }
}

function isIOSLike() {
  var ua = safeUserAgent();
  return /iPad|iPhone|iPod/i.test(ua);
}

function isWebKitLike() {
  var ua = safeUserAgent();
  return /AppleWebKit/i.test(ua);
}

function isChromiumLike() {
  var ua = safeUserAgent();
  return /Chrome|CriOS|Chromium|EdgiOS|EdgA|Edg\//i.test(ua);
}

function isFirefoxLike() {
  var ua = safeUserAgent();
  return /FxiOS|Firefox/i.test(ua);
}

function isSafariDesktopLike() {
  var ua = safeUserAgent();
  var vendor = safeVendor();
  if (!/Safari/i.test(ua)) return false;
  if (isChromiumLike()) return false;
  if (isFirefoxLike()) return false;
  if (vendor && vendor.indexOf('Apple') === -1) return false;
  return true;
}

function isSafariLikeRuntime() {
  if (!hasNavigator()) return false;
  if (!isWebKitLike()) return false;
  if (isChromiumLike()) return false;
  if (isFirefoxLike()) return false;
  if (isIOSLike()) return true;
  return isSafariDesktopLike();
}

function hasStuckBootMarker() {
  return !!safeSessionGet('bcc:boot:running', '');
}

function hasRuntimeMarkers() {
  var i;
  var key;

  for (i = 0; i < SESSION_RUNTIME_KEYS.length; i += 1) {
    key = SESSION_RUNTIME_KEYS[i];
    if (safeSessionGet(key, null) != null) return true;
  }

  for (i = 0; i < LOCAL_RUNTIME_KEYS.length; i += 1) {
    key = LOCAL_RUNTIME_KEYS[i];
    if (safeLocalGet(key, null) != null) return true;
  }

  return false;
}

function shouldRunByVersion() {
  var lastVersion = safeLocalGet(GUARD_KEYS.LAST_RUN_VERSION, '');
  return lastVersion !== BOOT_CACHE_GUARD_VERSION;
}

function shouldRunByFailures() {
  var failCount = toIntSafe(safeSessionGet('bcc:boot:fail_count', '0'), 0);
  return failCount > 0;
}

function shouldRunByTime() {
  var lastRunAt = safeLocalGet(GUARD_KEYS.LAST_RUN_AT, '');
  if (!lastRunAt) return true;

  try {
    var last = new Date(lastRunAt).getTime();
    var now = Date.now();
    if (!isFinite(last) || !isFinite(now)) return true;
    return (now - last) > (1000 * 60 * 60 * 12);
  } catch (e) {
    return true;
  }
}

function shouldRunBootCacheGuard() {
  var safariLike = isSafariLikeRuntime();
  var stuckBoot = hasStuckBootMarker();
  var runtimeMarkers = hasRuntimeMarkers();
  var byVersion = shouldRunByVersion();
  var byFailures = shouldRunByFailures();
  var byTime = shouldRunByTime();

  if (stuckBoot) return true;
  if (runtimeMarkers && safariLike) return true;
  if (byFailures && safariLike) return true;
  if (byVersion && safariLike) return true;
  if (byTime && safariLike) return true;

  return false;
}

function isRelevantCacheName(name) {
  var safeName = String(name || '');
  if (!safeName) return false;
  return safeName.indexOf('brightcup-cache') === 0 || safeName.indexOf('bcc') === 0;
}

/* internal helper — async cache listing (not exported) */
async function listRelevantCaches() {
  var list = [];
  var keys;
  var i;

  if (!hasCachesApi()) return list;

  try {
    keys = await caches.keys();
  } catch (e) {
    return list;
  }

  for (i = 0; i < keys.length; i += 1) {
    if (isRelevantCacheName(keys[i])) {
      list.push(keys[i]);
    }
  }

  return list;
}

async function clearRelevantCaches() {
  var removed = [];
  var keys;
  var i;
  var key;

  if (!hasCachesApi()) return removed;

  try {
    keys = await caches.keys();
  } catch (e) {
    return removed;
  }

  for (i = 0; i < keys.length; i += 1) {
    key = keys[i];
    if (!isRelevantCacheName(key)) continue;
    try {
      if (await caches.delete(key)) {
        removed.push(key);
      }
    } catch (e2) {}
  }

  return removed;
}

async function handleServiceWorkers() {
  var handled = {
    supported: hasServiceWorkerApi(),
    registrationsFound: 0,
    registrationsTouched: 0
  };

  var registrations;
  var i;
  var reg;

  if (!handled.supported) return handled;

  try {
    if (typeof navigator.serviceWorker.getRegistrations !== 'function') {
      return handled;
    }

    registrations = await navigator.serviceWorker.getRegistrations();
    handled.registrationsFound = registrations && registrations.length ? registrations.length : 0;

    for (i = 0; i < handled.registrationsFound; i += 1) {
      reg = registrations[i];

      try {
        if (reg && reg.waiting && typeof reg.waiting.postMessage === 'function') {
          reg.waiting.postMessage({ type: 'BCC_SKIP_WAITING' });
          handled.registrationsTouched += 1;
        }
      } catch (e1) {}

      try {
        if (reg && reg.active && typeof reg.active.postMessage === 'function') {
          reg.active.postMessage({ type: 'BCC_CLEAR_RUNTIME_CACHES' });
          handled.registrationsTouched += 1;
        }
      } catch (e2) {}
    }
  } catch (e) {}

  return handled;
}

function clearRuntimeSessionFlags() {
  var removed = [];
  var i;
  var key;

  for (i = 0; i < SESSION_RUNTIME_KEYS.length; i += 1) {
    key = SESSION_RUNTIME_KEYS[i];
    if (safeSessionRemove(key)) {
      removed.push(key);
    }
  }

  return removed;
}

function clearRuntimeLocalFlags() {
  var removed = [];
  var i;
  var key;

  for (i = 0; i < LOCAL_RUNTIME_KEYS.length; i += 1) {
    key = LOCAL_RUNTIME_KEYS[i];
    if (safeLocalRemove(key)) {
      removed.push(key);
    }
  }

  return removed;
}

async function runBootCacheGuard() {
  var safariLike = isSafariLikeRuntime();
  var shouldRun = shouldRunBootCacheGuard();
  var reason = 'no_action_needed';
  var removedCaches = [];
  var removedSessionFlags = [];
  var removedLocalFlags = [];
  var swHandled = {
    supported: false,
    registrationsFound: 0,
    registrationsTouched: 0
  };
  var ran = false;

  if (hasStuckBootMarker()) {
    reason = 'stuck_boot_marker';
  } else if (hasRuntimeMarkers()) {
    reason = 'runtime_markers_detected';
  } else if (shouldRunByFailures()) {
    reason = 'boot_failures_detected';
  } else if (shouldRunByVersion()) {
    reason = 'guard_version_changed';
  } else if (shouldRunByTime()) {
    reason = 'guard_time_window_elapsed';
  }

  if (!shouldRun) {
    return {
      ok: true,
      ran: false,
      reason: reason,
      isSafariLike: safariLike,
      removedCaches: removedCaches,
      removedSessionFlags: removedSessionFlags,
      removedLocalFlags: removedLocalFlags,
      swHandled: swHandled,
      preservedUserData: true,
      preservedProjectData: true,
      preservedConfig: true,
      ranAt: nowIso()
    };
  }

  try {
    removedSessionFlags = clearRuntimeSessionFlags();
  } catch (e1) {}

  try {
    removedLocalFlags = clearRuntimeLocalFlags();
  } catch (e2) {}

  try {
    removedCaches = await clearRelevantCaches();
  } catch (e3) {}

  try {
    swHandled = await handleServiceWorkers();
  } catch (e4) {}

  ran = true;

  safeLocalSet(GUARD_KEYS.LAST_RUN_AT, nowIso());
  safeLocalSet(GUARD_KEYS.LAST_RUN_VERSION, BOOT_CACHE_GUARD_VERSION);
  safeLocalSet(GUARD_KEYS.LAST_REASON, reason);

  return {
    ok: true,
    ran: ran,
    reason: reason,
    isSafariLike: safariLike,
    removedCaches: removedCaches,
    removedSessionFlags: removedSessionFlags,
    removedLocalFlags: removedLocalFlags,
    swHandled: swHandled,
    preservedUserData: true,
    preservedProjectData: true,
    preservedConfig: true,
    ranAt: nowIso()
  };
}

/* synchronous diagnostic snapshot */
function buildBootCacheDiagnostic() {
  var sessionFlags = {};
  var localFlags = {};
  var notes = [];
  var i;
  var key;
  var value;

  for (i = 0; i < SESSION_RUNTIME_KEYS.length; i += 1) {
    key = SESSION_RUNTIME_KEYS[i];
    value = safeSessionGet(key, null);
    if (value != null) {
      sessionFlags[key] = value;
    }
  }

  for (i = 0; i < LOCAL_RUNTIME_KEYS.length; i += 1) {
    key = LOCAL_RUNTIME_KEYS[i];
    value = safeLocalGet(key, null);
    if (value != null) {
      localFlags[key] = value;
    }
  }

  if (hasStuckBootMarker()) {
    notes.push('Stuck boot marker detected.');
  }

  if (Object.keys(sessionFlags).length > 0 || Object.keys(localFlags).length > 0) {
    notes.push('Runtime flags detected.');
  }

  if (isSafariLikeRuntime()) {
    notes.push('Safari-like runtime detected.');
  }

  return {
    generatedAt: nowIso(),
    guardVersion: BOOT_CACHE_GUARD_VERSION,
    isSafariLike: isSafariLikeRuntime(),
    shouldRun: shouldRunBootCacheGuard(),
    stuckBootMarker: hasStuckBootMarker(),
    hasRuntimeMarkers: hasRuntimeMarkers(),
    bootFailCount: toIntSafe(safeSessionGet('bcc:boot:fail_count', '0'), 0),
    sessionFlags: sessionFlags,
    localFlags: localFlags,
    lastGuardRunAt: safeLocalGet(GUARD_KEYS.LAST_RUN_AT, ''),
    lastGuardRunVersion: safeLocalGet(GUARD_KEYS.LAST_RUN_VERSION, ''),
    lastGuardReason: safeLocalGet(GUARD_KEYS.LAST_REASON, ''),
    notes: notes
  };
}

export {
  isSafariLikeRuntime,
  shouldRunBootCacheGuard,
  runBootCacheGuard,
  buildBootCacheDiagnostic
};
