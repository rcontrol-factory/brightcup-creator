/* FILE: /js/core/fullwrap_pdf_payload.js */
// Bright Cup Creator — Fullwrap PDF Payload v0.1 SAFE
// Payload lógico consolidado da capa full wrap
// - ainda SEM gerar PDF real
// - ainda SEM imagem real
// - sem DOM
// - sem canvas
// - sem dependências externas
// - compatível com Safari/iOS

import { buildCoverPdfPayload } from './cover_pdf_payload.js';

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
    keywords: Array.isArray(src.keywords) ? src.keywords.slice() : [],
    categories: Array.isArray(src.categories) ? src.categories.slice() : []
  };
}

function normalizeLayout(layout, plan) {
  var src = isObject(layout) ? clone(layout) : {};
  var safePlan = normalizePlan(plan || {});

  return {
    trim: toStringSafe(src.trim, '8.5x11') || '8.5x11',
    bleed: toStringSafe(src.bleed, '0.125in') || '0.125in',
    safeArea: toStringSafe(src.safeArea, '0.25in') || '0.25in',
    pageTarget: Math.max(0, toIntSafe(src.pageTarget, safePlan.pageTarget)),
    wrapMode: 'full_wrap'
  };
}

function normalizeCoverPayload(payload, plan) {
  var src = isObject(payload) ? clone(payload) : {};
  var safePlan = normalizePlan(plan || {});

  return {
    payloadVersion: toStringSafe(src.payloadVersion, '1.0') || '1.0',
    type: toStringSafe(src.type, 'brightcup_cover_pdf_payload') || 'brightcup_cover_pdf_payload',
    generatedAt: toStringSafe(src.generatedAt, ''),
    canRenderCover: !!src.canRenderCover,
    summary: toStringSafe(src.summary, ''),
    book: isObject(src.book) ? clone(src.book) : {
      id: safePlan.id,
      theme: safePlan.theme,
      ageGroup: safePlan.ageGroup,
      language: safePlan.language,
      style: safePlan.style,
      pageTarget: safePlan.pageTarget,
      status: safePlan.status,
      createdAt: safePlan.createdAt,
      updatedAt: safePlan.updatedAt,
      notes: safePlan.notes
    },
    cover: isObject(src.cover) ? clone(src.cover) : {
      title: '',
      subtitle: '',
      theme: safePlan.theme,
      visualPlaceholder: 'front_cover_placeholder'
    },
    spine: isObject(src.spine) ? clone(src.spine) : {
      title: '',
      enabled: false
    },
    back: isObject(src.back) ? clone(src.back) : {
      description: '',
      keywords: [],
      visualPlaceholder: 'back_cover_placeholder'
    },
    layout: normalizeLayout(src.layout, safePlan),
    metadata: normalizeMetadata(src.metadata)
  };
}

function safeBuildCoverPayload(plan) {
  try {
    return normalizeCoverPayload(buildCoverPdfPayload(plan || {}), plan || {});
  } catch (e) {
    return normalizeCoverPayload({}, plan || {});
  }
}

function buildFrontSection(coverPayload) {
  var cover = isObject(coverPayload && coverPayload.cover) ? coverPayload.cover : {};
  return {
    title: toStringSafe(cover.title, ''),
    subtitle: toStringSafe(cover.subtitle, ''),
    theme: toStringSafe(cover.theme, ''),
    visualPlaceholder: toStringSafe(cover.visualPlaceholder, 'front_cover_placeholder') || 'front_cover_placeholder'
  };
}

function buildSpineSection(coverPayload) {
  var spine = isObject(coverPayload && coverPayload.spine) ? coverPayload.spine : {};
  return {
    title: toStringSafe(spine.title, ''),
    enabled: !!spine.enabled
  };
}

function buildBackSection(coverPayload) {
  var back = isObject(coverPayload && coverPayload.back) ? coverPayload.back : {};
  return {
    description: toStringSafe(back.description, ''),
    keywords: Array.isArray(back.keywords) ? back.keywords.slice() : [],
    visualPlaceholder: toStringSafe(back.visualPlaceholder, 'back_cover_placeholder') || 'back_cover_placeholder'
  };
}

function canRenderFullwrap(plan, coverPayload) {
  return !!(
    coverPayload &&
    coverPayload.canRenderCover === true &&
    plan &&
    plan.id &&
    Math.max(0, toIntSafe(plan.pageTarget, 0)) > 0
  );
}

function buildSummary(isReady, plan) {
  var pageTarget = Math.max(0, toIntSafe(plan && plan.pageTarget, 0));

  if (isReady) {
    return (
      'Full wrap payload ready. Front, spine, back, and layout are logically prepared ' +
      'for a future cover render with pageTarget=' + pageTarget + '.'
    );
  }

  return (
    'Full wrap payload blocked. Minimum cover/wrap data is incomplete. ' +
    'Required base: cover payload ready, plan.id present, and pageTarget > 0.'
  );
}

function buildFallbackFullwrapPdfPayload(plan, reason) {
  var safePlan = normalizePlan(plan || {});
  var coverPayload = safeBuildCoverPayload(safePlan);
  var layout = normalizeLayout(coverPayload.layout, safePlan);

  return {
    payloadVersion: '1.0',
    type: 'brightcup_fullwrap_pdf_payload',
    generatedAt: nowIso(),
    canRenderFullwrap: false,
    summary: 'Full wrap payload fallback generated. ' + toStringSafe(reason, 'Unknown error.'),
    book: isObject(coverPayload.book) ? clone(coverPayload.book) : {},
    front: buildFrontSection(coverPayload),
    spine: buildSpineSection(coverPayload),
    back: buildBackSection(coverPayload),
    layout: layout,
    metadata: normalizeMetadata(coverPayload.metadata)
  };
}

function buildFullwrapPdfPayload(plan) {
  try {
    var normalizedPlan = normalizePlan(plan || {});
    var coverPayload = safeBuildCoverPayload(normalizedPlan);
    var ready = canRenderFullwrap(normalizedPlan, coverPayload);
    var layout = normalizeLayout(coverPayload.layout, normalizedPlan);

    return {
      payloadVersion: '1.0',
      type: 'brightcup_fullwrap_pdf_payload',
      generatedAt: nowIso(),
      canRenderFullwrap: ready,
      summary: buildSummary(ready, normalizedPlan),
      book: isObject(coverPayload.book) ? clone(coverPayload.book) : {},
      front: buildFrontSection(coverPayload),
      spine: buildSpineSection(coverPayload),
      back: buildBackSection(coverPayload),
      layout: layout,
      metadata: normalizeMetadata(coverPayload.metadata)
    };
  } catch (e) {
    return buildFallbackFullwrapPdfPayload(
      plan || {},
      String((e && e.message) || e || 'unknown error')
    );
  }
}

export {
  buildFullwrapPdfPayload
};
