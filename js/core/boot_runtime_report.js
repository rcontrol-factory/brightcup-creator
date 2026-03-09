/* FILE: /js/core/boot_runtime_report.js */
// Bright Cup Creator — Boot Runtime Report v1 SAFE
// Consolidated diagnostic snapshot for boot/runtime/cache guard state
// - synchronous
// - no DOM
// - no canvas
// - no external dependencies
// - Safari/iOS safe
// - read-only (does not modify storage or runtime)

import { buildRuntimeDiagnostic } from './runtime_stability_guard.js';
import { buildBootCacheDiagnostic } from './boot_cache_guard.js';

var REPORT_VERSION = 'bcc-boot-runtime-report-v1';

function nowIso(){
  try { return new Date().toISOString(); }
  catch(e){ return ''; }
}

function safeSessionGet(key, fallback){
  try{
    var v = sessionStorage.getItem(String(key));
    return v == null ? fallback : v;
  }catch(e){
    return fallback;
  }
}

function safeLocalGet(key, fallback){
  try{
    var v = localStorage.getItem(String(key));
    return v == null ? fallback : v;
  }catch(e){
    return fallback;
  }
}

function toIntSafe(value, fallback){
  var n = parseInt(value,10);
  if(!isFinite(n)) return typeof fallback === 'number' ? fallback : 0;
  return n;
}

function hasSessionStorage(){
  try{ return typeof sessionStorage !== 'undefined'; }
  catch(e){ return false; }
}

function hasLocalStorage(){
  try{ return typeof localStorage !== 'undefined'; }
  catch(e){ return false; }
}

function hasServiceWorkerSupport(){
  try{ return typeof navigator !== 'undefined' && !!navigator.serviceWorker; }
  catch(e){ return false; }
}

function hasCacheApiSupport(){
  try{ return typeof caches !== 'undefined'; }
  catch(e){ return false; }
}

function countKeys(obj){
  if(!obj || typeof obj !== 'object') return 0;
  return Object.keys(obj).length;
}

function buildEnvironment(cacheDiag){
  return {
    isSafariLike: !!(cacheDiag && cacheDiag.isSafariLike),
    hasSessionStorage: hasSessionStorage(),
    hasLocalStorage: hasLocalStorage(),
    hasServiceWorkerSupport: hasServiceWorkerSupport(),
    hasCacheApiSupport: hasCacheApiSupport()
  };
}

function buildBootSection(){
  return {
    running: !!safeSessionGet('bcc:boot:running',''),
    lastOkAt: safeSessionGet('bcc:boot:last_ok',''),
    failCount: toIntSafe(safeSessionGet('bcc:boot:fail_count','0'),0),
    lastError: safeSessionGet('bcc:boot:last_error',''),
    lastRouteAttempt: safeSessionGet('bcc:last_route_attempt','')
  };
}

function buildRuntimeSection(runtimeDiag){
  var sessionFlags = runtimeDiag && runtimeDiag.sessionFlags ? runtimeDiag.sessionFlags : {};
  var localFlags = runtimeDiag && runtimeDiag.localFlags ? runtimeDiag.localFlags : {};

  return {
    hasRuntimeFlags: (countKeys(sessionFlags) + countKeys(localFlags)) > 0,
    sessionFlagsCount: countKeys(sessionFlags),
    localFlagsCount: countKeys(localFlags),
    lastRenderError: safeSessionGet('bcc:last_render_error','')
  };
}

function buildCacheGuardSection(cacheDiag){
  return {
    shouldRun: !!(cacheDiag && cacheDiag.shouldRun),
    lastRunAt: cacheDiag ? cacheDiag.lastGuardRunAt || '' : '',
    lastRunVersion: cacheDiag ? cacheDiag.lastGuardRunVersion || '' : '',
    lastReason: cacheDiag ? cacheDiag.lastGuardReason || '' : ''
  };
}

function buildRecoverySection(boot, runtime, cacheGuard, cacheDiag){
  var stuckBoot = !!(cacheDiag && cacheDiag.stuckBootMarker);
  var runtimeRecoverySuggested = runtime.hasRuntimeFlags;
  var cacheGuardSuggested = cacheGuard.shouldRun;

  var safeToContinue = !stuckBoot || (stuckBoot && runtime.sessionFlagsCount === 0);

  return {
    stuckBootDetected: stuckBoot,
    runtimeRecoverySuggested: runtimeRecoverySuggested,
    cacheGuardSuggested: cacheGuardSuggested,
    safeToContinue: safeToContinue
  };
}

function deriveStatus(boot, runtime, cacheGuard, recovery){
  if(recovery.stuckBootDetected && boot.lastError && boot.failCount > 2){
    return 'critical';
  }

  if(boot.failCount > 0 && cacheGuard.shouldRun){
    return 'warning';
  }

  if(recovery.runtimeRecoverySuggested || recovery.cacheGuardSuggested){
    return 'recovered';
  }

  return 'healthy';
}

function buildSummary(status, boot, runtime, cacheGuard){
  if(status === 'critical'){
    return 'Boot instability detected. Persistent errors and stuck markers present.';
  }

  if(status === 'warning'){
    return 'Boot environment shows instability signals. Guard or recovery may be required.';
  }

  if(status === 'recovered'){
    return 'Environment shows previous instability but appears recoverable.';
  }

  return 'Runtime environment healthy.';
}

function buildNotes(boot, runtime, cacheGuard, recovery){
  var notes = [];

  if(recovery.stuckBootDetected){
    notes.push('Boot marker indicates previous incomplete startup.');
  }

  if(runtime.hasRuntimeFlags){
    notes.push('Ephemeral runtime flags detected.');
  }

  if(cacheGuard.shouldRun){
    notes.push('Cache guard suggests technical cleanup.');
  }

  if(boot.failCount > 0){
    notes.push('Previous boot failures recorded.');
  }

  if(!recovery.safeToContinue){
    notes.push('Environment may require recovery before stable boot.');
  }

  return notes;
}

function buildBootRuntimeReport(){
  var runtimeDiag;
  var cacheDiag;

  try{ runtimeDiag = buildRuntimeDiagnostic(); }
  catch(e){ runtimeDiag = {}; }

  try{ cacheDiag = buildBootCacheDiagnostic(); }
  catch(e){ cacheDiag = {}; }

  var environment = buildEnvironment(cacheDiag);
  var boot = buildBootSection();
  var runtime = buildRuntimeSection(runtimeDiag);
  var cacheGuard = buildCacheGuardSection(cacheDiag);
  var recovery = buildRecoverySection(boot, runtime, cacheGuard, cacheDiag);

  var status = deriveStatus(boot, runtime, cacheGuard, recovery);
  var summary = buildSummary(status, boot, runtime, cacheGuard);
  var notes = buildNotes(boot, runtime, cacheGuard, recovery);

  return {
    reportVersion: REPORT_VERSION,
    type: 'boot_runtime_report',
    generatedAt: nowIso(),
    status: status,
    summary: summary,
    environment: environment,
    boot: boot,
    runtime: runtime,
    cacheGuard: cacheGuard,
    recovery: recovery,
    notes: notes
  };
}

export { buildBootRuntimeReport };
