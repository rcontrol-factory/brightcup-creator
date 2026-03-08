/* FILE: /js/core/test_book_export_package.js */
// Bright Cup Creator — Test Book Export Package v0.1 SAFE
// Pacote lógico exportável da camada de test book
// - acima de test_book_dashboard_payload
// - acima de test_book_package
// - acima de test_book_pipeline
// - acima de test_book_readiness
// - acima de book_test_builder
// - acima de publishing_snapshot
// - sem DOM
// - sem canvas
// - sem dependências externas
// - compatível com Safari/iOS

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

function buildBookSection(plan, dashboard, pkg, pipeline, readiness, testBook) {
  var safePlan = normalizePlan(plan || {});
  var dashboardBook = isObject(dashboard && dashboard.book) ? dashboard.book : {};
  var packageBook = isObject(pkg && pkg.book) ? pkg.book : {};
  var pipelineBook = isObject(pipeline && pipeline.book) ? pipeline.book : {};
  var readinessBook = isObject(readiness && readiness.book) ? readiness.book : {};
  var testBookBook = isObject(testBook && testBook.book) ? testBook.book : {};

  return {
    id: toStringSafe(
      dashboardBook.id || packageBook.id || pipelineBook.id || readinessBook.id || testBookBook.id || safePlan.id,
      ''
    ),
    theme: toStringSafe(
      dashboardBook.theme || packageBook.theme || pipelineBook.theme || readinessBook.theme || testBookBook.theme || safePlan.theme,
      ''
    ),
    ageGroup: toStringSafe(
      dashboardBook.ageGroup || packageBook.ageGroup || pipelineBook.ageGroup || readinessBook.ageGroup || testBookBook.ageGroup || safePlan.ageGroup,
      ''
    ),
    language: toStringSafe(
      dashboardBook.language || packageBook.language || pipelineBook.language || readinessBook.language || testBookBook.language || safePlan.language,
      'en'
    ) || 'en',
    style: toStringSafe(
      dashboardBook.style || packageBook.style || pipelineBook.style || readinessBook.style || testBookBook.style || safePlan.style,
      'clean coloring page'
    ) || 'clean coloring page',
    pageTarget: Math.max(
      0,
      toIntSafe(
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
      dashboardBook.status || packageBook.status || pipelineBook.status || readinessBook.status || testBookBook.status || safePlan.status,
      'idle'
    ) || 'idle',
    createdAt: toStringSafe(
      packageBook.createdAt || pipelineBook.createdAt || readinessBook.createdAt || testBookBook.createdAt || safePlan.createdAt,
      ''
    ),
    updatedAt: toStringSafe(
      packageBook.updatedAt || pipelineBook.updatedAt || readinessBook.updatedAt || testBookBook.updatedAt || safePlan.updatedAt,
      ''
    ),
    notes: toStringSafe(
      packageBook.notes || pipelineBook.notes || readinessBook.notes || testBookBook.notes || safePlan.notes,
      ''
    )
  };
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

function buildFallbackTestBookPackage(plan) {
  var safePlan = normalizePlan(plan || {});
  return {
    packageVersion: '1.0',
    type: 'brightcup_test_book_package',
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
    readiness: {},
    testBook: {},
    publishingSnapshot: {},
    pipeline: {},
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
    readiness: {},
    testBook: {},
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

function deriveExportStatus(pkg, pipeline, readiness, dashboard) {
  var packageStatus = toStringSafe(pkg && pkg.packageStatus, '').toLowerCase();
  var pipelineStatus = toStringSafe(pipeline && pipeline.pipelineStatus, '').toLowerCase();
  var dashboardStatus = toStringSafe(dashboard && dashboard.status, '').toLowerCase();
  var checks = isObject(readiness && readiness.readinessChecks) ? readiness.readinessChecks : {};

  if (dashboardStatus === 'ready' || packageStatus === 'ready' || pipelineStatus === 'ready') {
    return 'ready';
  }

  if (
    dashboardStatus === 'partial' ||
    packageStatus === 'partial' ||
    pipelineStatus === 'partial'
  ) {
    return 'partial';
  }

  if (
    checks.hasBookId === true &&
    checks.hasTheme === true &&
    (checks.hasApprovedPages === true || checks.hasMinimumPages === true)
  ) {
    return 'partial';
  }

  return 'blocked';
}

function buildExportFile(name, type, ready, source) {
  return {
    name: toStringSafe(name, ''),
    type: toStringSafe(type, ''),
    ready: !!ready,
    source: toStringSafe(source, '')
  };
}

function buildExportFiles(dashboard, pkg, pipeline, readiness, testBook) {
  return {
    'test-book-dashboard.json': buildExportFile(
      'test-book-dashboard.json',
      'brightcup_test_book_dashboard_payload',
      !!(dashboard && dashboard.type === 'brightcup_test_book_dashboard_payload'),
      'dashboard'
    ),
    'test-book-package.json': buildExportFile(
      'test-book-package.json',
      'brightcup_test_book_package',
      !!(pkg && pkg.type === 'brightcup_test_book_package'),
      'package'
    ),
    'test-book-pipeline.json': buildExportFile(
      'test-book-pipeline.json',
      'brightcup_test_book_pipeline',
      !!(pipeline && pipeline.type === 'brightcup_test_book_pipeline'),
      'pipeline'
    ),
    'test-book-readiness.json': buildExportFile(
      'test-book-readiness.json',
      'brightcup_test_book_readiness',
      !!(readiness && readiness.type === 'brightcup_test_book_readiness'),
      'readiness'
    ),
    'test-book.json': buildExportFile(
      'test-book.json',
      'brightcup_test_book',
      !!(testBook && testBook.type === 'brightcup_test_book'),
      'testBook'
    )
  };
}

function buildSummary(exportStatus) {
  if (exportStatus === 'ready') {
    return 'Test book export package ready. The project has a consolidated exportable test-book package.';
  }

  if (exportStatus === 'partial') {
    return 'Test book export package partial. The project already has a usable partial export package.';
  }

  return 'Test book export package blocked. The project cannot assemble an exportable test-book package yet.';
}

function buildFallbackTestBookExportPackage(plan, reason) {
  var safePlan = normalizePlan(plan || {});
  var dashboard = safeBuildTestBookDashboardPayload(safePlan);
  var pkg = safeBuildTestBookPackage(safePlan);
  var pipeline = safeRunTestBookPipeline(safePlan);
  var readiness = safeBuildTestBookReadiness(safePlan);
  var testBook = safeBuildTestBook(safePlan);
  var exportStatus = deriveExportStatus(pkg, pipeline, readiness, dashboard);

  return {
    packageVersion: '1.0',
    type: 'brightcup_test_book_export_package',
    generatedAt: nowIso(),
    book: buildBookSection(safePlan, dashboard, pkg, pipeline, readiness, testBook),
    dashboard: dashboard,
    package: pkg,
    pipeline: pipeline,
    readiness: readiness,
    testBook: testBook,
    exportFiles: buildExportFiles(dashboard, pkg, pipeline, readiness, testBook),
    exportStatus: exportStatus,
    summary: buildSummary(exportStatus) + ' Fallback generated: ' + toStringSafe(reason, 'Unknown error.')
  };
}

function buildTestBookExportPackage(plan) {
  try {
    var safePlan = normalizePlan(plan || {});
    var dashboard = safeBuildTestBookDashboardPayload(safePlan);
    var pkg = safeBuildTestBookPackage(safePlan);
    var pipeline = safeRunTestBookPipeline(safePlan);
    var readiness = safeBuildTestBookReadiness(safePlan);
    var testBook = safeBuildTestBook(safePlan);
    var exportStatus = deriveExportStatus(pkg, pipeline, readiness, dashboard);

    return {
      packageVersion: '1.0',
      type: 'brightcup_test_book_export_package',
      generatedAt: nowIso(),
      book: buildBookSection(safePlan, dashboard, pkg, pipeline, readiness, testBook),
      dashboard: dashboard,
      package: pkg,
      pipeline: pipeline,
      readiness: readiness,
      testBook: testBook,
      exportFiles: buildExportFiles(dashboard, pkg, pipeline, readiness, testBook),
      exportStatus: exportStatus,
      summary: buildSummary(exportStatus)
    };
  } catch (e) {
    return buildFallbackTestBookExportPackage(
      plan || {},
      String((e && e.message) || e || 'unknown error')
    );
  }
}

export { buildTestBookExportPackage };
