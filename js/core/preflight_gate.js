/* FILE: /js/core/preflight_gate.js
   Bright Cub Creator — Preflight Gate v0.1 SAFE

   Escopo atual:
   - gate pré-exportação do coloring pipeline
   - não gera PDF
   - decide se o plano pode seguir para exportação futura
   - JS puro
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

function normalizeReviewStatus(status) {
  var s = toStringSafe(status, 'pending_review').toLowerCase();

  if (s === 'approved_for_book') return 'approved_for_book';
  if (s === 'rejected') return 'rejected';
  if (s === 'needs_redo') return 'needs_redo';
  return 'pending_review';
}

function normalizeScene(scene) {
  var src = isObject(scene) ? scene : {};
  var review = isObject(src.review) ? src.review : {};

  return {
    id: toStringSafe(src.id, ''),
    title: toStringSafe(src.title, ''),
    status: toStringSafe(src.status, 'pending'),
    review: {
      status: normalizeReviewStatus(review.status),
      reviewedAt: toStringSafe(review.reviewedAt, ''),
      note: toStringSafe(review.note, '')
    }
  };
}

function normalizePlan(plan) {
  var src = isObject(plan) ? plan : {};
  var scenes = toArraySafe(src.scenes).map(normalizeScene);

  return {
    id: toStringSafe(src.id, ''),
    theme: toStringSafe(src.theme, ''),
    pageTarget: Math.max(0, toIntSafe(src.pageTarget, 0)),
    scenes: scenes
  };
}

function countReviewStates(scenes) {
  var stats = {
    approvedForBook: 0,
    rejected: 0,
    needsRedo: 0,
    pendingReview: 0
  };

  var list = toArraySafe(scenes);
  var i;
  var scene;
  var state;

  for (i = 0; i < list.length; i += 1) {
    scene = normalizeScene(list[i]);
    state = normalizeReviewStatus(scene.review && scene.review.status);

    if (state === 'approved_for_book') stats.approvedForBook += 1;
    else if (state === 'rejected') stats.rejected += 1;
    else if (state === 'needs_redo') stats.needsRedo += 1;
    else stats.pendingReview += 1;
  }

  return stats;
}

function summarizePreflight(result) {
  var r = isObject(result) ? result : {};
  var stats = isObject(r.stats) ? r.stats : {};
  var total = toIntSafe(stats.totalScenes, 0);
  var approved = toIntSafe(stats.approvedForBook, 0);
  var rejected = toIntSafe(stats.rejected, 0);
  var redo = toIntSafe(stats.needsRedo, 0);
  var pending = toIntSafe(stats.pendingReview, 0);
  var target = toIntSafe(stats.pageTarget, 0);

  if (r.canProceed) {
    return (
      'Preflight aprovado. ' +
      approved + ' de ' + total + ' cenas estão aprovadas para o livro, ' +
      'com pageTarget=' + target + ' e sem bloqueios críticos.'
    );
  }

  return (
    'Preflight bloqueado. ' +
    'Aprovadas: ' + approved +
    ', pendentes: ' + pending +
    ', needs redo: ' + redo +
    ', rejeitadas: ' + rejected +
    ', total: ' + total +
    ', pageTarget: ' + target + '.'
  );
}

function evaluateColoringPreflight(plan) {
  var normalized = normalizePlan(plan);
  var issues = [];
  var warnings = [];
  var reviewStats = countReviewStates(normalized.scenes);
  var totalScenes = normalized.scenes.length;
  var pageTarget = normalized.pageTarget;
  var approvedForBook = reviewStats.approvedForBook;
  var rejected = reviewStats.rejected;
  var needsRedo = reviewStats.needsRedo;
  var pendingReview = reviewStats.pendingReview;

  if (!normalized.id) {
    issues.push('plan.id is required');
  }

  if (!normalized.theme) {
    issues.push('plan.theme is required');
  }

  if (pageTarget <= 0) {
    issues.push('plan.pageTarget must be greater than 0');
  }

  if (!Array.isArray(normalized.scenes)) {
    issues.push('plan.scenes must be an array');
  }

  if (totalScenes <= 0) {
    issues.push('plan.scenes is empty');
  }

  if (pageTarget > 0 && totalScenes > 0 && totalScenes < pageTarget) {
    issues.push('total scenes is lower than pageTarget');
  }

  if (pageTarget > 0 && totalScenes > pageTarget) {
    warnings.push('total scenes is higher than pageTarget');
  }

  if (pendingReview > 0) {
    issues.push('there are scenes still pending human review');
  }

  if (needsRedo > 0) {
    issues.push('there are scenes marked as needs_redo');
  }

  if (approvedForBook <= 0) {
    issues.push('there are no scenes approved_for_book');
  }

  if (pageTarget > 0 && approvedForBook < pageTarget) {
    issues.push('approved_for_book count is insufficient for pageTarget');
  }

  if (rejected > 0 && approvedForBook >= pageTarget) {
    warnings.push('there are rejected scenes, even though approved count is sufficient');
  }

  var result = {
    canProceed: issues.length === 0,
    issues: issues,
    warnings: warnings,
    stats: {
      totalScenes: totalScenes,
      approvedForBook: approvedForBook,
      rejected: rejected,
      needsRedo: needsRedo,
      pendingReview: pendingReview,
      pageTarget: pageTarget
    },
    summary: ''
  };

  result.summary = summarizePreflight(result);
  return result;
}

export {
  evaluateColoringPreflight,
  summarizePreflight
};
