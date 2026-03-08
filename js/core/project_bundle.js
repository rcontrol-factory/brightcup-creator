/* FILE: /js/core/project_bundle.js */
// Bright Cup Creator — Project Bundle v0.2 SAFE
// Consolida o bundle editorial final do coloring pipeline
// - plan + preflight + manifest + metadata
// - ainda sem ZIP real
// - ainda sem PDF real
// - JS puro
// - sem DOM
// - sem dependências externas
// - compatível com Safari/iOS

import { evaluateColoringPreflight } from './preflight_gate.js';
import { buildColoringExportManifest } from './export_manifest.js';
import { buildColoringMetadata } from './metadata_builder.js';

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
    processingAt: toStringSafe(src.processingAt, ''),
    approvedAt: toStringSafe(src.approvedAt, ''),
    rejectedAt: toStringSafe(src.rejectedAt, ''),
    rejectionReason: toStringSafe(src.rejectionReason, ''),
    output: src.output != null ? clone(src.output) : null,
    review: {
      status: normalizeReviewStatus(review.status),
      reviewedAt: toStringSafe(review.reviewedAt, ''),
      note: toStringSafe(review.note, '')
    }
  };
}

function normalizeBundlePlan(plan) {
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
    pending: toArraySafe(src.pending).map(function(id) {
      return toStringSafe(id, '');
    }).filter(Boolean),
    approved: toArraySafe(src.approved).map(function(id) {
      return toStringSafe(id, '');
    }).filter(Boolean),
    rejected: toArraySafe(src.rejected).map(function(id) {
      return toStringSafe(id, '');
    }).filter(Boolean),
    scenes: scenes
  };
}

function buildFallbackPreflight(plan, reason) {
  return {
    canProceed: false,
    issues: [toStringSafe(reason, 'preflight_builder_failed')],
    warnings: [],
    stats: {
      totalScenes: Array.isArray(plan && plan.scenes) ? plan.scenes.length : 0,
      approvedForBook: 0,
      rejected: 0,
      needsRedo: 0,
      pendingReview: 0,
      pageTarget: plan && plan.pageTarget ? plan.pageTarget : 0
    },
    summary: 'Preflight fallback generated.'
  };
}

function buildFallbackManifest(plan, preflight, reason) {
  return {
    manifestVersion: '1.0',
    exportType: 'coloring_book_project',
    generatedAt: nowIso(),
    book: {
      id: plan && plan.id ? plan.id : '',
      theme: plan && plan.theme ? plan.theme : '',
      ageGroup: plan && plan.ageGroup ? plan.ageGroup : '',
      language: plan && plan.language ? plan.language : 'en',
      style: plan && plan.style ? plan.style : '',
      pageTarget: plan && plan.pageTarget ? plan.pageTarget : 0,
      status: plan && plan.status ? plan.status : 'idle',
      createdAt: plan && plan.createdAt ? plan.createdAt : '',
      updatedAt: plan && plan.updatedAt ? plan.updatedAt : '',
      notes: plan && plan.notes ? plan.notes : ''
    },
    scenes: [],
    review: {
      totalScenes: Array.isArray(plan && plan.scenes) ? plan.scenes.length : 0,
      approvedForBook: 0,
      rejected: 0,
      needsRedo: 0,
      pendingReview: 0
    },
    preflight: clone(preflight || buildFallbackPreflight(plan, reason || 'manifest_builder_failed'))
  };
}

function buildFallbackMetadata(plan, reason) {
  return {
    metadataVersion: '1.0',
    type: 'coloring_book_metadata',
    generatedAt: nowIso(),
    title: '',
    subtitle: '',
    theme: plan && plan.theme ? plan.theme : '',
    ageGroup: plan && plan.ageGroup ? plan.ageGroup : '',
    language: plan && plan.language ? plan.language : 'en',
    style: plan && plan.style ? plan.style : '',
    description: '',
    keywords: [],
    categories: [],
    _fallback: toStringSafe(reason, 'metadata_builder_failed')
  };
}

function safeEvaluatePreflight(plan) {
  try {
    return evaluateColoringPreflight(plan || {});
  } catch (e) {
    return buildFallbackPreflight(plan || {}, 'preflight_builder_failed');
  }
}

function safeBuildManifest(plan, preflight) {
  try {
    return buildColoringExportManifest(plan || {}, preflight || {});
  } catch (e) {
    return buildFallbackManifest(plan || {}, preflight || buildFallbackPreflight(plan || {}, 'preflight_builder_failed'), 'manifest_builder_failed');
  }
}

function safeBuildMetadata(plan) {
  try {
    return buildColoringMetadata(plan || {});
  } catch (e) {
    return buildFallbackMetadata(plan || {}, 'metadata_builder_failed');
  }
}

function buildColoringProjectBundle(plan) {
  var normalizedPlan = normalizeBundlePlan(plan);
  var preflight = safeEvaluatePreflight(normalizedPlan);
  var manifest = safeBuildManifest(normalizedPlan, preflight);
  var metadata = safeBuildMetadata(normalizedPlan);

  return {
    bundleVersion: '1.0',
    type: 'brightcup_coloring_project_bundle',
    generatedAt: nowIso(),
    plan: normalizedPlan,
    preflight: preflight,
    manifest: manifest,
    metadata: metadata
  };
}

export {
  buildColoringProjectBundle,
  normalizeBundlePlan
};
