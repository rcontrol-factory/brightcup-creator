/* FILE: /js/core/release_dashboard_payload.js */
// Bright Cup Creator — Release Dashboard Payload v0.1 SAFE
// Camada lógica resumida para futura dashboard final de release
// - ainda SEM DOM
// - ainda SEM gerar PDF real
// - ainda SEM gerar ZIP real
// - ainda SEM integração real com Amazon/KDP
// - sem canvas
// - sem dependências externas
// - compatível com Safari/iOS

import { buildReleaseReport } from './release_report.js';
import { buildReleaseSnapshot } from './release_snapshot.js';
import { buildReleaseReadiness } from './release_readiness.js';

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

function buildFallbackReport(plan) {
  var safePlan = normalizePlan(plan || {});
  return {
    reportVersion: '1.0',
    type: 'brightcup_release_report',
    generatedAt: nowIso(),
    status: 'blocked',
    headline: 'Projeto ainda bloqueado',
    summary: 'O projeto ainda não tem base editorial/export suficiente para release.',
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

function safeBuildReport(plan) {
  try {
    return buildReleaseReport(plan || {});
  } catch (e) {
    return buildFallbackReport(plan || {});
  }
}

function buildFallbackSnapshot(plan) {
  var safePlan = normalizePlan(plan || {});
  return {
    snapshotVersion: '1.0',
    type: 'brightcup_release_snapshot',
    generatedAt: nowIso(),
    releaseStatus: 'blocked',
    summary: 'Release snapshot fallback generated.',
    book: buildBookSection(safePlan),
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
    notes: []
  };
}

function safeBuildSnapshot(plan) {
  try {
    return buildReleaseSnapshot(plan || {});
  } catch (e) {
    return buildFallbackSnapshot(plan || {});
  }
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
    blockers: ['release readiness unavailable'],
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

function normalizeStatus(status) {
  var s = toStringSafe(status, 'blocked').toLowerCase();
  if (s === 'ready') return 'ready';
  if (s === 'partial') return 'partial';
  return 'blocked';
}

function indicatorStatusFromBool(flag) {
  return flag ? 'ready' : 'blocked';
}

function indicatorStatusFromCount(countA, countB) {
  if (countA > 0 && countB === 0) return 'ready';
  if (countA > 0 || countB > 0) return 'partial';
  return 'blocked';
}

function buildHeader(report, snapshot, status) {
  var headline = toStringSafe(report && report.headline, '');
  var summary = toStringSafe(report && report.summary, '');

  if (!headline) {
    if (status === 'ready') headline = 'Projeto pronto para próxima etapa';
    else if (status === 'partial') headline = 'Projeto com progresso consistente';
    else headline = 'Projeto ainda bloqueado';
  }

  if (!summary) {
    summary = toStringSafe(snapshot && snapshot.summary, '');
  }

  if (!summary) {
    if (status === 'ready') summary = 'Release logicamente pronta.';
    else if (status === 'partial') summary = 'Release parcialmente pronta, mas ainda com pendências.';
    else summary = 'Release bloqueada por bases editoriais/export insuficientes.';
  }

  return {
    headline: headline,
    summary: summary
  };
}

function buildCards(report, snapshot, readiness, status) {
  var progress = isObject(report && report.progress) ? report.progress : {};
  var checks = isObject(readiness && readiness.checks) ? readiness.checks : {};
  var metrics = isObject(snapshot && snapshot.metrics) ? snapshot.metrics : {};

  return {
    review: {
      label: 'Review',
      value: String(Math.max(0, toIntSafe(progress.approvedForBook, 0))) + ' approved',
      status: indicatorStatusFromCount(
        Math.max(0, toIntSafe(progress.approvedForBook, 0)),
        Math.max(0, toIntSafe(progress.pendingReview, 0)) + Math.max(0, toIntSafe(progress.needsRedo, 0))
      )
    },
    interior: {
      label: 'Interior',
      value: progress.interiorReady ? 'ready' : 'pending',
      status: indicatorStatusFromBool(!!(progress.interiorReady || checks.interiorReady))
    },
    cover: {
      label: 'Cover',
      value: progress.coverReady ? 'ready' : 'pending',
      status: indicatorStatusFromBool(!!(progress.coverReady || checks.coverReady))
    },
    delivery: {
      label: 'Delivery',
      value: progress.deliveryReady ? 'ready' : 'pending',
      status: indicatorStatusFromBool(!!(progress.deliveryReady || checks.deliveryReady))
    },
    release: {
      label: 'Release',
      value: status,
      status: status
    }
  };
}

function buildIndicators(report, snapshot, readiness) {
  var progress = isObject(report && report.progress) ? report.progress : {};
  var metrics = isObject(snapshot && snapshot.metrics) ? snapshot.metrics : {};
  var checks = isObject(readiness && readiness.checks) ? readiness.checks : {};

  return [
    {
      key: 'approved_scenes',
      label: 'Approved Scenes',
      value: Math.max(0, toIntSafe(progress.approvedForBook || metrics.approvedForBook, 0)),
      status: indicatorStatusFromCount(
        Math.max(0, toIntSafe(progress.approvedForBook || metrics.approvedForBook, 0)),
        Math.max(0, toIntSafe(progress.pendingReview || metrics.pendingReview, 0))
      )
    },
    {
      key: 'pending_review',
      label: 'Pending Review',
      value: Math.max(0, toIntSafe(progress.pendingReview || metrics.pendingReview, 0)),
      status: Math.max(0, toIntSafe(progress.pendingReview || metrics.pendingReview, 0)) === 0 ? 'ready' : 'partial'
    },
    {
      key: 'redo_count',
      label: 'Redo Count',
      value: Math.max(0, toIntSafe(progress.needsRedo || metrics.needsRedo, 0)),
      status: Math.max(0, toIntSafe(progress.needsRedo || metrics.needsRedo, 0)) === 0 ? 'ready' : 'blocked'
    },
    {
      key: 'delivery_ready',
      label: 'Delivery Ready',
      value: !!(progress.deliveryReady || checks.deliveryReady),
      status: indicatorStatusFromBool(!!(progress.deliveryReady || checks.deliveryReady))
    },
    {
      key: 'release_ready',
      label: 'Release Ready',
      value: !!(progress.releaseReady || readiness.isReadyForRelease),
      status: indicatorStatusFromBool(!!(progress.releaseReady || readiness.isReadyForRelease))
    }
  ];
}

function buildAlerts(report, snapshot, readiness, status) {
  if (status === 'ready') return [];

  return dedupeStrings(
    toArraySafe(report && report.blockers)
      .concat(toArraySafe(report && report.warnings))
      .concat(toArraySafe(readiness && readiness.blockers))
      .concat(toArraySafe(readiness && readiness.warnings))
      .concat(toArraySafe(snapshot && snapshot.notes))
  ).slice(0, 10);
}

function buildActions(report, status) {
  if (status === 'ready') {
    return ['seguir para futura publicação'];
  }

  var actions = dedupeStrings(toArraySafe(report && report.nextActions)).slice(0, 8);
  if (!actions.length) {
    actions = ['revisar pendências editoriais'];
  }
  return actions;
}

function buildFallbackDashboardPayload(plan, reason) {
  var safePlan = normalizePlan(plan || {});
  var report = safeBuildReport(safePlan);
  var snapshot = safeBuildSnapshot(safePlan);
  var readiness = safeBuildReadiness(safePlan);
  var status = normalizeStatus(report && report.status || snapshot && snapshot.releaseStatus);
  var header = buildHeader(report, snapshot, status);
  var cards = buildCards(report, snapshot, readiness, status);
  var indicators = buildIndicators(report, snapshot, readiness);
  var alerts = buildAlerts(report, snapshot, readiness, status);
  var actions = buildActions(report, status);

  alerts.unshift('fallback generated: ' + toStringSafe(reason, 'unknown error'));

  return {
    payloadVersion: '1.0',
    type: 'brightcup_release_dashboard_payload',
    generatedAt: nowIso(),
    status: status,
    header: header,
    book: buildBookSection(safePlan),
    cards: cards,
    indicators: indicators,
    alerts: alerts,
    actions: actions
  };
}

function buildReleaseDashboardPayload(plan) {
  try {
    var safePlan = normalizePlan(plan || {});
    var report = safeBuildReport(safePlan);
    var snapshot = safeBuildSnapshot(safePlan);
    var readiness = safeBuildReadiness(safePlan);
    var status = normalizeStatus(
      toStringSafe(report && report.status, '') ||
      toStringSafe(snapshot && snapshot.releaseStatus, 'blocked')
    );
    var header = buildHeader(report, snapshot, status);
    var cards = buildCards(report, snapshot, readiness, status);
    var indicators = buildIndicators(report, snapshot, readiness);
    var alerts = buildAlerts(report, snapshot, readiness, status);
    var actions = buildActions(report, status);

    return {
      payloadVersion: '1.0',
      type: 'brightcup_release_dashboard_payload',
      generatedAt: nowIso(),
      status: status,
      header: header,
      book: buildBookSection(safePlan),
      cards: cards,
      indicators: indicators,
      alerts: alerts,
      actions: actions
    };
  } catch (e) {
    return buildFallbackDashboardPayload(
      plan || {},
      String((e && e.message) || e || 'unknown error')
    );
  }
}

export {
  buildReleaseDashboardPayload
};
