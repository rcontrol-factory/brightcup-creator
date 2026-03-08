/* FILE: /js/core/master_test_book_export_package.js */
// Bright Cup Creator — Master Test Book Export Package v0.1 SAFE
// Pacote lógico exportável da trilha MASTER TEST BOOK
// - sem DOM
// - sem canvas
// - sem dependências externas
// - compatível com Safari/iOS
// - não gera PDF real
// - não gera ZIP real
// - não gera imagens
// - apenas consolida payload lógico exportável

import { buildMasterTestBookDashboardPayload } from './master_test_book_dashboard_payload.js';
import { buildMasterTestBookReport } from './master_test_book_report.js';
import { buildMasterTestBookSnapshot } from './master_test_book_snapshot.js';
import { buildMasterTestBookBundle } from './master_test_book_bundle.js';

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

function buildBookSection(plan, dashboard, report, snapshot, bundle) {
  var safePlan = normalizePlan(plan || {});
  var dashboardBook = isObject(dashboard && dashboard.book) ? dashboard.book : {};
  var reportBook = isObject(report && report.book) ? report.book : {};
  var snapshotBook = isObject(snapshot && snapshot.book) ? snapshot.book : {};
  var bundleBook = isObject(bundle && bundle.book) ? bundle.book : {};

  return {
    id: toStringSafe(dashboardBook.id || reportBook.id || snapshotBook.id || bundleBook.id || safePlan.id, ''),
    theme: toStringSafe(dashboardBook.theme || reportBook.theme || snapshotBook.theme || bundleBook.theme || safePlan.theme, ''),
    ageGroup: toStringSafe(dashboardBook.ageGroup || reportBook.ageGroup || snapshotBook.ageGroup || bundleBook.ageGroup || safePlan.ageGroup, ''),
    language: toStringSafe(dashboardBook.language || reportBook.language || snapshotBook.language || bundleBook.language || safePlan.language, 'en') || 'en',
    style: toStringSafe(dashboardBook.style || reportBook.style || snapshotBook.style || bundleBook.style || safePlan.style, 'clean coloring page') || 'clean coloring page',
    pageTarget: Math.max(
      0,
      toIntSafe(
        dashboardBook.pageTarget ||
        reportBook.pageTarget ||
        snapshotBook.pageTarget ||
        bundleBook.pageTarget ||
        safePlan.pageTarget,
        0
      )
    ),
    status: toStringSafe(dashboardBook.status || reportBook.status || snapshotBook.status || bundleBook.status || safePlan.status, 'idle') || 'idle',
    createdAt: toStringSafe(bundleBook.createdAt || safePlan.createdAt, ''),
    updatedAt: toStringSafe(bundleBook.updatedAt || safePlan.updatedAt, ''),
    notes: toStringSafe(bundleBook.notes || safePlan.notes, '')
  };
}

function buildFallbackBundle(plan) {
  var safePlan = normalizePlan(plan || {});
  return {
    bundleVersion: '1.0',
    type: 'brightcup_master_test_book_bundle',
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
    testBookExportPackage: {
      exportStatus: 'blocked',
      summary: 'Test book export package unavailable.'
    },
    testBookDashboard: {
      status: 'blocked'
    },
    testBookPackage: {
      packageStatus: 'blocked'
    },
    testBookPipeline: {
      pipelineStatus: 'blocked'
    },
    testBookReadiness: {
      readinessChecks: {
        hasBookId: !!safePlan.id,
        hasTheme: !!safePlan.theme,
        hasApprovedPages: false,
        hasMinimumPages: false
      },
      blockers: ['No approved pages found.', 'Minimum test page count not reached.'],
      warnings: []
    },
    testBook: {
      metrics: {
        pageCount: 0,
        approvedScenes: 0,
        pendingScenes: safePlan.scenes.length,
        rejectedScenes: 0
      }
    },
    finalStatus: 'blocked',
    summary: 'Master test book bundle unavailable.'
  };
}

function safeBuildBundle(plan) {
  try {
    return buildMasterTestBookBundle(plan || {});
  } catch (e) {
    return buildFallbackBundle(plan || {});
  }
}

function buildFallbackSnapshot(plan) {
  var safePlan = normalizePlan(plan || {});
  return {
    snapshotVersion: '1.0',
    type: 'brightcup_master_test_book_snapshot',
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
    finalStatus: 'blocked',
    readiness: {
      hasBookId: !!safePlan.id,
      hasTheme: !!safePlan.theme,
      hasApprovedPages: false,
      hasMinimumPages: false,
      pipelineReady: false,
      packageReady: false,
      exportReady: false
    },
    metrics: {
      pageTarget: safePlan.pageTarget || 0,
      scenesCount: safePlan.scenes.length,
      approvedScenes: 0,
      pendingScenes: safePlan.scenes.length,
      rejectedScenes: 0,
      pageCount: 0
    },
    artifacts: {
      masterBundle: false,
      exportPackage: false,
      dashboard: false,
      package: false,
      pipeline: false,
      readiness: false,
      testBook: false
    },
    notes: [
      'Master test book snapshot unavailable.',
      'No approved pages found.',
      'Minimum test page count not reached.',
      'Export package not ready.'
    ],
    summary: 'Master test book snapshot blocked. The project still lacks the minimum structure for the full test-book layer.'
  };
}

function safeBuildSnapshot(plan) {
  try {
    return buildMasterTestBookSnapshot(plan || {});
  } catch (e) {
    return buildFallbackSnapshot(plan || {});
  }
}

function buildFallbackReport(plan) {
  var safePlan = normalizePlan(plan || {});
  return {
    reportVersion: '1.0',
    type: 'brightcup_master_test_book_report',
    generatedAt: nowIso(),
    status: 'blocked',
    headline: 'Test Book master ainda bloqueado',
    summary: 'Faltam bases mínimas para consolidar a camada master.',
    book: {
      id: safePlan.id || '',
      theme: safePlan.theme || '',
      ageGroup: safePlan.ageGroup || '',
      language: safePlan.language || 'en',
      style: safePlan.style || '',
      pageTarget: safePlan.pageTarget || 0,
      status: safePlan.status || 'idle'
    },
    progress: {
      scenesCount: safePlan.scenes.length,
      approvedScenes: 0,
      pendingScenes: safePlan.scenes.length,
      rejectedScenes: 0,
      pageCount: 0,
      hasApprovedPages: false,
      hasMinimumPages: false,
      pipelineReady: false,
      packageReady: false,
      exportReady: false
    },
    blockers: [
      'No approved pages found.',
      'Minimum test page count not reached.',
      'Export package not ready.',
      'Pipeline not ready.'
    ],
    warnings: ['Master test book report unavailable.'],
    nextActions: [
      'approve more pages',
      'reach minimum page count',
      'review pending scenes',
      'validate exportable package'
    ]
  };
}

function safeBuildReport(plan) {
  try {
    return buildMasterTestBookReport(plan || {});
  } catch (e) {
    return buildFallbackReport(plan || {});
  }
}

function buildFallbackDashboard(plan) {
  var safePlan = normalizePlan(plan || {});
  return {
    payloadVersion: '1.0',
    type: 'brightcup_master_test_book_dashboard_payload',
    generatedAt: nowIso(),
    status: 'blocked',
    header: {
      headline: 'Master Test Book ainda bloqueado',
      summary: 'Não foi possível montar o dashboard master do test book.'
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
    cards: {
      review: { label: 'Review', value: 'blocked', status: 'blocked' },
      pages: { label: 'Pages', value: '0', status: 'blocked' },
      pipeline: { label: 'Pipeline', value: 'blocked', status: 'blocked' },
      package: { label: 'Package', value: 'blocked', status: 'blocked' },
      export: { label: 'Export', value: 'blocked', status: 'blocked' }
    },
    indicators: [],
    alerts: ['master test book dashboard unavailable'],
    actions: ['review project structure']
  };
}

function safeBuildDashboard(plan) {
  try {
    return buildMasterTestBookDashboardPayload(plan || {});
  } catch (e) {
    return buildFallbackDashboard(plan || {});
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

function buildExportFiles(dashboard, report, snapshot, bundle) {
  return {
    'master-test-book-dashboard.json': buildExportFile(
      'master-test-book-dashboard.json',
      'brightcup_master_test_book_dashboard_payload',
      !!(dashboard && dashboard.type === 'brightcup_master_test_book_dashboard_payload'),
      'dashboard'
    ),
    'master-test-book-report.json': buildExportFile(
      'master-test-book-report.json',
      'brightcup_master_test_book_report',
      !!(report && report.type === 'brightcup_master_test_book_report'),
      'report'
    ),
    'master-test-book-snapshot.json': buildExportFile(
      'master-test-book-snapshot.json',
      'brightcup_master_test_book_snapshot',
      !!(snapshot && snapshot.type === 'brightcup_master_test_book_snapshot'),
      'snapshot'
    ),
    'master-test-book-bundle.json': buildExportFile(
      'master-test-book-bundle.json',
      'brightcup_master_test_book_bundle',
      !!(bundle && bundle.type === 'brightcup_master_test_book_bundle'),
      'bundle'
    )
  };
}

function normalizeStatus(status) {
  var s = toStringSafe(status, 'blocked').toLowerCase();
  if (s === 'ready') return 'ready';
  if (s === 'partial') return 'partial';
  return 'blocked';
}

function deriveExportStatus(dashboard, report, snapshot, bundle) {
  var bundleStatus = normalizeStatus(bundle && bundle.finalStatus);
  var reportStatus = normalizeStatus(report && report.status);
  var snapshotStatus = normalizeStatus(snapshot && snapshot.finalStatus);
  var dashboardStatus = normalizeStatus(dashboard && dashboard.status);
  var readiness = isObject(snapshot && snapshot.readiness) ? snapshot.readiness : {};
  var metrics = isObject(snapshot && snapshot.metrics) ? snapshot.metrics : {};

  if (
    dashboard &&
    report &&
    snapshot &&
    bundle &&
    dashboard.type === 'brightcup_master_test_book_dashboard_payload' &&
    report.type === 'brightcup_master_test_book_report' &&
    snapshot.type === 'brightcup_master_test_book_snapshot' &&
    bundle.type === 'brightcup_master_test_book_bundle' &&
    bundleStatus === 'ready'
  ) {
    return 'ready';
  }

  if (
    bundleStatus === 'partial' ||
    reportStatus === 'partial' ||
    snapshotStatus === 'partial' ||
    dashboardStatus === 'partial' ||
    readiness.hasApprovedPages === true ||
    Math.max(0, toIntSafe(metrics.pageCount, 0)) > 0 ||
    Math.max(0, toIntSafe(metrics.approvedScenes, 0)) > 0
  ) {
    return 'partial';
  }

  return 'blocked';
}

function buildSummary(exportStatus) {
  if (exportStatus === 'ready') {
    return 'Master test book export package ready. The master test-book layer has a consolidated exportable package.';
  }

  if (exportStatus === 'partial') {
    return 'Master test book export package partial. The project already has consistent master test-book export progress.';
  }

  return 'Master test book export package blocked. The project still lacks the minimum structure for an exportable master test-book package.';
}

function buildFallbackMasterTestBookExportPackage(plan, reason) {
  var safePlan = normalizePlan(plan || {});
  var dashboard = safeBuildDashboard(safePlan);
  var report = safeBuildReport(safePlan);
  var snapshot = safeBuildSnapshot(safePlan);
  var bundle = safeBuildBundle(safePlan);
  var exportStatus = deriveExportStatus(dashboard, report, snapshot, bundle);

  return {
    packageVersion: '1.0',
    type: 'brightcup_master_test_book_export_package',
    generatedAt: nowIso(),
    book: buildBookSection(safePlan, dashboard, report, snapshot, bundle),
    dashboard: dashboard,
    report: report,
    snapshot: snapshot,
    bundle: bundle,
    exportFiles: buildExportFiles(dashboard, report, snapshot, bundle),
    exportStatus: exportStatus,
    summary: buildSummary(exportStatus) + ' Fallback generated: ' + toStringSafe(reason, 'Unknown error.')
  };
}

function buildMasterTestBookExportPackage(plan) {
  try {
    var safePlan = normalizePlan(plan || {});
    var dashboard = safeBuildDashboard(safePlan);
    var report = safeBuildReport(safePlan);
    var snapshot = safeBuildSnapshot(safePlan);
    var bundle = safeBuildBundle(safePlan);
    var exportStatus = deriveExportStatus(dashboard, report, snapshot, bundle);

    return {
      packageVersion: '1.0',
      type: 'brightcup_master_test_book_export_package',
      generatedAt: nowIso(),
      book: buildBookSection(safePlan, dashboard, report, snapshot, bundle),
      dashboard: dashboard,
      report: report,
      snapshot: snapshot,
      bundle: bundle,
      exportFiles: buildExportFiles(dashboard, report, snapshot, bundle),
      exportStatus: exportStatus,
      summary: buildSummary(exportStatus)
    };
  } catch (e) {
    return buildFallbackMasterTestBookExportPackage(
      plan || {},
      String((e && e.message) || e || 'unknown error')
    );
  }
}

export { buildMasterTestBookExportPackage };
