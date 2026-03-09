/* FILE: /js/core/test_book_pdf_export_package.js */
// Bright Cup Creator — Test Book PDF Export Package v0.2 SAFE
// Camada exportável lógica da trilha PDF do TEST BOOK
// - ainda NÃO gera PDF real
// - ainda NÃO gera ZIP real
// - sem DOM
// - sem canvas
// - sem bibliotecas externas
// - compatível com Safari/iOS
// - patch alinhado ao padrão Bright Cup Creator

import { buildTestBookPdfPayload } from './test_book_pdf_payload.js';
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

function safeBuildPdfPayload(plan){
  try { return buildTestBookPdfPayload(plan || {}); }
  catch (e){ return null; }
}

function safeBuildPdfPrep(plan){
  try { return buildTestBookPdfPrep(plan || {}); }
  catch (e){ return null; }
}

function safeBuildTestBook(plan){
  try { return buildTestBook(plan || {}); }
  catch (e){ return null; }
}

function safeBuildReadiness(plan){
  try { return buildTestBookReadiness(plan || {}); }
  catch (e){ return null; }
}

function safeRunPipeline(plan){
  try { return runTestBookPipeline(plan || {}); }
  catch (e){ return null; }
}

function buildBookSection(plan, payload, prep, testBook, readiness, pipeline){
  var safePlan = normalizePlan(plan || {});

  var src = (
    (payload && payload.book) ||
    (prep && prep.book) ||
    (testBook && testBook.book) ||
    safePlan
  );

  return {
    id: toStringSafe(src.id, safePlan.id),
    theme: toStringSafe(src.theme, safePlan.theme),
    ageGroup: toStringSafe(src.ageGroup, safePlan.ageGroup),
    language: toStringSafe(src.language, safePlan.language),
    style: toStringSafe(src.style, safePlan.style),
    pageTarget: Math.max(0, toIntSafe(src.pageTarget, safePlan.pageTarget)),
    status: toStringSafe(src.status, safePlan.status),
    createdAt: toStringSafe(src.createdAt, safePlan.createdAt),
    updatedAt: toStringSafe(src.updatedAt, safePlan.updatedAt),
    notes: toStringSafe(src.notes, safePlan.notes)
  };
}

function countRenderablePages(payload){
  var pages = toArraySafe(payload && payload.pages);
  var i;
  var c = 0;

  for (i = 0; i < pages.length; i += 1){
    if (pages[i] && pages[i].renderable) c += 1;
  }

  return c;
}

function buildExportFiles(payload, prep, testBook, readiness, pipeline){
  function entry(name, type, ready, source){
    return {
      name: name,
      type: type,
      ready: !!ready,
      source: source
    };
  }

  return {
    'test-book-pdf-payload.json': entry(
      'test-book-pdf-payload.json',
      'brightcup_test_book_pdf_payload',
      payload && payload.type === 'brightcup_test_book_pdf_payload',
      'pdfPayload'
    ),

    'test-book-pdf-prep.json': entry(
      'test-book-pdf-prep.json',
      'brightcup_test_book_pdf_prep',
      prep && prep.type === 'brightcup_test_book_pdf_prep',
      'pdfPrep'
    ),

    'test-book.json': entry(
      'test-book.json',
      'brightcup_test_book',
      testBook && testBook.type === 'brightcup_test_book',
      'testBook'
    ),

    'test-book-readiness.json': entry(
      'test-book-readiness.json',
      'brightcup_test_book_readiness',
      readiness && readiness.type === 'brightcup_test_book_readiness',
      'readiness'
    ),

    'test-book-pipeline.json': entry(
      'test-book-pipeline.json',
      'brightcup_test_book_pipeline',
      pipeline && pipeline.type === 'brightcup_test_book_pipeline',
      'pipeline'
    )
  };
}

function deriveExportStatus(payload, pipeline){
  if (!payload) return 'blocked';

  var typeOk = payload.type === 'brightcup_test_book_pdf_payload';
  var renderableCount = countRenderablePages(payload);
  var canRender = !!payload.canRenderTestBookPdf;
  var pipelineBlocked = pipeline && pipeline.pipelineStatus === 'blocked';

  if (typeOk && canRender && renderableCount >= 4 && !pipelineBlocked){
    return 'ready';
  }

  if (
    typeOk ||
    renderableCount > 0 ||
    (payload.pages && payload.pages.length > 0) ||
    (pipeline && pipeline.pipelineStatus !== 'blocked')
  ){
    return 'partial';
  }

  return 'blocked';
}

function buildSummary(status){
  if (status === 'ready'){
    return 'Test book PDF export package ready. The structure is prepared for future PDF rendering.';
  }

  if (status === 'partial'){
    return 'Test book PDF export package partial. The logical structure exists but cannot render the final PDF yet.';
  }

  return 'Test book PDF export package blocked. The project lacks the minimum structure for PDF export.';
}

function buildFallback(plan, reason){
  var safePlan = normalizePlan(plan || {});
  var emptyPayload = null;
  var emptyPrep = null;
  var emptyTestBook = null;
  var emptyReadiness = null;
  var emptyPipeline = null;

  var exportFiles = {
    'test-book-pdf-payload.json': { name:'test-book-pdf-payload.json', type:'brightcup_test_book_pdf_payload', ready:false, source:'pdfPayload' },
    'test-book-pdf-prep.json': { name:'test-book-pdf-prep.json', type:'brightcup_test_book_pdf_prep', ready:false, source:'pdfPrep' },
    'test-book.json': { name:'test-book.json', type:'brightcup_test_book', ready:false, source:'testBook' },
    'test-book-readiness.json': { name:'test-book-readiness.json', type:'brightcup_test_book_readiness', ready:false, source:'readiness' },
    'test-book-pipeline.json': { name:'test-book-pipeline.json', type:'brightcup_test_book_pipeline', ready:false, source:'pipeline' }
  };

  return {
    packageVersion: '1.0',
    type: 'brightcup_test_book_pdf_export_package',
    generatedAt: nowIso(),
    book: buildBookSection(safePlan, null, null, null, null, null),
    pdfPayload: emptyPayload,
    pdfPrep: emptyPrep,
    testBook: emptyTestBook,
    readiness: emptyReadiness,
    pipeline: emptyPipeline,
    exportFiles: exportFiles,
    exportStatus: 'blocked',
    summary: 'Test book PDF export package unavailable. Fallback generated: ' + toStringSafe(reason, 'unknown error')
  };
}

function buildTestBookPdfExportPackage(plan){
  try {
    var safePlan = normalizePlan(plan || {});

    var payload = safeBuildPdfPayload(safePlan);
    var prep = safeBuildPdfPrep(safePlan);
    var testBook = safeBuildTestBook(safePlan);
    var readiness = safeBuildReadiness(safePlan);
    var pipeline = safeRunPipeline(safePlan);

    if (!payload){
      return buildFallback(safePlan, 'payload unavailable');
    }

    var exportFiles = buildExportFiles(payload, prep, testBook, readiness, pipeline);
    var exportStatus = deriveExportStatus(payload, pipeline);

    return {
      packageVersion: '1.0',
      type: 'brightcup_test_book_pdf_export_package',
      generatedAt: nowIso(),
      book: buildBookSection(safePlan, payload, prep, testBook, readiness, pipeline),
      pdfPayload: payload,
      pdfPrep: prep,
      testBook: testBook,
      readiness: readiness,
      pipeline: pipeline,
      exportFiles: exportFiles,
      exportStatus: exportStatus,
      summary: buildSummary(exportStatus)
    };

  } catch (e){
    return buildFallback(plan || {}, (e && e.message) || e);
  }
}

export { buildTestBookPdfExportPackage };
