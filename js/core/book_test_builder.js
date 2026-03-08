/* FILE: /js/core/book_test_builder.js */
// Bright Cup Creator — Book Test Builder v0.1 SAFE
// Primeiro builder lógico de "test book"
// - sem DOM
// - sem canvas
// - sem dependências externas
// - compatível com Safari/iOS
// - não gera PDF real
// - não gera imagens
// - apenas prepara a estrutura do livro de teste

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

function filterApprovedScenes(scenes) {
  var list = toArraySafe(scenes);
  var out = [];
  var i;
  var scene;

  for (i = 0; i < list.length; i += 1) {
    scene = normalizeScene(list[i]);
    if (scene.review.status === 'approved_for_book') {
      out.push(scene);
    }
  }

  return out;
}

function buildPages(approvedScenes) {
  var list = toArraySafe(approvedScenes).slice(0, 10);
  var pages = [];
  var i;
  var scene;

  for (i = 0; i < list.length; i += 1) {
    scene = normalizeScene(list[i]);
    pages.push({
      pageNumber: i + 1,
      sceneId: scene.id || '',
      title: scene.title || '',
      promptBase: scene.promptBase || '',
      tags: toArraySafe(scene.tags)
    });
  }

  return pages;
}

function buildMetrics(scenes, approvedScenes, pages) {
  var allScenes = toArraySafe(scenes);
  var approvedCount = toArraySafe(approvedScenes).length;
  var pendingCount = 0;
  var rejectedCount = 0;
  var i;
  var scene;
  var reviewStatus;

  for (i = 0; i < allScenes.length; i += 1) {
    scene = normalizeScene(allScenes[i]);
    reviewStatus = scene.review.status;

    if (reviewStatus === 'approved_for_book') {
      continue;
    }

    if (reviewStatus === 'rejected') {
      rejectedCount += 1;
      continue;
    }

    pendingCount += 1;
  }

  return {
    pageCount: toArraySafe(pages).length,
    approvedScenes: approvedCount,
    pendingScenes: pendingCount,
    rejectedScenes: rejectedCount
  };
}

function buildSummary(metrics, totalApproved) {
  var pageCount = Math.max(0, toIntSafe(metrics && metrics.pageCount, 0));
  var approvedScenes = Math.max(0, toIntSafe(totalApproved, 0));

  if (pageCount > 0 && approvedScenes <= 10) {
    return 'Test book generated successfully with ' + pageCount + ' pages.';
  }

  if (pageCount > 0 && approvedScenes > 10) {
    return 'Test book generated successfully with ' + pageCount + ' pages (limited to max 10 pages).';
  }

  return 'Test book generated partially due to limited approved scenes.';
}

function buildFallbackTestBook(plan, reason) {
  var safePlan = normalizePlan(plan || {});
  var scenes = toArraySafe(safePlan.scenes);
  var approvedScenes = [];
  var pages = [];
  var metrics = {
    pageCount: 0,
    approvedScenes: 0,
    pendingScenes: scenes.length,
    rejectedScenes: 0
  };

  return {
    builderVersion: '1.0',
    type: 'brightcup_test_book',
    generatedAt: nowIso(),
    book: buildBookSection(safePlan),
    scenes: approvedScenes,
    pages: pages,
    metrics: metrics,
    summary: 'Test book fallback generated. ' + toStringSafe(reason, 'Unknown error.')
  };
}

function buildTestBook(plan) {
  try {
    var safePlan = normalizePlan(plan || {});
    var approvedScenes = filterApprovedScenes(safePlan.scenes);
    var pages = buildPages(approvedScenes);
    var metrics = buildMetrics(safePlan.scenes, approvedScenes, pages);

    return {
      builderVersion: '1.0',
      type: 'brightcup_test_book',
      generatedAt: nowIso(),
      book: buildBookSection(safePlan),
      scenes: approvedScenes.slice(0, 10),
      pages: pages,
      metrics: metrics,
      summary: buildSummary(metrics, approvedScenes.length)
    };
  } catch (e) {
    return buildFallbackTestBook(
      plan || {},
      String((e && e.message) || e || 'unknown error')
    );
  }
}

export { buildTestBook };
