/* FILE: /js/core/test_book_package.js */
// Bright Cup Creator — Test Book Package v0.1 SAFE
// Pacote lógico consolidado do livro de teste
// - acima de test_book_pipeline
// - acima de test_book_readiness
// - acima de book_test_builder
// - acima de publishing_snapshot
// - sem DOM
// - sem canvas
// - sem dependências externas
// - compatível com Safari/iOS
// - não gera PDF real
// - não gera imagens
// - não gera ZIP real

import { runTestBookPipeline } from './test_book_pipeline.js';
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

function buildBookSection(plan, readiness, testBook, publishingSnapshot, pipeline) {
  var safePlan = normalizePlan(plan || {});
  var readinessBook = isObject(readiness && readiness.book) ? readiness.book : {};
  var testBookBook = isObject(testBook && testBook.book) ? testBook.book : {};
  var publishingBook = isObject(publishingSnapshot && publishingSnapshot.book) ? publishingSnapshot.book : {};
  var pipelineBook = isObject(pipeline && pipeline.book) ? pipeline.book : {};

  return {
    id: toStringSafe(
      pipelineBook.id || readinessBook.id || testBookBook.id || publishingBook.id || safePlan.id,
      ''
    ),
    theme: toStringSafe(
      pipelineBook.theme || readinessBook.theme || testBookBook.theme || publishingBook.theme || safePlan.theme,
      ''
    ),
    ageGroup: toStringSafe(
      pipelineBook.ageGroup || readinessBook.ageGroup || testBookBook.ageGroup || publishingBook.ageGroup || safePlan.ageGroup,
      ''
    ),
    language: toStringSafe(
      pipelineBook.language || readinessBook.language || testBookBook.language || publishingBook.language || safePlan.language,
      'en'
    ) || 'en',
    style: toStringSafe(
      pipelineBook.style || readinessBook.style || testBookBook.style || publishingBook.style || safePlan.style,
      'clean coloring page'
    ) || 'clean coloring page',
    pageTarget: Math.max(
      0,
      toIntSafe(
        pipelineBook.pageTarget ||
        readinessBook.pageTarget ||
        testBookBook.pageTarget ||
        publishingBook.pageTarget ||
        safePlan.pageTarget,
        0
      )
    ),
    status: toStringSafe(
      pipelineBook.status || readinessBook.status || testBookBook.status || publishingBook.status || safePlan.status,
      'idle'
    ) || 'idle',
    createdAt: toStringSafe(
      pipelineBook.createdAt || readinessBook.createdAt || testBookBook.createdAt || safePlan.createdAt,
      ''
    ),
    updatedAt: toStringSafe(
      pipelineBook.updatedAt || readinessBook.updatedAt || testBookBook.updatedAt || safePlan.updatedAt,
      ''
    ),
    notes: toStringSafe(
      pipelineBook.notes || readinessBook.notes || testBookBook.notes || safePlan.notes,
      ''
    )
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

function buildFallbackTestBookPipeline(plan) {
  var safePlan = normalizePlan(plan || {});
  return {
    pipelineVersion: '1.0',
    type: 'brightcup_test_book_pipeline',
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
    readiness: buildFallbackTestBookReadiness(safePlan),
    testBook: buildFallbackTestBook(safePlan),
    publishingSnapshot: buildFallbackPublishingSnapshot(safePlan),
    pipelineStatus: 'blocked',
    summary: 'Test book pipeline blocked. The project cannot generate a test book yet.'
  };
}

function safeRunTestBookPipeline(plan) {
  try {
    return runTestBookPipeline(plan || {});
  } catch (e) {
    return buildFallbackTestBookPipeline(plan || {});
  }
}

function buildFileEntry(name, type, ready, source) {
  return {
    name: toStringSafe(name, ''),
    type: toStringSafe(type, ''),
    ready: !!ready,
    source: toStringSafe(source, '')
  };
}

function buildFiles(readiness, testBook, publishingSnapshot, pipeline) {
  return {
    'test-book.json': buildFileEntry(
      'test-book.json',
      'brightcup_test_book',
      !!(testBook && testBook.type === 'brightcup_test_book'),
      'testBook'
    ),
    'test-book-readiness.json': buildFileEntry(
      'test-book-readiness.json',
      'brightcup_test_book_readiness',
      !!(readiness && readiness.type === 'brightcup_test_book_readiness'),
      'readiness'
    ),
    'publishing-snapshot.json': buildFileEntry(
      'publishing-snapshot.json',
      'brightcup_publishing_snapshot',
      !!(publishingSnapshot && publishingSnapshot.type === 'brightcup_publishing_snapshot'),
      'publishingSnapshot'
    ),
    'test-book-pipeline.json': buildFileEntry(
      'test-book-pipeline.json',
      'brightcup_test_book_pipeline',
      !!(pipeline && pipeline.type === 'brightcup_test_book_pipeline'),
      'pipeline'
    )
  };
}

function normalizePackageStatus(pipelineStatus) {
  var s = toStringSafe(pipelineStatus, 'blocked').toLowerCase();
  if (s === 'ready') return 'ready';
  if (s === 'partial') return 'partial';
  return 'blocked';
}

function buildSummary(packageStatus) {
  if (packageStatus === 'ready') {
    return 'Test book package ready. The project has a consolidated test-book package.';
  }

  if (packageStatus === 'partial') {
    return 'Test book package partial. The project already has a partial usable package.';
  }

  return 'Test book package blocked. The project cannot assemble a test-book package yet.';
}

function buildFallbackTestBookPackage(plan, reason) {
  var safePlan = normalizePlan(plan || {});
  var readiness = safeBuildTestBookReadiness(safePlan);
  var testBook = safeBuildTestBook(safePlan);
  var publishingSnapshot = safeBuildPublishingSnapshot(safePlan);
  var pipeline = safeRunTestBookPipeline(safePlan);
  var packageStatus = normalizePackageStatus(pipeline && pipeline.pipelineStatus);

  return {
    packageVersion: '1.0',
    type: 'brightcup_test_book_package',
    generatedAt: nowIso(),
    book: buildBookSection(safePlan, readiness, testBook, publishingSnapshot, pipeline),
    readiness: readiness,
    testBook: testBook,
    publishingSnapshot: publishingSnapshot,
    pipeline: pipeline,
    files: buildFiles(readiness, testBook, publishingSnapshot, pipeline),
    packageStatus: packageStatus,
    summary: buildSummary(packageStatus) + ' Fallback generated: ' + toStringSafe(reason, 'Unknown error.')
  };
}

function buildTestBookPackage(plan) {
  try {
    var safePlan = normalizePlan(plan || {});
    var pipeline = safeRunTestBookPipeline(safePlan);
    var readiness = safeBuildTestBookReadiness(safePlan);
    var testBook = safeBuildTestBook(safePlan);
    var publishingSnapshot = safeBuildPublishingSnapshot(safePlan);
    var packageStatus = normalizePackageStatus(pipeline && pipeline.pipelineStatus);

    return {
      packageVersion: '1.0',
      type: 'brightcup_test_book_package',
      generatedAt: nowIso(),
      book: buildBookSection(safePlan, readiness, testBook, publishingSnapshot, pipeline),
      readiness: readiness,
      testBook: testBook,
      publishingSnapshot: publishingSnapshot,
      pipeline: pipeline,
      files: buildFiles(readiness, testBook, publishingSnapshot, pipeline),
      packageStatus: packageStatus,
      summary: buildSummary(packageStatus)
    };
  } catch (e) {
    return buildFallbackTestBookPackage(
      plan || {},
      String((e && e.message) || e || 'unknown error')
    );
  }
}

export { buildTestBookPackage };
