/* FILE: /js/core/batch_runner.js
   Bright Cub Creator — Batch Runner v0.1 SAFE

   Escopo atual:
   - executor lógico/preparatório de lote
   - sem geração real de imagem
   - trabalha 1 cena por vez
   - compatível com a generation_queue atual
   - JS puro
   - sem DOM
   - sem dependências externas
   - compatível com Safari/iOS
*/

import {
  rebuildGenerationQueues,
  getNextPendingScene,
  markSceneProcessing,
  approveScene,
  rejectScene,
  incrementSceneAttempts
} from './generation_queue.js';

function toStringSafe(value, fallback) {
  if (value == null) return fallback || '';
  return String(value).trim();
}

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function clone(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (e) {
    return value;
  }
}

function findProcessingScene(plan) {
  var p = rebuildGenerationQueues(plan || {});
  var scenes = Array.isArray(p.scenes) ? p.scenes : [];
  var i;
  var scene;

  for (i = 0; i < scenes.length; i += 1) {
    scene = scenes[i] || {};
    if (String(scene.status || '').toLowerCase() === 'processing') {
      return clone(scene);
    }
  }

  return null;
}

function getBatchRunnerState(plan) {
  var p = rebuildGenerationQueues(plan || {});
  var nextInfo = getNextPendingScene(p);
  var processingScene = findProcessingScene(p);

  return {
    ok: true,
    plan: p,
    status: p.status || 'idle',
    processingScene: processingScene,
    nextPendingScene: nextInfo && nextInfo.scene ? clone(nextInfo.scene) : null,
    counts: {
      scenes: Array.isArray(p.scenes) ? p.scenes.length : 0,
      pending: Array.isArray(p.pending) ? p.pending.length : 0,
      approved: Array.isArray(p.approved) ? p.approved.length : 0,
      rejected: Array.isArray(p.rejected) ? p.rejected.length : 0,
      processing: processingScene ? 1 : 0
    }
  };
}

function prepareNextScene(plan) {
  var p = rebuildGenerationQueues(plan || {});
  var state = getBatchRunnerState(p);
  var nextScene = state.nextPendingScene;

  if (!nextScene) {
    return {
      ok: true,
      action: 'idle',
      plan: p,
      scene: null,
      message: 'No pending scene available.'
    };
  }

  var inc = incrementSceneAttempts(p, nextScene.id);
  p = inc && inc.ok ? inc.plan : p;

  var marked = markSceneProcessing(p, nextScene.id);
  if (!marked || !marked.ok) {
    return {
      ok: false,
      action: 'idle',
      plan: p,
      scene: null,
      message: marked && marked.error ? marked.error : 'Failed to mark scene as processing.'
    };
  }

  return {
    ok: true,
    action: 'prepared',
    plan: marked.plan,
    scene: marked.scene ? clone(marked.scene) : null,
    message: 'Next pending scene prepared.'
  };
}

function finalizeSceneSuccess(plan, sceneId, payload) {
  var p = rebuildGenerationQueues(plan || {});
  var id = toStringSafe(sceneId, '');

  if (!id) {
    return {
      ok: false,
      action: 'idle',
      plan: p,
      scene: null,
      message: 'sceneId is required.'
    };
  }

  var approved = approveScene(p, id, isObject(payload) ? payload : (payload !== undefined ? { result: payload } : null));
  if (!approved || !approved.ok) {
    return {
      ok: false,
      action: 'idle',
      plan: p,
      scene: null,
      message: approved && approved.error ? approved.error : 'Failed to approve scene.'
    };
  }

  return {
    ok: true,
    action: 'approved',
    plan: approved.plan,
    scene: approved.scene ? clone(approved.scene) : null,
    message: 'Scene finalized with success.'
  };
}

function finalizeSceneFailure(plan, sceneId, reason) {
  var p = rebuildGenerationQueues(plan || {});
  var id = toStringSafe(sceneId, '');

  if (!id) {
    return {
      ok: false,
      action: 'idle',
      plan: p,
      scene: null,
      message: 'sceneId is required.'
    };
  }

  var rejected = rejectScene(p, id, toStringSafe(reason, 'batch-step-failed'));
  if (!rejected || !rejected.ok) {
    return {
      ok: false,
      action: 'idle',
      plan: p,
      scene: null,
      message: rejected && rejected.error ? rejected.error : 'Failed to reject scene.'
    };
  }

  return {
    ok: true,
    action: 'rejected',
    plan: rejected.plan,
    scene: rejected.scene ? clone(rejected.scene) : null,
    message: 'Scene finalized with failure.'
  };
}

function runNextBatchStep(plan, options) {
  var p = rebuildGenerationQueues(plan || {});
  var opts = isObject(options) ? options : {};
  var processingScene = findProcessingScene(p);

  if (processingScene) {
    if (opts.finalize === 'success') {
      return finalizeSceneSuccess(p, processingScene.id, opts.payload);
    }

    if (opts.finalize === 'failure') {
      return finalizeSceneFailure(p, processingScene.id, opts.reason || 'batch-step-failed');
    }

    return {
      ok: true,
      action: 'idle',
      plan: p,
      scene: processingScene,
      message: 'A scene is already processing.'
    };
  }

  return prepareNextScene(p);
}

export {
  runNextBatchStep,
  prepareNextScene,
  finalizeSceneSuccess,
  finalizeSceneFailure,
  getBatchRunnerState
};
