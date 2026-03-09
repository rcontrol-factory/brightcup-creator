/* FILE: /js/core/runtime_stability_guard.js */
// Bright Cup Creator — Runtime Stability Guard v0.1 SAFE
// Camada técnica leve para estabilidade de runtime
// - sem dependências externas
// - sem DOM pesado
// - sem overlay
// - sem popup
// - sem canvas
// - compatível com Safari/iOS
// - não apaga dados do usuário
// - não apaga coloring:book_plan
// - não apaga config útil

var RUNTIME_EPHEMERAL_KEYS = [
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

function safeSessionGet(key, fallback){
  try {
    var value = sessionStorage.getItem(String(key));
    return value == null ? fallback : value;
  } catch (e) {
    return fallback;
  }
}

function safeSessionSet(key, value){
  try {
    sessionStorage.setItem(String(key), String(value));
    return true;
  } catch (e) {
    return false;
  }
}

function safeSessionRemove(key){
  try {
    sessionStorage.removeItem(String(key));
    return true;
  } catch (e) {
    return false;
  }
}

function safeLocalGet(key, fallback){
  try {
    var value = localStorage.getItem(String(key));
    return value == null ? fallback : value;
  } catch (e) {
    return fallback;
  }
}

function safeLocalSet(key, value){
  try {
    localStorage.setItem(String(key), String(value));
    return true;
  } catch (e) {
    return false;
  }
}

function safeLocalRemove(key){
  try {
    localStorage.removeItem(String(key));
    return true;
  } catch (e) {
    return false;
  }
}

function toIntSafe(value, fallback){
  var n = parseInt(value, 10);
  if (!isFinite(n)) return typeof fallback === 'number' ? fallback : 0;
  return n;
}

function markRuntimeFlag(key, value){
  var k = String(key || '');
  if (!k) return false;
  return safeSessionSet(k, value == null ? '' : value);
}

function clearRuntimeFlag(key){
  var k = String(key || '');
  if (!k) return false;
  return safeSessionRemove(k);
}

function readRuntimeFlag(key, fallback){
  var k = String(key || '');
  if (!k) return fallback;
  return safeSessionGet(k, fallback);
}

function recoverRuntimeState(){
  var removedSession = [];
  var removedLocal = [];
  var i;
  var key;

  for (i = 0; i < RUNTIME_EPHEMERAL_KEYS.length; i += 1){
    key = RUNTIME_EPHEMERAL_KEYS[i];

    if (safeSessionRemove(key)) {
      removedSession.push(key);
    }

    if (safeLocalRemove(key)) {
      removedLocal.push(key);
    }
  }

  return {
    ok: true,
    recoveredAt: (function(){
      try { return new Date().toISOString(); } catch (e) { return ''; }
    })(),
    removedSessionFlags: removedSession,
    removedLocalFlags: removedLocal,
    preservedUserData: true,
    preservedProjectData: true,
    preservedConfig: true
  };
}

function buildRuntimeDiagnostic(){
  var sessionFlags = {};
  var localFlags = {};
  var notes = [];
  var i;
  var key;
  var sessionValue;
  var localValue;

  for (i = 0; i < RUNTIME_EPHEMERAL_KEYS.length; i += 1){
    key = RUNTIME_EPHEMERAL_KEYS[i];

    sessionValue = safeSessionGet(key, null);
    localValue = safeLocalGet(key, null);

    if (sessionValue != null) {
      sessionFlags[key] = sessionValue;
    }

    if (localValue != null) {
      localFlags[key] = localValue;
    }
  }

  if (Object.keys(sessionFlags).length === 0) {
    notes.push('No session runtime flags found.');
  }

  if (Object.keys(localFlags).length === 0) {
    notes.push('No local runtime flags found.');
  }

  if (Object.keys(sessionFlags).length > 0 || Object.keys(localFlags).length > 0) {
    notes.push('Ephemeral runtime flags detected.');
  }

  return {
    generatedAt: (function(){
      try { return new Date().toISOString(); } catch (e) { return ''; }
    })(),
    sessionFlags: sessionFlags,
    localFlags: localFlags,
    notes: notes,
    hasSessionFlags: Object.keys(sessionFlags).length > 0,
    hasLocalFlags: Object.keys(localFlags).length > 0,
    hasAnyRuntimeFlags: Object.keys(sessionFlags).length > 0 || Object.keys(localFlags).length > 0,
    safeToRecover: true
  };
}

export {
  safeSessionGet,
  safeSessionSet,
  safeSessionRemove,
  safeLocalRemove,
  safeLocalGet,
  safeLocalSet,
  toIntSafe,
  markRuntimeFlag,
  clearRuntimeFlag,
  readRuntimeFlag,
  recoverRuntimeState,
  buildRuntimeDiagnostic
};
