/* FILE: /js/core/test_book_pdf_prep.js */
// Bright Cup Creator — Test Book PDF Prep v0.1 SAFE
// Primeira camada lógica de preparação do PDF do TEST BOOK
// - ainda NÃO gera PDF real
// - sem DOM
// - sem canvas
// - sem bibliotecas externas
// - compatível com Safari/iOS
// - apenas estrutura lógica preparatória para PDF futuro

import { buildTestBook } from './book_test_builder.js';
import { buildTestBookReadiness } from './test_book_readiness.js';
import { runTestBookPipeline } from './test_book_pipeline.js';
import { buildPublishingSnapshot } from './publishing_snapshot.js';

function isObject(value){
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function toStringSafe(value, fallback){
  if (value == null) return fallback || '';
  return String(value).trim();
}

function toIntSafe(value, fallback){
  var n = parseInt(value, 10);
  if (!isFinite(n)) return typeof fallback === 'number' ? fallback : 0;
  return n;
}

function toArraySafe(value){
  return Array.isArray(value) ? value.slice() : [];
}

function nowIso(){
  try {
    return new Date().toISOString();
  } catch (e) {
    return '';
  }
}

function clone(value){
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (e) {
    return value;
  }
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
    status: toStringSafe(src.status, 'pending') || 'pending',
    attempts: Math.max(0, toIntSafe(src.attempts, 0)),
    tags: toArraySafe(src.tags).map(function(tag){
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

function normalizePlan(plan){
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
    scenes: toArraySafe(src.scenes).map(normalizeScene)
  };
}

function safeBuildTestBook(plan){
  try {
    return buildTestBook(plan || {});
  } catch (e) {
    return {
      builderVersion: '1.0',
      type: 'brightcup_test_book',
      generatedAt: nowIso(),
      book: {},
      scenes: [],
      pages: [],
      metrics: {
        pageCount: 0,
        approvedScenes: 0,
        pendingScenes: 0,
        rejectedScenes: 0
      },
      summary: 'Test book unavailable.'
    };
  }
}

function safeBuildReadiness(plan){
  try {
    return buildTestBookReadiness(plan || {});
  } catch (e) {
    return {
      readinessVersion: '1.0',
      type: 'brightcup_test_book_readiness',
      generatedAt: nowIso(),
      book: {},
      readinessChecks: {
        hasBookId: false,
        hasTheme: false,
        hasApprovedPages: false,
        hasMinimumPages: false,
        publishingStatus: 'blocked'
      },
      blockers: ['Readiness unavailable'],
      warnings: [],
      summary: 'Readiness unavailable.'
    };
  }
}

function safeRunPipeline(plan){
  try {
    return runTestBookPipeline(plan || {});
  } catch (e) {
    return {
      pipelineVersion: '1.0',
      type: 'brightcup_test_book_pipeline',
      generatedAt: nowIso(),
      pipelineStatus: 'blocked',
      summary: 'Pipeline unavailable.'
    };
  }
}

function safePublishingSnapshot(plan){
  try {
    return buildPublishingSnapshot(plan || {});
  } catch (e) {
    return {
      snapshotVersion: '1.0',
      type: 'brightcup_publishing_snapshot',
      generatedAt: nowIso(),
      publishingStatus: 'blocked',
      readiness: {},
      metrics: {},
      summary: 'Publishing snapshot unavailable.'
    };
  }
}

function buildBookSection(plan, testBook){
  var safePlan = normalizePlan(plan || {});
  var tbBook = isObject(testBook && testBook.book) ? testBook.book : {};

  return {
    id: toStringSafe(tbBook.id || safePlan.id, ''),
    theme: toStringSafe(tbBook.theme || safePlan.theme, ''),
    ageGroup: toStringSafe(tbBook.ageGroup || safePlan.ageGroup, ''),
    language: toStringSafe(tbBook.language || safePlan.language, 'en') || 'en',
    style: toStringSafe(tbBook.style || safePlan.style, 'clean coloring page') || 'clean coloring page',
    pageTarget: Math.max(0, toIntSafe(tbBook.pageTarget || safePlan.pageTarget, 0)),
    status: toStringSafe(tbBook.status || safePlan.status, 'idle') || 'idle',
    createdAt: toStringSafe(tbBook.createdAt || safePlan.createdAt, ''),
    updatedAt: toStringSafe(tbBook.updatedAt || safePlan.updatedAt, ''),
    notes: toStringSafe(tbBook.notes || safePlan.notes, '')
  };
}

function buildPages(pages){
  var safePages = toArraySafe(pages);
  var out = [];
  var i;
  var p;

  for (i = 0; i < safePages.length; i += 1){
    p = safePages[i] || {};

    var pageNumber = Math.max(1, toIntSafe(p.pageNumber || (i + 1), i + 1));
    var sceneId = toStringSafe(p.sceneId, '');
    var title = toStringSafe(p.title, '');
    var promptBase = toStringSafe(p.promptBase, '');
    var tags = toArraySafe(p.tags).map(function(t){ return toStringSafe(t, ''); }).filter(Boolean);

    var textReady = !!(title || promptBase);
    var printSafe = !!(sceneId && promptBase);

    out.push({
      pageNumber: pageNumber,
      sceneId: sceneId,
      title: title,
      promptBase: promptBase,
      tags: tags,
      printSafe: printSafe,
      imageReady: false,
      textReady: textReady
    });
  }

  return out;
}

function buildLayout(){
  return {
    trimSize: '8.5x11',
    pageWidth: 8.5,
    pageHeight: 11,
    bleed: 0.125,
    margin: 0.5,
    duplexSafe: true
  };
}

function buildAssets(){
  return {
    requiresGeneratedImages: true,
    requiresCover: true,
    requiresPdfRenderer: true
  };
}

function buildChecks(book, pages, readiness, pipeline, publishing){
  var hasBookId = !!toStringSafe(book && book.id, '');
  var hasTheme = !!toStringSafe(book && book.theme, '');
  var hasPages = pages.length > 0;
  var hasMinimumPages = pages.length >= 4;

  var pipelineReady = toStringSafe(pipeline && pipeline.pipelineStatus, '') !== 'blocked';
  var publishingAligned = toStringSafe(publishing && publishing.publishingStatus, '') !== 'blocked';

  return {
    hasBookId: hasBookId,
    hasTheme: hasTheme,
    hasPages: hasPages,
    hasMinimumPages: hasMinimumPages,
    pipelineReady: pipelineReady,
    publishingAligned: publishingAligned
  };
}

function deriveCanBuildPdf(checks){
  return !!(
    checks.hasBookId &&
    checks.hasTheme &&
    checks.hasPages &&
    checks.hasMinimumPages &&
    checks.pipelineReady
  );
}

function buildSummary(canBuild, pages){
  if (canBuild) {
    return 'Test book PDF preparation ready. The project has a valid logical structure for a future PDF build.';
  }

  if (pages && pages.length > 0) {
    return 'Test book PDF preparation partial. Some pages are available but the minimum structure is not complete.';
  }

  return 'Test book PDF preparation blocked. The project still lacks the minimum structure for PDF preparation.';
}

function buildFallback(plan, reason){
  var safePlan = normalizePlan(plan || {});
  var book = {
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

  var pages = [];

  var checks = {
    hasBookId: !!safePlan.id,
    hasTheme: !!safePlan.theme,
    hasPages: false,
    hasMinimumPages: false,
    pipelineReady: false,
    publishingAligned: false
  };

  return {
    prepVersion: '1.0',
    type: 'brightcup_test_book_pdf_prep',
    generatedAt: nowIso(),
    canBuildTestBookPdf: false,
    summary: 'Test book PDF preparation unavailable. Fallback generated: ' + toStringSafe(reason, 'unknown error'),
    book: book,
    source: {
      testBook: {},
      readiness: {},
      pipeline: {},
      publishing: {}
    },
    pages: pages,
    layout: buildLayout(),
    assets: buildAssets(),
    checks: checks
  };
}

function buildTestBookPdfPrep(plan){
  try {
    var safePlan = normalizePlan(plan || {});
    var testBook = safeBuildTestBook(safePlan);
    var readiness = safeBuildReadiness(safePlan);
    var pipeline = safeRunPipeline(safePlan);
    var publishing = safePublishingSnapshot(safePlan);

    var book = buildBookSection(safePlan, testBook);
    var pages = buildPages(testBook && testBook.pages);
    var layout = buildLayout();
    var assets = buildAssets();

    var checks = buildChecks(book, pages, readiness, pipeline, publishing);
    var canBuild = deriveCanBuildPdf(checks);

    return {
      prepVersion: '1.0',
      type: 'brightcup_test_book_pdf_prep',
      generatedAt: nowIso(),
      canBuildTestBookPdf: canBuild,
      summary: buildSummary(canBuild, pages),
      book: book,
      source: {
        testBook: testBook,
        readiness: readiness,
        pipeline: pipeline,
        publishing: publishing
      },
      pages: pages,
      layout: layout,
      assets: assets,
      checks: checks
    };
  } catch (e) {
    return buildFallback(plan || {}, (e && e.message) || e);
  }
}

export { buildTestBookPdfPrep };
