/* FILE: /js/core/master_test_book_report.js */
// Bright Cup Creator — Master Test Book Report v0.1 SAFE
// Relatório lógico, humano e legível da trilha MASTER TEST BOOK
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
// - apenas consolida um relatório lógico leve e legível

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

function buildBookSection(plan, snapshot, masterBundle) {
  var safePlan = normalizePlan(plan || {});
  var snapshotBook = isObject(snapshot && snapshot.book) ? snapshot.book : {};
  var bundleBook = isObject(masterBundle && masterBundle.book) ? masterBundle.book : {};

  return {
    id: toStringSafe(snapshotBook.id || bundleBook.id || safePlan.id, ''),
    theme: toStringSafe(snapshotBook.theme || bundleBook.theme || safePlan.theme, ''),
    ageGroup: toStringSafe(snapshotBook.ageGroup || bundleBook.ageGroup || safePlan.ageGroup, ''),
    language: toStringSafe(snapshotBook.language || bundleBook.language || safePlan.language, 'en') || 'en',
    style: toStringSafe(snapshotBook.style || bundleBook.style || safePlan.style, 'clean coloring page') || 'clean coloring page',
    pageTarget: Math.max(0, toIntSafe(snapshotBook.pageTarget || bundleBook.pageTarget || safePlan.pageTarget, 0)),
    status: toStringSafe(snapshotBook.status || bundleBook.status || safePlan.status, 'idle') || 'idle'
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
    book: buildBookSection(safePlan, null, safeBundle),
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

function normalizeStatus(status) {
  var s = toStringSafe(status, 'blocked').toLowerCase();
  if (s === 'ready') return 'ready';
  if (s === 'partial') return 'partial';
  return 'blocked';
}

function buildHeadline(status) {
  if (status === 'ready') {
    return 'Test Book master pronto';
  }
  if (status === 'partial') {
    return 'Test Book master com progresso consistente';
  }
  return 'Test Book master ainda bloqueado';
}

function buildSummary(status) {
  if (status === 'ready') {
    return 'O projeto já tem base consolidada para livro de teste.';
  }
  if (status === 'partial') {
    return 'O projeto avançou, mas ainda faltam ajustes.';
  }
  return 'Faltam bases mínimas para consolidar a camada master.';
}

function buildProgress(snapshot) {
  var metrics = isObject(snapshot && snapshot.metrics) ? snapshot.metrics : {};
  var readiness = isObject(snapshot && snapshot.readiness) ? snapshot.readiness : {};

  return {
    scenesCount: Math.max(0, toIntSafe(metrics.scenesCount, 0)),
    approvedScenes: Math.max(0, toIntSafe(metrics.approvedScenes, 0)),
    pendingScenes: Math.max(0, toIntSafe(metrics.pendingScenes, 0)),
    rejectedScenes: Math.max(0, toIntSafe(metrics.rejectedScenes, 0)),
    pageCount: Math.max(0, toIntSafe(metrics.pageCount, 0)),
    hasApprovedPages: !!readiness.hasApprovedPages,
    hasMinimumPages: !!readiness.hasMinimumPages,
    pipelineReady: !!readiness.pipelineReady,
    packageReady: !!readiness.packageReady,
    exportReady: !!readiness.exportReady
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

function buildBlockers(snapshot, masterBundle, progress, status) {
  var blockers = [];
  var notes = toArraySafe(snapshot && snapshot.notes);
  var readinessBlockers = toArraySafe(
    masterBundle &&
    masterBundle.testBookReadiness &&
    masterBundle.testBookReadiness.blockers
  );

  blockers = blockers.concat(readinessBlockers);

  if (!progress.hasApprovedPages) blockers.push('No approved pages found.');
  if (!progress.hasMinimumPages) blockers.push('Minimum test page count not reached.');
  if (!progress.exportReady) blockers.push('Export package not ready.');
  if (!progress.pipelineReady) blockers.push('Pipeline not ready.');

  if (status === 'blocked') {
    blockers = blockers.concat(notes);
  }

  return dedupeStrings(blockers).slice(0, 8);
}

function buildWarnings(snapshot, masterBundle, progress, status) {
  var warnings = [];
  var notes = toArraySafe(snapshot && snapshot.notes);
  var readinessWarnings = toArraySafe(
    masterBundle &&
    masterBundle.testBookReadiness &&
    masterBundle.testBookReadiness.warnings
  );

  warnings = warnings.concat(readinessWarnings);

  if (progress.pageCount > 0 && progress.pageCount < 4) {
    warnings.push('Few pages generated so far.');
  }
  if (status === 'partial') {
    warnings.push('The test-book layer has partial progress.');
  }
  if (progress.pipelineReady && !progress.exportReady) {
    warnings.push('Pipeline progressed, but export is still incomplete.');
  }
  if (notes.length && status !== 'blocked') {
    warnings = warnings.concat(notes);
  }

  return dedupeStrings(warnings).slice(0, 8);
}

function buildNextActions(progress, status) {
  var actions = [];

  if (status === 'ready') {
    actions.push('review final test-book output');
    actions.push('prepare next visual layer');
    return dedupeStrings(actions).slice(0, 6);
  }

  if (!progress.hasApprovedPages) {
    actions.push('approve more pages');
  }
  if (!progress.hasMinimumPages) {
    actions.push('reach minimum page count');
  }
  if (progress.pendingScenes > 0) {
    actions.push('review pending scenes');
  }
  if (!progress.exportReady) {
    actions.push('validate exportable package');
  }
  if (!progress.pipelineReady || !progress.packageReady) {
    actions.push('review final blockers');
  }

  if (!actions.length) {
    actions.push('review project structure');
  }

  return dedupeStrings(actions).slice(0, 6);
}

function buildFallbackMasterTestBookReport(plan, reason) {
  var safePlan = normalizePlan(plan || {});
  var masterBundle = safeBuildMasterTestBookBundle(safePlan);
  var snapshot = safeBuildMasterTestBookSnapshot(safePlan);
  var status = normalizeStatus(snapshot && snapshot.finalStatus);
  var blockers = buildBlockers(snapshot, masterBundle, buildProgress(snapshot), status);
  var warnings = buildWarnings(snapshot, masterBundle, buildProgress(snapshot), status);

  warnings.unshift('Fallback generated: ' + toStringSafe(reason, 'Unknown error.'));

  return {
    reportVersion: '1.0',
    type: 'brightcup_master_test_book_report',
    generatedAt: nowIso(),
    status: status,
    headline: buildHeadline(status),
    summary: buildSummary(status),
    book: buildBookSection(safePlan, snapshot, masterBundle),
    progress: buildProgress(snapshot),
    blockers: blockers,
    warnings: dedupeStrings(warnings).slice(0, 8),
    nextActions: buildNextActions(buildProgress(snapshot), status)
  };
}

function buildMasterTestBookReport(plan) {
  try {
    var safePlan = normalizePlan(plan || {});
    var snapshot = safeBuildMasterTestBookSnapshot(safePlan);
    var masterBundle = safeBuildMasterTestBookBundle(safePlan);
    var status = normalizeStatus(snapshot && snapshot.finalStatus);
    var progress = buildProgress(snapshot);

    return {
      reportVersion: '1.0',
      type: 'brightcup_master_test_book_report',
      generatedAt: nowIso(),
      status: status,
      headline: buildHeadline(status),
      summary: buildSummary(status),
      book: buildBookSection(safePlan, snapshot, masterBundle),
      progress: progress,
      blockers: buildBlockers(snapshot, masterBundle, progress, status),
      warnings: buildWarnings(snapshot, masterBundle, progress, status),
      nextActions: buildNextActions(progress, status)
    };
  } catch (e) {
    return buildFallbackMasterTestBookReport(
      plan || {},
      String((e && e.message) || e || 'unknown error')
    );
  }
}

export { buildMasterTestBookReport };
