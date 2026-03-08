/* FILE: /js/core/test_book_dashboard_payload.js */
// Bright Cup Creator — Test Book Dashboard Payload v0.1 SAFE
// Camada lógica resumida do estado do livro de teste
// - acima de test_book_package
// - acima de test_book_pipeline
// - acima de test_book_readiness
// - acima de book_test_builder
// - acima de publishing_snapshot
// - sem DOM
// - sem canvas
// - sem dependências externas
// - compatível com Safari/iOS

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

function buildBookSection(plan, readiness, testBook, pipeline, pkg) {
  var safePlan = normalizePlan(plan || {});
  var readinessBook = isObject(readiness && readiness.book) ? readiness.book : {};
  var testBookBook = isObject(testBook && testBook.book) ? testBook.book : {};
  var pipelineBook = isObject(pipeline && pipeline.book) ? pipeline.book : {};
  var packageBook = isObject(pkg && pkg.book) ? pkg.book : {};

  return {
    id: toStringSafe(packageBook.id || pipelineBook.id || readinessBook.id || testBookBook.id || safePlan.id, ''),
    theme: toStringSafe(packageBook.theme || pipelineBook.theme || readinessBook.theme || testBookBook.theme || safePlan.theme, ''),
    ageGroup: toStringSafe(packageBook.ageGroup || pipelineBook.ageGroup || readinessBook.ageGroup || testBookBook.ageGroup || safePlan.ageGroup, ''),
    language: toStringSafe(packageBook.language || pipelineBook.language || readinessBook.language || testBookBook.language || safePlan.language, 'en') || 'en',
    style: toStringSafe(packageBook.style || pipelineBook.style || readinessBook.style || testBookBook.style || safePlan.style, 'clean coloring page') || 'clean coloring page',
    pageTarget: Math.max(
      0,
      toIntSafe(
        packageBook.pageTarget ||
        pipelineBook.pageTarget ||
        readinessBook.pageTarget ||
        testBookBook.pageTarget ||
        safePlan.pageTarget,
        0
      )
    ),
    status: toStringSafe(packageBook.status || pipelineBook.status || readinessBook.status || testBookBook.status || safePlan.status, 'idle') || 'idle'
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

function normalizeStatus(status, pipeline, readiness) {
  var s = toStringSafe(status, '').toLowerCase();

  if (s === 'ready') return 'ready';
  if (s === 'partial') return 'partial';
  if (s === 'blocked') return 'blocked';

  s = toStringSafe(pipeline && pipeline.pipelineStatus, '').toLowerCase();
  if (s === 'ready') return 'ready';
  if (s === 'partial') return 'partial';
  if (s === 'blocked') return 'blocked';

  var checks = isObject(readiness && readiness.readinessChecks) ? readiness.readinessChecks : {};
  if (
    checks.hasBookId === true &&
    checks.hasTheme === true &&
    checks.hasApprovedPages === true &&
    checks.hasMinimumPages === true
  ) {
    return 'ready';
  }
  if (checks.hasBookId === true && checks.hasTheme === true && checks.hasApprovedPages === true) {
    return 'partial';
  }

  return 'blocked';
}

function buildHeader(status) {
  if (status === 'ready') {
    return {
      headline: 'Test Book pronto',
      summary: 'O projeto já possui base suficiente para montar um livro de teste utilizável.'
    };
  }

  if (status === 'partial') {
    return {
      headline: 'Test Book parcialmente pronto',
      summary: 'O projeto já tem progresso consistente, mas ainda faltam ajustes.'
    };
  }

  return {
    headline: 'Test Book bloqueado',
    summary: 'O projeto ainda não possui base suficiente para montar o livro de teste.'
  };
}

function boolStatus(flag) {
  return flag ? 'ready' : 'blocked';
}

function countStatus(mainValue, pendingValue) {
  if (mainValue > 0 && pendingValue <= 0) return 'ready';
  if (mainValue > 0 || pendingValue > 0) return 'partial';
  return 'blocked';
}

function buildCards(pkg, pipeline, readiness, testBook, status) {
  var testMetrics = isObject(testBook && testBook.metrics) ? testBook.metrics : {};
  var readinessChecks = isObject(readiness && readiness.readinessChecks) ? readiness.readinessChecks : {};
  var publishingSnapshot = isObject(readiness && readiness.publishingSnapshot) ? readiness.publishingSnapshot : {};
  var publishingStatus = toStringSafe(
    readinessChecks.publishingStatus || (publishingSnapshot && publishingSnapshot.publishingStatus),
    'blocked'
  );

  return {
    review: {
      label: 'Review',
      value: String(Math.max(0, toIntSafe(testMetrics.approvedScenes, 0))) + ' approved',
      status: countStatus(
        Math.max(0, toIntSafe(testMetrics.approvedScenes, 0)),
        Math.max(0, toIntSafe(testMetrics.pendingScenes, 0))
      )
    },
    pages: {
      label: 'Pages',
      value: String(Math.max(0, toIntSafe(testMetrics.pageCount, 0))),
      status: readinessChecks.hasMinimumPages ? 'ready' : (readinessChecks.hasApprovedPages ? 'partial' : 'blocked')
    },
    package: {
      label: 'Package',
      value: toStringSafe(pkg && pkg.packageStatus, status),
      status: normalizeStatus(pkg && pkg.packageStatus, null, readiness)
    },
    pipeline: {
      label: 'Pipeline',
      value: toStringSafe(pipeline && pipeline.pipelineStatus, status),
      status: normalizeStatus(null, pipeline, readiness)
    },
    publishing: {
      label: 'Publishing',
      value: publishingStatus,
      status: publishingStatus === 'ready' ? 'ready' : (publishingStatus === 'almost_ready' ? 'partial' : 'blocked')
    }
  };
}

function buildIndicators(pkg, readiness, testBook) {
  var testMetrics = isObject(testBook && testBook.metrics) ? testBook.metrics : {};
  var readinessChecks = isObject(readiness && readiness.readinessChecks) ? readiness.readinessChecks : {};
  var packageStatus = toStringSafe(pkg && pkg.packageStatus, 'blocked');

  return [
    {
      key: 'approved_scenes',
      label: 'Approved Scenes',
      value: Math.max(0, toIntSafe(testMetrics.approvedScenes, 0)),
      status: countStatus(
        Math.max(0, toIntSafe(testMetrics.approvedScenes, 0)),
        Math.max(0, toIntSafe(testMetrics.pendingScenes, 0))
      )
    },
    {
      key: 'pending_review',
      label: 'Pending Review',
      value: Math.max(0, toIntSafe(testMetrics.pendingScenes, 0)),
      status: Math.max(0, toIntSafe(testMetrics.pendingScenes, 0)) === 0 ? 'ready' : 'partial'
    },
    {
      key: 'rejected_scenes',
      label: 'Rejected Scenes',
      value: Math.max(0, toIntSafe(testMetrics.rejectedScenes, 0)),
      status: Math.max(0, toIntSafe(testMetrics.rejectedScenes, 0)) === 0 ? 'ready' : 'partial'
    },
    {
      key: 'generated_pages',
      label: 'Generated Pages',
      value: Math.max(0, toIntSafe(testMetrics.pageCount, 0)),
      status: readinessChecks.hasMinimumPages ? 'ready' : (readinessChecks.hasApprovedPages ? 'partial' : 'blocked')
    },
    {
      key: 'minimum_pages_reached',
      label: 'Minimum Pages Reached',
      value: !!readinessChecks.hasMinimumPages,
      status: boolStatus(!!readinessChecks.hasMinimumPages)
    },
    {
      key: 'package_ready',
      label: 'Package Ready',
      value: packageStatus,
      status: packageStatus === 'ready' ? 'ready' : (packageStatus === 'partial' ? 'partial' : 'blocked')
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

function buildAlerts(readiness, status) {
  var blockers = toArraySafe(readiness && readiness.blockers);
  var warnings = toArraySafe(readiness && readiness.warnings);
  var alerts = dedupeStrings(blockers.concat(warnings));

  if (status === 'ready') {
    return [];
  }

  return alerts.slice(0, 10);
}

function buildActions(status, readiness, testBook) {
  var actions = [];
  var checks = isObject(readiness && readiness.readinessChecks) ? readiness.readinessChecks : {};
  var metrics = isObject(testBook && testBook.metrics) ? testBook.metrics : {};

  if (status === 'ready') {
    return [
      'revisar resultado final',
      'preparar próxima camada visual'
    ];
  }

  if (Math.max(0, toIntSafe(metrics.pendingScenes, 0)) > 0) {
    actions.push('revisar cenas pendentes');
  }

  if (!checks.hasApprovedPages) {
    actions.push('aprovar mais páginas');
  }

  if (!checks.hasMinimumPages) {
    actions.push('atingir mínimo de páginas');
  }

  if (status === 'partial') {
    actions.push('validar pacote de teste');
  }

  if (!actions.length) {
    actions.push('revisar estrutura do projeto');
  }

  return dedupeStrings(actions).slice(0, 8);
}

function buildFallbackTestBookDashboardPayload(plan, reason) {
  var safePlan = normalizePlan(plan || {});
  var pkg = safeBuildTestBookPackage(safePlan);
  var pipeline = safeRunTestBookPipeline(safePlan);
  var readiness = safeBuildTestBookReadiness(safePlan);
  var testBook = safeBuildTestBook(safePlan);
  var status = normalizeStatus(pkg && pkg.packageStatus, pipeline, readiness);
  var alerts = buildAlerts(readiness, status);

  alerts.unshift('Fallback generated: ' + toStringSafe(reason, 'Unknown error.'));

  return {
    payloadVersion: '1.0',
    type: 'brightcup_test_book_dashboard_payload',
    generatedAt: nowIso(),
    status: status,
    header: buildHeader(status),
    book: buildBookSection(safePlan, readiness, testBook, pipeline, pkg),
    cards: buildCards(pkg, pipeline, readiness, testBook, status),
    indicators: buildIndicators(pkg, readiness, testBook),
    alerts: dedupeStrings(alerts).slice(0, 10),
    actions: buildActions(status, readiness, testBook)
  };
}

function buildTestBookDashboardPayload(plan) {
  try {
    var safePlan = normalizePlan(plan || {});
    var pkg = safeBuildTestBookPackage(safePlan);
    var pipeline = safeRunTestBookPipeline(safePlan);
    var readiness = safeBuildTestBookReadiness(safePlan);
    var testBook = safeBuildTestBook(safePlan);
    var status = normalizeStatus(pkg && pkg.packageStatus, pipeline, readiness);

    return {
      payloadVersion: '1.0',
      type: 'brightcup_test_book_dashboard_payload',
      generatedAt: nowIso(),
      status: status,
      header: buildHeader(status),
      book: buildBookSection(safePlan, readiness, testBook, pipeline, pkg),
      cards: buildCards(pkg, pipeline, readiness, testBook, status),
      indicators: buildIndicators(pkg, readiness, testBook),
      alerts: buildAlerts(readiness, status),
      actions: buildActions(status, readiness, testBook)
    };
  } catch (e) {
    return buildFallbackTestBookDashboardPayload(
      plan || {},
      String((e && e.message) || e || 'unknown error')
    );
  }
}

export { buildTestBookDashboardPayload };
