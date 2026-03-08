/* FILE: /js/core/image_quality_validator.js
   Bright Cub Creator — Coloring Image Quality Validator v0.1 SAFE

   Escopo atual:
   - validação lógica/editorial do plano e das cenas
   - sem análise real de pixels/imagem
   - JS puro
   - sem DOM
   - sem dependências
   - compatível com Safari/iOS
*/

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function toStringSafe(value, fallback) {
  if (value == null) return fallback || '';
  return String(value).trim();
}

function toNumberSafe(value, fallback) {
  var n = Number(value);
  if (!isFinite(n)) return typeof fallback === 'number' ? fallback : 0;
  return n;
}

function toArraySafe(value) {
  return Array.isArray(value) ? value.slice() : [];
}

function normalizeText(value) {
  return toStringSafe(value, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeLoose(value) {
  return normalizeText(value)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueStrings(list) {
  var arr = toArraySafe(list);
  var out = [];
  var seen = Object.create(null);
  var i;
  var s;
  var key;

  for (i = 0; i < arr.length; i += 1) {
    s = toStringSafe(arr[i], '');
    if (!s) continue;
    key = s.toLowerCase();
    if (seen[key]) continue;
    seen[key] = true;
    out.push(s);
  }

  return out;
}

function countWords(text) {
  var s = toStringSafe(text, '');
  if (!s) return 0;
  return s.split(/\s+/).filter(Boolean).length;
}

function hasColoringSignals(prompt) {
  var p = normalizeLoose(prompt);

  return (
    p.indexOf('coloring page') >= 0 ||
    p.indexOf('line art') >= 0 ||
    p.indexOf('black and white') >= 0 ||
    p.indexOf('outline') >= 0 ||
    p.indexOf('outlines') >= 0
  );
}

function hasWeakGenericSignals(prompt) {
  var p = normalizeLoose(prompt);

  var genericSignals = [
    'nice image',
    'beautiful image',
    'good image',
    'simple image',
    'random image',
    'cool image',
    'art image',
    'drawing',
    'picture',
    'illustration'
  ];

  var i;
  for (i = 0; i < genericSignals.length; i += 1) {
    if (p === genericSignals[i] || p.indexOf(genericSignals[i]) >= 0) {
      return true;
    }
  }

  return false;
}

function promptMentionsTheme(prompt, theme) {
  var p = normalizeLoose(prompt);
  var t = normalizeLoose(theme);

  if (!t) return true;

  var parts = t.split(/\s+/).filter(function(x){ return x.length >= 3; });
  if (!parts.length) return true;

  var i;
  for (i = 0; i < parts.length; i += 1) {
    if (p.indexOf(parts[i]) >= 0) return true;
  }

  return false;
}

function detectWeakPrompt(prompt, theme) {
  var text = toStringSafe(prompt, '');
  var normalized = normalizeLoose(text);
  var issues = [];
  var warnings = [];

  if (!text) {
    issues.push('promptBase is required');
  }

  if (text && text.length < 24) {
    warnings.push('prompt is too short');
  }

  if (countWords(text) < 4) {
    warnings.push('prompt has too few words');
  }

  if (text && !hasColoringSignals(text)) {
    warnings.push('prompt lacks basic coloring page signals');
  }

  if (text && !promptMentionsTheme(text, theme)) {
    warnings.push('prompt does not clearly reference the theme');
  }

  if (text && hasWeakGenericSignals(text)) {
    warnings.push('prompt looks too generic');
  }

  if (normalized && normalized.length < 18) {
    warnings.push('prompt structure is too weak');
  }

  return {
    isWeak: warnings.length > 0 || issues.length > 0,
    issues: issues,
    warnings: warnings
  };
}

function validateSceneStatus(status) {
  var s = toStringSafe(status, 'pending').toLowerCase();
  return s === 'pending' || s === 'approved' || s === 'rejected';
}

function validateColoringScene(scene, context) {
  var src = isObject(scene) ? scene : {};
  var ctx = isObject(context) ? context : {};
  var issues = [];
  var warnings = [];

  var id = toStringSafe(src.id, '');
  var title = toStringSafe(src.title, '');
  var promptBase = toStringSafe(src.promptBase, '');
  var status = toStringSafe(src.status, 'pending').toLowerCase();
  var tags = toArraySafe(src.tags);
  var attempts = toNumberSafe(src.attempts, 0);

  if (!id) {
    issues.push('scene.id is required');
  }

  if (!title) {
    issues.push('scene.title is required');
  }

  if (!promptBase) {
    issues.push('scene.promptBase is required');
  }

  if (!validateSceneStatus(status)) {
    issues.push('scene.status must be pending, approved, or rejected');
  }

  if (!Array.isArray(tags)) {
    issues.push('scene.tags must be an array');
  }

  if (attempts < 0 || Math.floor(attempts) !== attempts) {
    issues.push('scene.attempts must be a non-negative integer');
  }

  if (Array.isArray(tags) && uniqueStrings(tags).length === 0) {
    warnings.push('scene.tags is empty or weak');
  }

  if (title && title.length < 4) {
    warnings.push('scene.title is too short');
  }

  var promptCheck = detectWeakPrompt(promptBase, ctx.theme || '');
  warnings = warnings.concat(promptCheck.warnings);
  issues = issues.concat(promptCheck.issues);

  return {
    isValid: issues.length === 0,
    issues: issues,
    warnings: warnings,
    scene: {
      id: id,
      title: title,
      promptBase: promptBase,
      status: status || 'pending',
      tags: uniqueStrings(tags),
      attempts: Math.max(0, Math.floor(attempts))
    }
  };
}

function findDuplicateScenes(scenes) {
  var arr = toArraySafe(scenes);
  var titleMap = Object.create(null);
  var promptMap = Object.create(null);
  var looseMap = Object.create(null);

  var duplicateTitles = [];
  var duplicatePrompts = [];
  var similarScenes = [];

  var i;
  var scene;
  var titleKey;
  var promptKey;
  var looseKey;

  for (i = 0; i < arr.length; i += 1) {
    scene = isObject(arr[i]) ? arr[i] : {};

    titleKey = normalizeLoose(scene.title || '');
    promptKey = normalizeLoose(scene.promptBase || '');
    looseKey = normalizeLoose((scene.title || '') + ' | ' + (scene.promptBase || ''));

    if (titleKey) {
      if (titleMap[titleKey]) {
        duplicateTitles.push({
          firstIndex: titleMap[titleKey] - 1,
          secondIndex: i,
          value: scene.title || ''
        });
      } else {
        titleMap[titleKey] = i + 1;
      }
    }

    if (promptKey) {
      if (promptMap[promptKey]) {
        duplicatePrompts.push({
          firstIndex: promptMap[promptKey] - 1,
          secondIndex: i,
          value: scene.promptBase || ''
        });
      } else {
        promptMap[promptKey] = i + 1;
      }
    }

    if (looseKey) {
      if (looseMap[looseKey]) {
        similarScenes.push({
          firstIndex: looseMap[looseKey] - 1,
          secondIndex: i,
          value: scene.title || scene.promptBase || ''
        });
      } else {
        looseMap[looseKey] = i + 1;
      }
    }
  }

  return {
    duplicateTitles: duplicateTitles,
    duplicatePrompts: duplicatePrompts,
    similarScenes: similarScenes
  };
}

function validateColoringPlan(plan) {
  var src = isObject(plan) ? plan : {};
  var issues = [];
  var warnings = [];
  var scenes = toArraySafe(src.scenes);
  var validatedScenes = [];
  var weakPrompts = 0;
  var invalidScenes = 0;
  var i;
  var result;

  if (!toStringSafe(src.theme, '')) {
    issues.push('theme is required');
  }

  if (!toStringSafe(src.ageGroup, '')) {
    issues.push('ageGroup is required');
  }

  if (toNumberSafe(src.pageTarget, 0) <= 0) {
    issues.push('pageTarget must be greater than 0');
  }

  if (!Array.isArray(src.scenes)) {
    issues.push('scenes must be an array');
  }

  for (i = 0; i < scenes.length; i += 1) {
    result = validateColoringScene(scenes[i], { theme: src.theme || '' });
    validatedScenes.push(result);

    if (!result.isValid) {
      invalidScenes += 1;
      issues.push('scene[' + i + '] is invalid');
    }

    if (result.warnings && result.warnings.length) {
      warnings.push('scene[' + i + ']: ' + result.warnings.join('; '));
    }

    if ((result.warnings || []).length > 0) {
      var hasWeak = false;
      var j;
      for (j = 0; j < result.warnings.length; j += 1) {
        if (String(result.warnings[j]).toLowerCase().indexOf('prompt') >= 0) {
          hasWeak = true;
          break;
        }
      }
      if (hasWeak) weakPrompts += 1;
    }
  }

  var dup = findDuplicateScenes(scenes);

  if (dup.duplicateTitles.length > 0) {
    warnings.push('duplicate scene titles found');
  }

  if (dup.duplicatePrompts.length > 0) {
    warnings.push('duplicate scene prompts found');
  }

  if (dup.similarScenes.length > 0) {
    warnings.push('very similar scenes found');
  }

  if (scenes.length > 0 && toNumberSafe(src.pageTarget, 0) !== scenes.length) {
    warnings.push('pageTarget does not match scenes length');
  }

  return {
    isValid: issues.length === 0,
    issues: issues,
    warnings: warnings,
    stats: {
      scenes: scenes.length,
      invalidScenes: invalidScenes,
      duplicateTitles: dup.duplicateTitles.length,
      duplicatePrompts: dup.duplicatePrompts.length,
      similarScenes: dup.similarScenes.length,
      weakPrompts: weakPrompts
    },
    details: {
      scenes: validatedScenes,
      duplicates: dup
    }
  };
}

export {
  validateColoringPlan,
  validateColoringScene,
  findDuplicateScenes,
  detectWeakPrompt
};
