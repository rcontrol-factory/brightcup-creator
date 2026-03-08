/* FILE: /js/core/export_manifest.js
   Bright Cub Creator — Export Manifest v0.1 SAFE

   Escopo atual:
   - manifesto consolidado de exportação do coloring pipeline
   - não gera PDF
   - não gera ZIP
   - prepara estrutura previsível para exportação futura
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
    promptBase: toStringSafe(src.promptBase, ''),
    status: toStringSafe(src.status, 'pending') || 'pending',
    review: {
      status: normalizeReviewStatus(review.status),
      reviewedAt: toStringSafe(review.reviewedAt, ''),
      note: toStringSafe(review.note, '')
    },
    attempts: Math.max(0, toIntSafe(src.attempts, 0)),
    tags: toArraySafe(src.tags).map(function(tag){
      return toStringSafe(tag, '');
    }).filter(Boolean),
    output: src.output != null ? clone(src.output) : null
  };
}

function normalizePlan(plan) {
  var src = isObject(plan) ? plan : {};
  var scenes = toArraySafe(src.scenes).map(normalizeScene);

  return {
    id: toStringSafe(src.id, ''),
    createdAt: toStringSafe(src.createdAt, ''),
    updatedAt: toStringSafe(src.updatedAt, ''),
    theme: toStringSafe(src.theme, ''),
    ageGroup: toStringSafe(src.ageGroup, ''),
    language: toStringSafe(src.language, 'en') || 'en',
    style: toStringSafe(src.style, 'clean coloring page') || 'clean coloring page',
    pageTarget: Math.max(0, toIntSafe(src.pageTarget, 0)),
    status: toStringSafe(src.status, 'idle') || 'idle',
    scenes: scenes,
    pending: toArraySafe(src.pending),
    approved: toArraySafe(src.approved),
    rejected: toArraySafe(src.rejected),
    notes: toStringSafe(src.notes, '')
  };
}

function normalizePreflight(result) {
  var src = isObject(result) ? result : {};
  var stats = isObject(src.stats) ? src.stats : {};

  return {
    canProceed: !!src.canProceed,
    issues: toArraySafe(src.issues).map(function(x){ return toStringSafe(x, ''); }).filter(Boolean),
    warnings: toArraySafe(src.warnings).map(function(x){ return toStringSafe(x, ''); }).filter(Boolean),
    stats: {
      totalScenes: Math.max(0, toIntSafe(stats.totalScenes, 0)),
      approvedForBook: Math.max(0, toIntSafe(stats.approvedForBook, 0)),
      rejected: Math.max(0, toIntSafe(stats.rejected, 0)),
      needsRedo: Math.max(0, toIntSafe(stats.needsRedo, 0)),
      pendingReview: Math.max(0, toIntSafe(stats.pendingReview, 0)),
      pageTarget: Math.max(0, toIntSafe(stats.pageTarget, 0))
    },
    summary: toStringSafe(src.summary, '')
  };
}

function summarizeReviewStates(plan) {
  var p = normalizePlan(plan);
  var scenes = p.scenes || [];
  var out = {
    totalScenes: scenes.length,
    approvedForBook: 0,
    rejected: 0,
    needsRedo: 0,
    pendingReview: 0
  };
  var i;
  var state;

  for (i = 0; i < scenes.length; i += 1) {
    state = normalizeReviewStatus(scenes[i] && scenes[i].review && scenes[i].review.status);

    if (state === 'approved_for_book') out.approvedForBook += 1;
    else if (state === 'rejected') out.rejected += 1;
    else if (state === 'needs_redo') out.needsRedo += 1;
    else out.pendingReview += 1;
  }

  return out;
}

function buildBookSection(plan) {
  var p = normalizePlan(plan);

  return {
    id: p.id,
    theme: p.theme,
    ageGroup: p.ageGroup,
    language: p.language,
    style: p.style,
    pageTarget: p.pageTarget,
    status: p.status,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    notes: p.notes
  };
}

function buildScenesSection(plan) {
  var p = normalizePlan(plan);

  return p.scenes.map(function(scene, index){
    return {
      index: index + 1,
      id: scene.id,
      title: scene.title,
      promptBase: scene.promptBase,
      status: scene.status,
      reviewStatus: scene.review && scene.review.status ? scene.review.status : 'pending_review',
      reviewedAt: scene.review && scene.review.reviewedAt ? scene.review.reviewedAt : '',
      reviewNote: scene.review && scene.review.note ? scene.review.note : '',
      attempts: scene.attempts,
      tags: scene.tags.slice(),
      output: scene.output != null ? clone(scene.output) : null
    };
  });
}

function buildColoringExportManifest(plan, preflightResult) {
  var normalizedPlan = normalizePlan(plan);
  var normalizedPreflight = normalizePreflight(preflightResult);
  var reviewSummary = summarizeReviewStates(normalizedPlan);

  return {
    manifestVersion: '1.0',
    exportType: 'coloring_book_project',
    generatedAt: nowIso(),
    book: buildBookSection(normalizedPlan),
    scenes: buildScenesSection(normalizedPlan),
    review: {
      totalScenes: reviewSummary.totalScenes,
      approvedForBook: reviewSummary.approvedForBook,
      rejected: reviewSummary.rejected,
      needsRedo: reviewSummary.needsRedo,
      pendingReview: reviewSummary.pendingReview
    },
    preflight: {
      canProceed: normalizedPreflight.canProceed,
      issues: normalizedPreflight.issues.slice(),
      warnings: normalizedPreflight.warnings.slice(),
      stats: clone(normalizedPreflight.stats),
      summary: normalizedPreflight.summary
    }
  };
}

export {
  buildColoringExportManifest,
  summarizeReviewStates
};
