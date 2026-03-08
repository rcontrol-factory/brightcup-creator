/* FILE: /js/core/test_book_pipeline.js */
// Bright Cup Creator — Test Book Pipeline v0.1 SAFE
// Primeiro executor lógico do pipeline de livro de teste
// - orquestra:
//   - test_book_readiness
//   - book_test_builder
//   - publishing_snapshot
// - sem DOM
// - sem canvas
// - sem dependências externas
// - compatível com Safari/iOS
// - não gera PDF real
// - não gera imagens
// - apenas executa e consolida o pipeline

import { buildTestBookReadiness } from './test_book_readiness.js';
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

function buildBookSection(plan, readiness, testBook, publishingSnapshot) {
  var safePlan = normalizePlan(plan || {});
  var readinessBook = isObject(readiness && readiness.book) ? readiness.book : {};
  var testBookBook = isObject(testBook && testBook.book) ? testBook.book : {};
  var publishingBook = isObject(publishingSnapshot && publishingSnapshot.book) ? publishingSnapshot.book : {};

  return {
    id: toStringSafe(readinessBook.id || testBookBook.id || publishingBook.id || safePlan.id, ''),
    theme: toStringSafe(readinessBook.theme || testBookBook.theme || publishingBook.theme || safePlan.theme, ''),
    ageGroup: toStringSafe(readinessBook.ageGroup || testBookBook.ageGroup || publishingBook.ageGroup || safePlan.ageGroup, ''),
    language: toStringSafe(readinessBook.language || testBookBook.language || publishingBook.language || safePlan.language, 'en') || 'en',
    style: toStringSafe(readinessBook.style || testBookBook.style || publishingBook.style || safePlan.style, 'clean coloring page') || 'clean coloring page',
    pageTarget: Math.max(
      0,
      toIntSafe(
        readinessBook.pageTarget ||
        testBookBook.pageTarget ||
        publishingBook.pageTarget ||
        safePlan.pageTarget,
        0
      )
    ),
    status: toStringSafe(readinessBook.status || testBookBook.status || publishingBook.status || safePlan.status, 'idle') || 'idle',
    createdAt: toStringSafe(readinessBook.createdAt || testBookBook.createdAt || safePlan.createdAt, ''),
    updatedAt: toStringSafe(readinessBook.updatedAt || testBookBook.updatedAt || safePlan.updatedAt, ''),
    notes: toStringSafe(readinessBook.notes || testBookBook.notes || safePlan.notes, '')
  };
}

function buildFallbackTestBookReadiness(plan) {
  var safePlan = normalizePlan(plan || {});
  return {
    readinessVersion: '1.0',
    type: 'brightcup_test_book_readiness',
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
    testBook: {},
    publishingSnapshot: {},
    readinessChecks: {
      hasBookId: !!safePlan.id,
      hasTheme: !!safePlan.theme,
      hasApprovedPages: false,
      hasMinimumPages: false,
      publishingStatus: 'blocked'
    },
    blockers: [
      'Test book readiness unavailable.',
      'No approved pages found.',
      'Minimum test page count not reached.'
    ],
    warnings: [],
    summary: 'Test book readiness: BLOCKED. The project still lacks the minimum structure for a test book.'
  };
}

function safeBuildTestBookReadiness(plan) {
  try {
    return buildTestBookReadiness(plan || {});
  } catch (e) {
    return buildFallbackTestBookReadiness(plan || {});
  }
}

function buildFallbackTestBook(plan) {
  var safePlan = normalizePlan(plan || {});
  return {
    builderVersion: '1.0',
    type: 'brightcup_test_book',
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

function determinePipelineStatus(readiness, testBook, publishingSnapshot) {
  var checks = isObject(readiness && readiness.readinessChecks) ? readiness.readinessChecks : {};
  var blockers = toArraySafe(readiness && readiness.blockers);
  var pages = toArraySafe(testBook && testBook.pages);
  var publishingStatus = toStringSafe(
    checks.publishingStatus || (publishingSnapshot && publishingSnapshot.publishingStatus),
    'blocked'
  );

  if (
    blockers.length === 0 &&
    checks.hasBookId === true &&
    checks.hasTheme === true &&
    checks.hasApprovedPages === true &&
    checks.hasMinimumPages === true &&
    pages.length >= 4
  ) {
    return 'ready';
  }

  if (
    checks.hasBookId === true &&
    checks.hasTheme === true &&
    (checks.hasApprovedPages === true || pages.length > 0 || publishingStatus === 'almost_ready')
  ) {
    return 'partial';
  }

  return 'blocked';
}

function buildSummary(status) {
  if (status === 'ready') {
    return 'Test book pipeline ready. The project can generate a full test book.';
  }

  if (status === 'partial') {
    return 'Test book pipeline partial. The project generated a partial test structure.';
  }

  return 'Test book pipeline blocked. The project cannot generate a test book yet.';
}

function buildFallbackTestBookPipeline(plan, reason) {
  var safePlan = normalizePlan(plan || {});
  var readiness = safeBuildTestBookReadiness(safePlan);
  var testBook = safeBuildTestBook(safePlan);
  var publishingSnapshot = safeBuildPublishingSnapshot(safePlan);
  var book = buildBookSection(safePlan, readiness, testBook, publishingSnapshot);
  var pipelineStatus = determinePipelineStatus(readiness, testBook, publishingSnapshot);

  if (toStringSafe(reason, '')) {
    if (!Array.isArray(publishingSnapshot.notes)) publishingSnapshot.notes = [];
    publishingSnapshot.notes = ['Fallback generated: ' + toStringSafe(reason, 'Unknown error.')].concat(publishingSnapshot.notes);
  }

  return {
    pipelineVersion: '1.0',
    type: 'brightcup_test_book_pipeline',
    generatedAt: nowIso(),
    book: book,
    readiness: readiness,
    testBook: testBook,
    publishingSnapshot: publishingSnapshot,
    pipelineStatus: pipelineStatus,
    summary: buildSummary(pipelineStatus)
  };
}

function runTestBookPipeline(plan) {
  try {
    var safePlan = normalizePlan(plan || {});
    var readiness = safeBuildTestBookReadiness(safePlan);
    var testBook = safeBuildTestBook(safePlan);
    var publishingSnapshot = safeBuildPublishingSnapshot(safePlan);
    var book = buildBookSection(safePlan, readiness, testBook, publishingSnapshot);
    var pipelineStatus = determinePipelineStatus(readiness, testBook, publishingSnapshot);

    return {
      pipelineVersion: '1.0',
      type: 'brightcup_test_book_pipeline',
      generatedAt: nowIso(),
      book: book,
      readiness: readiness,
      testBook: testBook,
      publishingSnapshot: publishingSnapshot,
      pipelineStatus: pipelineStatus,
      summary: buildSummary(pipelineStatus)
    };
  } catch (e) {
    return buildFallbackTestBookPipeline(
      plan || {},
      String((e && e.message) || e || 'unknown error')
    );
  }
}

export { runTestBookPipeline };
