/* FILE: /js/core/boot_recovery_snapshot.js */
// Bright Cup Creator — Boot Recovery Snapshot v1 SAFE
// Lightweight synchronous consolidation layer for boot recovery state
// - no DOM
// - no canvas
// - no external dependencies
// - Safari/iOS safe
// - read-only diagnostics

import { buildRuntimeDiagnostic } from './runtime_stability_guard.js';
import { buildBootCacheDiagnostic } from './boot_cache_guard.js';
import { buildBootRuntimeReport } from './boot_runtime_report.js';

var SNAPSHOT_VERSION = 'bcc-boot-recovery-snapshot-v1';

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

function toIntSafe(v, fallback){
  var n = parseInt(v,10);
  if(!isFinite(n)) return typeof fallback === 'number' ? fallback : 0;
  return n;
}

function uniquePush(arr, txt){
  if(!txt) return;
  if(arr.indexOf(txt) === -1) arr.push(txt);
}

function buildBootSection(runtimeReport){
  var boot = runtimeReport && runtimeReport.boot ? runtimeReport.boot : {};

  return {
    running: !!boot.running,
    failCount: toIntSafe(boot.failCount,0),
    lastError: boot.lastError || '',
    lastOkAt: boot.lastOkAt || ''
  };
}

function buildRecoverySection(runtimeDiag, cacheDiag, runtimeReport){
  var sessionFlags = runtimeDiag && runtimeDiag.sessionFlags ? runtimeDiag.sessionFlags : {};
  var localFlags = runtimeDiag && runtimeDiag.localFlags ? runtimeDiag.localFlags : {};

  var runtimeFlagsDetected =
    (sessionFlags && Object.keys(sessionFlags).length > 0) ||
    (localFlags && Object.keys(localFlags).length > 0);

  var stuckBootDetected = !!(cacheDiag && cacheDiag.stuckBootMarker);

  var cacheGuardSuggested = !!(cacheDiag && cacheDiag.shouldRun);

  var recoveryLikely = runtimeFlagsDetected || cacheGuardSuggested || stuckBootDetected;

  return {
    stuckBootDetected: stuckBootDetected,
    runtimeFlagsDetected: runtimeFlagsDetected,
    cacheGuardSuggested: cacheGuardSuggested,
    recoveryLikely: recoveryLikely
  };
}

function buildRoutingSection(runtimeReport, recovery){
  var lastRoute = safeSessionGet('bcc:last_route_attempt','');

  var shouldAvoidLastRoute = false;
  var suggestedSafeRoute = '';

  if(recovery.stuckBootDetected || recovery.runtimeFlagsDetected){
    shouldAvoidLastRoute = true;
    suggestedSafeRoute = 'agent_center';
  } else if(recovery.cacheGuardSuggested){
    suggestedSafeRoute = 'agent_center';
  } else {
    suggestedSafeRoute = 'workflow_center';
  }

  return {
    lastRouteAttempt: lastRoute || '',
    suggestedSafeRoute: suggestedSafeRoute,
    shouldAvoidLastRoute: shouldAvoidLastRoute
  };
}

function buildSafetySection(boot, recovery){
  var safeToContinue = true;
  var safeToOpenPreferredRoute = true;
  var safeToOpenFallbackRoute = true;

  if(boot.running && boot.failCount > 1){
    safeToContinue = true;
  }

  if(recovery.runtimeFlagsDetected || recovery.stuckBootDetected){
    safeToOpenPreferredRoute = false;
  }

  if(recovery.stuckBootDetected && boot.failCount > 2){
    safeToOpenPreferredRoute = false;
    safeToOpenFallbackRoute = true;
  }

  return {
    safeToContinue: safeToContinue,
    safeToOpenPreferredRoute: safeToOpenPreferredRoute,
    safeToOpenFallbackRoute: safeToOpenFallbackRoute
  };
}

function deriveStatus(boot, recovery, safety){
  if(recovery.stuckBootDetected && boot.lastError && boot.failCount > 2){
    return 'blocked';
  }

  if(recovery.stuckBootDetected || recovery.runtimeFlagsDetected){
    if(!safety.safeToOpenPreferredRoute){
      return 'degraded';
    }
  }

  if(recovery.cacheGuardSuggested || boot.failCount > 0){
    return 'recoverable';
  }

  return 'ok';
}

function buildSummary(status){
  if(status === 'blocked'){
    return 'Boot environment blocked due to persistent errors and stuck markers.';
  }
  if(status === 'degraded'){
    return 'Boot environment degraded. Safer routing recommended.';
  }
  if(status === 'recoverable'){
    return 'Boot environment recoverable. Technical cleanup may be applied.';
  }
  return 'Boot environment healthy.';
}

function buildNotes(boot, recovery, routing){
  var notes = [];

  if(recovery.stuckBootDetected){
    uniquePush(notes, 'Stuck boot marker detected.');
  }

  if(recovery.runtimeFlagsDetected){
    uniquePush(notes, 'Ephemeral runtime flags detected.');
  }

  if(recovery.cacheGuardSuggested){
    uniquePush(notes, 'Cache guard suggests technical cleanup.');
  }

  if(boot.failCount > 0){
    uniquePush(notes, 'Previous boot failures recorded.');
  }

  if(routing.shouldAvoidLastRoute){
    uniquePush(notes, 'Last route may be unsafe to reopen.');
  }

  return notes;
}

function buildBootRecoverySnapshot(){

  var runtimeDiag;
  var cacheDiag;
  var runtimeReport;

  try{ runtimeDiag = buildRuntimeDiagnostic(); }
  catch(e){ runtimeDiag = {}; }

  try{ cacheDiag = buildBootCacheDiagnostic(); }
  catch(e){ cacheDiag = {}; }

  try{ runtimeReport = buildBootRuntimeReport(); }
  catch(e){ runtimeReport = {}; }

  var boot = buildBootSection(runtimeReport);
  var recovery = buildRecoverySection(runtimeDiag, cacheDiag, runtimeReport);
  var routing = buildRoutingSection(runtimeReport, recovery);
  var safety = buildSafetySection(boot, recovery);

  var status = deriveStatus(boot, recovery, safety);
  var summary = buildSummary(status);
  var notes = buildNotes(boot, recovery, routing);

  return {
    snapshotVersion: SNAPSHOT_VERSION,
    type: 'boot_recovery_snapshot',
    generatedAt: nowIso(),
    status: status,
    summary: summary,
    boot: boot,
    recovery: recovery,
    routing: routing,
    safety: safety,
    notes: notes
  };
}

export { buildBootRecoverySnapshot };
