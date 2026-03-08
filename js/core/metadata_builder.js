/* FILE: /js/core/metadata_builder.js
   Bright Cub Creator — Metadata Builder v0.1 SAFE

   Escopo atual:
   - construtor de metadados editoriais do coloring pipeline
   - não publica
   - não integra com Amazon
   - gera objeto previsível para metadata futura
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

function normalizeText(value) {
  return toStringSafe(value, '').replace(/\s+/g, ' ').trim();
}

function uniqueStrings(list) {
  var arr = toArraySafe(list);
  var out = [];
  var seen = Object.create(null);
  var i;
  var item;
  var key;

  for (i = 0; i < arr.length; i += 1) {
    item = normalizeText(arr[i]);
    if (!item) continue;
    key = item.toLowerCase();
    if (seen[key]) continue;
    seen[key] = true;
    out.push(item);
  }

  return out;
}

function normalizePlan(plan) {
  var src = isObject(plan) ? plan : {};
  return {
    id: toStringSafe(src.id, ''),
    theme: normalizeText(src.theme),
    ageGroup: normalizeText(src.ageGroup),
    language: normalizeText(src.language || 'en') || 'en',
    style: normalizeText(src.style || 'clean coloring page') || 'clean coloring page',
    pageTarget: Math.max(0, toIntSafe(src.pageTarget, 0)),
    status: normalizeText(src.status || 'idle') || 'idle',
    createdAt: toStringSafe(src.createdAt, ''),
    updatedAt: toStringSafe(src.updatedAt, ''),
    scenes: toArraySafe(src.scenes)
  };
}

function titleCaseSimple(text) {
  var s = normalizeText(text);
  if (!s) return '';
  return s
    .split(' ')
    .map(function(word){
      if (!word) return '';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function buildBookTitle(plan) {
  var p = normalizePlan(plan);
  var theme = titleCaseSimple(p.theme || 'Coloring Book');

  if (!theme) theme = 'Coloring Book';

  return theme + ' Coloring Book';
}

function buildBookSubtitle(plan) {
  var p = normalizePlan(plan);
  var parts = [];

  if (p.ageGroup) parts.push('Ages ' + p.ageGroup);
  if (p.pageTarget > 0) parts.push(String(p.pageTarget) + ' pages');
  parts.push('Fun and simple coloring pages');

  return parts.join(' • ');
}

function buildShortDescription(plan) {
  var p = normalizePlan(plan);
  var theme = p.theme || 'coloring';
  var age = p.ageGroup || 'kids';
  var pages = p.pageTarget > 0 ? String(p.pageTarget) : 'multiple';
  var style = p.style || 'clean coloring page';

  return (
    'A ' + theme + ' coloring book designed for age group ' + age + ', ' +
    'with ' + pages + ' planned pages in a ' + style + ' style. ' +
    'This project is structured for a simple, clean, and kid-friendly editorial flow.'
  );
}

function inferSceneKeywords(plan) {
  var p = normalizePlan(plan);
  var scenes = toArraySafe(p.scenes);
  var out = [];
  var i;
  var scene;
  var titleWords;

  for (i = 0; i < scenes.length; i += 1) {
    scene = scenes[i];
    if (!isObject(scene)) continue;

    titleWords = normalizeText(scene.title || '')
      .split(' ')
      .filter(function(word){
        return word && word.length >= 4;
      });

    out = out.concat(titleWords.slice(0, 3));
  }

  return uniqueStrings(out).slice(0, 10);
}

function buildKeywordList(plan) {
  var p = normalizePlan(plan);
  var theme = p.theme;
  var age = p.ageGroup;
  var keywords = [
    theme,
    theme ? theme + ' coloring book' : '',
    'coloring book',
    'kids coloring book',
    age ? 'ages ' + age : '',
    'black and white line art',
    'simple coloring pages',
    'printable coloring style',
    p.style,
    p.pageTarget > 0 ? String(p.pageTarget) + ' pages' : ''
  ];

  keywords = keywords.concat(inferSceneKeywords(p));

  return uniqueStrings(keywords).slice(0, 20);
}

function buildCategoryList(plan) {
  var p = normalizePlan(plan);
  var categories = [
    'coloring_books',
    'editorial_projects',
    'kids_activity_books'
  ];

  if (p.theme) categories.push(normalizeText(p.theme).replace(/\s+/g, '_'));
  if (p.ageGroup) categories.push('age_' + normalizeText(p.ageGroup).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, ''));
  if (p.style) categories.push(normalizeText(p.style).replace(/\s+/g, '_'));

  return uniqueStrings(categories).slice(0, 12);
}

function buildColoringMetadata(plan) {
  var p = normalizePlan(plan);

  return {
    metadataVersion: '1.0',
    type: 'coloring_book_metadata',
    generatedAt: nowIso(),
    title: buildBookTitle(p),
    subtitle: buildBookSubtitle(p),
    theme: p.theme,
    ageGroup: p.ageGroup,
    language: p.language,
    style: p.style,
    description: buildShortDescription(p),
    keywords: buildKeywordList(p),
    categories: buildCategoryList(p)
  };
}

export {
  buildColoringMetadata,
  buildKeywordList,
  buildShortDescription
};
