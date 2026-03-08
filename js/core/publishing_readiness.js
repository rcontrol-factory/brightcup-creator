/* FILE: /js/core/publishing_readiness.js */
// Bright Cup Creator — Publishing Readiness v0.1 SAFE
// Avaliador lógico final que decide se o projeto já pode ser considerado publicável
// - ainda SEM ZIP real
// - ainda SEM PDF real
// - sem DOM
// - sem canvas
// - sem dependências externas
// - compatível com Safari/iOS

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

function buildBookSection(plan, master) {
  var safePlan = normalizePlan(plan || {});
  var masterBook = isObject(master && master.book) ? master.book : {};

  return {
    id: toStringSafe(masterBook.id || safePlan.id, ''),
    theme: toStringSafe(masterBook.theme || safePlan.theme, ''),
    ageGroup: toStringSafe(masterBook.ageGroup || safePlan.ageGroup, ''),
    language: toStringSafe(masterBook.language || safePlan.language, 'en') || 'en',
    style: toStringSafe(masterBook.style || safePlan.style, 'clean coloring page') || 'clean coloring page',
    pageTarget: Math.max(0, toIntSafe(masterBook.pageTarget || safePlan.pageTarget, 0)),
    status: toStringSafe(masterBook.status || safePlan.status, 'idle') || 'idle',
    createdAt: toStringSafe(masterBook.createdAt || safePlan.createdAt, ''),
    updatedAt: toStringSafe(masterBook.updatedAt || safePlan.updatedAt, ''),
    notes: toStringSafe(masterBook.notes || safePlan.notes, '')
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

function buildReadinessChecks(master) {
  var releaseReadiness = isObject(master && master.releaseReadiness) ? master.releaseReadiness : {};
  var deliveryPackage = isObject(master && master.deliveryPackage) ? master.deliveryPackage : {};
  var readinessChecks = isObject(releaseReadiness.checks) ? releaseReadiness.checks : {};
  var deliveryChecks = isObject(deliveryPackage.checks) ? deliveryPackage.checks : {};
  var book = isObject(master && master.book) ? master.book : {};
  var metadataReady = !!(
    readinessChecks.hasMetadataTitle ||
    (master && master.releaseExportPackage &&
      master.releaseExportPackage.releaseReadiness &&
      master.releaseExportPackage.releaseReadiness.checks &&
      master.releaseExportPackage.releaseReadiness.checks.hasMetadataTitle)
  );

  return {
    releaseReady: !!(releaseReadiness.isReadyForRelease === true),
    deliveryReady: !!(deliveryPackage.canDeliver === true),
    interiorReady: !!(readinessChecks.interiorReady || deliveryChecks.interiorReady),
    coverReady: !!(readinessChecks.coverReady || deliveryChecks.coverReady),
    pageTarget: Math.max(
      0,
      toIntSafe(
        readinessChecks.pageTarget ||
        deliveryChecks.pageTarget ||
        book.pageTarget,
        0
      )
    ),
    metadataReady: metadataReady
  };
}

function determinePublishingStatus(master, checks) {
  var hasProgress = !!(
    master &&
    (
      master.finalStatus === 'partial' ||
      (master.releaseReport && toStringSafe(master.releaseReport.status, '') === 'partial') ||
      (master.deliveryPackage && master.deliveryPackage.canDeliver === true) ||
      checks.interiorReady ||
      checks.coverReady ||
      checks.metadataReady
    )
  );

  if (
    checks.releaseReady === true &&
    checks.deliveryReady === true &&
    toStringSafe(master && master.finalStatus, 'blocked') === 'ready'
  ) {
    return 'ready';
  }

  if (hasProgress) {
    return 'almost_ready';
  }

  return 'blocked';
}

function buildBlockers(master, checks, status) {
  var blockers = [];
  var releaseReadiness = isObject(master && master.releaseReadiness) ? master.releaseReadiness : {};
  var releaseReport = isObject(master && master.releaseReport) ? master.releaseReport : {};
  var readinessBlockers = toArraySafe(releaseReadiness.blockers);
  var reportBlockers = toArraySafe(releaseReport.blockers);

  if (status === 'ready') return blockers;

  blockers = blockers.concat(readinessBlockers).concat(reportBlockers);

  if (!checks.metadataReady) blockers.push('Metadata title missing.');
  if (!checks.interiorReady) blockers.push('Interior payload not ready.');
  if (!checks.coverReady) blockers.push('Cover payload not ready.');
  if (!checks.releaseReady) blockers.push('Release readiness blocked.');
  if (!checks.deliveryReady) blockers.push('Delivery package blocked.');
  if (checks.pageTarget <= 0) blockers.push('Page target invalid.');

  return dedupeStrings(blockers);
}

function buildWarnings(master, checks, status) {
  var warnings = [];
  var releaseReadiness = isObject(master && master.releaseReadiness) ? master.releaseReadiness : {};
  var releaseReport = isObject(master && master.releaseReport) ? master.releaseReport : {};
  var releaseSnapshot = isObject(master && master.releaseSnapshot) ? master.releaseSnapshot : {};
  var deliveryPackage = isObject(master && master.deliveryPackage) ? master.deliveryPackage : {};

  warnings = warnings
    .concat(toArraySafe(releaseReadiness.warnings))
    .concat(toArraySafe(releaseReport.warnings))
    .concat(toArraySafe(releaseSnapshot.notes));

  if (status === 'almost_ready') {
    warnings.push('Projeto quase pronto, mas ainda depende de validações finais.');
  }

  if (!(deliveryPackage && deliveryPackage.canDeliver === true) && checks.interiorReady && checks.coverReady) {
    warnings.push('Interior e cover parecem prontos, mas delivery final ainda não foi validado.');
  }

  return dedupeStrings(warnings);
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

function buildSummary(status) {
  if (status === 'ready') {
    return 'Publishing readiness: READY. O projeto já possui todos os artefatos necessários para publicação.';
  }

  if (status === 'almost_ready') {
    return 'Publishing readiness: ALMOST READY. O projeto já tem base forte, mas ainda faltam ajustes finais no pipeline editorial.';
  }

  return 'Publishing readiness: BLOCKED. Ainda existem pendências no pipeline editorial.';
}

function buildFallbackPublishingReadiness(plan, reason) {
  var safePlan = normalizePlan(plan || {});
  var master = safeBuildMasterReleaseBundle(safePlan);
  var book = buildBookSection(safePlan, master);
  var readinessChecks = buildReadinessChecks(master);
  var publishingStatus = determinePublishingStatus(master, readinessChecks);
  var blockers = buildBlockers(master, readinessChecks, publishingStatus);
  var warnings = buildWarnings(master, readinessChecks, publishingStatus);

  warnings.unshift('Fallback generated: ' + toStringSafe(reason, 'Unknown error.'));

  return {
    payloadVersion: '1.0',
    type: 'brightcup_publishing_readiness',
    generatedAt: nowIso(),
    book: book,
    publishingStatus: publishingStatus,
    masterBundle: master,
    readinessChecks: readinessChecks,
    blockers: blockers,
    warnings: warnings,
    summary: buildSummary(publishingStatus)
  };
}

function buildPublishingReadiness(plan) {
  try {
    var safePlan = normalizePlan(plan || {});
    var master = safeBuildMasterReleaseBundle(safePlan);
    var book = buildBookSection(safePlan, master);
    var readinessChecks = buildReadinessChecks(master);
    var publishingStatus = determinePublishingStatus(master, readinessChecks);
    var blockers = buildBlockers(master, readinessChecks, publishingStatus);
    var warnings = buildWarnings(master, readinessChecks, publishingStatus);

    return {
      payloadVersion: '1.0',
      type: 'brightcup_publishing_readiness',
      generatedAt: nowIso(),
      book: book,
      publishingStatus: publishingStatus,
      masterBundle: master,
      readinessChecks: readinessChecks,
      blockers: blockers,
      warnings: warnings,
      summary: buildSummary(publishingStatus)
    };
  } catch (e) {
    return buildFallbackPublishingReadiness(
      plan || {},
      String((e && e.message) || e || 'unknown error')
    );
  }
}

export {
  buildPublishingReadiness
};
