/* FILE: /js/core/print_ready_payload.js */
// Bright Cup Creator — Print Ready Payload v0.2 SAFE
// Payload lógico mestre da futura saída print-ready
// - ainda SEM gerar PDF real
// - ainda SEM gerar ZIP real
// - sem DOM
// - sem canvas
// - sem dependências externas
// - compatível com Safari/iOS

import { buildPdfExportPrep } from './pdf_export_prep.js';
import { buildInteriorPdfPayload } from './interior_pdf_payload.js';
import { buildFullwrapPdfPayload } from './fullwrap_pdf_payload.js';

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
    notes: toStringSafe(src.notes, '')
  };
}

function buildFallbackPdfPrep(plan) {
  var safePlan = normalizePlan(plan || {});
  return {
    prepVersion: '1.0',
    type: 'brightcup_pdf_export_prep',
    generatedAt: nowIso(),
    canBuildPdf: false,
    summary: 'PDF export prep fallback generated.',
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
    pages: [],
    stats: {
      totalScenes: 0,
      eligiblePages: 0,
      pageTarget: safePlan.pageTarget || 0,
      missingApprovedPages: safePlan.pageTarget || 0,
      preflightCanProceed: false
    },
    preflight: {}
  };
}

function safeBuildPdfPrep(plan) {
  try {
    return buildPdfExportPrep(plan || {});
  } catch (e) {
    return buildFallbackPdfPrep(plan || {});
  }
}

function safeBuildInterior(plan) {
  try {
    var pdfPrep = safeBuildPdfPrep(plan || {});
    return buildInteriorPdfPayload(pdfPrep || {});
  } catch (e) {
    var safePlan = normalizePlan(plan || {});
    var fallbackPrep = buildFallbackPdfPrep(safePlan);

    try {
      return buildInteriorPdfPayload(fallbackPrep);
    } catch (e2) {
      return {
        payloadVersion: '1.0',
        type: 'brightcup_interior_pdf_payload',
        generatedAt: nowIso(),
        canRenderInterior: false,
        summary: 'Interior payload fallback generated.',
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
        pages: [],
        stats: {
          pagesCount: 0,
          pageTarget: safePlan.pageTarget || 0,
          missingPages: safePlan.pageTarget || 0
        }
      };
    }
  }
}

function safeBuildCover(plan) {
  try {
    return buildFullwrapPdfPayload(plan || {});
  } catch (e) {
    var safePlan = normalizePlan(plan || {});
    return {
      payloadVersion: '1.0',
      type: 'brightcup_fullwrap_pdf_payload',
      generatedAt: nowIso(),
      canRenderFullwrap: false,
      summary: 'Full wrap payload fallback generated.',
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
      front: {
        title: '',
        subtitle: '',
        theme: safePlan.theme || '',
        visualPlaceholder: 'front_cover_placeholder'
      },
      spine: {
        title: '',
        enabled: false
      },
      back: {
        description: '',
        keywords: [],
        visualPlaceholder: 'back_cover_placeholder'
      },
      layout: {
        trim: '8.5x11',
        bleed: '0.125in',
        safeArea: '0.25in',
        pageTarget: safePlan.pageTarget || 0,
        wrapMode: 'full_wrap'
      },
      metadata: {}
    };
  }
}

function buildBookSection(plan, interior, cover) {
  var safePlan = normalizePlan(plan || {});
  var interiorBook = isObject(interior && interior.book) ? interior.book : {};
  var coverBook = isObject(cover && cover.book) ? cover.book : {};

  return {
    id: toStringSafe(safePlan.id || interiorBook.id || coverBook.id, ''),
    theme: toStringSafe(safePlan.theme || interiorBook.theme || coverBook.theme, ''),
    ageGroup: toStringSafe(safePlan.ageGroup || interiorBook.ageGroup || coverBook.ageGroup, ''),
    language: toStringSafe(safePlan.language || interiorBook.language || coverBook.language, 'en') || 'en',
    style: toStringSafe(safePlan.style || interiorBook.style || coverBook.style, 'clean coloring page') || 'clean coloring page',
    pageTarget: Math.max(
      0,
      toIntSafe(
        safePlan.pageTarget ||
        interiorBook.pageTarget ||
        coverBook.pageTarget,
        0
      )
    ),
    status: toStringSafe(safePlan.status || interiorBook.status || coverBook.status, 'idle') || 'idle',
    createdAt: toStringSafe(safePlan.createdAt || interiorBook.createdAt || coverBook.createdAt, ''),
    updatedAt: toStringSafe(safePlan.updatedAt || interiorBook.updatedAt || coverBook.updatedAt, ''),
    notes: toStringSafe(safePlan.notes || interiorBook.notes || coverBook.notes, '')
  };
}

function buildChecks(book, interior, cover) {
  var interiorStats = isObject(interior && interior.stats) ? interior.stats : {};
  var interiorPages = Math.max(0, toIntSafe(interiorStats.pagesCount, 0));
  var pageTarget = Math.max(0, toIntSafe(book && book.pageTarget, 0));
  var missingInteriorPages = Math.max(0, toIntSafe(interiorStats.missingPages, Math.max(0, pageTarget - interiorPages)));

  return {
    interiorReady: !!(interior && interior.canRenderInterior === true),
    coverReady: !!(cover && cover.canRenderFullwrap === true),
    pageTarget: pageTarget,
    interiorPages: interiorPages,
    missingInteriorPages: missingInteriorPages
  };
}

function canBuildPrintReady(book, checks) {
  return !!(
    book &&
    book.id &&
    Math.max(0, toIntSafe(book.pageTarget, 0)) > 0 &&
    checks &&
    checks.interiorReady === true &&
    checks.coverReady === true
  );
}

function buildSummary(isReady, checks) {
  var target = Math.max(0, toIntSafe(checks && checks.pageTarget, 0));
  var interiorPages = Math.max(0, toIntSafe(checks && checks.interiorPages, 0));
  var missing = Math.max(0, toIntSafe(checks && checks.missingInteriorPages, 0));

  if (isReady) {
    return (
      'Print-ready payload ready. Interior and cover are logically prepared ' +
      'with ' + interiorPages + ' interior page(s) for pageTarget=' + target + '.'
    );
  }

  return (
    'Print-ready payload blocked. Interior and/or cover are not fully ready yet. ' +
    'Interior pages=' + interiorPages +
    ', pageTarget=' + target +
    ', missingInteriorPages=' + missing + '.'
  );
}

function buildFallbackPrintReadyPayload(plan, reason) {
  var interior = safeBuildInterior(plan || {});
  var cover = safeBuildCover(plan || {});
  var book = buildBookSection(plan || {}, interior, cover);
  var checks = buildChecks(book, interior, cover);

  return {
    payloadVersion: '1.0',
    type: 'brightcup_print_ready_payload',
    generatedAt: nowIso(),
    canBuildPrintReady: false,
    summary: 'Print-ready payload fallback generated. ' + toStringSafe(reason, 'Unknown error.'),
    book: book,
    interior: interior,
    cover: cover,
    checks: checks
  };
}

function buildPrintReadyPayload(plan) {
  try {
    var interior = safeBuildInterior(plan || {});
    var cover = safeBuildCover(plan || {});
    var book = buildBookSection(plan || {}, interior, cover);
    var checks = buildChecks(book, interior, cover);
    var ready = canBuildPrintReady(book, checks);

    return {
      payloadVersion: '1.0',
      type: 'brightcup_print_ready_payload',
      generatedAt: nowIso(),
      canBuildPrintReady: ready,
      summary: buildSummary(ready, checks),
      book: book,
      interior: interior,
      cover: cover,
      checks: checks
    };
  } catch (e) {
    return buildFallbackPrintReadyPayload(
      plan || {},
      String((e && e.message) || e || 'unknown error')
    );
  }
}

export {
  buildPrintReadyPayload
};
