/* FILE: /js/core/kdp_ready_bundle.js */
// Bright Cup Creator — KDP Ready Bundle v0.1 SAFE
// Bundle lógico mestre para futura saída KDP-ready
// - ainda SEM gerar PDF real
// - ainda SEM gerar ZIP real
// - ainda SEM integração real com Amazon/KDP
// - sem DOM
// - sem canvas
// - sem dependências externas
// - compatível com Safari/iOS

import { buildColoringMetadata } from './metadata_builder.js';
import { buildPdfExportPrep } from './pdf_export_prep.js';
import { buildInteriorPdfPayload } from './interior_pdf_payload.js';
import { buildFullwrapPdfPayload } from './fullwrap_pdf_payload.js';
import { buildPrintReadyPayload } from './print_ready_payload.js';
import { buildFinalExportBundle } from './final_export_bundle.js';

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

function buildFallbackMetadata(plan) {
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

function safeBuildMetadata(plan) {
  try {
    return buildColoringMetadata(plan || {});
  } catch (e) {
    return buildFallbackMetadata(plan || {});
  }
}

function buildFallbackPdfPrep(plan) {
  var safePlan = normalizePlan(plan || {});
  return {
    prepVersion: '1.0',
    type: 'brightcup_pdf_export_prep',
    generatedAt: nowIso(),
    canBuildPdf: false,
    summary: 'PDF export prep fallback generated.',
    book: buildBookSection(safePlan),
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

function buildFallbackInterior(plan) {
  var safePlan = normalizePlan(plan || {});
  return {
    payloadVersion: '1.0',
    type: 'brightcup_interior_pdf_payload',
    generatedAt: nowIso(),
    canRenderInterior: false,
    summary: 'Interior payload fallback generated.',
    book: buildBookSection(safePlan),
    pages: [],
    stats: {
      pagesCount: 0,
      pageTarget: safePlan.pageTarget || 0,
      missingPages: safePlan.pageTarget || 0
    }
  };
}

function safeBuildInterior(plan) {
  try {
    var pdfPrep = safeBuildPdfPrep(plan || {});
    return buildInteriorPdfPayload(pdfPrep || {});
  } catch (e) {
    return buildFallbackInterior(plan || {});
  }
}

function buildFallbackCover(plan) {
  var safePlan = normalizePlan(plan || {});
  return {
    payloadVersion: '1.0',
    type: 'brightcup_fullwrap_pdf_payload',
    generatedAt: nowIso(),
    canRenderFullwrap: false,
    summary: 'Full wrap payload fallback generated.',
    book: buildBookSection(safePlan),
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
    metadata: buildFallbackMetadata(safePlan)
  };
}

function safeBuildCover(plan) {
  try {
    return buildFullwrapPdfPayload(plan || {});
  } catch (e) {
    return buildFallbackCover(plan || {});
  }
}

function buildFallbackPrintReady(plan) {
  var safePlan = normalizePlan(plan || {});
  var interior = safeBuildInterior(safePlan);
  var cover = safeBuildCover(safePlan);
  var interiorStats = isObject(interior.stats) ? interior.stats : {};

  return {
    payloadVersion: '1.0',
    type: 'brightcup_print_ready_payload',
    generatedAt: nowIso(),
    canBuildPrintReady: false,
    summary: 'Print-ready payload fallback generated.',
    book: buildBookSection(safePlan),
    interior: interior,
    cover: cover,
    checks: {
      interiorReady: !!interior.canRenderInterior,
      coverReady: !!cover.canRenderFullwrap,
      pageTarget: safePlan.pageTarget || 0,
      interiorPages: Math.max(0, toIntSafe(interiorStats.pagesCount, 0)),
      missingInteriorPages: Math.max(0, toIntSafe(interiorStats.missingPages, safePlan.pageTarget || 0))
    }
  };
}

function safeBuildPrintReady(plan) {
  try {
    return buildPrintReadyPayload(plan || {});
  } catch (e) {
    return buildFallbackPrintReady(plan || {});
  }
}

function buildFallbackFinalExport(plan) {
  var safePlan = normalizePlan(plan || {});
  var metadata = safeBuildMetadata(safePlan);
  var interior = safeBuildInterior(safePlan);
  var cover = safeBuildCover(safePlan);
  var printReady = safeBuildPrintReady(safePlan);

  return {
    bundleVersion: '1.0',
    type: 'brightcup_final_export_bundle',
    generatedAt: nowIso(),
    plan: safePlan,
    preflight: {},
    manifest: {},
    metadata: metadata,
    projectBundle: {},
    exportPackage: {},
    zipPayload: {},
    pdfPrep: safeBuildPdfPrep(safePlan),
    interiorPdfPayload: interior,
    summary: 'Final export bundle fallback generated.',
    _cover: cover,
    _printReady: printReady
  };
}

function safeBuildFinalExport(plan) {
  try {
    return buildFinalExportBundle(plan || {});
  } catch (e) {
    return buildFallbackFinalExport(plan || {});
  }
}

function buildChecks(book, metadata, interior, cover, printReady, finalExport) {
  var interiorStats = isObject(interior && interior.stats) ? interior.stats : {};
  var interiorPages = Math.max(0, toIntSafe(interiorStats.pagesCount, 0));
  var pageTarget = Math.max(0, toIntSafe(book && book.pageTarget, 0));
  var missingInteriorPages = Math.max(0, toIntSafe(interiorStats.missingPages, Math.max(0, pageTarget - interiorPages)));

  return {
    metadataReady: !!(metadata && metadata.title),
    interiorReady: !!(interior && interior.canRenderInterior === true),
    coverReady: !!(cover && cover.canRenderFullwrap === true),
    printReady: !!(printReady && printReady.canBuildPrintReady === true),
    finalExportReady: !!(
      finalExport &&
      finalExport.preflight &&
      finalExport.preflight.canProceed === true &&
      finalExport.pdfPrep &&
      finalExport.pdfPrep.canBuildPdf === true &&
      finalExport.interiorPdfPayload &&
      finalExport.interiorPdfPayload.canRenderInterior === true
    ),
    pageTarget: pageTarget,
    interiorPages: interiorPages,
    missingInteriorPages: missingInteriorPages
  };
}

function canBuildKdpReady(book, metadata, interior, cover, printReady) {
  return !!(
    book &&
    book.id &&
    metadata &&
    metadata.title &&
    interior &&
    interior.canRenderInterior === true &&
    cover &&
    cover.canRenderFullwrap === true &&
    printReady &&
    printReady.canBuildPrintReady === true
  );
}

function buildSummary(isReady, checks) {
  var reasons = [];

  if (!checks.metadataReady) reasons.push('metadata.title missing');
  if (!checks.interiorReady) reasons.push('interior not ready');
  if (!checks.coverReady) reasons.push('cover not ready');
  if (!checks.printReady) reasons.push('printReady blocked');

  if (isReady) {
    return (
      'KDP-ready bundle logically prepared. ' +
      'Metadata, interior, cover, and print-ready layers are aligned for a future KDP export step.'
    );
  }

  return (
    'KDP-ready bundle blocked. ' +
      (reasons.length ? 'Missing requirements: ' + reasons.join(', ') + '.' : 'Some requirements are still incomplete.') +
      ' pageTarget=' + Math.max(0, toIntSafe(checks && checks.pageTarget, 0)) +
      ', interiorPages=' + Math.max(0, toIntSafe(checks && checks.interiorPages, 0)) +
      ', missingInteriorPages=' + Math.max(0, toIntSafe(checks && checks.missingInteriorPages, 0)) + '.'
  );
}

function buildFallbackKdpReadyBundle(plan, reason) {
  var safePlan = normalizePlan(plan || {});
  var book = buildBookSection(safePlan);
  var metadata = safeBuildMetadata(safePlan);
  var interior = safeBuildInterior(safePlan);
  var cover = safeBuildCover(safePlan);
  var printReady = safeBuildPrintReady(safePlan);
  var finalExport = safeBuildFinalExport(safePlan);
  var checks = buildChecks(book, metadata, interior, cover, printReady, finalExport);

  return {
    bundleVersion: '1.0',
    type: 'brightcup_kdp_ready_bundle',
    generatedAt: nowIso(),
    canBuildKdpReady: false,
    summary: 'KDP-ready bundle fallback generated. ' + toStringSafe(reason, 'Unknown error.'),
    book: book,
    metadata: metadata,
    interior: interior,
    cover: cover,
    printReady: printReady,
    finalExport: finalExport,
    checks: checks
  };
}

function buildKdpReadyBundle(plan) {
  try {
    var safePlan = normalizePlan(plan || {});
    var book = buildBookSection(safePlan);
    var metadata = safeBuildMetadata(safePlan);
    var interior = safeBuildInterior(safePlan);
    var cover = safeBuildCover(safePlan);
    var printReady = safeBuildPrintReady(safePlan);
    var finalExport = safeBuildFinalExport(safePlan);
    var checks = buildChecks(book, metadata, interior, cover, printReady, finalExport);
    var ready = canBuildKdpReady(book, metadata, interior, cover, printReady);

    return {
      bundleVersion: '1.0',
      type: 'brightcup_kdp_ready_bundle',
      generatedAt: nowIso(),
      canBuildKdpReady: ready,
      summary: buildSummary(ready, checks),
      book: book,
      metadata: metadata,
      interior: interior,
      cover: cover,
      printReady: printReady,
      finalExport: finalExport,
      checks: checks
    };
  } catch (e) {
    return buildFallbackKdpReadyBundle(
      plan || {},
      String((e && e.message) || e || 'unknown error')
    );
  }
}

export {
  buildKdpReadyBundle
};
