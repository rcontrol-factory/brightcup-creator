/* FILE: /js/core/release_snapshot.js */
// Bright Cup Creator — Release Snapshot v0.1 SAFE
// Snapshot lógico final do estado de release do projeto
// - ainda SEM gerar PDF real
// - ainda SEM gerar ZIP real
// - ainda SEM integração real com Amazon/KDP
// - sem DOM
// - sem canvas
// - sem dependências externas
// - compatível com Safari/iOS

import { buildReleaseReadiness } from './release_readiness.js';
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
    status: safePlan.status || 'idle'
  };
}

function buildFallbackReadiness(plan) {
  var safePlan = normalizePlan(plan || {});
  return {
    readinessVersion: '1.0',
    type: 'brightcup_release_readiness',
    generatedAt: nowIso(),
    isReadyForRelease: false,
    summary: 'Release readiness fallback generated.',
    book: buildBookSection(safePlan),
    finalExport: {},
    printReady: {},
    kdpReady: {},
    delivery: {},
    checks: {
      preflightReady: false,
      interiorReady: false,
      coverReady: false,
      printReady: false,
      kdpReady: false,
      deliveryReady: false,
      pageTarget: safePlan.pageTarget || 0,
      hasMetadataTitle: false
    },
    blockers: ['Release readiness unavailable.'],
    warnings: []
  };
}

function safeBuildReadiness(plan) {
  try {
    return buildReleaseReadiness(plan || {});
  } catch (e) {
    return buildFallbackReadiness(plan || {});
  }
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
      issues: [],
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

function countReviewStates(scenes) {
  var list = toArraySafe(scenes);
  var counts = {
    approvedForBook: 0,
    pendingReview: 0,
    needsRedo: 0
  };
  var i;
  var state;

  for (i = 0; i < list.length; i += 1) {
    state = normalizeReviewStatus(list[i] && list[i].review && list[i].review.status);
    if (state === 'approved_for_book') counts.approvedForBook += 1;
    else if (state === 'needs_redo') counts.needsRedo += 1;
    else counts.pendingReview += 1;
  }

  return counts;
}

function determineReleaseStatus(readiness, plan, finalExport, printReady, kdpReady, delivery) {
  var hasCoreBook = !!(plan && plan.id && plan.theme && Math.max(0, toIntSafe(plan.pageTarget, 0)) > 0);
  var hasProgress = !!(
    (finalExport && finalExport.summary) ||
    (printReady && printReady.summary) ||
    (kdpReady && kdpReady.summary) ||
    (delivery && delivery.summary)
  );

  if (readiness && readiness.isReadyForRelease === true) return 'ready';
  if (hasCoreBook && hasProgress) return 'partial';
  return 'blocked';
}

function buildMetrics(plan, readiness, finalExport, printReady, kdpReady, delivery) {
  var safePlan = normalizePlan(plan || {});
  var counts = countReviewStates(safePlan.scenes);
  var checks = isObject(readiness && readiness.checks) ? readiness.checks : {};
  var deliveryChecks = isObject(delivery && delivery.checks) ? delivery.checks : {};
  var printChecks = isObject(printReady && printReady.checks) ? printReady.checks : {};
  var finalInterior = isObject(finalExport && finalExport.interiorPdfPayload) ? finalExport.interiorPdfPayload : {};
  var kdpCover = isObject(kdpReady && kdpReady.cover) ? kdpReady.cover : {};

  return {
    pageTarget: Math.max(0, toIntSafe(safePlan.pageTarget, 0)),
    scenesCount: safePlan.scenes.length,
    approvedForBook: counts.approvedForBook,
    pendingReview: counts.pendingReview,
    needsRedo: counts.needsRedo,
    interiorReady: !!(
      checks.interiorReady ||
      deliveryChecks.interiorReady ||
      finalInterior.canRenderInterior === true
    ),
    coverReady: !!(
      checks.coverReady ||
      deliveryChecks.coverReady ||
      kdpCover.canRenderFullwrap === true
    ),
    deliveryReady: !!(
      checks.deliveryReady ||
      (delivery && delivery.canDeliver === true) ||
      (printReady && printReady.canBuildPrintReady === true && kdpReady && kdpReady.canBuildKdpReady === true)
    )
  };
}

function buildArtifacts(finalExport, printReady, kdpReady, delivery) {
  var hasManifest = !!(finalExport && finalExport.manifest && finalExport.manifest.exportType);
  var hasMetadata = !!(finalExport && finalExport.metadata && finalExport.metadata.title);
  var hasBundle = !!(finalExport && finalExport.projectBundle && finalExport.projectBundle.type);
  var hasPackage = !!(finalExport && finalExport.exportPackage && finalExport.exportPackage.type);
  var hasZip = !!(finalExport && finalExport.zipPayload && finalExport.zipPayload.type);
  var hasPdfPrep = !!(finalExport && finalExport.pdfPrep && finalExport.pdfPrep.type);
  var hasInterior = !!(finalExport && finalExport.interiorPdfPayload && finalExport.interiorPdfPayload.type);

  return {
    manifest: hasManifest,
    metadata: hasMetadata,
    bundle: hasBundle,
    package: hasPackage,
    zipPayload: hasZip,
    pdfPrep: hasPdfPrep,
    interiorPdfPayload: hasInterior,
    printReady: !!(printReady && printReady.type),
    kdpReady: !!(kdpReady && kdpReady.type),
    delivery: !!(delivery && delivery.type)
  };
}

function buildNotes(status, readiness, metrics, artifacts) {
  var notes = [];

  if (status === 'ready') {
    notes.push('Release snapshot indicates logical readiness.');
  } else if (status === 'partial') {
    notes.push('Release snapshot indicates partial progress.');
  } else {
    notes.push('Release snapshot indicates blocked state.');
  }

  if (metrics.scenesCount === 0) notes.push('No scenes found in plan.');
  if (metrics.pendingReview > 0) notes.push(metrics.pendingReview + ' scene(s) still pending review.');
  if (metrics.needsRedo > 0) notes.push(metrics.needsRedo + ' scene(s) marked as needs redo.');
  if (!artifacts.metadata) notes.push('Metadata artifact not ready.');
  if (!artifacts.interiorPdfPayload) notes.push('Interior PDF payload artifact not ready.');
  if (!artifacts.delivery) notes.push('Delivery package artifact not ready.');
  if (readiness && Array.isArray(readiness.warnings) && readiness.warnings.length) {
    notes = notes.concat(readiness.warnings.slice(0, 4));
  }

  return notes;
}

function buildSummary(status) {
  if (status === 'ready') {
    return 'Release pronta.';
  }
  if (status === 'partial') {
    return 'Release parcialmente pronta, mas ainda com pendências.';
  }
  return 'Release bloqueada por bases editoriais/export insuficientes.';
}

function buildFallbackReleaseSnapshot(plan, reason) {
  var safePlan = normalizePlan(plan || {});
  var book = buildBookSection(safePlan);
  var readiness = safeBuildReadiness(safePlan);
  var finalExport = safeBuildFinalExport(safePlan);
  var printReady = safeBuildPrintReady(safePlan);
  var kdpReady = safeBuildKdpReady(safePlan);
  var delivery = safeBuildDelivery(safePlan);
  var releaseStatus = determineReleaseStatus(readiness, safePlan, finalExport, printReady, kdpReady, delivery);
  var metrics = buildMetrics(safePlan, readiness, finalExport, printReady, kdpReady, delivery);
  var artifacts = buildArtifacts(finalExport, printReady, kdpReady, delivery);
  var notes = buildNotes(releaseStatus, readiness, metrics, artifacts);

  notes.unshift('Fallback generated: ' + toStringSafe(reason, 'Unknown error.'));

  return {
    snapshotVersion: '1.0',
    type: 'brightcup_release_snapshot',
    generatedAt: nowIso(),
    releaseStatus: releaseStatus,
    summary: buildSummary(releaseStatus),
    book: book,
    readiness: readiness,
    metrics: metrics,
    artifacts: artifacts,
    notes: notes
  };
}

function buildReleaseSnapshot(plan) {
  try {
    var safePlan = normalizePlan(plan || {});
    var book = buildBookSection(safePlan);
    var readiness = safeBuildReadiness(safePlan);
    var finalExport = safeBuildFinalExport(safePlan);
    var printReady = safeBuildPrintReady(safePlan);
    var kdpReady = safeBuildKdpReady(safePlan);
    var delivery = safeBuildDelivery(safePlan);
    var releaseStatus = determineReleaseStatus(readiness, safePlan, finalExport, printReady, kdpReady, delivery);
    var metrics = buildMetrics(safePlan, readiness, finalExport, printReady, kdpReady, delivery);
    var artifacts = buildArtifacts(finalExport, printReady, kdpReady, delivery);
    var notes = buildNotes(releaseStatus, readiness, metrics, artifacts);

    return {
      snapshotVersion: '1.0',
      type: 'brightcup_release_snapshot',
      generatedAt: nowIso(),
      releaseStatus: releaseStatus,
      summary: buildSummary(releaseStatus),
      book: book,
      readiness: readiness,
      metrics: metrics,
      artifacts: artifacts,
      notes: notes
    };
  } catch (e) {
    return buildFallbackReleaseSnapshot(
      plan || {},
      String((e && e.message) || e || 'unknown error')
    );
  }
}

export {
  buildReleaseSnapshot
};
