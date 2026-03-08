/* FILE: /js/core/zip_export.js
   Bright Cup Creator — ZIP Export Payload v0.1 SAFE

   Escopo atual:
   - base do exportador ZIP do Bright Cup Creator
   - ainda sem compactação real
   - transforma export package em payload final exportável
   - JS puro
   - sem DOM
   - sem dependências externas
   - compatível com Safari/iOS
*/

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

function stringifyExportFileContent(value) {
  try {
    if (typeof value === 'string') return value;
    return JSON.stringify(value == null ? null : value, null, 2);
  } catch (e) {
    return JSON.stringify({
      error: 'stringify_failed',
      message: String((e && e.message) || e || 'unknown error')
    }, null, 2);
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

function sortFileKeys(keys) {
  var preferred = ['bundle.json', 'metadata.json', 'manifest.json', 'plan.json'];

  return keys.slice().sort(function(a, b) {
    var ia = preferred.indexOf(a);
    var ib = preferred.indexOf(b);

    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return String(a).localeCompare(String(b));
  });
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
    files.push({
      path: String(key),
      content: stringifyExportFileContent(filesMap[key])
    });
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
