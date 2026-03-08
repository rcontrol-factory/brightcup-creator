/* FILE: /js/modules/coloring_agent.js */
// Bright Cub Creator — Coloring Agent v0.4 SAFE
// Objetivo:
// - planejamento e controle de coloring books
// - integração com validador lógico de qualidade
// - integração com fila lógica de geração
// - integração com batch runner lógico
// - sem geração de imagem ainda
// - compatível com Safari/iOS

import { Storage } from '../core/storage.js';
import { validateColoringPlan } from '../core/image_quality_validator.js';
import {
  rebuildGenerationQueues,
  getNextPendingScene,
  markSceneProcessing,
  approveScene,
  rejectScene,
  incrementSceneAttempts
} from '../core/generation_queue.js';
import {
  runNextBatchStep,
  finalizeSceneSuccess,
  finalizeSceneFailure,
  getBatchRunnerState
} from '../core/batch_runner.js';

function esc(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
    return ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    })[c];
  });
}

function nowIso(){
  try {
    return new Date().toISOString();
  } catch (e) {
    return '';
  }
}

function makeId(prefix){
  var a = Math.random().toString(36).slice(2, 8);
  var b = Date.now().toString(36);
  return String(prefix || 'id') + '_' + b + '_' + a;
}

function toInt(value, fallback){
  var n = parseInt(value, 10);
  if (!isFinite(n)) return fallback;
  return n;
}

function normalizeText(value){
  return String(value == null ? '' : value).trim();
}

function normalizeSceneTitle(title){
  return normalizeText(title).replace(/\s+/g, ' ');
}

function uniqueStrings(list){
  var out = [];
  var seen = Object.create(null);
  var i, v, key;

  if (!Array.isArray(list)) return out;

  for (i = 0; i < list.length; i += 1){
    v = normalizeText(list[i]);
    if (!v) continue;
    key = v.toLowerCase();
    if (seen[key]) continue;
    seen[key] = true;
    out.push(v);
  }

  return out;
}

function createEmptyScene(input){
  var src = input && typeof input === 'object' ? input : {};
  return {
    id: normalizeText(src.id) || makeId('scene'),
    title: normalizeSceneTitle(src.title || ''),
    promptBase: normalizeText(src.promptBase || ''),
    status: normalizeText(src.status || 'pending') || 'pending',
    tags: Array.isArray(src.tags) ? uniqueStrings(src.tags) : [],
    attempts: Math.max(0, toInt(src.attempts, 0)),
    processingAt: normalizeText(src.processingAt || ''),
    approvedAt: normalizeText(src.approvedAt || ''),
    rejectedAt: normalizeText(src.rejectedAt || ''),
    rejectionReason: normalizeText(src.rejectionReason || ''),
    output: src.output != null ? src.output : null
  };
}

function createEmptyColoringPlan(){
  var ts = nowIso();
  return {
    id: '',
    createdAt: ts,
    updatedAt: ts,
    theme: '',
    ageGroup: '',
    pageTarget: 0,
    language: 'en',
    style: 'clean coloring page',
    status: 'idle',
    scenes: [],
    pending: [],
    approved: [],
    rejected: [],
    notes: ''
  };
}

function normalizeScenePrompt(theme, style, ageGroup, title){
  var parts = [];

  if (title) parts.push(title);
  if (theme) parts.push(theme);
  if (style) parts.push(style);
  if (ageGroup) parts.push('for age group ' + ageGroup);

  parts.push('black and white line art');
  parts.push('white background');
  parts.push('no shading');
  parts.push('simple clean outlines');

  return parts.join(', ');
}

function chooseScenePool(theme, ageGroup){
  var t = normalizeText(theme).toLowerCase();
  var a = normalizeText(ageGroup).toLowerCase();

  if (t.indexOf('dinosaur') >= 0 || t.indexOf('dino') >= 0){
    return [
      'baby dinosaur smiling in grass',
      'triceratops near volcano',
      'brontosaurus eating leaves',
      'dinosaur egg hatching',
      't-rex with friendly face',
      'dino family walking together',
      'small dinosaur near river',
      'pterodactyl flying over hills',
      'stegosaurus in simple landscape',
      'cartoon dinosaur footprints',
      'dinosaur in prehistoric forest',
      'cute dinosaur waving'
    ];
  }

  if (t.indexOf('animal') >= 0 || t.indexOf('farm') >= 0){
    return [
      'baby cow in field',
      'happy pig on farm',
      'chicken with eggs',
      'horse near barn',
      'duck in pond',
      'goat smiling',
      'sheep in grass',
      'farmer cat with hat',
      'puppy near fence',
      'kitten with yarn',
      'rabbit in garden',
      'bird on tree branch'
    ];
  }

  if (t.indexOf('princess') >= 0 || t.indexOf('fairy') >= 0){
    return [
      'princess with crown',
      'princess in garden',
      'fairy with wings',
      'castle with simple towers',
      'magic wand and stars',
      'princess tea party',
      'fairy near mushroom house',
      'royal carriage',
      'princess and friendly bird',
      'heart decorations',
      'fairy in flower field',
      'princess dress close-up'
    ];
  }

  if (t.indexOf('vehicle') >= 0 || t.indexOf('car') >= 0 || t.indexOf('truck') >= 0){
    return [
      'simple race car',
      'happy fire truck',
      'school bus front view',
      'tractor in farm field',
      'construction truck',
      'airplane in clouds',
      'boat on calm water',
      'train with smiling face',
      'police car simple outline',
      'helicopter above city',
      'tow truck side view',
      'ice cream truck'
    ];
  }

  if (t.indexOf('ocean') >= 0 || t.indexOf('sea') >= 0 || t.indexOf('marine') >= 0){
    return [
      'happy dolphin jumping',
      'sea turtle swimming',
      'octopus smiling',
      'whale near bubbles',
      'seahorse simple outline',
      'starfish and shells',
      'crab on sand',
      'small fish school',
      'mermaid simple line art',
      'submarine cartoon style',
      'coral reef scene',
      'boat on ocean waves'
    ];
  }

  if (a.indexOf('2') >= 0 || a.indexOf('3') >= 0 || a.indexOf('4') >= 0){
    return [
      'big apple smiling',
      'cute teddy bear',
      'balloon bunch',
      'simple butterfly',
      'happy sun and cloud',
      'toy train',
      'big flower',
      'friendly cat face',
      'simple robot',
      'kite in the sky',
      'birthday cake',
      'soft bunny'
    ];
  }

  return [
    'cute bear in forest',
    'happy fox in meadow',
    'friendly lion face',
    'simple castle scene',
    'dragon with soft shapes',
    'girl with balloons',
    'boy with kite',
    'garden with butterflies',
    'camping tent in nature',
    'treehouse simple outline',
    'rainbow and clouds',
    'playground scene',
    'cute owl on branch',
    'unicorn in field',
    'friendly monster',
    'picnic basket scene'
  ];
}

function buildScenes(theme, ageGroup, pageTarget, style){
  var pool = chooseScenePool(theme, ageGroup);
  var out = [];
  var count = Math.max(1, toInt(pageTarget, 12));
  var i;

  for (i = 0; i < count; i += 1){
    var title = pool[i % pool.length];

    if (i >= pool.length) {
      title = title + ' variation ' + (i - pool.length + 2);
    }

    out.push(createEmptyScene({
      title: title,
      promptBase: normalizeScenePrompt(theme, style, ageGroup, title),
      status: 'pending',
      tags: inferTags(theme, ageGroup, title),
      attempts: 0
    }));
  }

  return out;
}

function inferTags(theme, ageGroup, title){
  var tags = [];
  var t = normalizeText(theme);
  var a = normalizeText(ageGroup);
  var s = normalizeText(title);

  if (t) tags.push(t);
  if (a) tags.push(a);
  if (s) {
    var first = s.split(' ')[0];
    if (first) tags.push(first);
  }

  tags.push('coloring');
  tags.push('line art');

  return uniqueStrings(tags);
}

function normalizePlan(input){
  var base = createEmptyColoringPlan();
  var src = input && typeof input === 'object' ? input : {};
  var scenes = Array.isArray(src.scenes) ? src.scenes.map(createEmptyScene) : [];

  base.id = normalizeText(src.id) || makeId('colorbook');
  base.createdAt = normalizeText(src.createdAt) || base.createdAt;
  base.updatedAt = normalizeText(src.updatedAt) || nowIso();
  base.theme = normalizeText(src.theme);
  base.ageGroup = normalizeText(src.ageGroup);
  base.pageTarget = Math.max(0, toInt(src.pageTarget, 0));
  base.language = normalizeText(src.language || 'en') || 'en';
  base.style = normalizeText(src.style || 'clean coloring page') || 'clean coloring page';
  base.status = normalizeText(src.status || 'idle') || 'idle';
  base.scenes = scenes;
  base.pending = Array.isArray(src.pending) ? src.pending.slice() : [];
  base.approved = Array.isArray(src.approved) ? src.approved.slice() : [];
  base.rejected = Array.isArray(src.rejected) ? src.rejected.slice() : [];
  base.notes = normalizeText(src.notes);

  return rebuildGenerationQueues(base);
}

function createPlanFromForm(form){
  var theme = normalizeText(form.theme);
  var ageGroup = normalizeText(form.ageGroup);
  var pageTarget = Math.max(1, toInt(form.pageTarget, 12));
  var language = normalizeText(form.language || 'en') || 'en';
  var style = normalizeText(form.style || 'clean coloring page') || 'clean coloring page';
  var notes = normalizeText(form.notes || '');

  var plan = normalizePlan({
    id: makeId('colorbook'),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    theme: theme,
    ageGroup: ageGroup,
    pageTarget: pageTarget,
    language: language,
    style: style,
    status: 'planned',
    scenes: buildScenes(theme, ageGroup, pageTarget, style),
    notes: notes
  });

  return rebuildGenerationQueues(plan);
}

function renderPlanSummary(plan){
  if (!plan) return 'Nenhum plano gerado.';
  return [
    'ID: ' + plan.id,
    'Theme: ' + (plan.theme || '-'),
    'Age Group: ' + (plan.ageGroup || '-'),
    'Pages Target: ' + String(plan.pageTarget || 0),
    'Language: ' + (plan.language || 'en'),
    'Style: ' + (plan.style || '-'),
    'Status: ' + (plan.status || 'idle'),
    'Scenes: ' + String((plan.scenes || []).length),
    'Pending: ' + String((plan.pending || []).length),
    'Approved: ' + String((plan.approved || []).length),
    'Rejected: ' + String((plan.rejected || []).length)
  ].join('\n');
}

function renderScenesText(plan){
  var scenes = plan && Array.isArray(plan.scenes) ? plan.scenes : [];
  if (!scenes.length) return 'No scenes yet.';

  return scenes.map(function(scene, idx){
    return [
      String(idx + 1).padStart(2, '0') + '. ' + scene.title,
      '   status: ' + scene.status,
      '   attempts: ' + String(scene.attempts || 0),
      '   tags: ' + ((scene.tags || []).join(', ') || '-'),
      '   prompt: ' + scene.promptBase
    ].join('\n');
  }).join('\n\n');
}

function safeValidatePlan(plan){
  try {
    return validateColoringPlan(plan || {});
  } catch (e) {
    return {
      isValid: false,
      issues: ['validator failed: ' + String((e && e.message) || e || 'unknown error')],
      warnings: [],
      stats: {
        scenes: 0,
        invalidScenes: 0,
        duplicateTitles: 0,
        duplicatePrompts: 0,
        similarScenes: 0,
        weakPrompts: 0
      }
    };
  }
}

function renderValidationReport(report){
  if (!report) return 'No validation yet.';

  var stats = report.stats || {};
  var issues = Array.isArray(report.issues) ? report.issues : [];
  var warnings = Array.isArray(report.warnings) ? report.warnings : [];

  return [
    'isValid: ' + (report.isValid ? 'true' : 'false'),
    '',
    'issues:',
    issues.length ? issues.map(function(x){ return '- ' + x; }).join('\n') : '- none',
    '',
    'warnings:',
    warnings.length ? warnings.map(function(x){ return '- ' + x; }).join('\n') : '- none',
    '',
    'stats:',
    '- scenes: ' + String(stats.scenes || 0),
    '- invalidScenes: ' + String(stats.invalidScenes || 0),
    '- duplicateTitles: ' + String(stats.duplicateTitles || 0),
    '- duplicatePrompts: ' + String(stats.duplicatePrompts || 0),
    '- similarScenes: ' + String(stats.similarScenes || 0),
    '- weakPrompts: ' + String(stats.weakPrompts || 0)
  ].join('\n');
}

function renderQueueReport(plan){
  if (!plan) return 'No queue state yet.';

  var nextInfo = getNextPendingScene(plan || {});
  var nextScene = nextInfo && nextInfo.scene ? nextInfo.scene : null;

  return [
    'planStatus: ' + (plan.status || 'idle'),
    '- pending: ' + String((plan.pending || []).length),
    '- approved: ' + String((plan.approved || []).length),
    '- rejected: ' + String((plan.rejected || []).length),
    '',
    'nextPendingScene:',
    nextScene ? ('- ' + nextScene.title + ' [' + nextScene.id + ']') : '- none'
  ].join('\n');
}

function renderBatchRunnerReport(state){
  if (!state) return 'No batch runner state yet.';

  var counts = state.counts || {};
  var processing = state.processingScene || null;
  var nextPending = state.nextPendingScene || null;

  return [
    'status: ' + (state.status || 'idle'),
    '',
    'processingScene:',
    processing ? ('- ' + processing.title + ' [' + processing.id + ']') : '- none',
    '',
    'nextPendingScene:',
    nextPending ? ('- ' + nextPending.title + ' [' + nextPending.id + ']') : '- none',
    '',
    'counts:',
    '- scenes: ' + String(counts.scenes || 0),
    '- pending: ' + String(counts.pending || 0),
    '- approved: ' + String(counts.approved || 0),
    '- rejected: ' + String(counts.rejected || 0),
    '- processing: ' + String(counts.processing || 0)
  ].join('\n');
}

function findProcessingScene(plan){
  var scenes = plan && Array.isArray(plan.scenes) ? plan.scenes : [];
  var i;
  for (i = 0; i < scenes.length; i += 1){
    if (String(scenes[i].status || '').toLowerCase() === 'processing') {
      return scenes[i];
    }
  }
  return null;
}

export class ColoringAgentModule {
  constructor(app){
    this.app = app;
    this.id = 'coloring_agent';
    this.title = 'Coloring Agent';
  }

  async init(){}

  render(root){
    var seed = Storage.get('coloring:agent_seed', {
      theme: '',
      ageGroup: '3-5',
      pageTarget: 20,
      language: 'en',
      style: 'clean coloring page',
      notes: ''
    });

    var rawPlan = Storage.get('coloring:book_plan', null);
    var existingPlan = rawPlan ? normalizePlan(rawPlan) : null;
    var hasExistingPlan = !!(existingPlan && existingPlan.id && existingPlan.theme);

    root.innerHTML = `
      <div class="grid">
        <div class="card">
          <h2>Coloring Agent</h2>
          <p class="muted">
            Planejamento do livro de colorir. Esta etapa ainda não gera imagens.
            Ela organiza o tema, a meta de páginas, a fila e o executor lógico de lote.
          </p>

          <div class="row">
            <label style="flex:1">
              Theme
              <input id="ca_theme" class="inp" placeholder="Dinosaurs, Farm Animals, Princesses..." value="${esc(seed.theme || '')}" />
            </label>

            <label style="min-width:140px">
              Age Group
              <input id="ca_age" class="inp" placeholder="3-5" value="${esc(seed.ageGroup || '3-5')}" />
            </label>
          </div>

          <div class="row">
            <label style="min-width:140px">
              Page Target
              <input id="ca_pages" class="inp" type="number" min="1" step="1" value="${esc(String(seed.pageTarget || 20))}" />
            </label>

            <label style="min-width:120px">
              Language
              <input id="ca_lang" class="inp" value="${esc(seed.language || 'en')}" />
            </label>

            <label style="flex:1">
              Style
              <input id="ca_style" class="inp" value="${esc(seed.style || 'clean coloring page')}" />
            </label>
          </div>

          <label>
            Notes
            <textarea id="ca_notes" class="txt" rows="4" placeholder="Commercial notes, constraints, target audience...">${esc(seed.notes || '')}</textarea>
          </label>

          <div class="row" style="margin-top:10px">
            <button id="ca_build" class="btn primary">Generate Plan</button>
            <button id="ca_save" class="btn">Save Plan</button>
            <button id="ca_reload" class="btn secondary">Reload Saved</button>
          </div>

          <div class="row" style="margin-top:10px">
            <button id="ca_mark_processing" class="btn">Mark Next Pending → Processing</button>
            <button id="ca_approve_current" class="btn">Approve Current Scene</button>
            <button id="ca_reject_current" class="btn">Reject Current Scene</button>
            <button id="ca_inc_attempts" class="btn secondary">+ Attempts on Current</button>
          </div>

          <div class="row" style="margin-top:10px">
            <button id="ca_run_batch_step" class="btn primary">Run Next Batch Step</button>
            <button id="ca_finalize_success" class="btn">Finalize Current Success</button>
            <button id="ca_finalize_failure" class="btn">Finalize Current Failure</button>
          </div>
        </div>

        <div class="card">
          <h2>Plan Summary</h2>
          <pre id="ca_summary" class="pre"></pre>
        </div>

        <div class="card">
          <h2>Validation</h2>
          <pre id="ca_validation" class="pre"></pre>
        </div>

        <div class="card">
          <h2>Queue State</h2>
          <pre id="ca_queue" class="pre"></pre>
        </div>

        <div class="card">
          <h2>Batch Runner State</h2>
          <pre id="ca_batch" class="pre"></pre>
        </div>

        <div class="card">
          <h2>Scene List</h2>
          <pre id="ca_scenes" class="pre"></pre>
        </div>
      </div>
    `;

    var $ = function(sel){ return root.querySelector(sel); };
    var summaryEl = $('#ca_summary');
    var validationEl = $('#ca_validation');
    var queueEl = $('#ca_queue');
    var batchEl = $('#ca_batch');
    var scenesEl = $('#ca_scenes');

    var currentPlan = hasExistingPlan ? rebuildGenerationQueues(existingPlan) : null;
    var currentValidation = currentPlan ? safeValidatePlan(currentPlan) : null;
    var currentBatchState = currentPlan ? getBatchRunnerState(currentPlan) : null;

    function getFormData(){
      return {
        theme: ($('#ca_theme').value || '').trim(),
        ageGroup: ($('#ca_age').value || '').trim(),
        pageTarget: ($('#ca_pages').value || '').trim(),
        language: ($('#ca_lang').value || '').trim(),
        style: ($('#ca_style').value || '').trim(),
        notes: ($('#ca_notes').value || '').trim()
      };
    }

    function saveSeed(){
      Storage.set('coloring:agent_seed', getFormData());
    }

    function rehydratePlan(){
      if (!currentPlan) return;
      currentPlan = rebuildGenerationQueues(currentPlan);
    }

    function validateCurrentPlan(){
      currentValidation = currentPlan ? safeValidatePlan(currentPlan) : null;
    }

    function refreshBatchState(){
      currentBatchState = currentPlan ? getBatchRunnerState(currentPlan) : null;
    }

    function syncDerivedStates(){
      rehydratePlan();
      validateCurrentPlan();
      refreshBatchState();
    }

    function persistCurrentPlan(){
      if (!currentPlan) return;
      Storage.set('coloring:book_plan', currentPlan);
    }

    function paint(){
      summaryEl.textContent = currentPlan ? renderPlanSummary(currentPlan) : 'Nenhum plano gerado.';
      validationEl.textContent = currentValidation ? renderValidationReport(currentValidation) : 'No validation yet.';
      queueEl.textContent = currentPlan ? renderQueueReport(currentPlan) : 'No queue state yet.';
      batchEl.textContent = currentBatchState ? renderBatchRunnerReport(currentBatchState) : 'No batch runner state yet.';
      scenesEl.textContent = currentPlan ? renderScenesText(currentPlan) : 'No scenes yet.';
    }

    $('#ca_build').onclick = () => {
      try {
        saveSeed();
        currentPlan = createPlanFromForm(getFormData());
        syncDerivedStates();
        paint();

        if (this.app && this.app.toast) this.app.toast('Coloring plan generated ✅');
        if (this.app && this.app.log) {
          this.app.log(
            '[COLORING_AGENT] plan generated theme=' + currentPlan.theme +
            ' pages=' + currentPlan.pageTarget +
            ' scenes=' + currentPlan.scenes.length +
            ' valid=' + (currentValidation && currentValidation.isValid ? 'true' : 'false')
          );
        }
      } catch (e) {
        if (this.app && this.app.toast) this.app.toast('Failed to generate plan', 'err');
      }
    };

    $('#ca_save').onclick = () => {
      try {
        saveSeed();

        if (!currentPlan) {
          currentPlan = createPlanFromForm(getFormData());
        }

        currentPlan.updatedAt = nowIso();
        currentPlan = normalizePlan(currentPlan);
        syncDerivedStates();

        Storage.set('coloring:book_plan', currentPlan);

        if (this.app && this.app.saveProject) {
          this.app.saveProject({
            type: 'coloring_book_planner',
            ts: Date.now(),
            plan: currentPlan,
            validation: currentValidation,
            batchState: currentBatchState,
            seed: Storage.get('coloring:agent_seed', {})
          });
        }

        paint();
        if (this.app && this.app.toast) this.app.toast('Coloring plan saved ✅');
      } catch (e) {
        if (this.app && this.app.toast) this.app.toast('Failed to save plan', 'err');
      }
    };

    $('#ca_reload').onclick = () => {
      try {
        var saved = Storage.get('coloring:book_plan', null);
        currentPlan = saved ? normalizePlan(saved) : null;
        syncDerivedStates();
        paint();
        if (this.app && this.app.toast) this.app.toast('Saved plan reloaded ✅');
      } catch (e) {
        if (this.app && this.app.toast) this.app.toast('Failed to reload', 'err');
      }
    };

    $('#ca_mark_processing').onclick = () => {
      try {
        if (!currentPlan) {
          if (this.app && this.app.toast) this.app.toast('Generate a plan first');
          return;
        }

        var nextInfo = getNextPendingScene(currentPlan);
        var nextScene = nextInfo && nextInfo.scene ? nextInfo.scene : null;

        if (!nextScene) {
          if (this.app && this.app.toast) this.app.toast('No pending scene');
          return;
        }

        var res = markSceneProcessing(currentPlan, nextScene.id);
        if (!res.ok) throw new Error(res.error || 'Failed to mark processing');

        currentPlan = rebuildGenerationQueues(res.plan);
        syncDerivedStates();
        persistCurrentPlan();
        paint();

        if (this.app && this.app.toast) this.app.toast('Scene in processing ✅');
      } catch (e) {
        if (this.app && this.app.toast) this.app.toast('Failed to move scene', 'err');
      }
    };

    $('#ca_approve_current').onclick = () => {
      try {
        if (!currentPlan) {
          if (this.app && this.app.toast) this.app.toast('Generate a plan first');
          return;
        }

        var currentScene = findProcessingScene(currentPlan);
        if (!currentScene) {
          var nextInfo = getNextPendingScene(currentPlan);
          currentScene = nextInfo && nextInfo.scene ? nextInfo.scene : null;
        }

        if (!currentScene) {
          if (this.app && this.app.toast) this.app.toast('No scene available');
          return;
        }

        var res = approveScene(currentPlan, currentScene.id, { approvedBy: 'manual-test' });
        if (!res.ok) throw new Error(res.error || 'Failed to approve');

        currentPlan = rebuildGenerationQueues(res.plan);
        syncDerivedStates();
        persistCurrentPlan();
        paint();

        if (this.app && this.app.toast) this.app.toast('Scene approved ✅');
      } catch (e) {
        if (this.app && this.app.toast) this.app.toast('Failed to approve', 'err');
      }
    };

    $('#ca_reject_current').onclick = () => {
      try {
        if (!currentPlan) {
          if (this.app && this.app.toast) this.app.toast('Generate a plan first');
          return;
        }

        var currentScene = findProcessingScene(currentPlan);
        if (!currentScene) {
          var nextInfo = getNextPendingScene(currentPlan);
          currentScene = nextInfo && nextInfo.scene ? nextInfo.scene : null;
        }

        if (!currentScene) {
          if (this.app && this.app.toast) this.app.toast('No scene available');
          return;
        }

        var res = rejectScene(currentPlan, currentScene.id, 'manual-test');
        if (!res.ok) throw new Error(res.error || 'Failed to reject');

        currentPlan = rebuildGenerationQueues(res.plan);
        syncDerivedStates();
        persistCurrentPlan();
        paint();

        if (this.app && this.app.toast) this.app.toast('Scene rejected ✅');
      } catch (e) {
        if (this.app && this.app.toast) this.app.toast('Failed to reject', 'err');
      }
    };

    $('#ca_inc_attempts').onclick = () => {
      try {
        if (!currentPlan) {
          if (this.app && this.app.toast) this.app.toast('Generate a plan first');
          return;
        }

        var currentScene = findProcessingScene(currentPlan);
        if (!currentScene) {
          var nextInfo = getNextPendingScene(currentPlan);
          currentScene = nextInfo && nextInfo.scene ? nextInfo.scene : null;
        }

        if (!currentScene) {
          if (this.app && this.app.toast) this.app.toast('No scene available');
          return;
        }

        var res = incrementSceneAttempts(currentPlan, currentScene.id);
        if (!res.ok) throw new Error(res.error || 'Failed to increment attempts');

        currentPlan = rebuildGenerationQueues(res.plan);
        syncDerivedStates();
        persistCurrentPlan();
        paint();

        if (this.app && this.app.toast) this.app.toast('Attempts incremented ✅');
      } catch (e) {
        if (this.app && this.app.toast) this.app.toast('Failed to increment attempts', 'err');
      }
    };

    $('#ca_run_batch_step').onclick = () => {
      try {
        if (!currentPlan) {
          if (this.app && this.app.toast) this.app.toast('Generate a plan first');
          return;
        }

        var res = runNextBatchStep(currentPlan);
        if (!res.ok) throw new Error(res.message || 'Failed to run batch step');

        currentPlan = rebuildGenerationQueues(res.plan);
        syncDerivedStates();
        persistCurrentPlan();
        paint();

        if (this.app && this.app.toast) this.app.toast(res.message || 'Batch step executed ✅');
      } catch (e) {
        if (this.app && this.app.toast) this.app.toast('Failed to run batch step', 'err');
      }
    };

    $('#ca_finalize_success').onclick = () => {
      try {
        if (!currentPlan) {
          if (this.app && this.app.toast) this.app.toast('Generate a plan first');
          return;
        }

        var state = getBatchRunnerState(currentPlan);
        var processing = state && state.processingScene ? state.processingScene : null;

        if (!processing) {
          if (this.app && this.app.toast) this.app.toast('No processing scene');
          return;
        }

        var res = finalizeSceneSuccess(currentPlan, processing.id, { finalizedBy: 'manual-batch-success' });
        if (!res.ok) throw new Error(res.message || 'Failed to finalize success');

        currentPlan = rebuildGenerationQueues(res.plan);
        syncDerivedStates();
        persistCurrentPlan();
        paint();

        if (this.app && this.app.toast) this.app.toast(res.message || 'Scene finalized ✅');
      } catch (e) {
        if (this.app && this.app.toast) this.app.toast('Failed to finalize success', 'err');
      }
    };

    $('#ca_finalize_failure').onclick = () => {
      try {
        if (!currentPlan) {
          if (this.app && this.app.toast) this.app.toast('Generate a plan first');
          return;
        }

        var state = getBatchRunnerState(currentPlan);
        var processing = state && state.processingScene ? state.processingScene : null;

        if (!processing) {
          if (this.app && this.app.toast) this.app.toast('No processing scene');
          return;
        }

        var res = finalizeSceneFailure(currentPlan, processing.id, 'manual-batch-failure');
        if (!res.ok) throw new Error(res.message || 'Failed to finalize failure');

        currentPlan = rebuildGenerationQueues(res.plan);
        syncDerivedStates();
        persistCurrentPlan();
        paint();

        if (this.app && this.app.toast) this.app.toast(res.message || 'Scene rejected ✅');
      } catch (e) {
        if (this.app && this.app.toast) this.app.toast('Failed to finalize failure', 'err');
      }
    };

    syncDerivedStates();
    paint();
  }
}
