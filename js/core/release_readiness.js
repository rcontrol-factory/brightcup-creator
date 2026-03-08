/* FILE: /js/core/release_readiness.js */
// Bright Cup Creator — Release Readiness v0.1 SAFE
// Verificador lógico final de prontidão de release
// - ainda SEM gerar PDF real
// - ainda SEM gerar ZIP real
// - ainda SEM integração real com Amazon/KDP
// - sem DOM
// - sem canvas
// - sem dependências externas
// - compatível com Safari/iOS

import { buildFinalExportBundle } from './final_export_bundle.js';
import { buildPrintReadyPayload } from './print_ready_payload.js';
import { buildKdpReadyBundle } from './kdp_ready_bundle.js';
import { buildDeliveryPackage } from './delivery_package.js';

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
  var src = isObject(scene) ? clone(scene) : {};
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

function normalizePlan(plan) {
  var src = isObject(plan) ? clone(plan) : {};

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
    scenes: toArraySafe(src.scenes).map(normalizeScene)
  };
}

function buildBookSection(plan) {
  var safePlan = normalizePlan(plan || {});

  return {
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
  };
}

function buildFallbackFinalExport(plan) {
  var safePlan = normalizePlan(plan || {});
  return {
    bundleVersion: '1.0',
    type: 'brightcup_final_export_bundle',
    generatedAt: nowIso(),
    plan: safePlan,
    preflight: {
      canProceed: false,
      issues: ['final_export_unavailable'],
      warnings: [],
      stats: {
        totalScenes: safePlan.scenes.length,
        approvedForBook: 0,
        rejected: 0,
        needsRedo: 0,
        pendingReview: 0,
        pageTarget: safePlan.pageTarget || 0
      },
      summary: 'Final export fallback generated.'
    },
    manifest: {},
    metadata: {},
    projectBundle: {},
    exportPackage: {},
    zipPayload: {},
    pdfPrep: {
      canBuildPdf: false
    },
    interiorPdfPayload: {
      canRenderInterior: false
    },
    summary: 'Final export fallback generated.'
  };
}

function safeBuildFinalExport(plan) {
  try {
    return buildFinalExportBundle(plan || {});
  } catch (e) {
    return buildFallbackFinalExport(plan || {});
  }
}

function buildFallbackPrintReady(plan) {
  var safePlan = normalizePlan(plan || {});
  return {
    payloadVersion: '1.0',
    type: 'brightcup_print_ready_payload',
    generatedAt: nowIso(),
    canBuildPrintReady: false,
    summary: 'Print-ready fallback generated.',
    book: buildBookSection(safePlan),
    interior: {
      canRenderInterior: false
    },
    cover: {
      canRenderFullwrap: false
    },
    checks: {
      interiorReady: false,
      coverReady: false,
      pageTarget: safePlan.pageTarget || 0,
      interiorPages: 0,
      missingInteriorPages: safePlan.pageTarget || 0
    }
  };
}

function safeBuildPrintReady(plan) {
  try {
    return buildPrintReadyPayload(plan || {});
  } catch (e) {
    return buildFallbackPrintReady(plan || {});
  }
}

function buildFallbackKdpReady(plan) {
  var safePlan = normalizePlan(plan || {});
  return {
    bundleVersion: '1.0',
    type: 'brightcup_kdp_ready_bundle',
    generatedAt: nowIso(),
    canBuildKdpReady: false,
    summary: 'KDP-ready fallback generated.',
    book: buildBookSection(safePlan),
    metadata: {
      title: ''
    },
    interior: {
      canRenderInterior: false
    },
    cover: {
      canRenderFullwrap: false
    },
    printReady: {
      canBuildPrintReady: false
    },
    finalExport: {},
    checks: {
      metadataReady: false,
      interiorReady: false,
      coverReady: false,
      printReady: false,
      finalExportReady: false,
      pageTarget: safePlan.pageTarget || 0,
      interiorPages: 0,
      missingInteriorPages: safePlan.pageTarget || 0
    }
  };
}

function safeBuildKdpReady(plan) {
  try {
    return buildKdpReadyBundle(plan || {});
  } catch (e) {
    return buildFallbackKdpReady(plan || {});
  }
}

function buildFallbackDelivery(plan) {
  var safePlan = normalizePlan(plan || {});
  return {
    packageVersion: '1.0',
    type: 'brightcup_delivery_package',
    generatedAt: nowIso(),
    canDeliver: false,
    summary: 'Delivery fallback generated.',
    book: buildBookSection(safePlan),
    finalExport: {},
    printReady: {},
    kdpReady: {},
    deliverables: {},
    checks: {
      finalExportReady: false,
      printReady: false,
      kdpReady: false,
      pageTarget: safePlan.pageTarget || 0,
      interiorReady: false,
      coverReady: false
    }
  };
}

function safeBuildDelivery(plan) {
  try {
    return buildDeliveryPackage(plan || {});
  } catch (e) {
    return buildFallbackDelivery(plan || {});
  }
}

function buildChecks(finalExport, printReady, kdpReady, delivery) {
  var preflight = isObject(finalExport && finalExport.preflight) ? finalExport.preflight : {};
  var metadata = isObject(kdpReady && kdpReady.metadata) ? kdpReady.metadata : {};
  var interior = isObject(kdpReady && kdpReady.interior) ? kdpReady.interior : {};
  var cover = isObject(kdpReady && kdpReady.cover) ? kdpReady.cover : {};
  var printChecks = isObject(printReady && printReady.checks) ? printReady.checks : {};
  var deliveryChecks = isObject(delivery && delivery.checks) ? delivery.checks : {};

  return {
    preflightReady: !!(preflight.canProceed === true),
    interiorReady: !!(interior.canRenderInterior === true),
    coverReady: !!(cover.canRenderFullwrap === true),
    printReady: !!(printReady && printReady.canBuildPrintReady === true),
    kdpReady: !!(kdpReady && kdpReady.canBuildKdpReady === true),
    deliveryReady: !!(delivery && delivery.canDeliver === true),
    pageTarget: Math.max(0, toIntSafe(
      printChecks.pageTarget || deliveryChecks.pageTarget,
      0
    )),
    hasMetadataTitle: !!toStringSafe(metadata.title, '')
  };
}

function buildBlockers(checks) {
  var blockers = [];

  if (!checks.preflightReady) blockers.push('Preflight not ready.');
  if (!checks.hasMetadataTitle) blockers.push('Metadata title missing.');
  if (!checks.interiorReady) blockers.push('Interior payload not ready.');
  if (!checks.coverReady) blockers.push('Cover payload not ready.');
  if (!checks.printReady) blockers.push('Print-ready payload blocked.');
  if (!checks.kdpReady) blockers.push('KDP-ready bundle blocked.');
  if (!checks.deliveryReady) blockers.push('Delivery package blocked.');

  return blockers;
}

function buildWarnings(plan, checks, finalExport, printReady, kdpReady, delivery) {
  var warnings = [];
  var safePlan = normalizePlan(plan || {});
  var scenesCount = safePlan.scenes.length;
  var pageTarget = Math.max(0, toIntSafe(checks && checks.pageTarget, 0));
  var preflight = isObject(finalExport && finalExport.preflight) ? finalExport.preflight : {};
  var preflightWarnings = toArraySafe(preflight.warnings).map(function(item){
    return toStringSafe(item, '');
  }).filter(Boolean);
  var printChecks = isObject(printReady && printReady.checks) ? printReady.checks : {};
  var missingInteriorPages = Math.max(0, toIntSafe(printChecks.missingInteriorPages, 0));

  if (!safePlan.id) warnings.push('Book id is missing.');
  if (!safePlan.theme) warnings.push('Theme is missing.');
  if (pageTarget <= 0) warnings.push('Page target is not defined.');
  if (scenesCount === 0) warnings.push('Plan has no scenes.');
  if (missingInteriorPages > 0) warnings.push('Interior is missing ' + missingInteriorPages + ' page(s).');
  if (preflightWarnings.length) {
    warnings = warnings.concat(preflightWarnings);
  }
  if (kdpReady && kdpReady.summary && !kdpReady.canBuildKdpReady) {
    warnings.push('KDP-ready layer still has pending requirements.');
  }
  if (delivery && delivery.summary && !delivery.canDeliver) {
    warnings.push('Delivery layer still has pending requirements.');
  }

  return warnings;
}

function isReadyForRelease(finalExport, printReady, kdpReady, delivery) {
  return !!(
    finalExport &&
    finalExport.preflight &&
    finalExport.preflight.canProceed === true &&
    printReady &&
    printReady.canBuildPrintReady === true &&
    kdpReady &&
    kdpReady.canBuildKdpReady === true &&
    delivery &&
    delivery.canDeliver === true
  );
}

function buildSummary(ready) {
  if (ready) {
    return 'Release logicamente pronta. As camadas editorial, print-ready, KDP-ready e delivery estão alinhadas para a futura etapa de publicação.';
  }

  return 'Release bloqueada. Ainda existem pendências editoriais/export que precisam ser resolvidas antes da liberação final.';
}

function buildFallbackReleaseReadiness(plan, reason) {
  var safePlan = normalizePlan(plan || {});
  var book = buildBookSection(safePlan);
  var finalExport = safeBuildFinalExport(safePlan);
  var printReady = safeBuildPrintReady(safePlan);
  var kdpReady = safeBuildKdpReady(safePlan);
  var delivery = safeBuildDelivery(safePlan);
  var checks = buildChecks(finalExport, printReady, kdpReady, delivery);
  var blockers = buildBlockers(checks);
  var warnings = buildWarnings(safePlan, checks, finalExport, printReady, kdpReady, delivery);

  return {
    readinessVersion: '1.0',
    type: 'brightcup_release_readiness',
    generatedAt: nowIso(),
    isReadyForRelease: false,
    summary: 'Release readiness fallback generated. ' + toStringSafe(reason, 'Unknown error.'),
    book: book,
    finalExport: finalExport,
    printReady: printReady,
    kdpReady: kdpReady,
    delivery: delivery,
    checks: checks,
    blockers: blockers,
    warnings: warnings
  };
}

function buildReleaseReadiness(plan) {
  try {
    var safePlan = normalizePlan(plan || {});
    var book = buildBookSection(safePlan);
    var finalExport = safeBuildFinalExport(safePlan);
    var printReady = safeBuildPrintReady(safePlan);
    var kdpReady = safeBuildKdpReady(safePlan);
    var delivery = safeBuildDelivery(safePlan);
    var checks = buildChecks(finalExport, printReady, kdpReady, delivery);
    var blockers = buildBlockers(checks);
    var warnings = buildWarnings(safePlan, checks, finalExport, printReady, kdpReady, delivery);
    var ready = isReadyForRelease(finalExport, printReady, kdpReady, delivery);

    return {
      readinessVersion: '1.0',
      type: 'brightcup_release_readiness',
      generatedAt: nowIso(),
      isReadyForRelease: ready,
      summary: buildSummary(ready),
      book: book,
      finalExport: finalExport,
      printReady: printReady,
      kdpReady: kdpReady,
      delivery: delivery,
      checks: checks,
      blockers: blockers,
      warnings: warnings
    };
  } catch (e) {
    return buildFallbackReleaseReadiness(
      plan || {},
      String((e && e.message) || e || 'unknown error')
    );
  }
}

export {
  buildReleaseReadiness
};
