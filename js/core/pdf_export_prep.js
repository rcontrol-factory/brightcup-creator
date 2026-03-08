/* FILE: /js/core/pdf_export_prep.js */
// Bright Cup Creator — PDF Export Prep v0.1 SAFE
// Base lógica da futura exportação para PDF
// - ainda SEM gerar PDF real
// - sem DOM
// - sem canvas
// - sem dependências externas
// - compatível com Safari/iOS
// - foco no interior do livro

import { evaluateColoringPreflight } from './preflight_gate.js';

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
    attempts: Math.max(0, toIntSafe(src.attempts, 0)),
    tags: toArraySafe(src.tags).map(function(tag) {
      return toStringSafe(tag, '');
    }).filter(Boolean),
    output: src.output != null ? clone(src.output) : null,
    review: {
      status: normalizeReviewStatus(review.status),
      reviewedAt: toStringSafe(review.reviewedAt, ''),
      note: toStringSafe(review.note, '')
    }
  };
}

function normalizePdfExportPlan(plan) {
  var src = isObject(plan) ? clone(plan) : {};
  var scenes = toArraySafe(src.scenes).map(normalizeScene);

  return {
    id: toStringSafe(src.id, ''),
    createdAt: toStringSafe(src.createdAt, ''),
    updatedAt: toStringSafe(src.updatedAt, ''),
    theme: toStringSafe(src.theme, ''),
    ageGroup: toStringSafe(src.ageGroup, ''),
    pageTarget: Math.max(0, toIntSafe(src.pageTarget, 0)),
    language: toStringSafe(src.language, 'en') || 'en',
    style: toStringSafe(src.style, 'clean coloring page') || 'clean coloring page',
    status: toStringSafe(src.status, 'idle') || 'idle',
    notes: toStringSafe(src.notes, ''),
    scenes: scenes
  };
}

function safeEvaluatePreflight(plan) {
  try {
    return evaluateColoringPreflight(plan || {});
  } catch (e) {
    return {
      canProceed: false,
      issues: ['preflight evaluation failed: ' + String((e && e.message) || e || 'unknown error')],
      warnings: [],
      stats: {
        totalScenes: Array.isArray(plan && plan.scenes) ? plan.scenes.length : 0,
        approvedForBook: 0,
        rejected: 0,
        needsRedo: 0,
        pendingReview: 0,
        pageTarget: plan && plan.pageTarget ? plan.pageTarget : 0
      },
      summary: 'Preflight failed.'
    };
  }
}

function buildBookSection(plan) {
  return {
    id: plan.id || '',
    theme: plan.theme || '',
    ageGroup: plan.ageGroup || '',
    language: plan.language || 'en',
    style: plan.style || '',
    pageTarget: plan.pageTarget || 0,
    status: plan.status || 'idle',
    createdAt: plan.createdAt || '',
    updatedAt: plan.updatedAt || '',
    notes: plan.notes || ''
  };
}

function buildEligiblePages(plan) {
  var scenes = toArraySafe(plan && plan.scenes);
  var pages = [];
  var i;
  var scene;
  var reviewStatus;

  for (i = 0; i < scenes.length; i += 1) {
    scene = scenes[i];
    reviewStatus = normalizeReviewStatus(scene && scene.review && scene.review.status);

    if (reviewStatus !== 'approved_for_book') continue;

    pages.push({
      index: pages.length + 1,
      sceneId: toStringSafe(scene.id, ''),
      title: toStringSafe(scene.title, ''),
      promptBase: toStringSafe(scene.promptBase, ''),
      reviewStatus: reviewStatus,
      output: scene.output != null ? clone(scene.output) : null
    });
  }

  return pages;
}

function buildStats(plan, pages, preflight) {
  var scenes = toArraySafe(plan && plan.scenes);
  var approvedScenes = pages.length;
  var target = Math.max(0, toIntSafe(plan && plan.pageTarget, 0));

  return {
    totalScenes: scenes.length,
    eligiblePages: approvedScenes,
    pageTarget: target,
    missingApprovedPages: Math.max(0, target - approvedScenes),
    preflightCanProceed: !!(preflight && preflight.canProceed)
  };
}

function buildSummary(plan, pages, preflight, canBuildPdf) {
  var target = Math.max(0, toIntSafe(plan && plan.pageTarget, 0));
  var approved = pages.length;

  if (canBuildPdf) {
    return (
      'PDF prep ready. ' +
      approved + ' approved pages are organized for the book interior, ' +
      'with pageTarget=' + target + ' and preflight cleared.'
    );
  }

  return (
    'PDF prep blocked. ' +
    approved + ' approved pages found for pageTarget=' + target +
    '. Resolve preflight/review blockers before building the PDF interior.'
  );
}

function buildFallbackPdfPrep(plan, reason) {
  var normalizedPlan = normalizePdfExportPlan(plan || {});
  var preflight = safeEvaluatePreflight(normalizedPlan);

  return {
    prepVersion: '1.0',
    type: 'brightcup_pdf_export_prep',
    generatedAt: nowIso(),
    canBuildPdf: false,
    summary: 'PDF export prep fallback generated.',
    book: buildBookSection(normalizedPlan),
    pages: [],
    stats: {
      totalScenes: Array.isArray(normalizedPlan.scenes) ? normalizedPlan.scenes.length : 0,
      eligiblePages: 0,
      pageTarget: normalizedPlan.pageTarget || 0,
      missingApprovedPages: normalizedPlan.pageTarget || 0,
      preflightCanProceed: !!preflight.canProceed
    },
    preflight: clone(preflight),
    _fallback: toStringSafe(reason, 'pdf_export_prep_failed')
  };
}

function buildPdfExportPrep(plan) {
  try {
    var normalizedPlan = normalizePdfExportPlan(plan || {});
    var preflight = safeEvaluatePreflight(normalizedPlan);
    var pages = buildEligiblePages(normalizedPlan);
    var canBuildPdf = !!(preflight && preflight.canProceed);
    var stats = buildStats(normalizedPlan, pages, preflight);

    return {
      prepVersion: '1.0',
      type: 'brightcup_pdf_export_prep',
      generatedAt: nowIso(),
      canBuildPdf: canBuildPdf,
      summary: buildSummary(normalizedPlan, pages, preflight, canBuildPdf),
      book: buildBookSection(normalizedPlan),
      pages: pages,
      stats: stats,
      preflight: clone(preflight)
    };
  } catch (e) {
    return buildFallbackPdfPrep(plan || {}, String((e && e.message) || e || 'unknown error'));
  }
}

export {
  buildPdfExportPrep,
  normalizePdfExportPlan
};
