/* FILE: /js/core/master_test_book_dashboard_payload.js */
// Bright Cup Creator — Master Test Book Dashboard Payload v0.1 SAFE
// Camada lógica resumida e visualmente orientada da trilha MASTER TEST BOOK
// - acima de master_test_book_report.js
// - acima de master_test_book_snapshot.js
// - acima de master_test_book_bundle.js
// - acima de test_book_export_package.js
// - acima de test_book_dashboard_payload.js
// - acima de test_book_package.js
// - acima de test_book_pipeline.js
// - acima de test_book_readiness.js
// - acima de book_test_builder.js
// - sem DOM
// - sem canvas
// - sem dependências externas
// - compatível com Safari/iOS
// - não gera PDF real
// - não gera ZIP real
// - não gera imagens
// - apenas consolida payload leve para futura dashboard master

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

function buildBookSection(plan, report, snapshot, masterBundle) {
  var safePlan = normalizePlan(plan || {});
  var reportBook = isObject(report && report.book) ? report.book : {};
  var snapshotBook = isObject(snapshot && snapshot.book) ? snapshot.book : {};
  var bundleBook = isObject(masterBundle && masterBundle.book) ? masterBundle.book : {};

  return {
    id: toStringSafe(reportBook.id || snapshotBook.id || bundleBook.id || safePlan.id, ''),
    theme: toStringSafe(reportBook.theme || snapshotBook.theme || bundleBook.theme || safePlan.theme, ''),
    ageGroup: toStringSafe(reportBook.ageGroup || snapshotBook.ageGroup || bundleBook.ageGroup || safePlan.ageGroup, ''),
    language: toStringSafe(reportBook.language || snapshotBook.language || bundleBook.language || safePlan.language, 'en') || 'en',
    style: toStringSafe(reportBook.style || snapshotBook.style || bundleBook.style || safePlan.style, 'clean coloring page') || 'clean coloring page',
    pageTarget: Math.max(0, toIntSafe(reportBook.pageTarget || snapshotBook.pageTarget || bundleBook.pageTarget || safePlan.pageTarget, 0)),
    status: toStringSafe(reportBook.status || snapshotBook.status || bundleBook.status || safePlan.status, 'idle') || 'idle'
  };
}

function buildFallbackMasterTestBookBundle(plan) {
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
      packageStatus: 'blocked',
      summary: 'Test book package unavailable.'
    },
    testBookPipeline: {
      pipelineStatus: 'blocked',
      summary: 'Test book pipeline unavailable.'
    },
    testBookReadiness: {
      readinessChecks: {
        hasBookId: !!safePlan.id,
        hasTheme: !!safePlan.theme,
        hasApprovedPages: false,
        hasMinimumPages: false,
        publishingStatus: 'blocked'
      },
      blockers: [
        'No approved pages found.',
        'Minimum test page count not reached.'
      ],
      warnings: [],
      summary: 'Test book readiness unavailable.'
    },
    testBook: {
      metrics: {
        pageCount: 0,
        approvedScenes: 0,
        pendingScenes: safePlan.scenes.length,
        rejectedScenes: 0
      },
      pages: [],
      scenes: []
    },
    finalStatus: 'blocked',
    summary: 'Master test book bundle unavailable.'
  };
}

function safeBuildMasterTestBookBundle(plan) {
  try {
    return buildMasterTestBookBundle(plan || {});
  } catch (e) {
    return buildFallbackMasterTestBookBundle(plan || {});
  }
}

function buildFallbackMasterTestBookSnapshot(plan) {
  var safePlan = normalizePlan(plan || {});
  var safeBundle = safeBuildMasterTestBookBundle(safePlan);

  return {
    snapshotVersion: '1.0',
    type: 'brightcup_master_test_book_snapshot',
    generatedAt: nowIso(),
    book: buildBookSection(safePlan, null, null, safeBundle),
    finalStatus: toStringSafe(safeBundle.finalStatus, 'blocked') || 'blocked',
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
      masterBundle: true,
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

function safeBuildMasterTestBookSnapshot(plan) {
  try {
    return buildMasterTestBookSnapshot(plan || {});
  } catch (e) {
    return buildFallbackMasterTestBookSnapshot(plan || {});
  }
}

function buildFallbackMasterTestBookReport(plan) {
  var safePlan = normalizePlan(plan || {});
  var safeSnapshot = safeBuildMasterTestBookSnapshot(safePlan);

  return {
    reportVersion: '1.0',
    type: 'brightcup_master_test_book_report',
    generatedAt: nowIso(),
    status: toStringSafe(safeSnapshot.finalStatus, 'blocked') || 'blocked',
    headline: 'Test Book master ainda bloqueado',
    summary: 'Faltam bases mínimas para consolidar a camada master.',
    book: buildBookSection(safePlan, null, safeSnapshot, null),
    progress: {
      scenesCount: toIntSafe(safeSnapshot.metrics && safeSnapshot.metrics.scenesCount, 0),
      approvedScenes: toIntSafe(safeSnapshot.metrics && safeSnapshot.metrics.approvedScenes, 0),
      pendingScenes: toIntSafe(safeSnapshot.metrics && safeSnapshot.metrics.pendingScenes, 0),
      rejectedScenes: toIntSafe(safeSnapshot.metrics && safeSnapshot.metrics.rejectedScenes, 0),
      pageCount: toIntSafe(safeSnapshot.metrics && safeSnapshot.metrics.pageCount, 0),
      hasApprovedPages: !!(safeSnapshot.readiness && safeSnapshot.readiness.hasApprovedPages),
      hasMinimumPages: !!(safeSnapshot.readiness && safeSnapshot.readiness.hasMinimumPages),
      pipelineReady: !!(safeSnapshot.readiness && safeSnapshot.readiness.pipelineReady),
      packageReady: !!(safeSnapshot.readiness && safeSnapshot.readiness.packageReady),
      exportReady: !!(safeSnapshot.readiness && safeSnapshot.readiness.exportReady)
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

function safeBuildMasterTestBookReport(plan) {
  try {
    return buildMasterTestBookReport(plan || {});
  } catch (e) {
    return buildFallbackMasterTestBookReport(plan || {});
  }
}

function normalizeStatus(status) {
  var s = toStringSafe(status, 'blocked').toLowerCase();
  if (s === 'ready') return 'ready';
  if (s === 'partial') return 'partial';
  return 'blocked';
}

function boolStatus(flag) {
  return flag ? 'ready' : 'blocked';
}

function countStatus(mainValue, secondaryValue) {
  var a = Math.max(0, toIntSafe(mainValue, 0));
  var b = Math.max(0, toIntSafe(secondaryValue, 0));

  if (a > 0 && b === 0) return 'ready';
  if (a > 0 || b > 0) return 'partial';
  return 'blocked';
}

function buildHeader(status, report) {
  var headline = toStringSafe(report && report.headline, '');
  var summary = toStringSafe(report && report.summary, '');

  if (!headline) {
    if (status === 'ready') headline = 'Master Test Book pronto';
    else if (status === 'partial') headline = 'Master Test Book com progresso consistente';
    else headline = 'Master Test Book ainda bloqueado';
  }

  if (!summary) {
    if (status === 'ready') summary = 'O projeto já possui base consolidada para a camada master do livro de teste.';
    else if (status === 'partial') summary = 'O projeto avançou bem, mas ainda faltam alguns ajustes finais.';
    else summary = 'O projeto ainda não possui base suficiente para consolidar a camada master do livro de teste.';
  }

  return {
    headline: headline,
    summary: summary
  };
}

function buildCards(report, snapshot, masterBundle, status) {
  var progress = isObject(report && report.progress) ? report.progress : {};
  var readiness = isObject(snapshot && snapshot.readiness) ? snapshot.readiness : {};
  var exportPackage = isObject(masterBundle && masterBundle.testBookExportPackage) ? masterBundle.testBookExportPackage : {};
  var packageObj = isObject(masterBundle && masterBundle.testBookPackage) ? masterBundle.testBookPackage : {};
  var pipelineObj = isObject(masterBundle && masterBundle.testBookPipeline) ? masterBundle.testBookPipeline : {};

  return {
    review: {
      label: 'Review',
      value: String(Math.max(0, toIntSafe(progress.approvedScenes, 0))) + ' approved',
      status: countStatus(progress.approvedScenes, progress.pendingScenes)
    },
    pages: {
      label: 'Pages',
      value: String(Math.max(0, toIntSafe(progress.pageCount, 0))),
      status: readiness.hasMinimumPages ? 'ready' : (readiness.hasApprovedPages ? 'partial' : 'blocked')
    },
    pipeline: {
      label: 'Pipeline',
      value: toStringSafe(pipelineObj.pipelineStatus, status),
      status: normalizeStatus(pipelineObj.pipelineStatus || status)
    },
    package: {
      label: 'Package',
      value: toStringSafe(packageObj.packageStatus, status),
      status: normalizeStatus(packageObj.packageStatus || status)
    },
    export: {
      label: 'Export',
      value: toStringSafe(exportPackage.exportStatus, status),
      status: normalizeStatus(exportPackage.exportStatus || status)
    }
  };
}

function buildIndicators(report, snapshot, masterBundle) {
  var progress = isObject(report && report.progress) ? report.progress : {};
  var readiness = isObject(snapshot && snapshot.readiness) ? snapshot.readiness : {};
  var exportPackage = isObject(masterBundle && masterBundle.testBookExportPackage) ? masterBundle.testBookExportPackage : {};

  return [
    {
      key: 'approved_scenes',
      label: 'Approved Scenes',
      value: Math.max(0, toIntSafe(progress.approvedScenes, 0)),
      status: countStatus(progress.approvedScenes, progress.pendingScenes)
    },
    {
      key: 'pending_scenes',
      label: 'Pending Scenes',
      value: Math.max(0, toIntSafe(progress.pendingScenes, 0)),
      status: Math.max(0, toIntSafe(progress.pendingScenes, 0)) === 0 ? 'ready' : 'partial'
    },
    {
      key: 'rejected_scenes',
      label: 'Rejected Scenes',
      value: Math.max(0, toIntSafe(progress.rejectedScenes, 0)),
      status: Math.max(0, toIntSafe(progress.rejectedScenes, 0)) === 0 ? 'ready' : 'partial'
    },
    {
      key: 'generated_pages',
      label: 'Generated Pages',
      value: Math.max(0, toIntSafe(progress.pageCount, 0)),
      status: readiness.hasMinimumPages ? 'ready' : (readiness.hasApprovedPages ? 'partial' : 'blocked')
    },
    {
      key: 'minimum_pages_reached',
      label: 'Minimum Pages Reached',
      value: !!readiness.hasMinimumPages,
      status: boolStatus(!!readiness.hasMinimumPages)
    },
    {
      key: 'export_ready',
      label: 'Export Ready',
      value: toStringSafe(exportPackage.exportStatus, 'blocked') || 'blocked',
      status: normalizeStatus(exportPackage.exportStatus)
    }
  ];
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

function buildAlerts(report, snapshot, status) {
  var blockers = toArraySafe(report && report.blockers);
  var warnings = toArraySafe(report && report.warnings);
  var notes = toArraySafe(snapshot && snapshot.notes);
  var alerts = dedupeStrings(blockers.concat(warnings).concat(notes));

  if (status === 'ready') {
    return [];
  }

  return alerts.slice(0, 10);
}

function buildActions(report, status) {
  var actions = toArraySafe(report && report.nextActions);

  if (status === 'ready') {
    if (!actions.length) {
      actions = ['review final test-book output', 'prepare next visual layer'];
    }
    return dedupeStrings(actions).slice(0, 6);
  }

  if (!actions.length) {
    actions = [
      'approve more pages',
      'reach minimum page count',
      'review pending scenes',
      'validate exportable package',
      'review final blockers'
    ];
  }

  return dedupeStrings(actions).slice(0, 6);
}

function buildFallbackMasterTestBookDashboardPayload(plan, reason) {
  var safePlan = normalizePlan(plan || {});
  var report = safeBuildMasterTestBookReport(safePlan);
  var snapshot = safeBuildMasterTestBookSnapshot(safePlan);
  var masterBundle = safeBuildMasterTestBookBundle(safePlan);
  var status = normalizeStatus(report && report.status);
  var alerts = buildAlerts(report, snapshot, status);

  alerts.unshift('Fallback generated: ' + toStringSafe(reason, 'Unknown error.'));

  return {
    payloadVersion: '1.0',
    type: 'brightcup_master_test_book_dashboard_payload',
    generatedAt: nowIso(),
    status: status,
    header: buildHeader(status, report),
    book: buildBookSection(safePlan, report, snapshot, masterBundle),
    cards: buildCards(report, snapshot, masterBundle, status),
    indicators: buildIndicators(report, snapshot, masterBundle),
    alerts: dedupeStrings(alerts).slice(0, 10),
    actions: buildActions(report, status)
  };
}

function buildMasterTestBookDashboardPayload(plan) {
  try {
    var safePlan = normalizePlan(plan || {});
    var report = safeBuildMasterTestBookReport(safePlan);
    var snapshot = safeBuildMasterTestBookSnapshot(safePlan);
    var masterBundle = safeBuildMasterTestBookBundle(safePlan);
    var status = normalizeStatus(report && report.status);

    return {
      payloadVersion: '1.0',
      type: 'brightcup_master_test_book_dashboard_payload',
      generatedAt: nowIso(),
      status: status,
      header: buildHeader(status, report),
      book: buildBookSection(safePlan, report, snapshot, masterBundle),
      cards: buildCards(report, snapshot, masterBundle, status),
      indicators: buildIndicators(report, snapshot, masterBundle),
      alerts: buildAlerts(report, snapshot, status),
      actions: buildActions(report, status)
    };
  } catch (e) {
    return buildFallbackMasterTestBookDashboardPayload(
      plan || {},
      String((e && e.message) || e || 'unknown error')
    );
  }
}

export { buildMasterTestBookDashboardPayload };
