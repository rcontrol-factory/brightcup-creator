/* FILE: /js/core/test_book_pdf_payload.js */
// Bright Cup Creator — Test Book PDF Payload v0.1 SAFE
// Camada lógica acima de test_book_pdf_prep.js
// - ainda NÃO gera PDF real
// - sem DOM
// - sem canvas
// - sem bibliotecas externas
// - compatível com Safari/iOS
// - consolida payload futuro do PDF do TEST BOOK

import { buildTestBookPdfPrep } from './test_book_pdf_prep.js';
import { buildTestBook } from './book_test_builder.js';
import { buildTestBookReadiness } from './test_book_readiness.js';
import { runTestBookPipeline } from './test_book_pipeline.js';

function isObject(v){
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function toStringSafe(v, fallback){
  if (v == null) return fallback || '';
  return String(v).trim();
}

function toIntSafe(v, fallback){
  var n = parseInt(v, 10);
  if (!isFinite(n)) return typeof fallback === 'number' ? fallback : 0;
  return n;
}

function toArraySafe(v){
  return Array.isArray(v) ? v.slice() : [];
}

function nowIso(){
  try { return new Date().toISOString(); }
  catch (e){ return ''; }
}

function clone(v){
  try { return JSON.parse(JSON.stringify(v)); }
  catch (e){ return v; }
}

function normalizeReviewStatus(status){
  var s = toStringSafe(status, 'pending_review').toLowerCase();
  if (s === 'approved_for_book') return 'approved_for_book';
  if (s === 'rejected') return 'rejected';
  if (s === 'needs_redo') return 'needs_redo';
  return 'pending_review';
}

function normalizeScene(scene){
  var src = isObject(scene) ? clone(scene) : {};
  var review = isObject(src.review) ? src.review : {};

  return {
    id: toStringSafe(src.id, ''),
    title: toStringSafe(src.title, ''),
    promptBase: toStringSafe(src.promptBase, ''),
    status: toStringSafe(src.status, 'pending'),
    attempts: Math.max(0, toIntSafe(src.attempts, 0)),
    tags: toArraySafe(src.tags).map(function(t){ return toStringSafe(t, ''); }).filter(Boolean),
    review: {
      status: normalizeReviewStatus(review.status)
    }
  };
}

function normalizePlan(plan){
  var src = isObject(plan) ? clone(plan) : {};

  return {
    id: toStringSafe(src.id, ''),
    theme: toStringSafe(src.theme, ''),
    ageGroup: toStringSafe(src.ageGroup, ''),
    language: toStringSafe(src.language, 'en'),
    style: toStringSafe(src.style, 'clean coloring page'),
    pageTarget: Math.max(0, toIntSafe(src.pageTarget, 0)),
    status: toStringSafe(src.status, 'idle'),
    createdAt: toStringSafe(src.createdAt, ''),
    updatedAt: toStringSafe(src.updatedAt, ''),
    notes: toStringSafe(src.notes, ''),
    scenes: toArraySafe(src.scenes).map(normalizeScene)
  };
}

function safeBuildPrep(plan){
  try {
    return buildTestBookPdfPrep(plan || {});
  } catch (e){
    return null;
  }
}

function safeBuildTestBook(plan){
  try {
    return buildTestBook(plan || {});
  } catch (e){
    return null;
  }
}

function safeBuildReadiness(plan){
  try {
    return buildTestBookReadiness(plan || {});
  } catch (e){
    return null;
  }
}

function safeRunPipeline(plan){
  try {
    return runTestBookPipeline(plan || {});
  } catch (e){
    return null;
  }
}

function buildDocument(book, pages, layout){
  var title = toStringSafe(book && book.theme, 'Test Book');

  return {
    title: title,
    pageCount: pages.length,
    trimSize: toStringSafe(layout && layout.trimSize, '8.5x11'),
    duplexSafe: !!(layout && layout.duplexSafe),
    language: toStringSafe(book && book.language, 'en'),
    pdfIntent: 'test_book_print_preview'
  };
}

function buildPlacement(){
  return {
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    rotation: 0
  };
}

function buildPages(prepPages){
  var src = toArraySafe(prepPages);
  var out = [];
  var i;

  for (i = 0; i < src.length; i += 1){
    var p = src[i] || {};

    var printSafe = !!p.printSafe;
    var textReady = !!p.textReady;
    var renderable = printSafe && textReady;

    out.push({
      pageNumber: Math.max(1, toIntSafe(p.pageNumber, i + 1)),
      sceneId: toStringSafe(p.sceneId, ''),
      title: toStringSafe(p.title, ''),
      promptBase: toStringSafe(p.promptBase, ''),
      tags: toArraySafe(p.tags),
      printSafe: printSafe,
      imageReady: !!p.imageReady,
      textReady: textReady,
      renderable: renderable,
      placement: buildPlacement()
    });
  }

  return out;
}

function buildAssets(prepAssets){
  var base = isObject(prepAssets) ? prepAssets : {};

  return {
    requiresGeneratedImages: !!base.requiresGeneratedImages,
    requiresCover: !!base.requiresCover,
    requiresPdfRenderer: !!base.requiresPdfRenderer,
    requiresFontEmbedding: true
  };
}

function buildChecks(prep, pages, pipeline){
  var renderablePages = pages.filter(function(p){ return !!p.renderable; });

  var prepReady = !!(prep && prep.canBuildTestBookPdf !== false);
  var hasRenderablePages = renderablePages.length > 0;
  var hasMinimumPages = renderablePages.length >= 4;

  var pipelineReady = true;
  if (pipeline && pipeline.pipelineStatus === 'blocked'){
    pipelineReady = false;
  }

  var documentReady = hasRenderablePages;

  return {
    prepReady: prepReady,
    hasRenderablePages: hasRenderablePages,
    hasMinimumPages: hasMinimumPages,
    documentReady: documentReady,
    pipelineReady: pipelineReady
  };
}

function deriveRenderable(pages){
  var list = pages.filter(function(p){ return !!p.renderable; });
  return list.length;
}

function buildSummary(canRender, renderablePages){
  if (canRender){
    return 'Test book PDF payload ready. The document can be rendered when a PDF engine becomes available.';
  }

  if (renderablePages > 0){
    return 'Test book PDF payload partial. Some pages are renderable but the document is not fully ready.';
  }

  return 'Test book PDF payload blocked. The project still lacks renderable pages.';
}

function buildFallback(plan, reason){
  var safePlan = normalizePlan(plan || {});

  return {
    payloadVersion: '1.0',
    type: 'brightcup_test_book_pdf_payload',
    generatedAt: nowIso(),
    canRenderTestBookPdf: false,
    summary: 'Test book PDF payload unavailable. Fallback generated: ' + toStringSafe(reason, 'unknown error'),
    book: {
      id: safePlan.id,
      theme: safePlan.theme,
      language: safePlan.language
    },
    source: {},
    document: {
      title: safePlan.theme || 'Test Book',
      pageCount: 0,
      trimSize: '8.5x11',
      duplexSafe: true,
      language: safePlan.language || 'en',
      pdfIntent: 'test_book_print_preview'
    },
    pages: [],
    layout: {},
    assets: {
      requiresGeneratedImages: true,
      requiresCover: true,
      requiresPdfRenderer: true,
      requiresFontEmbedding: true
    },
    checks: {
      prepReady: false,
      hasRenderablePages: false,
      hasMinimumPages: false,
      documentReady: false,
      pipelineReady: false
    }
  };
}

function buildTestBookPdfPayload(plan){
  try {
    var safePlan = normalizePlan(plan || {});
    var prep = safeBuildPrep(safePlan);
    var pipeline = safeRunPipeline(safePlan);
    var testBook = safeBuildTestBook(safePlan);
    var readiness = safeBuildReadiness(safePlan);

    if (!prep) return buildFallback(safePlan, 'prep unavailable');

    var book = clone(prep.book || {});
    var layout = clone(prep.layout || {});
    var pages = buildPages(prep.pages);
    var assets = buildAssets(prep.assets);

    var document = buildDocument(book, pages, layout);

    var checks = buildChecks(prep, pages, pipeline);

    var renderableCount = deriveRenderable(pages);

    var canRender = !!(
      checks.prepReady &&
      checks.hasRenderablePages &&
      checks.hasMinimumPages &&
      checks.documentReady &&
      checks.pipelineReady
    );

    return {
      payloadVersion: '1.0',
      type: 'brightcup_test_book_pdf_payload',
      generatedAt: nowIso(),
      canRenderTestBookPdf: canRender,
      summary: buildSummary(canRender, renderableCount),
      book: book,
      source: {
        prep: prep,
        testBook: testBook,
        readiness: readiness,
        pipeline: pipeline
      },
      document: document,
      pages: pages,
      layout: layout,
      assets: assets,
      checks: checks
    };

  } catch (e){
    return buildFallback(plan || {}, (e && e.message) || e);
  }
}

export { buildTestBookPdfPayload };
