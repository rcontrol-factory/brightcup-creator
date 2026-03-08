/* FILE: /js/core/publishing_snapshot.js */
// Bright Cup Creator — Publishing Snapshot v0.1 SAFE
// Snapshot lógico resumido do estado de publishing
// - acima de publishing_readiness.js
// - sem DOM
// - sem canvas
// - sem dependências externas
// - compatível com Safari/iOS

import { buildPublishingReadiness } from './publishing_readiness.js';
import { buildMasterReleaseBundle } from './master_release_bundle.js';

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

function buildBookSection(plan, readiness, master) {
  var safePlan = normalizePlan(plan || {});
  var readinessBook = isObject(readiness && readiness.book) ? readiness.book : {};
  var masterBook = isObject(master && master.book) ? master.book : {};

  return {
    id: toStringSafe(readinessBook.id || masterBook.id || safePlan.id, ''),
    theme: toStringSafe(readinessBook.theme || masterBook.theme || safePlan.theme, ''),
    ageGroup: toStringSafe(readinessBook.ageGroup || masterBook.ageGroup || safePlan.ageGroup, ''),
    language: toStringSafe(readinessBook.language || masterBook.language || safePlan.language, 'en') || 'en',
    style: toStringSafe(readinessBook.style || masterBook.style || safePlan.style, 'clean coloring page') || 'clean coloring page',
    pageTarget: Math.max(
      0,
      toIntSafe(
        readinessBook.pageTarget || masterBook.pageTarget || safePlan.pageTarget,
        0
      )
    ),
    status: toStringSafe(readinessBook.status || masterBook.status || safePlan.status, 'idle') || 'idle'
  };
}

function buildFallbackMasterReleaseBundle(plan) {
  var safePlan = normalizePlan(plan || {});
  return {
    bundleVersion: '1.0',
    type: 'brightcup_master_release_bundle',
    generatedAt: nowIso(),
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
    releaseExportPackage: {},
    releaseReport: {
      status: 'blocked',
      blockers: ['release report unavailable'],
      warnings: []
    },
    releaseDashboard: {},
    releaseSnapshot: {},
    releaseReadiness: {
      isReadyForRelease: false,
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
    },
    deliveryPackage: {
      canDeliver: false,
      checks: {
        finalExportReady: false,
        printReady: false,
        kdpReady: false,
        pageTarget: safePlan.pageTarget || 0,
        interiorReady: false,
        coverReady: false
      }
    },
    finalStatus: 'blocked',
    summary: 'Master release bundle unavailable.'
  };
}

function safeBuildMasterReleaseBundle(plan) {
  try {
    return buildMasterReleaseBundle(plan || {});
  } catch (e) {
    return buildFallbackMasterReleaseBundle(plan || {});
  }
}

function buildFallbackPublishingReadiness(plan) {
  var safePlan = normalizePlan(plan || {});
  var master = safeBuildMasterReleaseBundle(safePlan);

  return {
    payloadVersion: '1.0',
    type: 'brightcup_publishing_readiness',
    generatedAt: nowIso(),
    book: buildBookSection(safePlan, null, master),
    publishingStatus: 'blocked',
    masterBundle: master,
    readinessChecks: {
      releaseReady: false,
      deliveryReady: false,
      interiorReady: false,
      coverReady: false,
      pageTarget: safePlan.pageTarget || 0,
      metadataReady: false
    },
    blockers: [
      'Publishing readiness unavailable.',
      'Release readiness blocked.',
      'Delivery package blocked.'
    ],
    warnings: [],
    summary: 'Publishing readiness: BLOCKED. Ainda existem pendências no pipeline editorial.'
  };
}

function safeBuildPublishingReadiness(plan) {
  try {
    return buildPublishingReadiness(plan || {});
  } catch (e) {
    return buildFallbackPublishingReadiness(plan || {});
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

function buildReadinessSection(readiness, master) {
  var checks = isObject(readiness && readiness.readinessChecks) ? readiness.readinessChecks : {};
  var masterReadiness = isObject(master && master.releaseReadiness) ? master.releaseReadiness : {};
  var masterChecks = isObject(masterReadiness.checks) ? masterReadiness.checks : {};
  var masterDelivery = isObject(master && master.deliveryPackage) ? master.deliveryPackage : {};
  var masterDeliveryChecks = isObject(masterDelivery.checks) ? masterDelivery.checks : {};

  return {
    releaseReady: !!checks.releaseReady,
    deliveryReady: !!checks.deliveryReady,
    interiorReady: !!(checks.interiorReady || masterChecks.interiorReady || masterDeliveryChecks.interiorReady),
    coverReady: !!(checks.coverReady || masterChecks.coverReady || masterDeliveryChecks.coverReady),
    pageTarget: Math.max(0, toIntSafe(checks.pageTarget || masterChecks.pageTarget || masterDeliveryChecks.pageTarget, 0)),
    metadataReady: !!(checks.metadataReady || masterChecks.hasMetadataTitle)
  };
}

function buildMetrics(plan, readiness, master) {
  var safePlan = normalizePlan(plan || {});
  var counts = countReviewStates(safePlan.scenes);
  var r = buildReadinessSection(readiness, master);

  return {
    pageTarget: Math.max(0, toIntSafe(r.pageTarget || safePlan.pageTarget, 0)),
    scenesCount: safePlan.scenes.length,
    approvedForBook: counts.approvedForBook,
    pendingReview: counts.pendingReview,
    needsRedo: counts.needsRedo,
    interiorReady: !!r.interiorReady,
    coverReady: !!r.coverReady,
    deliveryReady: !!r.deliveryReady
  };
}

function buildArtifacts(readiness, master) {
  var releaseExportPackage = isObject(master && master.releaseExportPackage) ? master.releaseExportPackage : {};
  var exportFiles = isObject(releaseExportPackage.exportFiles) ? releaseExportPackage.exportFiles : {};
  var deliveryPackage = isObject(master && master.deliveryPackage) ? master.deliveryPackage : {};
  var releaseDashboard = isObject(master && master.releaseDashboard) ? master.releaseDashboard : {};
  var releaseSnapshot = isObject(master && master.releaseSnapshot) ? master.releaseSnapshot : {};
  var releaseReadiness = isObject(master && master.releaseReadiness) ? master.releaseReadiness : {};
  var releaseReport = isObject(master && master.releaseReport) ? master.releaseReport : {};

  return {
    masterBundle: !!(master && master.type === 'brightcup_master_release_bundle'),
    releaseExportPackage: !!(releaseExportPackage && releaseExportPackage.type === 'brightcup_release_export_package'),
    releaseReport: !!(releaseReport && releaseReport.type === 'brightcup_release_report'),
    releaseDashboard: !!(releaseDashboard && releaseDashboard.type === 'brightcup_release_dashboard_payload'),
    releaseSnapshot: !!(releaseSnapshot && releaseSnapshot.type === 'brightcup_release_snapshot'),
    releaseReadiness: !!(releaseReadiness && releaseReadiness.type === 'brightcup_release_readiness'),
    deliveryPackage: !!(deliveryPackage && deliveryPackage.type === 'brightcup_delivery_package'),
    exportFilesCount: Object.keys(exportFiles).length
  };
}

function dedupeStrings(list) {
  var arr = toArraySafe(list);
  var out = [];
  var seen = {};
  var i;
  var item;
  var key;

  for (i = 0; i < arr.length; i += 1) {
    item = toStringSafe(arr[i], '');
    if (!item) continue;
    key = item.toLowerCase();
    if (seen[key]) continue;
    seen[key] = true;
    out.push(item);
  }

  return out;
}

function buildNotes(readiness, master, metrics, artifacts) {
  var notes = [];
  var blockers = toArraySafe(readiness && readiness.blockers);
  var warnings = toArraySafe(readiness && readiness.warnings);
  var masterSummary = toStringSafe(master && master.summary, '');
  var publishingSummary = toStringSafe(readiness && readiness.summary, '');

  if (publishingSummary) notes.push(publishingSummary);
  if (masterSummary) notes.push(masterSummary);

  if (metrics.pendingReview > 0) {
    notes.push(metrics.pendingReview + ' scene(s) still pending review.');
  }

  if (metrics.needsRedo > 0) {
    notes.push(metrics.needsRedo + ' scene(s) marked as needs redo.');
  }

  if (!artifacts.releaseExportPackage) {
    notes.push('Release export package not ready.');
  }

  if (!artifacts.deliveryPackage) {
    notes.push('Delivery package not ready.');
  }

  notes = notes.concat(blockers).concat(warnings);

  return dedupeStrings(notes).slice(0, 12);
}

function buildSummary(status, metrics) {
  if (status === 'ready') {
    return 'Publishing snapshot ready. O projeto está logicamente pronto para publicação.';
  }

  if (status === 'almost_ready') {
    return 'Publishing snapshot almost ready. O projeto já avançou bem, mas ainda faltam ajustes finais.';
  }

  return 'Publishing snapshot blocked. Ainda existem pendências no pipeline editorial/publicação.';
}

function buildFallbackPublishingSnapshot(plan, reason) {
  var safePlan = normalizePlan(plan || {});
  var master = safeBuildMasterReleaseBundle(safePlan);
  var readiness = safeBuildPublishingReadiness(safePlan);
  var book = buildBookSection(safePlan, readiness, master);
  var publishingStatus = toStringSafe(readiness && readiness.publishingStatus, 'blocked') || 'blocked';
  var readinessSection = buildReadinessSection(readiness, master);
  var metrics = buildMetrics(safePlan, readiness, master);
  var artifacts = buildArtifacts(readiness, master);
  var notes = buildNotes(readiness, master, metrics, artifacts);

  notes.unshift('Fallback generated: ' + toStringSafe(reason, 'Unknown error.'));

  return {
    snapshotVersion: '1.0',
    type: 'brightcup_publishing_snapshot',
    generatedAt: nowIso(),
    book: book,
    publishingStatus: publishingStatus,
    readiness: readinessSection,
    metrics: metrics,
    artifacts: artifacts,
    notes: notes,
    summary: buildSummary(publishingStatus, metrics)
  };
}

function buildPublishingSnapshot(plan) {
  try {
    var safePlan = normalizePlan(plan || {});
    var readiness = safeBuildPublishingReadiness(safePlan);
    var master = safeBuildMasterReleaseBundle(safePlan);
    var book = buildBookSection(safePlan, readiness, master);
    var publishingStatus = toStringSafe(readiness && readiness.publishingStatus, 'blocked') || 'blocked';
    var readinessSection = buildReadinessSection(readiness, master);
    var metrics = buildMetrics(safePlan, readiness, master);
    var artifacts = buildArtifacts(readiness, master);
    var notes = buildNotes(readiness, master, metrics, artifacts);

    return {
      snapshotVersion: '1.0',
      type: 'brightcup_publishing_snapshot',
      generatedAt: nowIso(),
      book: book,
      publishingStatus: publishingStatus,
      readiness: readinessSection,
      metrics: metrics,
      artifacts: artifacts,
      notes: notes,
      summary: buildSummary(publishingStatus, metrics)
    };
  } catch (e) {
    return buildFallbackPublishingSnapshot(
      plan || {},
      String((e && e.message) || e || 'unknown error')
    );
  }
}

export { buildPublishingSnapshot };
