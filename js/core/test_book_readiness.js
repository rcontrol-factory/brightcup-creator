/* FILE: /js/core/test_book_readiness.js */
// Bright Cup Creator — Test Book Readiness v0.1 SAFE
// Avaliador lógico para decidir se o projeto já está pronto
// para montar um livro de teste utilizável
// - acima de book_test_builder.js
// - acima de publishing_snapshot.js
// - sem DOM
// - sem canvas
// - sem dependências externas
// - compatível com Safari/iOS

import { buildTestBook } from './book_test_builder.js';
import { buildPublishingSnapshot } from './publishing_snapshot.js';

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

function buildFallbackTestBook(plan) {
  var safePlan = normalizePlan(plan || {});
  return {
    builderVersion: '1.0',
    type: 'brightcup_test_book',
    generatedAt: nowIso(),
    book: buildBookSection(safePlan),
    scenes: [],
    pages: [],
    metrics: {
      pageCount: 0,
      approvedScenes: 0,
      pendingScenes: safePlan.scenes.length,
      rejectedScenes: 0
    },
    summary: 'Test book unavailable.'
  };
}

function safeBuildTestBook(plan) {
  try {
    return buildTestBook(plan || {});
  } catch (e) {
    return buildFallbackTestBook(plan || {});
  }
}

function buildFallbackPublishingSnapshot(plan) {
  var safePlan = normalizePlan(plan || {});
  return {
    snapshotVersion: '1.0',
    type: 'brightcup_publishing_snapshot',
    generatedAt: nowIso(),
    book: {
      id: safePlan.id || '',
      theme: safePlan.theme || '',
      ageGroup: safePlan.ageGroup || '',
      language: safePlan.language || 'en',
      style: safePlan.style || '',
      pageTarget: safePlan.pageTarget || 0,
      status: safePlan.status || 'idle'
    },
    publishingStatus: 'blocked',
    readiness: {
      releaseReady: false,
      deliveryReady: false,
      interiorReady: false,
      coverReady: false,
      pageTarget: safePlan.pageTarget || 0,
      metadataReady: false
    },
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
    notes: ['Publishing snapshot unavailable.'],
    summary: 'Publishing snapshot blocked.'
  };
}

function safeBuildPublishingSnapshot(plan) {
  try {
    return buildPublishingSnapshot(plan || {});
  } catch (e) {
    return buildFallbackPublishingSnapshot(plan || {});
  }
}

function buildReadinessChecks(book, testBook, publishingSnapshot) {
  var pages = toArraySafe(testBook && testBook.pages);
  var metrics = isObject(testBook && testBook.metrics) ? testBook.metrics : {};
  var publishingStatus = toStringSafe(publishingSnapshot && publishingSnapshot.publishingStatus, 'blocked') || 'blocked';

  return {
    hasBookId: !!toStringSafe(book && book.id, ''),
    hasTheme: !!toStringSafe(book && book.theme, ''),
    hasApprovedPages: pages.length > 0 && Math.max(0, toIntSafe(metrics.approvedScenes, pages.length)) > 0,
    hasMinimumPages: pages.length >= 4,
    publishingStatus: publishingStatus
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

function buildBlockers(checks) {
  var blockers = [];

  if (!checks.hasBookId) blockers.push('Book id missing.');
  if (!checks.hasTheme) blockers.push('Theme missing.');
  if (!checks.hasApprovedPages) blockers.push('No approved pages found.');
  if (!checks.hasMinimumPages) blockers.push('Minimum test page count not reached.');

  return blockers;
}

function buildWarnings(testBook, publishingSnapshot, checks) {
  var warnings = [];
  var metrics = isObject(testBook && testBook.metrics) ? testBook.metrics : {};
  var snapshotMetrics = isObject(publishingSnapshot && publishingSnapshot.metrics) ? publishingSnapshot.metrics : {};
  var pageCount = Math.max(0, toIntSafe(metrics.pageCount, 0));
  var pendingScenes = Math.max(0, toIntSafe(metrics.pendingScenes, 0));
  var rejectedScenes = Math.max(0, toIntSafe(metrics.rejectedScenes, 0));
  var needsRedo = Math.max(0, toIntSafe(snapshotMetrics.needsRedo, 0));

  if (pageCount > 0 && pageCount < 6) {
    warnings.push('Project currently has a small test book.');
  }

  if (checks.publishingStatus !== 'ready') {
    warnings.push('Publishing is not ready yet.');
  }

  if (pendingScenes > 0) {
    warnings.push('Scenes are still pending review.');
  }

  if (needsRedo > 0) {
    warnings.push('Some scenes are marked as needs redo.');
  }

  if (rejectedScenes > 0) {
    warnings.push('There are rejected scenes in the project.');
  }

  return dedupeStrings(warnings);
}

function determineReadinessState(checks) {
  if (
    checks.hasBookId &&
    checks.hasTheme &&
    checks.hasApprovedPages &&
    checks.hasMinimumPages
  ) {
    return 'ready';
  }

  if (
    checks.hasBookId &&
    checks.hasTheme &&
    checks.hasApprovedPages
  ) {
    return 'almost_ready';
  }

  return 'blocked';
}

function buildSummary(state) {
  if (state === 'ready') {
    return 'Test book readiness: READY. The project can already generate a usable test book.';
  }

  if (state === 'almost_ready') {
    return 'Test book readiness: ALMOST READY. The project already has a usable base, but still needs small adjustments.';
  }

  return 'Test book readiness: BLOCKED. The project still lacks the minimum structure for a test book.';
}

function buildFallbackTestBookReadiness(plan, reason) {
  var safePlan = normalizePlan(plan || {});
  var book = buildBookSection(safePlan);
  var testBook = safeBuildTestBook(safePlan);
  var publishingSnapshot = safeBuildPublishingSnapshot(safePlan);
  var readinessChecks = buildReadinessChecks(book, testBook, publishingSnapshot);
  var blockers = buildBlockers(readinessChecks);
  var warnings = buildWarnings(testBook, publishingSnapshot, readinessChecks);

  warnings.unshift('Fallback generated: ' + toStringSafe(reason, 'Unknown error.'));

  return {
    readinessVersion: '1.0',
    type: 'brightcup_test_book_readiness',
    generatedAt: nowIso(),
    book: book,
    testBook: testBook,
    publishingSnapshot: publishingSnapshot,
    readinessChecks: readinessChecks,
    blockers: blockers,
    warnings: warnings,
    summary: buildSummary(determineReadinessState(readinessChecks))
  };
}

function buildTestBookReadiness(plan) {
  try {
    var safePlan = normalizePlan(plan || {});
    var book = buildBookSection(safePlan);
    var testBook = safeBuildTestBook(safePlan);
    var publishingSnapshot = safeBuildPublishingSnapshot(safePlan);
    var readinessChecks = buildReadinessChecks(book, testBook, publishingSnapshot);
    var blockers = buildBlockers(readinessChecks);
    var warnings = buildWarnings(testBook, publishingSnapshot, readinessChecks);
    var state = determineReadinessState(readinessChecks);

    return {
      readinessVersion: '1.0',
      type: 'brightcup_test_book_readiness',
      generatedAt: nowIso(),
      book: book,
      testBook: testBook,
      publishingSnapshot: publishingSnapshot,
      readinessChecks: readinessChecks,
      blockers: blockers,
      warnings: warnings,
      summary: buildSummary(state)
    };
  } catch (e) {
    return buildFallbackTestBookReadiness(
      plan || {},
      String((e && e.message) || e || 'unknown error')
    );
  }
}

export { buildTestBookReadiness };
