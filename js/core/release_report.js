/* FILE: /js/core/release_report.js */
// Bright Cup Creator — Release Report v0.1 SAFE
// Relatório lógico final e legível da situação do projeto
// - ainda SEM gerar PDF real
// - ainda SEM gerar ZIP real
// - ainda SEM integração real com Amazon/KDP
// - sem DOM
// - sem canvas
// - sem dependências externas
// - compatível com Safari/iOS

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
    status: safePlan.status || 'idle'
  };
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

function dedupeStrings(list) {
  var arr = toArraySafe(list);
  var seen = {};
  var out = [];
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

function buildProgress(snapshot, readiness, delivery) {
  var metrics = isObject(snapshot && snapshot.metrics) ? snapshot.metrics : {};
  var checks = isObject(readiness && readiness.checks) ? readiness.checks : {};
  var deliveryChecks = isObject(delivery && delivery.checks) ? delivery.checks : {};

  return {
    scenesCount: Math.max(0, toIntSafe(metrics.scenesCount, 0)),
    approvedForBook: Math.max(0, toIntSafe(metrics.approvedForBook, 0)),
    pendingReview: Math.max(0, toIntSafe(metrics.pendingReview, 0)),
    needsRedo: Math.max(0, toIntSafe(metrics.needsRedo, 0)),
    interiorReady: !!(metrics.interiorReady || checks.interiorReady || deliveryChecks.interiorReady),
    coverReady: !!(metrics.coverReady || checks.coverReady || deliveryChecks.coverReady),
    deliveryReady: !!(metrics.deliveryReady || checks.deliveryReady || (delivery && delivery.canDeliver === true)),
    releaseReady: !!(readiness && readiness.isReadyForRelease === true)
  };
}

function buildHeadline(status) {
  if (status === 'ready') return 'Projeto pronto para próxima etapa';
  if (status === 'partial') return 'Projeto com progresso consistente';
  return 'Projeto ainda bloqueado';
}

function buildSummary(status) {
  if (status === 'ready') {
    return 'O projeto está logicamente pronto para seguir para a próxima etapa de publicação.';
  }
  if (status === 'partial') {
    return 'O projeto avançou bem, mas ainda existem pendências antes da liberação final.';
  }
  return 'O projeto ainda não tem base editorial/export suficiente para release.';
}

function buildNextActions(status, progress, readiness, delivery) {
  var actions = [];

  if (status === 'ready') {
    actions.push('seguir para futura etapa de publicação');
    actions.push('validar pacote final de entrega');
    return dedupeStrings(actions);
  }

  if (progress.pendingReview > 0) {
    actions.push('revisar cenas pendentes');
  }

  if (progress.needsRedo > 0) {
    actions.push('corrigir cenas marcadas como redo');
  }

  if (!(readiness && readiness.checks && readiness.checks.hasMetadataTitle)) {
    actions.push('concluir metadata');
  }

  if (!progress.interiorReady) {
    actions.push('validar preparação do interior');
  }

  if (!progress.coverReady) {
    actions.push('validar payload lógico da capa');
  }

  if (!(delivery && delivery.canDeliver === true)) {
    actions.push('validar delivery final');
  }

  if (!actions.length) {
    actions.push('revisar pendências editoriais');
  }

  return dedupeStrings(actions);
}

function buildFallbackBlockers(status, progress, readiness, delivery) {
  var blockers = [];

  if (status === 'ready') return blockers;

  if (!(readiness && readiness.checks && readiness.checks.hasMetadataTitle)) {
    blockers.push('metadata title ausente');
  }
  if (!progress.interiorReady) {
    blockers.push('interior não pronto');
  }
  if (!progress.coverReady) {
    blockers.push('capa não pronta');
  }
  if (!(delivery && delivery.canDeliver === true)) {
    blockers.push('delivery final bloqueado');
  }
  if (!(readiness && readiness.isReadyForRelease === true) && !blockers.length) {
    blockers.push('release ainda não aprovada');
  }

  return dedupeStrings(blockers);
}

function buildFallbackWarnings(snapshot, readiness) {
  var notes = toArraySafe(snapshot && snapshot.notes);
  var warnings = toArraySafe(readiness && readiness.warnings);

  return dedupeStrings(notes.concat(warnings)).slice(0, 8);
}

function buildFallbackReport(plan, reason) {
  var safePlan = normalizePlan(plan || {});
  var snapshot = safeBuildSnapshot(safePlan);
  var readiness = safeBuildReadiness(safePlan);
  var delivery = safeBuildDelivery(safePlan);
  var status = toStringSafe(snapshot.releaseStatus, 'blocked') || 'blocked';
  var progress = buildProgress(snapshot, readiness, delivery);
  var blockers = buildFallbackBlockers(status, progress, readiness, delivery);
  var warnings = buildFallbackWarnings(snapshot, readiness);
  var nextActions = buildNextActions(status, progress, readiness, delivery);

  warnings.unshift('fallback generated: ' + toStringSafe(reason, 'unknown error'));

  return {
    reportVersion: '1.0',
    type: 'brightcup_release_report',
    generatedAt: nowIso(),
    status: status,
    headline: buildHeadline(status),
    summary: buildSummary(status),
    book: buildBookSection(safePlan),
    progress: progress,
    blockers: blockers,
    warnings: warnings,
    nextActions: nextActions
  };
}

function buildReleaseReport(plan) {
  try {
    var safePlan = normalizePlan(plan || {});
    var snapshot = safeBuildSnapshot(safePlan);
    var readiness = safeBuildReadiness(safePlan);
    var delivery = safeBuildDelivery(safePlan);

    var status = toStringSafe(snapshot.releaseStatus, 'blocked') || 'blocked';
    if (status !== 'ready' && status !== 'partial' && status !== 'blocked') {
      status = readiness && readiness.isReadyForRelease ? 'ready' : 'blocked';
    }

    var progress = buildProgress(snapshot, readiness, delivery);
    var blockers = status === 'ready'
      ? []
      : dedupeStrings(toArraySafe(readiness && readiness.blockers).concat(buildFallbackBlockers(status, progress, readiness, delivery)));
    var warnings = dedupeStrings(toArraySafe(readiness && readiness.warnings).concat(toArraySafe(snapshot && snapshot.notes))).slice(0, 10);
    var nextActions = buildNextActions(status, progress, readiness, delivery);

    return {
      reportVersion: '1.0',
      type: 'brightcup_release_report',
      generatedAt: nowIso(),
      status: status,
      headline: buildHeadline(status),
      summary: buildSummary(status),
      book: buildBookSection(safePlan),
      progress: progress,
      blockers: blockers,
      warnings: warnings,
      nextActions: nextActions
    };
  } catch (e) {
    return buildFallbackReport(
      plan || {},
      String((e && e.message) || e || 'unknown error')
    );
  }
}

export {
  buildReleaseReport
};
