/* FILE: /js/core/master_test_book_bundle.js */
// Bright Cup Creator — Master Test Book Bundle v0.1 SAFE
// Bundle lógico mestre da trilha de TEST BOOK
// - acima da camada atual de exportação do test book
// - sem DOM
// - sem canvas
// - sem dependências externas
// - compatível com Safari/iOS
// - não gera PDF real
// - não gera ZIP real
// - não gera imagens
// - apenas consolida lógica

import { buildTestBookExportPackage } from './test_book_export_package.js';
import { buildTestBookDashboardPayload } from './test_book_dashboard_payload.js';
import { buildTestBookPackage } from './test_book_package.js';
import { runTestBookPipeline } from './test_book_pipeline.js';
import { buildTestBookReadiness } from './test_book_readiness.js';
import { buildTestBook } from './book_test_builder.js';

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

function buildBookSection(plan, exportPackage, dashboard, pkg, pipeline, readiness, testBook) {
  var safePlan = normalizePlan(plan || {});
  var exportBook = isObject(exportPackage && exportPackage.book) ? exportPackage.book : {};
  var dashboardBook = isObject(dashboard && dashboard.book) ? dashboard.book : {};
  var packageBook = isObject(pkg && pkg.book) ? pkg.book : {};
  var pipelineBook = isObject(pipeline && pipeline.book) ? pipeline.book : {};
  var readinessBook = isObject(readiness && readiness.book) ? readiness.book : {};
  var testBookBook = isObject(testBook && testBook.book) ? testBook.book : {};

  return {
    id: toStringSafe(
      exportBook.id || dashboardBook.id || packageBook.id || pipelineBook.id || readinessBook.id || testBookBook.id || safePlan.id,
      ''
    ),
    theme: toStringSafe(
      exportBook.theme || dashboardBook.theme || packageBook.theme || pipelineBook.theme || readinessBook.theme || testBookBook.theme || safePlan.theme,
      ''
    ),
    ageGroup: toStringSafe(
      exportBook.ageGroup || dashboardBook.ageGroup || packageBook.ageGroup || pipelineBook.ageGroup || readinessBook.ageGroup || testBookBook.ageGroup || safePlan.ageGroup,
      ''
    ),
    language: toStringSafe(
      exportBook.language || dashboardBook.language || packageBook.language || pipelineBook.language || readinessBook.language || testBookBook.language || safePlan.language,
      'en'
    ) || 'en',
    style: toStringSafe(
      exportBook.style || dashboardBook.style || packageBook.style || pipelineBook.style || readinessBook.style || testBookBook.style || safePlan.style,
      'clean coloring page'
    ) || 'clean coloring page',
    pageTarget: Math.max(
      0,
      toIntSafe(
        exportBook.pageTarget ||
        dashboardBook.pageTarget ||
        packageBook.pageTarget ||
        pipelineBook.pageTarget ||
        readinessBook.pageTarget ||
        testBookBook.pageTarget ||
        safePlan.pageTarget,
        0
      )
    ),
    status: toStringSafe(
      exportBook.status || dashboardBook.status || packageBook.status || pipelineBook.status || readinessBook.status || testBookBook.status || safePlan.status,
      'idle'
    ) || 'idle',
    createdAt: toStringSafe(
      exportBook.createdAt || packageBook.createdAt || pipelineBook.createdAt || readinessBook.createdAt || testBookBook.createdAt || safePlan.createdAt,
      ''
    ),
    updatedAt: toStringSafe(
      exportBook.updatedAt || packageBook.updatedAt || pipelineBook.updatedAt || readinessBook.updatedAt || testBookBook.updatedAt || safePlan.updatedAt,
      ''
    ),
    notes: toStringSafe(
      exportBook.notes || packageBook.notes || pipelineBook.notes || readinessBook.notes || testBookBook.notes || safePlan.notes,
      ''
    )
  };
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

function buildFallbackTestBookReadiness(plan) {
  var safePlan = normalizePlan(plan || {});
  return {
    readinessVersion: '1.0',
    type: 'brightcup_test_book_readiness',
    generatedAt: nowIso(),
    book: buildFallbackTestBook(safePlan).book,
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

function buildFallbackTestBookPipeline(plan) {
  var safePlan = normalizePlan(plan || {});
  return {
    pipelineVersion: '1.0',
    type: 'brightcup_test_book_pipeline',
    generatedAt: nowIso(),
    book: buildFallbackTestBook(safePlan).book,
    readiness: buildFallbackTestBookReadiness(safePlan),
    testBook: buildFallbackTestBook(safePlan),
    publishingSnapshot: {},
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

function buildFallbackTestBookPackage(plan) {
  var safePlan = normalizePlan(plan || {});
  return {
    packageVersion: '1.0',
    type: 'brightcup_test_book_package',
    generatedAt: nowIso(),
    book: buildFallbackTestBook(safePlan).book,
    readiness: buildFallbackTestBookReadiness(safePlan),
    testBook: buildFallbackTestBook(safePlan),
    publishingSnapshot: {},
    pipeline: buildFallbackTestBookPipeline(safePlan),
    files: {},
    packageStatus: 'blocked',
    summary: 'Test book package blocked. The project cannot assemble a test-book package yet.'
  };
}

function safeBuildTestBookPackage(plan) {
  try {
    return buildTestBookPackage(plan || {});
  } catch (e) {
    return buildFallbackTestBookPackage(plan || {});
  }
}

function buildFallbackTestBookDashboardPayload(plan) {
  var safePlan = normalizePlan(plan || {});
  return {
    payloadVersion: '1.0',
    type: 'brightcup_test_book_dashboard_payload',
    generatedAt: nowIso(),
    status: 'blocked',
    header: {
      headline: 'Test Book bloqueado',
      summary: 'O projeto ainda não possui base suficiente para montar o livro de teste.'
    },
    book: {
      id: safePlan.id || '',
      theme: safePlan.theme || '',
      ageGroup: safePlan.ageGroup || '',
      language: safePlan.language || 'en',
      style: safePlan.style || '',
      pageTarget: safePlan.pageTarget || 0,
      status: safePlan.status || 'idle'
    },
    cards: {},
    indicators: [],
    alerts: ['test book dashboard unavailable'],
    actions: ['revisar estrutura do projeto']
  };
}

function safeBuildTestBookDashboardPayload(plan) {
  try {
    return buildTestBookDashboardPayload(plan || {});
  } catch (e) {
    return buildFallbackTestBookDashboardPayload(plan || {});
  }
}

function buildFallbackTestBookExportPackage(plan) {
  var safePlan = normalizePlan(plan || {});
  return {
    packageVersion: '1.0',
    type: 'brightcup_test_book_export_package',
    generatedAt: nowIso(),
    book: buildFallbackTestBook(safePlan).book,
    dashboard: buildFallbackTestBookDashboardPayload(safePlan),
    package: buildFallbackTestBookPackage(safePlan),
    pipeline: buildFallbackTestBookPipeline(safePlan),
    readiness: buildFallbackTestBookReadiness(safePlan),
    testBook: buildFallbackTestBook(safePlan),
    exportFiles: {},
    exportStatus: 'blocked',
    summary: 'Test book export package blocked. The project cannot assemble an exportable test-book package yet.'
  };
}

function safeBuildTestBookExportPackage(plan) {
  try {
    return buildTestBookExportPackage(plan || {});
  } catch (e) {
    return buildFallbackTestBookExportPackage(plan || {});
  }
}

function hasCriticalReadinessBlockers(readiness) {
  var blockers = toArraySafe(readiness && readiness.blockers);
  if (!blockers.length) return false;

  var criticalNeedles = [
    'book id missing',
    'theme missing',
    'no approved pages found',
    'minimum test page count not reached'
  ];
  var i;
  var j;
  var blocker;

  for (i = 0; i < blockers.length; i += 1) {
    blocker = toStringSafe(blockers[i], '').toLowerCase();
    for (j = 0; j < criticalNeedles.length; j += 1) {
      if (blocker.indexOf(criticalNeedles[j]) !== -1) {
        return true;
      }
    }
  }

  return false;
}

function deriveFinalStatus(exportPackage, dashboard, pkg, pipeline, readiness, testBook) {
  var exportStatus = toStringSafe(exportPackage && exportPackage.exportStatus, '').toLowerCase();
  var dashboardStatus = toStringSafe(dashboard && dashboard.status, '').toLowerCase();
  var packageStatus = toStringSafe(pkg && pkg.packageStatus, '').toLowerCase();
  var pipelineStatus = toStringSafe(pipeline && pipeline.pipelineStatus, '').toLowerCase();
  var readinessChecks = isObject(readiness && readiness.readinessChecks) ? readiness.readinessChecks : {};
  var testMetrics = isObject(testBook && testBook.metrics) ? testBook.metrics : {};
  var approvedScenes = Math.max(0, toIntSafe(testMetrics.approvedScenes, 0));
  var pageCount = Math.max(0, toIntSafe(testMetrics.pageCount, 0));
  var criticalBlockers = hasCriticalReadinessBlockers(readiness);

  if (
    exportStatus === 'ready' &&
    packageStatus === 'ready' &&
    pipelineStatus === 'ready' &&
    !criticalBlockers
  ) {
    return 'ready';
  }

  if (
    exportStatus === 'partial' ||
    dashboardStatus === 'partial' ||
    packageStatus === 'partial' ||
    pipelineStatus === 'partial' ||
    approvedScenes > 0 ||
    pageCount > 0 ||
    readinessChecks.hasApprovedPages === true
  ) {
    return 'partial';
  }

  return 'blocked';
}

function buildSummary(finalStatus) {
  if (finalStatus === 'ready') {
    return 'Master test book bundle ready. The full test-book layer is logically consolidated.';
  }

  if (finalStatus === 'partial') {
    return 'Master test book bundle partial. The project already has consistent test-book progress.';
  }

  return 'Master test book bundle blocked. The project still lacks the minimum structure for the full test-book layer.';
}

function buildFallbackMasterTestBookBundle(plan, reason) {
  var safePlan = normalizePlan(plan || {});
  var testBookExportPackage = safeBuildTestBookExportPackage(safePlan);
  var testBookDashboard = safeBuildTestBookDashboardPayload(safePlan);
  var testBookPackage = safeBuildTestBookPackage(safePlan);
  var testBookPipeline = safeRunTestBookPipeline(safePlan);
  var testBookReadiness = safeBuildTestBookReadiness(safePlan);
  var testBook = safeBuildTestBook(safePlan);
  var finalStatus = deriveFinalStatus(
    testBookExportPackage,
    testBookDashboard,
    testBookPackage,
    testBookPipeline,
    testBookReadiness,
    testBook
  );

  return {
    bundleVersion: '1.0',
    type: 'brightcup_master_test_book_bundle',
    generatedAt: nowIso(),
    book: buildBookSection(
      safePlan,
      testBookExportPackage,
      testBookDashboard,
      testBookPackage,
      testBookPipeline,
      testBookReadiness,
      testBook
    ),
    testBookExportPackage: testBookExportPackage,
    testBookDashboard: testBookDashboard,
    testBookPackage: testBookPackage,
    testBookPipeline: testBookPipeline,
    testBookReadiness: testBookReadiness,
    testBook: testBook,
    finalStatus: finalStatus,
    summary: buildSummary(finalStatus) + ' Fallback generated: ' + toStringSafe(reason, 'Unknown error.')
  };
}

function buildMasterTestBookBundle(plan) {
  try {
    var safePlan = normalizePlan(plan || {});
    var testBookExportPackage = safeBuildTestBookExportPackage(safePlan);
    var testBookDashboard = safeBuildTestBookDashboardPayload(safePlan);
    var testBookPackage = safeBuildTestBookPackage(safePlan);
    var testBookPipeline = safeRunTestBookPipeline(safePlan);
    var testBookReadiness = safeBuildTestBookReadiness(safePlan);
    var testBook = safeBuildTestBook(safePlan);
    var finalStatus = deriveFinalStatus(
      testBookExportPackage,
      testBookDashboard,
      testBookPackage,
      testBookPipeline,
      testBookReadiness,
      testBook
    );

    return {
      bundleVersion: '1.0',
      type: 'brightcup_master_test_book_bundle',
      generatedAt: nowIso(),
      book: buildBookSection(
        safePlan,
        testBookExportPackage,
        testBookDashboard,
        testBookPackage,
        testBookPipeline,
        testBookReadiness,
        testBook
      ),
      testBookExportPackage: testBookExportPackage,
      testBookDashboard: testBookDashboard,
      testBookPackage: testBookPackage,
      testBookPipeline: testBookPipeline,
      testBookReadiness: testBookReadiness,
      testBook: testBook,
      finalStatus: finalStatus,
      summary: buildSummary(finalStatus)
    };
  } catch (e) {
    return buildFallbackMasterTestBookBundle(
      plan || {},
      String((e && e.message) || e || 'unknown error')
    );
  }
}

export { buildMasterTestBookBundle };
