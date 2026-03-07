/* FILE: /js/core/book_project.js
   Bright Cub Creator — book_project.js
   Base central e previsível para estrutura do livro.
   Regras:
   - sem DOM
   - sem dependências
   - JS puro
   - compatível com Safari/iOS
*/

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function toStringSafe(value, fallback) {
  if (value == null) return fallback || '';
  return String(value);
}

function toBooleanSafe(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (value == null) return !!fallback;
  return !!value;
}

function toArraySafe(value, fallback) {
  if (Array.isArray(value)) return value.slice();
  return Array.isArray(fallback) ? fallback.slice() : [];
}

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (e) {
    return '';
  }
}

function normalizeStringArray(value) {
  var arr = toArraySafe(value, []);
  var out = [];
  var seen = Object.create(null);
  var i;
  var item;
  var str;

  for (i = 0; i < arr.length; i += 1) {
    item = arr[i];
    if (item == null) continue;
    str = String(item).trim();
    if (!str) continue;
    if (seen[str]) continue;
    seen[str] = true;
    out.push(str);
  }

  return out;
}

function createEmptyBookProject() {
  var ts = nowIso();

  return {
    id: '',
    createdAt: ts,
    updatedAt: ts,
    theme: '',
    title: '',
    subtitle: '',
    language: 'en',
    ageGroup: '',
    bookType: '',
    pageSize: '8.5x11',
    pageCount: 0,
    complexity: '',
    source: {
      mode: '',
      prompt: '',
      originFileName: ''
    },
    pages: [],
    cover: {
      title: '',
      subtitle: '',
      theme: '',
      frontPrompt: '',
      backText: '',
      spineText: '',
      barcodeReserved: true
    },
    metadata: {
      title: '',
      subtitle: '',
      description: '',
      keywords: [],
      categories: []
    },
    validation: {
      isValid: false,
      issues: []
    },
    export: {
      interiorPdfReady: false,
      coverPdfReady: false,
      metadataReady: false,
      zipReady: false
    }
  };
}

function normalizeSource(input) {
  var src = isObject(input) ? input : {};

  return {
    mode: toStringSafe(src.mode, ''),
    prompt: toStringSafe(src.prompt, ''),
    originFileName: toStringSafe(src.originFileName, '')
  };
}

function normalizeCover(input, root) {
  var cover = isObject(input) ? input : {};
  var base = isObject(root) ? root : {};

  return {
    title: toStringSafe(cover.title, toStringSafe(base.title, '')),
    subtitle: toStringSafe(cover.subtitle, toStringSafe(base.subtitle, '')),
    theme: toStringSafe(cover.theme, toStringSafe(base.theme, '')),
    frontPrompt: toStringSafe(cover.frontPrompt, ''),
    backText: toStringSafe(cover.backText, ''),
    spineText: toStringSafe(cover.spineText, ''),
    barcodeReserved: toBooleanSafe(cover.barcodeReserved, true)
  };
}

function normalizeMetadata(input, root) {
  var meta = isObject(input) ? input : {};
  var base = isObject(root) ? root : {};

  return {
    title: toStringSafe(meta.title, toStringSafe(base.title, '')),
    subtitle: toStringSafe(meta.subtitle, toStringSafe(base.subtitle, '')),
    description: toStringSafe(meta.description, ''),
    keywords: normalizeStringArray(meta.keywords),
    categories: normalizeStringArray(meta.categories)
  };
}

function normalizeValidation(input) {
  var validation = isObject(input) ? input : {};

  return {
    isValid: toBooleanSafe(validation.isValid, false),
    issues: normalizeStringArray(validation.issues)
  };
}

function normalizeExport(input) {
  var exp = isObject(input) ? input : {};

  return {
    interiorPdfReady: toBooleanSafe(exp.interiorPdfReady, false),
    coverPdfReady: toBooleanSafe(exp.coverPdfReady, false),
    metadataReady: toBooleanSafe(exp.metadataReady, false),
    zipReady: toBooleanSafe(exp.zipReady, false)
  };
}

function normalizePages(input) {
  var pages = toArraySafe(input, []);
  return pages.slice();
}

function normalizePageCount(inputCount, pages) {
  var count = Number(inputCount);

  if (typeof count !== 'number' || !isFinite(count) || count < 0) {
    count = 0;
  }

  count = Math.floor(count);

  if (!count && Array.isArray(pages) && pages.length > 0) {
    count = pages.length;
  }

  return count;
}

function normalizeBookProject(input) {
  var base = createEmptyBookProject();
  var src = isObject(input) ? input : {};
  var pages = normalizePages(src.pages);

  base.id = toStringSafe(src.id, '');
  base.createdAt = toStringSafe(src.createdAt, base.createdAt || nowIso());
  base.updatedAt = toStringSafe(src.updatedAt, nowIso());
  base.theme = toStringSafe(src.theme, '');
  base.title = toStringSafe(src.title, '');
  base.subtitle = toStringSafe(src.subtitle, '');
  base.language = toStringSafe(src.language, 'en') || 'en';
  base.ageGroup = toStringSafe(src.ageGroup, '');
  base.bookType = toStringSafe(src.bookType, '');
  base.pageSize = toStringSafe(src.pageSize, '8.5x11') || '8.5x11';
  base.pageCount = normalizePageCount(src.pageCount, pages);
  base.complexity = toStringSafe(src.complexity, '');

  base.source = normalizeSource(src.source);
  base.pages = pages;
  base.cover = normalizeCover(src.cover, base);
  base.metadata = normalizeMetadata(src.metadata, base);
  base.validation = normalizeValidation(src.validation);
  base.export = normalizeExport(src.export);

  return base;
}

function validateBasicBookProject(project) {
  var normalized = normalizeBookProject(project);
  var issues = [];

  if (!normalized.title) {
    issues.push('title is required');
  }

  if (!normalized.language) {
    issues.push('language is required');
  }

  if (!normalized.bookType) {
    issues.push('bookType is recommended');
  }

  if (!normalized.pageSize) {
    issues.push('pageSize is required');
  }

  if (normalized.pageCount < 0) {
    issues.push('pageCount cannot be negative');
  }

  if (normalized.pageCount === 0 && normalized.pages.length > 0) {
    issues.push('pageCount should match pages length');
  }

  if (normalized.pageCount > 0 && normalized.pages.length > 0 && normalized.pageCount !== normalized.pages.length) {
    issues.push('pageCount does not match pages length');
  }

  if (!isObject(normalized.source)) {
    issues.push('source must be an object');
  }

  if (!isObject(normalized.cover)) {
    issues.push('cover must be an object');
  }

  if (!isObject(normalized.metadata)) {
    issues.push('metadata must be an object');
  }

  if (!Array.isArray(normalized.metadata.keywords)) {
    issues.push('metadata.keywords must be an array');
  }

  if (!Array.isArray(normalized.metadata.categories)) {
    issues.push('metadata.categories must be an array');
  }

  return {
    isValid: issues.length === 0,
    issues: issues,
    project: {
      id: normalized.id,
      createdAt: normalized.createdAt,
      updatedAt: normalized.updatedAt,
      theme: normalized.theme,
      title: normalized.title,
      subtitle: normalized.subtitle,
      language: normalized.language,
      ageGroup: normalized.ageGroup,
      bookType: normalized.bookType,
      pageSize: normalized.pageSize,
      pageCount: normalized.pageCount,
      complexity: normalized.complexity,
      source: normalized.source,
      pages: normalized.pages,
      cover: normalized.cover,
      metadata: normalized.metadata,
      validation: {
        isValid: issues.length === 0,
        issues: issues.slice()
      },
      export: normalized.export
    }
  };
}

export {
  createEmptyBookProject,
  normalizeBookProject,
  validateBasicBookProject
};
