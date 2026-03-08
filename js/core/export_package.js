/* FILE: /js/core/export_package.js */
// Bright Cup Creator — Export Package v0.2 SAFE
// Consolida o pacote final de exportação do projeto
// - ainda sem ZIP real
// - ainda sem PDF real
// - JS puro
// - sem DOM
// - sem dependências externas
// - compatível com Safari/iOS

import { buildColoringExportManifest } from './export_manifest.js';
import { buildColoringMetadata } from './metadata_builder.js';
import { buildColoringProjectBundle } from './project_bundle.js';

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

function clone(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (e) {
    return value;
  }
}

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (e) {
    return '';
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

function normalizeExportPlan(plan) {
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

function buildFallbackManifest(plan) {
  return {
    manifestVersion: '1.0',
    exportType: 'coloring_book_project',
    generatedAt: nowIso(),
    book: {
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
    },
    scenes: [],
    review: {
      totalScenes: Array.isArray(plan.scenes) ? plan.scenes.length : 0,
      approvedForBook: 0,
      rejected: 0,
      needsRedo: 0,
      pendingReview: 0
    },
    preflight: {
      canProceed: false,
      issues: ['manifest_builder_failed'],
      warnings: [],
      stats: {
        totalScenes: Array.isArray(plan.scenes) ? plan.scenes.length : 0,
        approvedForBook: 0,
        rejected: 0,
        needsRedo: 0,
        pendingReview: 0,
        pageTarget: plan.pageTarget || 0
      },
      summary: 'Manifest fallback generated.'
    }
  };
}

function buildFallbackMetadata(plan) {
  return {
    metadataVersion: '1.0',
    type: 'coloring_book_metadata',
    generatedAt: nowIso(),
    title: '',
    subtitle: '',
    theme: plan.theme || '',
    ageGroup: plan.ageGroup || '',
    language: plan.language || 'en',
    style: plan.style || '',
    description: '',
    keywords: [],
    categories: []
  };
}

function buildFallbackBundle(plan, manifest, metadata) {
  return {
    bundleVersion: '1.0',
    type: 'brightcup_coloring_project_bundle',
    generatedAt: nowIso(),
    plan: clone(plan),
    preflight: {
      canProceed: false,
      issues: ['project_bundle_builder_failed'],
      warnings: [],
      stats: {
        totalScenes: Array.isArray(plan.scenes) ? plan.scenes.length : 0,
        approvedForBook: 0,
        rejected: 0,
        needsRedo: 0,
        pendingReview: 0,
        pageTarget: plan.pageTarget || 0
      },
      summary: 'Bundle fallback generated.'
    },
    manifest: clone(manifest),
    metadata: clone(metadata)
  };
}

function safeBuildManifest(plan) {
  try {
    return buildColoringExportManifest(plan || {}, null);
  } catch (e) {
    return buildFallbackManifest(plan || {});
  }
}

function safeBuildMetadata(plan) {
  try {
    return buildColoringMetadata(plan || {});
  } catch (e) {
    return buildFallbackMetadata(plan || {});
  }
}

function safeBuildBundle(plan, manifest, metadata) {
  try {
    return buildColoringProjectBundle(plan || {});
  } catch (e) {
    return buildFallbackBundle(plan || {}, manifest || {}, metadata || {});
  }
}

function buildColoringExportPackage(plan) {
  var normalizedPlan = normalizeExportPlan(plan);
  var metadata = safeBuildMetadata(normalizedPlan);
  var manifest = safeBuildManifest(normalizedPlan);
  var bundle = safeBuildBundle(normalizedPlan, manifest, metadata);

  return {
    packageVersion: '1.0',
    type: 'brightcup_export_package',
    generatedAt: nowIso(),
    files: {
      'bundle.json': bundle,
      'metadata.json': metadata,
      'manifest.json': manifest,
      'plan.json': normalizedPlan
    }
  };
}

export {
  buildColoringExportPackage,
  normalizeExportPlan
};
