/* FILE: /js/core/generation_queue.js
   Bright Cub Creator — Generation Queue v0.1 SAFE

   Escopo atual:
   - fila lógica do pipeline de coloring books
   - sem geração real de imagens
   - sem DOM
   - sem dependências externas
   - compatível com Safari/iOS
*/

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function toStringSafe(value, fallback) {
  if (value == null) return fallback || '';
  return String(value).trim();
}

function toIntSafe(value, fallback) {
  var n = parseInt(value, 10);
  if (!isFinite(n)) return typeof fallback === 'number' ? fallback : 0;
  return n;
}

function toArraySafe(value) {
  return Array.isArray(value) ? value.slice() : [];
}

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (e) {
    return '';
  }
}

function clone(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (e) {
    return value;
  }
}

function normalizeStatus(status) {
  var s = toStringSafe(status, 'pending').toLowerCase();
  if (s === 'approved') return 'approved';
  if (s === 'rejected') return 'rejected';
  if (s === 'processing') return 'processing';
  return 'pending';
}

function uniqueIds(list) {
  var arr = toArraySafe(list);
  var out = [];
  var seen = Object.create(null);
  var i;
  var id;

  for (i = 0; i < arr.length; i += 1) {
    id = toStringSafe(arr[i], '');
    if (!id) continue;
    if (seen[id]) continue;
    seen[id] = true;
    out.push(id);
  }

  return out;
}

function normalizeScene(scene) {
  var src = isObject(scene) ? scene : {};
  return {
    id: toStringSafe(src.id, ''),
    title: toStringSafe(src.title, ''),
    promptBase: toStringSafe(src.promptBase, ''),
    status: normalizeStatus(src.status),
    tags: Array.isArray(src.tags) ? src.tags.slice() : [],
    attempts: Math.max(0, toIntSafe(src.attempts, 0)),
    processingAt: toStringSafe(src.processingAt, ''),
    approvedAt: toStringSafe(src.approvedAt, ''),
    rejectedAt: toStringSafe(src.rejectedAt, ''),
    rejectionReason: toStringSafe(src.rejectionReason, ''),
    output: isObject(src.output) ? clone(src.output) : (src.output != null ? src.output : null)
  };
}

function normalizePlan(plan) {
  var src = isObject(plan) ? clone(plan) : {};
  var scenes = toArraySafe(src.scenes).map(normalizeScene);

  return {
    id: toStringSafe(src.id, ''),
    createdAt: toStringSafe(src.createdAt, ''),
    updatedAt: toStringSafe(src.updatedAt, nowIso()),
    theme: toStringSafe(src.theme, ''),
    ageGroup: toStringSafe(src.ageGroup, ''),
    pageTarget: Math.max(0, toIntSafe(src.pageTarget, 0)),
    language: toStringSafe(src.language, 'en') || 'en',
    style: toStringSafe(src.style, 'clean coloring page') || 'clean coloring page',
    status: toStringSafe(src.status, 'idle') || 'idle',
    scenes: scenes,
    pending: uniqueIds(src.pending),
    approved: uniqueIds(src.approved),
    rejected: uniqueIds(src.rejected),
    notes: toStringSafe(src.notes, '')
  };
}

function findSceneIndex(plan, sceneId) {
  var id = toStringSafe(sceneId, '');
  var scenes = plan && Array.isArray(plan.scenes) ? plan.scenes : [];
  var i;

  for (i = 0; i < scenes.length; i += 1) {
    if (toStringSafe(scenes[i] && scenes[i].id, '') === id) return i;
  }

  return -1;
}

function rebuildGenerationQueues(plan) {
  var next = normalizePlan(plan);
  var pending = [];
  var approved = [];
  var rejected = [];
  var processing = [];
  var i;
  var scene;

  for (i = 0; i < next.scenes.length; i += 1) {
    scene = normalizeScene(next.scenes[i]);
    next.scenes[i] = scene;

    if (!scene.id) continue;

    if (scene.status === 'approved') approved.push(scene.id);
    else if (scene.status === 'rejected') rejected.push(scene.id);
    else if (scene.status === 'processing') processing.push(scene.id);
    else pending.push(scene.id);
  }

  next.pending = uniqueIds(pending);
  next.approved = uniqueIds(approved);
  next.rejected = uniqueIds(rejected);

  if (approved.length && approved.length >= next.scenes.length && next.scenes.length > 0) {
    next.status = 'completed';
  } else if (processing.length) {
    next.status = 'processing';
  } else if (pending.length) {
    next.status = 'planned';
  } else if (rejected.length && !approved.length) {
    next.status = 'review';
  } else if (next.scenes.length > 0) {
    next.status = 'planned';
  } else {
    next.status = next.status || 'idle';
  }

  next.updatedAt = nowIso();
  return next;
}

function getNextPendingScene(plan) {
  var next = rebuildGenerationQueues(plan);
  var firstId = next.pending && next.pending.length ? next.pending[0] : '';
  var index = findSceneIndex(next, firstId);

  return {
    plan: next,
    scene: index >= 0 ? clone(next.scenes[index]) : null
  };
}

function markSceneProcessing(plan, sceneId) {
  var next = rebuildGenerationQueues(plan);
  var index = findSceneIndex(next, sceneId);

  if (index < 0) {
    return {
      ok: false,
      error: 'scene not found',
      plan: next,
      scene: null
    };
  }

  next.scenes[index].status = 'processing';
  next.scenes[index].processingAt = nowIso();

  next = rebuildGenerationQueues(next);

  return {
    ok: true,
    plan: next,
    scene: clone(next.scenes[findSceneIndex(next, sceneId)])
  };
}

function approveScene(plan, sceneId, payload) {
  var next = rebuildGenerationQueues(plan);
  var index = findSceneIndex(next, sceneId);
  var scene;

  if (index < 0) {
    return {
      ok: false,
      error: 'scene not found',
      plan: next,
      scene: null
    };
  }

  scene = next.scenes[index];
  scene.status = 'approved';
  scene.approvedAt = nowIso();
  scene.rejectedAt = '';
  scene.rejectionReason = '';
  scene.processingAt = '';

  if (payload !== undefined) {
    scene.output = clone(payload);
  }

  next = rebuildGenerationQueues(next);

  return {
    ok: true,
    plan: next,
    scene: clone(next.scenes[findSceneIndex(next, sceneId)])
  };
}

function rejectScene(plan, sceneId, reason) {
  var next = rebuildGenerationQueues(plan);
  var index = findSceneIndex(next, sceneId);
  var scene;

  if (index < 0) {
    return {
      ok: false,
      error: 'scene not found',
      plan: next,
      scene: null
    };
  }

  scene = next.scenes[index];
  scene.status = 'rejected';
  scene.rejectedAt = nowIso();
  scene.approvedAt = '';
  scene.processingAt = '';
  scene.rejectionReason = toStringSafe(reason, '');

  next = rebuildGenerationQueues(next);

  return {
    ok: true,
    plan: next,
    scene: clone(next.scenes[findSceneIndex(next, sceneId)])
  };
}

function incrementSceneAttempts(plan, sceneId) {
  var next = rebuildGenerationQueues(plan);
  var index = findSceneIndex(next, sceneId);

  if (index < 0) {
    return {
      ok: false,
      error: 'scene not found',
      plan: next,
      scene: null
    };
  }

  next.scenes[index].attempts = Math.max(0, toIntSafe(next.scenes[index].attempts, 0)) + 1;
  next.updatedAt = nowIso();

  return {
    ok: true,
    plan: next,
    scene: clone(next.scenes[index])
  };
}

export {
  getNextPendingScene,
  markSceneProcessing,
  approveScene,
  rejectScene,
  incrementSceneAttempts,
  rebuildGenerationQueues
};
