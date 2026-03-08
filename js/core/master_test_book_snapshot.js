/* FILE: /js/core/master_test_book_snapshot.js */
// Bright Cup Creator — Master Test Book Snapshot v0.1 SAFE
// Snapshot lógico resumido da trilha MASTER TEST BOOK
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
// - apenas consolida um resumo lógico leve

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

function buildBookSection(plan, masterBundle) {
  var safePlan = normalizePlan(plan || {});
  var bundleBook = isObject(masterBundle && masterBundle.book) ? masterBundle.book : {};

  return {
    id: toStringSafe(bundleBook.id || safePlan.id, ''),
    theme: toStringSafe(bundleBook.theme || safePlan.theme, ''),
    ageGroup: toStringSafe(bundleBook.ageGroup || safePlan.ageGroup, ''),
    language: toStringSafe(bundleBook.language || safePlan.language, 'en') || 'en',
    style: toStringSafe(bundleBook.style || safePlan.style, 'clean coloring page') || 'clean coloring page',
    pageTarget: Math.max(0, toIntSafe(bundleBook.pageTarget || safePlan.pageTarget, 0)),
    status: toStringSafe(bundleBook.status || safePlan.status, 'idle') || 'idle',
    createdAt: toStringSafe(bundleBook.createdAt || safePlan.createdAt, ''),
    updatedAt: toStringSafe(bundleBook.updatedAt || safePlan.updatedAt, ''),
    notes: toStringSafe(bundleBook.notes || safePlan.notes, '')
  };
}

function buildFallbackMasterTestBookBundle(plan) {
  var safePlan = normalizePlan(plan || {});
  return {
    bundleVersion: '1.0',
    type: 'brightcup_master_test_book_bundle',
    generatedAt: nowIso(),
    book: buildBookSection(safePlan, null),
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

function buildReadiness(masterBundle) {
  var readiness = isObject(masterBundle && masterBundle.testBookReadiness)
    ? masterBundle.testBookReadiness
    : {};
  var pipeline = isObject(masterBundle && masterBundle.testBookPipeline)
    ? masterBundle.testBookPipeline
    : {};
  var pkg = isObject(masterBundle && masterBundle.testBookPackage)
    ? masterBundle.testBookPackage
    : {};
  var exportPackage = isObject(masterBundle && masterBundle.testBookExportPackage)
    ? masterBundle.testBookExportPackage
    : {};
  var checks = isObject(readiness.readinessChecks) ? readiness.readinessChecks : {};

  return {
    hasBookId: !!checks.hasBookId,
    hasTheme: !!checks.hasTheme,
    hasApprovedPages: !!checks.hasApprovedPages,
    hasMinimumPages: !!checks.hasMinimumPages,
    pipelineReady: toStringSafe(pipeline.pipelineStatus, 'blocked') === 'ready',
    packageReady: toStringSafe(pkg.packageStatus, 'blocked') === 'ready',
    exportReady: toStringSafe(exportPackage.exportStatus, 'blocked') === 'ready'
  };
}

function buildMetrics(plan, masterBundle) {
  var safePlan = normalizePlan(plan || {});
  var testBook = isObject(masterBundle && masterBundle.testBook) ? masterBundle.testBook : {};
  var testMetrics = isObject(testBook.metrics) ? testBook.metrics : {};
  var scenesCount = safePlan.scenes.length;

  return {
    pageTarget: Math.max(0, toIntSafe(safePlan.pageTarget, 0)),
    scenesCount: scenesCount,
    approvedScenes: Math.max(0, toIntSafe(testMetrics.approvedScenes, 0)),
    pendingScenes: Math.max(0, toIntSafe(testMetrics.pendingScenes, 0)),
    rejectedScenes: Math.max(0, toIntSafe(testMetrics.rejectedScenes, 0)),
    pageCount: Math.max(0, toIntSafe(testMetrics.pageCount, 0))
  };
}

function buildArtifacts(masterBundle) {
  return {
    masterBundle: !!(masterBundle && masterBundle.type === 'brightcup_master_test_book_bundle'),
    exportPackage: !!(
      masterBundle &&
      masterBundle.testBookExportPackage &&
      masterBundle.testBookExportPackage.type === 'brightcup_test_book_export_package'
    ),
    dashboard: !!(
      masterBundle &&
      masterBundle.testBookDashboard &&
      masterBundle.testBookDashboard.type === 'brightcup_test_book_dashboard_payload'
    ),
    package: !!(
      masterBundle &&
      masterBundle.testBookPackage &&
      masterBundle.testBookPackage.type === 'brightcup_test_book_package'
    ),
    pipeline: !!(
      masterBundle &&
      masterBundle.testBookPipeline &&
      masterBundle.testBookPipeline.type === 'brightcup_test_book_pipeline'
    ),
    readiness: !!(
      masterBundle &&
      masterBundle.testBookReadiness &&
      masterBundle.testBookReadiness.type === 'brightcup_test_book_readiness'
    ),
    testBook: !!(
      masterBundle &&
      masterBundle.testBook &&
      masterBundle.testBook.type === 'brightcup_test_book'
    )
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

function buildNotes(masterBundle, readiness, metrics) {
  var notes = [];
  var bundleSummary = toStringSafe(masterBundle && masterBundle.summary, '');
  var readinessSummary = toStringSafe(
    masterBundle && masterBundle.testBookReadiness && masterBundle.testBookReadiness.summary,
    ''
  );
  var blockers = toArraySafe(
    masterBundle && masterBundle.testBookReadiness && masterBundle.testBookReadiness.blockers
  );
  var warnings = toArraySafe(
    masterBundle && masterBundle.testBookReadiness && masterBundle.testBookReadiness.warnings
  );

  if (bundleSummary) notes.push(bundleSummary);
  if (readinessSummary) notes.push(readinessSummary);

  if (!readiness.hasApprovedPages) {
    notes.push('No approved pages found.');
  }
  if (!readiness.hasMinimumPages) {
    notes.push('Minimum test page count not reached.');
  }
  if (!readiness.exportReady) {
    notes.push('Export package not ready.');
  }
  if (metrics.pageCount > 0 && metrics.pageCount < 4) {
    notes.push('Test book still has a small page count.');
  }

  notes = notes.concat(blockers).concat(warnings);

  return dedupeStrings(notes).slice(0, 10);
}

function buildSummary(finalStatus) {
  if (finalStatus === 'ready') {
    return 'Master test book snapshot ready. The full test-book layer is logically consolidated.';
  }

  if (finalStatus === 'partial') {
    return 'Master test book snapshot partial. The project already has consistent test-book progress.';
  }

  return 'Master test book snapshot blocked. The project still lacks the minimum structure for the full test-book layer.';
}

function buildFallbackMasterTestBookSnapshot(plan, reason) {
  var safePlan = normalizePlan(plan || {});
  var masterBundle = safeBuildMasterTestBookBundle(safePlan);
  var finalStatus = toStringSafe(masterBundle && masterBundle.finalStatus, 'blocked') || 'blocked';
  var readiness = buildReadiness(masterBundle);
  var metrics = buildMetrics(safePlan, masterBundle);
  var artifacts = buildArtifacts(masterBundle);
  var notes = buildNotes(masterBundle, readiness, metrics);

  notes.unshift('Fallback generated: ' + toStringSafe(reason, 'Unknown error.'));

  return {
    snapshotVersion: '1.0',
    type: 'brightcup_master_test_book_snapshot',
    generatedAt: nowIso(),
    book: buildBookSection(safePlan, masterBundle),
    finalStatus: finalStatus,
    readiness: readiness,
    metrics: metrics,
    artifacts: artifacts,
    notes: dedupeStrings(notes).slice(0, 10),
    summary: buildSummary(finalStatus)
  };
}

function buildMasterTestBookSnapshot(plan) {
  try {
    var safePlan = normalizePlan(plan || {});
    var masterBundle = safeBuildMasterTestBookBundle(safePlan);
    var finalStatus = toStringSafe(masterBundle && masterBundle.finalStatus, 'blocked') || 'blocked';
    var readiness = buildReadiness(masterBundle);
    var metrics = buildMetrics(safePlan, masterBundle);
    var artifacts = buildArtifacts(masterBundle);
    var notes = buildNotes(masterBundle, readiness, metrics);

    return {
      snapshotVersion: '1.0',
      type: 'brightcup_master_test_book_snapshot',
      generatedAt: nowIso(),
      book: buildBookSection(safePlan, masterBundle),
      finalStatus: finalStatus,
      readiness: readiness,
      metrics: metrics,
      artifacts: artifacts,
      notes: notes,
      summary: buildSummary(finalStatus)
    };
  } catch (e) {
    return buildFallbackMasterTestBookSnapshot(
      plan || {},
      String((e && e.message) || e || 'unknown error')
    );
  }
}

export { buildMasterTestBookSnapshot };
