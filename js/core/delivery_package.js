/* FILE: /js/core/delivery_package.js */
// Bright Cup Creator — Delivery Package v0.1 SAFE
// Pacote lógico final de entrega do projeto
// - ainda SEM gerar ZIP real
// - ainda SEM gerar PDF real
// - ainda SEM integração real com Amazon/KDP
// - sem DOM
// - sem canvas
// - sem dependências externas
// - compatível com Safari/iOS

import { buildFinalExportBundle } from './final_export_bundle.js';
import { buildPrintReadyPayload } from './print_ready_payload.js';
import { buildKdpReadyBundle } from './kdp_ready_bundle.js';

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
    tags: Array.isArray(src.tags) ? src.tags.map(function(tag) {
      return toStringSafe(tag, '');
    }).filter(Boolean) : [],
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
    pending: Array.isArray(src.pending) ? src.pending.map(function(id) {
      return toStringSafe(id, '');
    }).filter(Boolean) : [],
    approved: Array.isArray(src.approved) ? src.approved.map(function(id) {
      return toStringSafe(id, '');
    }).filter(Boolean) : [],
    rejected: Array.isArray(src.rejected) ? src.rejected.map(function(id) {
      return toStringSafe(id, '');
    }).filter(Boolean) : [],
    scenes: Array.isArray(src.scenes) ? src.scenes.map(normalizeScene) : []
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
    preflight: {},
    manifest: {},
    metadata: {},
    projectBundle: {},
    exportPackage: {},
    zipPayload: {},
    pdfPrep: {},
    interiorPdfPayload: {},
    summary: 'Final export bundle fallback generated.'
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
    summary: 'Print-ready payload fallback generated.',
    book: buildBookSection(safePlan),
    interior: {
      canRenderInterior: false,
      stats: {
        pagesCount: 0,
        pageTarget: safePlan.pageTarget || 0,
        missingPages: safePlan.pageTarget || 0
      }
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
    summary: 'KDP-ready bundle fallback generated.',
    book: buildBookSection(safePlan),
    metadata: {},
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

function buildDeliverable(name, type, ready, source) {
  return {
    name: toStringSafe(name, ''),
    type: toStringSafe(type, ''),
    ready: !!ready,
    source: toStringSafe(source, '')
  };
}

function buildDeliverables(finalExport, printReady, kdpReady) {
  var finalMeta = finalExport && finalExport.metadata ? finalExport.metadata : {};
  var finalManifest = finalExport && finalExport.manifest ? finalExport.manifest : {};
  var finalZip = finalExport && finalExport.zipPayload ? finalExport.zipPayload : {};
  var finalInterior = finalExport && finalExport.interiorPdfPayload ? finalExport.interiorPdfPayload : {};
  var printCover = printReady && printReady.cover ? printReady.cover : {};

  return {
    interiorPdf: buildDeliverable(
      'interior_print.pdf',
      'interior_pdf_payload',
      !!(finalInterior && finalInterior.canRenderInterior === true),
      'finalExport.interiorPdfPayload'
    ),
    coverPdf: buildDeliverable(
      'cover_fullwrap.pdf',
      'fullwrap_pdf_payload',
      !!(printCover && printCover.canRenderFullwrap === true),
      'printReady.cover'
    ),
    metadata: buildDeliverable(
      'metadata.json',
      'coloring_book_metadata',
      !!(finalMeta && finalMeta.title),
      'finalExport.metadata'
    ),
    manifest: buildDeliverable(
      'manifest.json',
      'coloring_book_project',
      !!(finalManifest && finalManifest.exportType),
      'finalExport.manifest'
    ),
    zipPayload: buildDeliverable(
      'zip_payload.json',
      'brightcup_zip_export',
      !!(finalZip && finalZip.type),
      'finalExport.zipPayload'
    ),
    kdpPackage: buildDeliverable(
      'kdp_ready_bundle.json',
      'brightcup_kdp_ready_bundle',
      !!(kdpReady && kdpReady.canBuildKdpReady === true),
      'kdpReady'
    )
  };
}

function buildChecks(finalExport, printReady, kdpReady) {
  var printChecks = isObject(printReady && printReady.checks) ? printReady.checks : {};
  var finalPreflight = isObject(finalExport && finalExport.preflight) ? finalExport.preflight : {};
  var finalPdfPrep = isObject(finalExport && finalExport.pdfPrep) ? finalExport.pdfPrep : {};
  var finalInterior = isObject(finalExport && finalExport.interiorPdfPayload) ? finalExport.interiorPdfPayload : {};
  var printCover = isObject(printReady && printReady.cover) ? printReady.cover : {};

  return {
    finalExportReady: !!(
      finalExport &&
      finalExport.summary &&
      finalPreflight.canProceed === true &&
      finalPdfPrep.canBuildPdf === true &&
      finalInterior.canRenderInterior === true
    ),
    printReady: !!(printReady && printReady.canBuildPrintReady === true),
    kdpReady: !!(kdpReady && kdpReady.canBuildKdpReady === true),
    pageTarget: Math.max(0, toIntSafe(printChecks.pageTarget, 0)),
    interiorReady: !!(finalInterior && finalInterior.canRenderInterior === true),
    coverReady: !!(printCover && printCover.canRenderFullwrap === true)
  };
}

function canBuildDelivery(finalExport, printReady, kdpReady) {
  return !!(
    finalExport &&
    finalExport.summary &&
    printReady &&
    printReady.canBuildPrintReady === true &&
    kdpReady &&
    kdpReady.canBuildKdpReady === true
  );
}

function buildSummary(ready, checks) {
  if (ready) {
    return (
      'Delivery package logically ready. Final export, print-ready payload, and KDP-ready bundle are aligned for a future delivery step.'
    );
  }

  var reasons = [];
  if (!checks.finalExportReady) reasons.push('final export not ready');
  if (!checks.printReady) reasons.push('print-ready blocked');
  if (!checks.kdpReady) reasons.push('kdp-ready blocked');
  if (!checks.interiorReady) reasons.push('interior not ready');
  if (!checks.coverReady) reasons.push('cover not ready');

  return (
    'Delivery package blocked by editorial/export pending items. ' +
    (reasons.length ? 'Missing requirements: ' + reasons.join(', ') + '.' : 'Some requirements are still incomplete.')
  );
}

function buildFallbackDeliveryPackage(plan, reason) {
  var safePlan = normalizePlan(plan || {});
  var book = buildBookSection(safePlan);
  var finalExport = safeBuildFinalExport(safePlan);
  var printReady = safeBuildPrintReady(safePlan);
  var kdpReady = safeBuildKdpReady(safePlan);
  var deliverables = buildDeliverables(finalExport, printReady, kdpReady);
  var checks = buildChecks(finalExport, printReady, kdpReady);

  return {
    packageVersion: '1.0',
    type: 'brightcup_delivery_package',
    generatedAt: nowIso(),
    canDeliver: false,
    summary: 'Delivery package fallback generated. ' + toStringSafe(reason, 'Unknown error.'),
    book: book,
    finalExport: finalExport,
    printReady: printReady,
    kdpReady: kdpReady,
    deliverables: deliverables,
    checks: checks
  };
}

function buildDeliveryPackage(plan) {
  try {
    var safePlan = normalizePlan(plan || {});
    var book = buildBookSection(safePlan);
    var finalExport = safeBuildFinalExport(safePlan);
    var printReady = safeBuildPrintReady(safePlan);
    var kdpReady = safeBuildKdpReady(safePlan);
    var deliverables = buildDeliverables(finalExport, printReady, kdpReady);
    var checks = buildChecks(finalExport, printReady, kdpReady);
    var ready = canBuildDelivery(finalExport, printReady, kdpReady);

    return {
      packageVersion: '1.0',
      type: 'brightcup_delivery_package',
      generatedAt: nowIso(),
      canDeliver: ready,
      summary: buildSummary(ready, checks),
      book: book,
      finalExport: finalExport,
      printReady: printReady,
      kdpReady: kdpReady,
      deliverables: deliverables,
      checks: checks
    };
  } catch (e) {
    return buildFallbackDeliveryPackage(
      plan || {},
      String((e && e.message) || e || 'unknown error')
    );
  }
}

export {
  buildDeliveryPackage
};
