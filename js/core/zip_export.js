/* FILE: /js/core/zip_export.js */
// Bright Cup Creator — ZIP Export Payload v0.2 SAFE
// Base do exportador ZIP lógico
// - ainda sem compactação ZIP real
// - transforma export package em payload final exportável
// - JS puro
// - sem DOM
// - sem dependências externas
// - compatível com Safari/iOS

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function toStringSafe(value, fallback) {
  if (value == null) return fallback || '';
  return String(value);
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

function safeJsonStringify(value) {
  try {
    return JSON.stringify(value == null ? null : value, null, 2);
  } catch (e) {
    return JSON.stringify({
      error: 'stringify_failed',
      message: String((e && e.message) || e || 'unknown error')
    }, null, 2);
  }
}

function stringifyExportFileContent(value) {
  try {
    if (typeof value === 'string') return value;
    return safeJsonStringify(value);
  } catch (e) {
    return safeJsonStringify({
      error: 'content_serialization_failed',
      message: String((e && e.message) || e || 'unknown error')
    });
  }
}

function normalizeExportPackage(exportPackage) {
  var src = isObject(exportPackage) ? clone(exportPackage) : {};
  var files = isObject(src.files) ? src.files : {};

  return {
    packageVersion: toStringSafe(src.packageVersion || '1.0', '1.0'),
    type: toStringSafe(src.type || 'brightcup_export_package', 'brightcup_export_package'),
    generatedAt: toStringSafe(src.generatedAt || '', ''),
    files: files
  };
}

function normalizeFilePath(path) {
  var raw = toStringSafe(path || '', '').trim();

  if (!raw) return 'unnamed.json';

  return raw
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/{2,}/g, '/');
}

function buildPreferredOrderMap() {
  return {
    'bundle.json': 1,
    'metadata.json': 2,
    'manifest.json': 3,
    'plan.json': 4
  };
}

function sortFileKeys(keys) {
  var preferred = buildPreferredOrderMap();

  return (Array.isArray(keys) ? keys.slice() : []).sort(function(a, b) {
    var pa = preferred.hasOwnProperty(a) ? preferred[a] : 9999;
    var pb = preferred.hasOwnProperty(b) ? preferred[b] : 9999;

    if (pa !== pb) return pa - pb;
    return String(a).localeCompare(String(b));
  });
}

function buildExportFileEntry(path, value) {
  var safePath = normalizeFilePath(path);
  var content = stringifyExportFileContent(value);

  return {
    path: safePath,
    content: content
  };
}

function buildZipExportPayload(exportPackage) {
  var normalized = normalizeExportPackage(exportPackage);
  var filesMap = normalized.files || {};
  var fileKeys = sortFileKeys(Object.keys(filesMap));
  var files = [];
  var i;
  var key;

  for (i = 0; i < fileKeys.length; i += 1) {
    key = fileKeys[i];
    files.push(buildExportFileEntry(key, filesMap[key]));
  }

  return {
    zipVersion: '1.0',
    type: 'brightcup_zip_export',
    generatedAt: nowIso(),
    files: files
  };
}

export {
  buildZipExportPayload,
  stringifyExportFileContent
};
