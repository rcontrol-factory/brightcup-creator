/* FILE: /js/core/release_export_package.js */
// Bright Cup Creator — Release Export Package v0.1 SAFE
// Pacote lógico consolidado do estado final de release
// - ainda SEM ZIP real
// - ainda SEM PDF real
// - sem DOM
// - sem canvas
// - sem dependências externas
// - compatível com Safari/iOS

import { buildReleaseReport } from './release_report.js';
import { buildReleaseDashboardPayload } from './release_dashboard_payload.js';
import { buildReleaseSnapshot } from './release_snapshot.js';
import { buildReleaseReadiness } from './release_readiness.js';
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

function buildFallbackReleaseReport(plan) {
  var safePlan = normalizePlan(plan || {});
  return {
    reportVersion: '1.0',
    type: 'brightcup_release_report',
    generatedAt: nowIso(),
    status: 'blocked',
    headline: 'Projeto ainda bloqueado',
    summary: 'Não foi possível montar o release report.',
    book: buildBookSection(safePlan),
    progress: {
      scenesCount: safePlan.scenes.length,
      approvedForBook: 0,
      pendingReview: safePlan.scenes.length,
      needsRedo: 0,
      interiorReady: false,
      coverReady: false,
      deliveryReady: false,
      releaseReady: false
    },
    blockers: ['release report unavailable'],
    warnings: [],
    nextActions: ['revisar pendências editoriais']
  };
}

function safeBuildReleaseReport(plan) {
  try {
    return buildReleaseReport(plan || {});
  } catch (e) {
    return buildFallbackReleaseReport(plan || {});
  }
}

function buildFallbackReleaseDashboard(plan) {
  var safePlan = normalizePlan(plan || {});
  return {
    payloadVersion: '1.0',
    type: 'brightcup_release_dashboard_payload',
    generatedAt: nowIso(),
    status: 'blocked',
    header: {
      headline: 'Projeto ainda bloqueado',
      summary: 'Não foi possível montar o release dashboard.'
    },
    book: buildBookSection(safePlan),
    cards: {
      review: { label: 'Review', value: 'blocked', status: 'blocked' },
      interior: { label: 'Interior', value: 'blocked', status: 'blocked' },
      cover: { label: 'Cover', value: 'blocked', status: 'blocked' },
      delivery: { label: 'Delivery', value: 'blocked', status: 'blocked' },
      release: { label: 'Release', value: 'blocked', status: 'blocked' }
    },
    indicators: [],
    alerts: ['release dashboard unavailable'],
    actions: ['revisar pendências editoriais']
  };
}

function safeBuildReleaseDashboard(plan) {
  try {
    return buildReleaseDashboardPayload(plan || {});
  } catch (e) {
    return buildFallbackReleaseDashboard(plan || {});
  }
}

function buildFallbackReleaseSnapshot(plan) {
  var safePlan = normalizePlan(plan || {});
  return {
    snapshotVersion: '1.0',
    type: 'brightcup_release_snapshot',
    generatedAt: nowIso(),
    releaseStatus: 'blocked',
    summary: 'Release snapshot indisponível.',
    book: {
      id: safePlan.id || '',
      theme: safePlan.theme || '',
      ageGroup: safePlan.ageGroup || '',
      language: safePlan.language || 'en',
      style: safePlan.style || '',
      pageTarget: safePlan.pageTarget || 0,
      status: safePlan.status || 'idle'
    },
    readiness: {},
    metrics: {
      pageTarget: safePlan.pageTarget || 0,
      scenesCount: safePlan.scenes.length,
      approvedForBook: 0,
      pendingReview: safePlan.scenes.length,
      needsRedo: 0,
      interiorReady: false,
      coverReady: false,
      deliveryReady: false
    },
    artifacts: {},
    notes: ['release snapshot unavailable']
  };
}

function safeBuildReleaseSnapshot(plan) {
  try {
    return buildReleaseSnapshot(plan || {});
  } catch (e) {
    return buildFallbackReleaseSnapshot(plan || {});
  }
}

function buildFallbackReleaseReadiness(plan) {
  var safePlan = normalizePlan(plan || {});
  return {
    readinessVersion: '1.0',
    type: 'brightcup_release_readiness',
    generatedAt: nowIso(),
    isReadyForRelease: false,
    summary: 'Release readiness indisponível.',
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
    blockers: ['release readiness unavailable'],
    warnings: []
  };
}

function safeBuildReleaseReadiness(plan) {
  try {
    return buildReleaseReadiness(plan || {});
  } catch (e) {
    return buildFallbackReleaseReadiness(plan || {});
  }
}

function buildFallbackDeliveryPackage(plan) {
  var safePlan = normalizePlan(plan || {});
  return {
    packageVersion: '1.0',
    type: 'brightcup_delivery_package',
    generatedAt: nowIso(),
    canDeliver: false,
    summary: 'Delivery package indisponível.',
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

function safeBuildDeliveryPackage(plan) {
  try {
    return buildDeliveryPackage(plan || {});
  } catch (e) {
    return buildFallbackDeliveryPackage(plan || {});
  }
}

function buildExportFile(name, type, ready, source) {
  return {
    name: toStringSafe(name, ''),
    type: toStringSafe(type, ''),
    ready: !!ready,
    source: toStringSafe(source, '')
  };
}

function buildExportFiles(releaseReport, releaseDashboard, releaseSnapshot, releaseReadiness, deliveryPackage) {
  return {
    'release-report.json': buildExportFile(
      'release-report.json',
      'brightcup_release_report',
      !!(releaseReport && releaseReport.type === 'brightcup_release_report'),
      'releaseReport'
    ),
    'release-dashboard.json': buildExportFile(
      'release-dashboard.json',
      'brightcup_release_dashboard_payload',
      !!(releaseDashboard && releaseDashboard.type === 'brightcup_release_dashboard_payload'),
      'releaseDashboard'
    ),
    'release-snapshot.json': buildExportFile(
      'release-snapshot.json',
      'brightcup_release_snapshot',
      !!(releaseSnapshot && releaseSnapshot.type === 'brightcup_release_snapshot'),
      'releaseSnapshot'
    ),
    'release-readiness.json': buildExportFile(
      'release-readiness.json',
      'brightcup_release_readiness',
      !!(releaseReadiness && releaseReadiness.type === 'brightcup_release_readiness'),
      'releaseReadiness'
    ),
    'delivery-package.json': buildExportFile(
      'delivery-package.json',
      'brightcup_delivery_package',
      !!(deliveryPackage && deliveryPackage.type === 'brightcup_delivery_package'),
      'deliveryPackage'
    )
  };
}

function buildSummary(releaseReadiness, deliveryPackage, releaseReport) {
  var ready = !!(
    releaseReadiness &&
    releaseReadiness.isReadyForRelease === true &&
    deliveryPackage &&
    deliveryPackage.canDeliver === true &&
    releaseReport &&
    toStringSafe(releaseReport.status, 'blocked') === 'ready'
  );

  if (ready) {
    return 'Release export package ready. O pacote lógico final de release está consolidado e pronto para entrega futura.';
  }

  return 'Release export package blocked. Ainda existem pendências na camada final de release/delivery.';
}

function buildFallbackReleaseExportPackage(plan, reason) {
  var safePlan = normalizePlan(plan || {});
  var releaseReport = safeBuildReleaseReport(safePlan);
  var releaseDashboard = safeBuildReleaseDashboard(safePlan);
  var releaseSnapshot = safeBuildReleaseSnapshot(safePlan);
  var releaseReadiness = safeBuildReleaseReadiness(safePlan);
  var deliveryPackage = safeBuildDeliveryPackage(safePlan);

  return {
    packageVersion: '1.0',
    type: 'brightcup_release_export_package',
    generatedAt: nowIso(),
    book: buildBookSection(safePlan),
    releaseReport: releaseReport,
    releaseDashboard: releaseDashboard,
    releaseSnapshot: releaseSnapshot,
    releaseReadiness: releaseReadiness,
    deliveryPackage: deliveryPackage,
    exportFiles: buildExportFiles(
      releaseReport,
      releaseDashboard,
      releaseSnapshot,
      releaseReadiness,
      deliveryPackage
    ),
    summary: 'Release export package fallback generated. ' + toStringSafe(reason, 'Unknown error.')
  };
}

function buildReleaseExportPackage(plan) {
  try {
    var safePlan = normalizePlan(plan || {});
    var releaseReport = safeBuildReleaseReport(safePlan);
    var releaseDashboard = safeBuildReleaseDashboard(safePlan);
    var releaseSnapshot = safeBuildReleaseSnapshot(safePlan);
    var releaseReadiness = safeBuildReleaseReadiness(safePlan);
    var deliveryPackage = safeBuildDeliveryPackage(safePlan);

    return {
      packageVersion: '1.0',
      type: 'brightcup_release_export_package',
      generatedAt: nowIso(),
      book: buildBookSection(safePlan),
      releaseReport: releaseReport,
      releaseDashboard: releaseDashboard,
      releaseSnapshot: releaseSnapshot,
      releaseReadiness: releaseReadiness,
      deliveryPackage: deliveryPackage,
      exportFiles: buildExportFiles(
        releaseReport,
        releaseDashboard,
        releaseSnapshot,
        releaseReadiness,
        deliveryPackage
      ),
      summary: buildSummary(releaseReadiness, deliveryPackage, releaseReport)
    };
  } catch (e) {
    return buildFallbackReleaseExportPackage(
      plan || {},
      String((e && e.message) || e || 'unknown error')
    );
  }
}

export {
  buildReleaseExportPackage
};
