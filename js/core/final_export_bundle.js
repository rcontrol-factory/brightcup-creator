/* FILE: /js/core/final_export_bundle.js */
// Bright Cup Creator — Final Export Bundle v0.1 SAFE
// Consolidação lógica final do pipeline editorial de exportação
// - ainda SEM PDF real
// - ainda SEM ZIP real
// - sem DOM
// - sem dependências externas
// - compatível com Safari/iOS

import { evaluateColoringPreflight } from './preflight_gate.js';
import { buildColoringExportManifest } from './export_manifest.js';
import { buildColoringMetadata } from './metadata_builder.js';
import { buildColoringProjectBundle } from './project_bundle.js';
import { buildColoringExportPackage } from './export_package.js';
import { buildZipExportPayload } from './zip_export.js';
import { buildPdfExportPrep } from './pdf_export_prep.js';
import { buildInteriorPdfPayload } from './interior_pdf_payload.js';

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

function normalizeFinalExportPlan(plan) {
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

function safeBuildManifest(plan, preflight) {
  try {
    return buildColoringExportManifest(plan || {}, preflight || {});
  } catch (e) {
    return {
      manifestVersion: '1.0',
      exportType: 'coloring_book_project',
      generatedAt: nowIso(),
      book: {
        id: toStringSafe(plan && plan.id, ''),
        theme: toStringSafe(plan && plan.theme, ''),
        ageGroup: toStringSafe(plan && plan.ageGroup, ''),
        language: toStringSafe(plan && plan.language, 'en') || 'en',
        style: toStringSafe(plan && plan.style, ''),
        pageTarget: Math.max(0, toIntSafe(plan && plan.pageTarget, 0)),
        status: toStringSafe(plan && plan.status, 'idle') || 'idle',
        createdAt: toStringSafe(plan && plan.createdAt, ''),
        updatedAt: toStringSafe(plan && plan.updatedAt, ''),
        notes: toStringSafe(plan && plan.notes, '')
      },
      scenes: [],
      review: {
        totalScenes: Array.isArray(plan && plan.scenes) ? plan.scenes.length : 0,
        approvedForBook: 0,
        rejected: 0,
        needsRedo: 0,
        pendingReview: 0
      },
      preflight: clone(preflight || safeEvaluatePreflight(plan || {}))
    };
  }
}

function safeBuildMetadata(plan) {
  try {
    return buildColoringMetadata(plan || {});
  } catch (e) {
    return {
      metadataVersion: '1.0',
      type: 'coloring_book_metadata',
      generatedAt: nowIso(),
      title: '',
      subtitle: '',
      theme: toStringSafe(plan && plan.theme, ''),
      ageGroup: toStringSafe(plan && plan.ageGroup, ''),
      language: toStringSafe(plan && plan.language, 'en') || 'en',
      style: toStringSafe(plan && plan.style, ''),
      description: '',
      keywords: [],
      categories: []
    };
  }
}

function safeBuildProjectBundle(plan) {
  try {
    return buildColoringProjectBundle(plan || {});
  } catch (e) {
    var preflight = safeEvaluatePreflight(plan || {});
    return {
      bundleVersion: '1.0',
      type: 'brightcup_coloring_project_bundle',
      generatedAt: nowIso(),
      plan: clone(plan || {}),
      preflight: preflight,
      manifest: safeBuildManifest(plan || {}, preflight),
      metadata: safeBuildMetadata(plan || {})
    };
  }
}

function safeBuildExportPackage(plan) {
  try {
    return buildColoringExportPackage(plan || {});
  } catch (e) {
    var normalized = normalizeFinalExportPlan(plan || {});
    return {
      packageVersion: '1.0',
      type: 'brightcup_export_package',
      generatedAt: nowIso(),
      files: {
        'bundle.json': safeBuildProjectBundle(normalized),
        'metadata.json': safeBuildMetadata(normalized),
        'manifest.json': safeBuildManifest(normalized, safeEvaluatePreflight(normalized)),
        'plan.json': normalized
      }
    };
  }
}

function safeBuildZipPayload(exportPackage) {
  try {
    return buildZipExportPayload(exportPackage || {});
  } catch (e) {
    return {
      zipVersion: '1.0',
      type: 'brightcup_zip_export',
      generatedAt: nowIso(),
      files: []
    };
  }
}

function safeBuildPdfPrep(plan) {
  try {
    return buildPdfExportPrep(plan || {});
  } catch (e) {
    var safePlan = normalizeFinalExportPlan(plan || {});
    return {
      prepVersion: '1.0',
      type: 'brightcup_pdf_export_prep',
      generatedAt: nowIso(),
      canBuildPdf: false,
      summary: 'PDF export prep failed.',
      book: {
        id: safePlan.id || '',
        theme: safePlan.theme || '',
        ageGroup: safePlan.ageGroup || '',
        language: safePlan.language || 'en',
        style: safePlan.style || '',
        pageTarget: safePlan.pageTarget || 0,
        status: safePlan.status || 'idle',
        createdAt: safePlan.createdAt || '',
        updatedAt: safePlan.updatedAt || '',
        notes: safePlan.notes || ''
      },
      pages: [],
      stats: {
        totalScenes: Array.isArray(safePlan.scenes) ? safePlan.scenes.length : 0,
        eligiblePages: 0,
        pageTarget: safePlan.pageTarget || 0,
        missingApprovedPages: safePlan.pageTarget || 0,
        preflightCanProceed: false
      },
      preflight: safeEvaluatePreflight(safePlan)
    };
  }
}

function safeBuildInteriorPdfPayload(pdfPrep) {
  try {
    return buildInteriorPdfPayload(pdfPrep || {});
  } catch (e) {
    var safePrep = isObject(pdfPrep) ? clone(pdfPrep) : {};
    var stats = isObject(safePrep.stats) ? safePrep.stats : {};
    var pages = toArraySafe(safePrep.pages);

    return {
      payloadVersion: '1.0',
      type: 'brightcup_interior_pdf_payload',
      generatedAt: nowIso(),
      canRenderInterior: false,
      summary: 'Interior PDF payload failed.',
      book: isObject(safePrep.book) ? clone(safePrep.book) : {},
      pages: pages,
      stats: {
        pagesCount: pages.length,
        pageTarget: Math.max(0, toIntSafe(stats.pageTarget, 0)),
        missingPages: Math.max(0, toIntSafe(stats.missingApprovedPages, 0))
      }
    };
  }
}

function buildSummary(preflight, pdfPrep, interiorPdfPayload) {
  var ready = !!(
    preflight &&
    preflight.canProceed === true &&
    pdfPrep &&
    pdfPrep.canBuildPdf === true &&
    interiorPdfPayload &&
    interiorPdfPayload.canRenderInterior === true
  );

  if (ready) {
    return 'Final export bundle ready. The project passed logical export validation, PDF prep is ready, and the interior payload can be rendered.';
  }

  return 'Final export bundle blocked. Review/preflight/PDF preparation requirements are not fully satisfied yet.';
}

function buildFinalExportBundle(plan) {
  try {
    var normalizedPlan = normalizeFinalExportPlan(plan || {});
    var preflight = safeEvaluatePreflight(normalizedPlan);
    var manifest = safeBuildManifest(normalizedPlan, preflight);
    var metadata = safeBuildMetadata(normalizedPlan);
    var projectBundle = safeBuildProjectBundle(normalizedPlan);
    var exportPackage = safeBuildExportPackage(normalizedPlan);
    var zipPayload = safeBuildZipPayload(exportPackage);
    var pdfPrep = safeBuildPdfPrep(normalizedPlan);
    var interiorPdfPayload = safeBuildInteriorPdfPayload(pdfPrep);

    return {
      bundleVersion: '1.0',
      type: 'brightcup_final_export_bundle',
      generatedAt: nowIso(),
      plan: normalizedPlan,
      preflight: preflight,
      manifest: manifest,
      metadata: metadata,
      projectBundle: projectBundle,
      exportPackage: exportPackage,
      zipPayload: zipPayload,
      pdfPrep: pdfPrep,
      interiorPdfPayload: interiorPdfPayload,
      summary: buildSummary(preflight, pdfPrep, interiorPdfPayload)
    };
  } catch (e) {
    var safePlan = normalizeFinalExportPlan(plan || {});
    var safePreflight = safeEvaluatePreflight(safePlan);
    var safePdfPrep = safeBuildPdfPrep(safePlan);
    var safeInterior = safeBuildInteriorPdfPayload(safePdfPrep);

    return {
      bundleVersion: '1.0',
      type: 'brightcup_final_export_bundle',
      generatedAt: nowIso(),
      plan: safePlan,
      preflight: safePreflight,
      manifest: safeBuildManifest(safePlan, safePreflight),
      metadata: safeBuildMetadata(safePlan),
      projectBundle: safeBuildProjectBundle(safePlan),
      exportPackage: safeBuildExportPackage(safePlan),
      zipPayload: safeBuildZipPayload(safeBuildExportPackage(safePlan)),
      pdfPrep: safePdfPrep,
      interiorPdfPayload: safeInterior,
      summary: 'Final export bundle fallback generated. ' + String((e && e.message) || e || 'unknown error')
    };
  }
}

export {
  buildFinalExportBundle
};
