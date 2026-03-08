/* FILE: /js/core/cover_pdf_payload.js */
// Bright Cup Creator — Cover PDF Payload v0.1 SAFE
// Base lógica do payload futuro da capa completa do livro
// - ainda SEM gerar PDF real
// - ainda SEM imagem real de capa
// - sem DOM
// - sem canvas
// - sem dependências externas
// - compatível com Safari/iOS

import { buildColoringMetadata } from './metadata_builder.js';

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
    scenes: toArraySafe(src.scenes)
  };
}

function normalizeMetadata(metadata) {
  var src = isObject(metadata) ? clone(metadata) : {};

  return {
    metadataVersion: toStringSafe(src.metadataVersion, '1.0') || '1.0',
    type: toStringSafe(src.type, 'coloring_book_metadata') || 'coloring_book_metadata',
    generatedAt: toStringSafe(src.generatedAt, ''),
    title: toStringSafe(src.title, ''),
    subtitle: toStringSafe(src.subtitle, ''),
    theme: toStringSafe(src.theme, ''),
    ageGroup: toStringSafe(src.ageGroup, ''),
    language: toStringSafe(src.language, 'en') || 'en',
    style: toStringSafe(src.style, ''),
    description: toStringSafe(src.description, ''),
    keywords: toArraySafe(src.keywords).map(function(item){
      return toStringSafe(item, '');
    }).filter(Boolean),
    categories: toArraySafe(src.categories).map(function(item){
      return toStringSafe(item, '');
    }).filter(Boolean)
  };
}

function safeBuildMetadata(plan) {
  try {
    return normalizeMetadata(buildColoringMetadata(plan || {}));
  } catch (e) {
    var safePlan = normalizePlan(plan || {});
    return {
      metadataVersion: '1.0',
      type: 'coloring_book_metadata',
      generatedAt: nowIso(),
      title: '',
      subtitle: '',
      theme: safePlan.theme || '',
      ageGroup: safePlan.ageGroup || '',
      language: safePlan.language || 'en',
      style: safePlan.style || '',
      description: '',
      keywords: [],
      categories: []
    };
  }
}

function buildBookSection(plan) {
  return {
    id: plan.id || '',
    theme: plan.theme || '',
    ageGroup: plan.ageGroup || '',
    language: plan.language || 'en',
    style: plan.style || '',
    pageTarget: plan.pageTarget || 0,
    status: plan.status || 'idle',
    createdAt: plan.createdAt || '',
    updatedAt: plan.updatedAt || '',
    notes: plan.notes || ''
  };
}

function buildCoverSection(plan, metadata) {
  return {
    title: metadata.title || '',
    subtitle: metadata.subtitle || '',
    theme: plan.theme || metadata.theme || '',
    visualPlaceholder: 'front_cover_placeholder'
  };
}

function buildSpineSection(plan, metadata) {
  return {
    title: metadata.title || '',
    enabled: Math.max(0, toIntSafe(plan.pageTarget, 0)) > 0
  };
}

function buildBackSection(metadata) {
  return {
    description: metadata.description || '',
    keywords: toArraySafe(metadata.keywords),
    visualPlaceholder: 'back_cover_placeholder'
  };
}

function buildLayoutSection(plan) {
  return {
    trim: '8.5x11',
    bleed: '0.125in',
    safeArea: '0.25in',
    pageTarget: Math.max(0, toIntSafe(plan.pageTarget, 0))
  };
}

function canRenderCover(plan, metadata) {
  return !!(
    plan &&
    plan.id &&
    plan.theme &&
    Math.max(0, toIntSafe(plan.pageTarget, 0)) > 0 &&
    metadata &&
    metadata.title
  );
}

function buildSummary(isReady, plan, metadata) {
  if (isReady) {
    return (
      'Cover payload ready. The project has minimum editorial data for future logical cover rendering, ' +
      'including title, theme, and pageTarget=' + Math.max(0, toIntSafe(plan && plan.pageTarget, 0)) + '.'
    );
  }

  return (
    'Cover payload blocked. Minimum cover data is incomplete. ' +
    'Required base: plan.id, plan.theme, plan.pageTarget > 0, and metadata.title.'
  );
}

function buildFallbackCoverPdfPayload(plan, reason) {
  var safePlan = normalizePlan(plan || {});
  var safeMetadata = safeBuildMetadata(safePlan);

  return {
    payloadVersion: '1.0',
    type: 'brightcup_cover_pdf_payload',
    generatedAt: nowIso(),
    canRenderCover: false,
    summary: 'Cover payload fallback generated. ' + toStringSafe(reason, 'Unknown error.'),
    book: buildBookSection(safePlan),
    cover: buildCoverSection(safePlan, safeMetadata),
    spine: buildSpineSection(safePlan, safeMetadata),
    back: buildBackSection(safeMetadata),
    layout: buildLayoutSection(safePlan),
    metadata: safeMetadata
  };
}

function buildCoverPdfPayload(plan) {
  try {
    var normalizedPlan = normalizePlan(plan || {});
    var metadata = safeBuildMetadata(normalizedPlan);
    var ready = canRenderCover(normalizedPlan, metadata);

    return {
      payloadVersion: '1.0',
      type: 'brightcup_cover_pdf_payload',
      generatedAt: nowIso(),
      canRenderCover: ready,
      summary: buildSummary(ready, normalizedPlan, metadata),
      book: buildBookSection(normalizedPlan),
      cover: buildCoverSection(normalizedPlan, metadata),
      spine: buildSpineSection(normalizedPlan, metadata),
      back: buildBackSection(metadata),
      layout: buildLayoutSection(normalizedPlan),
      metadata: metadata
    };
  } catch (e) {
    return buildFallbackCoverPdfPayload(
      plan || {},
      String((e && e.message) || e || 'unknown error')
    );
  }
}

export {
  buildCoverPdfPayload
};
