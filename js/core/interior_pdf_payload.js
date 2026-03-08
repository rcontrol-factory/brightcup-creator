/* FILE: /js/core/interior_pdf_payload.js */
// Bright Cup Creator — Interior PDF Payload v0.1 SAFE
// Core lógico do payload final do interior do livro
// - ainda SEM gerar PDF real
// - sem canvas
// - sem DOM
// - sem dependências externas
// - compatível com Safari/iOS
// - foco em preparação lógica do miolo

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

function normalizeBook(book) {
  var src = isObject(book) ? book : {};

  return {
    id: toStringSafe(src.id, ''),
    theme: toStringSafe(src.theme, ''),
    ageGroup: toStringSafe(src.ageGroup, ''),
    language: toStringSafe(src.language, 'en') || 'en',
    style: toStringSafe(src.style, ''),
    pageTarget: Math.max(0, toIntSafe(src.pageTarget, 0)),
    status: toStringSafe(src.status, 'idle') || 'idle',
    createdAt: toStringSafe(src.createdAt, ''),
    updatedAt: toStringSafe(src.updatedAt, ''),
    notes: toStringSafe(src.notes, '')
  };
}

function normalizePrepPage(page, index) {
  var src = isObject(page) ? page : {};

  return {
    index: Math.max(1, toIntSafe(src.index, index + 1)),
    sceneId: toStringSafe(src.sceneId, ''),
    title: toStringSafe(src.title, ''),
    promptBase: toStringSafe(src.promptBase, ''),
    reviewStatus: normalizeReviewStatus(src.reviewStatus),
    output: src.output != null ? clone(src.output) : null
  };
}

function normalizePdfPrep(pdfPrep) {
  var src = isObject(pdfPrep) ? clone(pdfPrep) : {};
  var pages = toArraySafe(src.pages).map(normalizePrepPage);
  var stats = isObject(src.stats) ? src.stats : {};

  return {
    prepVersion: toStringSafe(src.prepVersion, '1.0') || '1.0',
    type: toStringSafe(src.type, 'brightcup_pdf_export_prep') || 'brightcup_pdf_export_prep',
    generatedAt: toStringSafe(src.generatedAt, ''),
    canBuildPdf: !!src.canBuildPdf,
    summary: toStringSafe(src.summary, ''),
    book: normalizeBook(src.book),
    pages: pages,
    stats: {
      totalScenes: Math.max(0, toIntSafe(stats.totalScenes, 0)),
      eligiblePages: Math.max(0, toIntSafe(stats.eligiblePages, pages.length)),
      pageTarget: Math.max(0, toIntSafe(stats.pageTarget, 0)),
      missingApprovedPages: Math.max(0, toIntSafe(stats.missingApprovedPages, 0)),
      preflightCanProceed: !!stats.preflightCanProceed
    },
    preflight: isObject(src.preflight) ? clone(src.preflight) : {}
  };
}

function buildPages(pages) {
  var list = toArraySafe(pages);
  var out = [];
  var i;
  var page;

  for (i = 0; i < list.length; i += 1) {
    page = normalizePrepPage(list[i], i);
    out.push({
      index: i + 1,
      sceneId: page.sceneId,
      title: page.title,
      promptBase: page.promptBase,
      reviewStatus: page.reviewStatus,
      output: page.output != null ? clone(page.output) : null
    });
  }

  return out;
}

function buildStats(book, pages) {
  var pageTarget = Math.max(0, toIntSafe(book && book.pageTarget, 0));
  var pagesCount = toArraySafe(pages).length;

  return {
    pagesCount: pagesCount,
    pageTarget: pageTarget,
    missingPages: Math.max(0, pageTarget - pagesCount)
  };
}

function buildSummary(canRenderInterior, stats) {
  var pageTarget = Math.max(0, toIntSafe(stats && stats.pageTarget, 0));
  var pagesCount = Math.max(0, toIntSafe(stats && stats.pagesCount, 0));
  var missingPages = Math.max(0, toIntSafe(stats && stats.missingPages, 0));

  if (canRenderInterior) {
    return (
      'Interior payload ready. ' +
      pagesCount + ' approved pages are organized for the book interior' +
      (pageTarget > 0 ? ' with pageTarget=' + pageTarget + '.' : '.')
    );
  }

  return (
    'Interior payload blocked. ' +
    pagesCount + ' eligible pages found' +
    (pageTarget > 0 ? ' for pageTarget=' + pageTarget : '') +
    (missingPages > 0 ? ', missing ' + missingPages + ' page(s).' : '.') +
    ' Review/preflight requirements must be resolved before rendering the interior.'
  );
}

function buildFallbackInteriorPdfPayload(pdfPrep, reason) {
  var prep = normalizePdfPrep(pdfPrep || {});
  var pages = buildPages(prep.pages);
  var stats = buildStats(prep.book, pages);

  return {
    payloadVersion: '1.0',
    type: 'brightcup_interior_pdf_payload',
    generatedAt: nowIso(),
    canRenderInterior: false,
    summary: 'Interior payload fallback generated. ' + toStringSafe(reason, 'Unknown error.'),
    book: clone(prep.book),
    pages: pages,
    stats: stats,
    _fallback: toStringSafe(reason, 'interior_pdf_payload_failed')
  };
}

function buildInteriorPdfPayload(pdfPrep) {
  try {
    var prep = normalizePdfPrep(pdfPrep || {});
    var pages = buildPages(prep.pages);
    var stats = buildStats(prep.book, pages);
    var canRenderInterior = !!(prep.canBuildPdf === true && pages.length > 0);

    return {
      payloadVersion: '1.0',
      type: 'brightcup_interior_pdf_payload',
      generatedAt: nowIso(),
      canRenderInterior: canRenderInterior,
      summary: buildSummary(canRenderInterior, stats),
      book: clone(prep.book),
      pages: pages,
      stats: stats
    };
  } catch (e) {
    return buildFallbackInteriorPdfPayload(
      pdfPrep || {},
      String((e && e.message) || e || 'unknown error')
    );
  }
}

export {
  buildInteriorPdfPayload
};
