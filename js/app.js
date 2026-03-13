/* FILE: /js/app.js */
// Bright Cup Creator — /js/app.js
// Boot defensivo + boot leve + init sob demanda
// Safari/iPhone/PWA safe

import { Storage } from './core/storage.js';
import { PromptEngine } from './core/prompt_engine.js';
import { ComfyClient } from './core/comfy_client.js';

import {
  safeSessionGet,
  safeSessionSet,
  safeSessionRemove,
  toIntSafe,
  recoverRuntimeState,
  buildRuntimeDiagnostic
} from './core/runtime_stability_guard.js';

import {
  shouldRunBootCacheGuard,
  runBootCacheGuard,
  buildBootCacheDiagnostic
} from './core/boot_cache_guard.js';

import { buildBootRecoverySnapshot } from './core/boot_recovery_snapshot.js';

import { AgentCenterModule } from './modules/agent_center.js';
import { WorkflowCenterModule } from './modules/workflow_center.js';
import { PublishingCenterModule } from './modules/publishing_center.js';

import { ColoringModule } from './modules/coloring.js';
import { ColoringAgentModule } from './modules/coloring_agent.js';
import { ColoringBookBuilderModule } from './modules/coloring_book_builder.js';
import { ColoringReviewModule } from './modules/coloring_review.js';

import { TestBookCenterModule } from './modules/test_book_center.js';
import { MasterTestBookCenterModule } from './modules/master_test_book_center.js';
import { MasterTestBookExportCenterModule } from './modules/master_test_book_export_center.js';

import { ExportCenterModule } from './modules/export_center.js';
import { ReleaseCenterModule } from './modules/release_center.js';

import { CoversModule } from './modules/covers.js';
import { WordSearchModule } from './modules/wordsearch.js';
import { CrosswordModule } from './modules/crossword.js';
import { MandalaModule } from './modules/mandala.js';

import { CulturalAgentModule } from './modules/cultural_agent.js';
import { CulturalBookBuilderModule } from './modules/cultural_book_builder.js';

import { SettingsModule } from './modules/settings.js';

const $ = function(sel, root){ return (root || document).querySelector(sel); };
const $$ = function(sel, root){ return Array.from((root || document).querySelectorAll(sel)); };

const BOOT_KEYS = {
  RUNNING: 'bcc:boot:running',
  LAST_OK: 'bcc:boot:last_ok',
  FAIL_COUNT: 'bcc:boot:fail_count',
  LAST_ERROR: 'bcc:boot:last_error'
};

const TOP_LEVEL_VIEWS = [
  'agent_center',
  'workflow_center',
  'publishing_center',
  'coloring',
  'covers',
  'wordsearch',
  'crossword',
  'mandala',
  'cultural',
  'book',
  'settings',
  'help'
];

const SAFE_BOOT_VIEWS = [
  'agent_center',
  'workflow_center',
  'publishing_center',
  'help'
];

const State = {
  themes: null,
  cfg: null,
  activeView: null,
  modules: new Map(),
  moduleFactories: new Map(),
  modulePromises: new Map(),
  toastTimer: null,
  app: null
};

function normalizeConfig(cfg){
  var safe = cfg && typeof cfg === 'object' ? cfg : {};
  var base = String(safe.baseUrl || safe.comfyBase || '').trim();

  return Object.assign({}, safe, {
    baseUrl: base,
    comfyBase: base,
    lastView: String(safe.lastView || '').trim()
  });
}

function escapeHtml(s){
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

function clone(v){
  try { return JSON.parse(JSON.stringify(v)); }
  catch (e) { return v; }
}

function uiStatus(text, kind){
  var el = $('#uiStatus');
  if (!el) return;
  el.textContent = text;
  el.classList.remove('ok','warn','bad');
  el.classList.add(kind || 'ok');
}

function toast(msg, type){
  var el = $('#toast');
  if (!el) return;

  el.hidden = false;
  el.textContent = msg;
  el.className = 'toast show ' + (type || 'info');

  clearTimeout(State.toastTimer);
  State.toastTimer = setTimeout(function(){
    el.classList.remove('show');
    el.hidden = true;
  }, 2600);
}

function log(line){
  var el = $('#log');
  if (!el) return;

  var txt = typeof line === 'string' ? line : JSON.stringify(line, null, 2);
  el.textContent += txt + '\n';
  el.scrollTop = el.scrollHeight;
}

function logBootStep(step, extra){
  if (extra) log('[BOOT STEP] ' + step + ' — ' + extra);
  else log('[BOOT STEP] ' + step);
}

function safeClipboardCopy(text){
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }

  return new Promise(function(resolve, reject){
    try {
      var ta = document.createElement('textarea');
      ta.value = text || '';
      ta.setAttribute('readonly','readonly');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      resolve(true);
    } catch (e) {
      reject(e);
    }
  });
}

function markBootStart(){
  safeSessionSet(BOOT_KEYS.RUNNING, new Date().toISOString());
}

function markBootSuccess(){
  safeSessionRemove(BOOT_KEYS.RUNNING);
  safeSessionSet(BOOT_KEYS.LAST_OK, new Date().toISOString());
  safeSessionSet(BOOT_KEYS.FAIL_COUNT, '0');
  safeSessionRemove(BOOT_KEYS.LAST_ERROR);
}

function markBootFailure(err){
  var current = toIntSafe(safeSessionGet(BOOT_KEYS.FAIL_COUNT, '0'), 0);
  safeSessionSet(BOOT_KEYS.FAIL_COUNT, String(current + 1));
  safeSessionSet(BOOT_KEYS.LAST_ERROR, String((err && err.stack) || err || 'unknown error'));
}

function recoverFromStuckBoot(){
  var hadRunning = !!safeSessionGet(BOOT_KEYS.RUNNING, '');
  if (!hadRunning) return false;

  try {
    safeSessionRemove(BOOT_KEYS.RUNNING);
    recoverRuntimeState();
  } catch (e) {}

  return true;
}

async function loadThemes(){
  var res = await fetch('./data/themes.json', { cache:'no-cache' });
  if (!res.ok) throw new Error('Falha ao carregar themes.json');
  return await res.json();
}

function mergeConfig(patch){
  var current = normalizeConfig(State.cfg || Storage.get('config', {}));
  var next = normalizeConfig(Object.assign({}, current, patch || {}));
  State.cfg = next;
  Storage.set('config', next);
}

function getConfig(){
  State.cfg = normalizeConfig(State.cfg || Storage.get('config', {}));
  return State.cfg;
}

function setConfig(patch){
  mergeConfig(patch || {});
  return getConfig();
}

function buildExportDump(){
  var keys = [];
  var data = {};
  var i;
  var k;

  try { keys = Storage.listKeys(); }
  catch (e) { keys = []; }

  for (i = 0; i < keys.length; i += 1){
    k = keys[i];
    try { data[k] = Storage.get(k, null); }
    catch (e2) { data[k] = null; }
  }

  return {
    exportedAt: new Date().toISOString(),
    config: clone(getConfig()),
    data: data
  };
}

function downloadJson(filename, obj){
  var blob = new Blob([JSON.stringify(obj, null, 2)], { type:'application/json' });
  var a = document.createElement('a');

  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();

  setTimeout(function(){
    try { URL.revokeObjectURL(a.href); } catch (e) {}
  }, 5000);
}

function exportAll(){
  var dump = buildExportDump();

  try {
    downloadJson('brightcup-backup-' + Date.now() + '.json', dump);
    toast('Backup exportado ✅', 'ok');
  } catch (e) {
    log('[EXPORT ERROR] ' + String((e && e.stack) || e));
    toast('Falha ao exportar backup', 'bad');
  }

  return dump;
}

function importAll(payload){
  var src = payload && typeof payload === 'object' ? payload : null;
  var data;
  var keys;
  var i;
  var k;

  if (!src) throw new Error('Payload de importação inválido.');

  data = src.data && typeof src.data === 'object' ? src.data : src;
  keys = Object.keys(data);

  for (i = 0; i < keys.length; i += 1){
    k = keys[i];
    Storage.set(k, data[k]);
  }

  if (src.config && typeof src.config === 'object') {
    Storage.set('config', normalizeConfig(src.config));
  }

  State.cfg = normalizeConfig(Storage.get('config', {}));
  toast('Backup importado ✅', 'ok');
  return true;
}

function resetAll(){
  var keys = [];
  var i;

  try { keys = Storage.listKeys(); }
  catch (e) { keys = []; }

  for (i = 0; i < keys.length; i += 1){
    try { Storage.del(keys[i]); } catch (e2) {}
  }

  State.cfg = normalizeConfig({});
  toast('Dados resetados ✅', 'ok');
  return true;
}

function helpRender(root){
  root.innerHTML = `
    <div class="grid">
      <div class="card">
        <h2>Ajuda rápida</h2>
        <p class="muted">
          Fluxo principal:<br/>
          Agent Center → Workflow Center → Publishing Center
          <br/><br/>
          No fluxo de coloring, a execução passa por Coloring Builder e Coloring Review antes da publicação.
        </p>
      </div>
    </div>
  `;
}

function navOpen(on){
  document.body.classList.toggle('nav-open', !!on);
}
function navToggle(){ navOpen(!document.body.classList.contains('nav-open')); }
function navClose(){ navOpen(false); }

function bindNavClicks(){
  $$('.navitem').forEach(function(btn){
    if (btn.__bccNavBound) return;
    btn.__bccNavBound = true;

    btn.addEventListener('click', function(){
      routeTo(btn.dataset.view).catch(function(){});
      navClose();
    });
  });
}

function ensureNavItem(viewId, label, afterView){
  var existing = document.querySelector('.navitem[data-view="' + viewId + '"]');
  if (existing) return;

  var anchor = afterView ? document.querySelector('.navitem[data-view="' + afterView + '"]') : null;
  var parent = anchor ? anchor.parentNode : null;

  if (!parent) {
    var any = document.querySelector('.navitem');
    parent = any ? any.parentNode : null;
  }

  if (!parent) return;

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'navitem';
  btn.dataset.view = viewId;
  btn.textContent = label;

  if (anchor && anchor.nextSibling) parent.insertBefore(btn, anchor.nextSibling);
  else parent.appendChild(btn);
}

function ensureDynamicNavItems(){
  ensureNavItem('agent_center', 'Agent Center');
  ensureNavItem('workflow_center', 'Workflow Center', 'agent_center');
  ensureNavItem('publishing_center', 'Publishing Center', 'workflow_center');

  ensureNavItem('coloring', 'Coloring');
  ensureNavItem('covers', 'Covers');
  ensureNavItem('wordsearch', 'Word Search');
  ensureNavItem('crossword', 'Crossword');
  ensureNavItem('mandala', 'Mandala');
  ensureNavItem('cultural', 'Cultural');
  ensureNavItem('book', 'Book');
  ensureNavItem('settings', 'Settings');
  ensureNavItem('help', 'Help');
}

function mountNav(){
  ensureDynamicNavItems();
  bindNavClicks();

  var btnHelp = $('#btnHelp');
  if (btnHelp && !btnHelp.__bccBound){
    btnHelp.__bccBound = true;
    btnHelp.addEventListener('click', function(){
      routeTo('help').catch(function(){});
      navClose();
    });
  }

  var btnExport = $('#btnExport');
  if (btnExport && !btnExport.__bccBound){
    btnExport.__bccBound = true;
    btnExport.addEventListener('click', function(){
      exportAll();
    });
  }

  var btnClear = $('#btnClear');
  if (btnClear && !btnClear.__bccBound){
    btnClear.__bccBound = true;
    btnClear.addEventListener('click', function(){
      var el = $('#log');
      if (el) el.textContent = '';
    });
  }

  var btnCopyLog = $('#btnCopyLog');
  if (btnCopyLog && !btnCopyLog.__bccBound){
    btnCopyLog.__bccBound = true;
    btnCopyLog.addEventListener('click', function(){
      safeClipboardCopy((($('#log') && $('#log').textContent) || ''))
        .then(function(){ toast('Logs copiados ✅','ok'); })
        .catch(function(){ toast('Falha ao copiar logs','bad'); });
    });
  }

  var btnMenu = $('#btnMenu');
  if (btnMenu && !btnMenu.__bccBound){
    btnMenu.__bccBound = true;
    btnMenu.addEventListener('click', navToggle);
  }

  var navOverlay = $('#navOverlay');
  if (navOverlay && !navOverlay.__bccBound){
    navOverlay.__bccBound = true;
    navOverlay.addEventListener('click', navClose);
  }
}

function setActiveNav(viewId){
  $$('.navitem').forEach(function(b){
    b.classList.toggle('active', b.dataset.view === viewId);
  });
}

function renderViewError(root, err, title){
  root.innerHTML = `
    <div class="card">
      <h2>${escapeHtml(title || 'Erro ao renderizar')}</h2>
      <pre class="log">${escapeHtml(String((err && err.stack) || err || 'Erro desconhecido'))}</pre>
    </div>
  `;
}

async function initModule(id, mod){
  State.modules.set(id, mod);
  logBootStep('init module', id);

  if (mod && typeof mod.init === 'function'){
    try {
      await mod.init();
      logBootStep('init module ok', id);
    } catch (e) {
      log('[MODULE INIT ERROR][' + id + '] ' + String((e && e.stack) || e));
      logBootStep('init module failed', id);
    }
  } else {
    logBootStep('init module ok', id);
  }
}

function registerModuleFactories(app){
  State.moduleFactories.clear();

  State.moduleFactories.set('coloring', function(){ return new ColoringModule(app); });
  State.moduleFactories.set('coloring_agent', function(){ return new ColoringAgentModule(app); });
  State.moduleFactories.set('coloring_book', function(){ return new ColoringBookBuilderModule(app); });
  State.moduleFactories.set('coloring_review', function(){ return new ColoringReviewModule(app); });

  State.moduleFactories.set('test_book_center', function(){ return new TestBookCenterModule(app); });
  State.moduleFactories.set('master_test_book_center', function(){ return new MasterTestBookCenterModule(app); });
  State.moduleFactories.set('master_test_book_export_center', function(){ return new MasterTestBookExportCenterModule(app); });

  State.moduleFactories.set('export_center', function(){ return new ExportCenterModule(app); });
  State.moduleFactories.set('release_center', function(){ return new ReleaseCenterModule(app); });

  State.moduleFactories.set('covers', function(){ return new CoversModule(app); });
  State.moduleFactories.set('wordsearch', function(){ return new WordSearchModule(app); });
  State.moduleFactories.set('crossword', function(){ return new CrosswordModule(app); });
  State.moduleFactories.set('mandala', function(){ return new MandalaModule(app); });

  State.moduleFactories.set('cultural', function(){ return new CulturalAgentModule(app); });
  State.moduleFactories.set('book', function(){ return new CulturalBookBuilderModule(app); });
}

function hasRouteAvailable(viewId){
  if (!viewId) return false;
  if (viewId === 'help') return true;
  if (State.modules.has(viewId)) return true;
  if (State.moduleFactories.has(viewId)) return true;
  return false;
}

function isSafeBootView(viewId){
  return SAFE_BOOT_VIEWS.indexOf(viewId) !== -1;
}

async function ensureModuleReady(id){
  if (!id || id === 'help') return null;

  if (State.modules.has(id)) return State.modules.get(id);

  if (State.modulePromises.has(id)) {
    return State.modulePromises.get(id);
  }

  if (!State.moduleFactories.has(id)) return null;

  log('[LAZY MODULE] preparing ' + id);

  var promise = (async function(){
    try {
      var factory = State.moduleFactories.get(id);
      if (typeof factory !== 'function') {
        throw new Error('Factory not found for ' + id);
      }

      var mod = factory();
      await initModule(id, mod);
      log('[LAZY MODULE] ready ' + id);
      return State.modules.get(id) || mod;
    } catch (e) {
      log('[LAZY MODULE ERROR][' + id + '] ' + String((e && e.stack) || e));
      throw e;
    } finally {
      State.modulePromises.delete(id);
    }
  })();

  State.modulePromises.set(id, promise);
  return promise;
}

async function routeTo(viewId){
  var root = $('#view');
  var chosen = viewId || 'workflow_center';

  State.activeView = chosen;
  mergeConfig({ lastView: chosen });
  setActiveNav(chosen);

  safeSessionSet('bcc:last_route_attempt', chosen);

  if (!root) return false;

  if (chosen === 'help'){
    helpRender(root);
    return true;
  }

  try {
    safeSessionSet('bcc:view:rendering', chosen);

    var mod = await ensureModuleReady(chosen);

    if (!mod){
      safeSessionRemove('bcc:view:rendering');
      root.innerHTML = '<div class="card"><h2>View não encontrada</h2><p class="muted">' + escapeHtml(chosen) + '</p></div>';
      return false;
    }

    if (typeof mod.render !== 'function') {
      throw new Error('Módulo sem render().');
    }

    mod.render(root);

    if (typeof mod.onShow === 'function') mod.onShow();

    safeSessionRemove('bcc:view:rendering');
    safeSessionRemove('bcc:last_render_error');
    return true;

  } catch (e) {
    console.error(e);
    safeSessionSet('bcc:last_render_error', String((e && e.stack) || e || 'route render error'));
    safeSessionRemove('bcc:view:rendering');
    log('[ROUTE ERROR][' + chosen + '] ' + String((e && e.stack) || e));
    renderViewError(root, e, 'Erro ao abrir view');
    toast('Erro ao renderizar view', 'bad');
    throw e;
  }
}

function getSafeStartView(){
  var last = getConfig().lastView;
  log('[SAFE BOOT] lastView=' + (last || ''));

  if (last && isSafeBootView(last) && hasRouteAvailable(last)) {
    log('[SAFE BOOT] lastView accepted');
    return last;
  }

  if (last && !isSafeBootView(last)) {
    log('[SAFE BOOT] lastView=' + last + ' rejected');
  }

  if (hasRouteAvailable('workflow_center')) {
    log('[SAFE BOOT] using workflow_center');
    return 'workflow_center';
  }

  if (hasRouteAvailable('agent_center')) {
    log('[SAFE BOOT] using agent_center');
    return 'agent_center';
  }

  if (hasRouteAvailable('publishing_center')) {
    log('[SAFE BOOT] using publishing_center');
    return 'publishing_center';
  }

  log('[SAFE BOOT] using help');
  return 'help';
}

function resolveSafeBootStartView(){
  var preferred = getSafeStartView();
  var finalView = preferred;

  log('[BOOT ROUTE] preferred=' + preferred);

  var snapshot;
  try {
    snapshot = buildBootRecoverySnapshot();
    log('[BOOT RECOVERY SNAPSHOT] ' + JSON.stringify(snapshot));
  } catch(e){
    log('[BOOT SNAPSHOT ERROR] ' + String(e));
    snapshot = null;
  }

  if (snapshot) {
    if (snapshot.routing && snapshot.routing.shouldAvoidLastRoute === true){
      log('[BOOT ROUTE] avoiding preferred route due to snapshot');
    }

    if (snapshot.safety && snapshot.safety.safeToOpenPreferredRoute === false){
      log('[BOOT ROUTE] preferred route not safe');
    }

    if (
      snapshot.routing &&
      (snapshot.routing.shouldAvoidLastRoute === true ||
       (snapshot.safety && snapshot.safety.safeToOpenPreferredRoute === false))
    ){
      var suggested = snapshot.routing.suggestedSafeRoute;

      if (suggested && isSafeBootView(suggested) && hasRouteAvailable(suggested)){
        log('[BOOT ROUTE] using suggested safe route=' + suggested);
        finalView = suggested;
      } else if (hasRouteAvailable('workflow_center')){
        log('[BOOT ROUTE] fallback workflow_center');
        finalView = 'workflow_center';
      } else if (hasRouteAvailable('agent_center')){
        log('[BOOT ROUTE] fallback agent_center');
        finalView = 'agent_center';
      } else if (hasRouteAvailable('publishing_center')){
        log('[BOOT ROUTE] fallback publishing_center');
        finalView = 'publishing_center';
      } else {
        log('[BOOT ROUTE] final fallback help');
        finalView = 'help';
      }
    }
  }

  if (!isSafeBootView(finalView) || !hasRouteAvailable(finalView)) {
    if (hasRouteAvailable('workflow_center')) finalView = 'workflow_center';
    else if (hasRouteAvailable('agent_center')) finalView = 'agent_center';
    else if (hasRouteAvailable('publishing_center')) finalView = 'publishing_center';
    else finalView = 'help';
  }

  log('[SAFE BOOT] final route=' + finalView);
  return finalView;
}

function hasRenderableViewContent(root){
  if (!root) return false;
  if (typeof root.innerHTML !== 'string') return false;
  return root.innerHTML.trim().length > 0;
}

document.addEventListener('bcc:navigate', function(e){
  try {
    if (!e || !e.detail) return;
    var view = e.detail.view;
    if (!view) return;
    routeTo(view).catch(function(){});
  } catch (err) {}
});

window.routeTo = routeTo;

window.addEventListener('error', function(e){
  try {
    log('[WINDOW ERROR] ' + String((e && (e.error && e.error.stack || e.message)) || 'Unknown window error'));
  } catch (err) {}
});

window.addEventListener('unhandledrejection', function(e){
  try {
    var reason = e && e.reason ? e.reason : 'Unhandled rejection';
    log('[UNHANDLED REJECTION] ' + String((reason && reason.stack) || reason));
  } catch (err) {}
});

async function boot(){
  uiStatus('BOOT', 'warn');
  log('[BOOT] ' + new Date().toISOString());

  try {

    if (recoverFromStuckBoot()) {
      log('[BOOT RECOVERY] Recovered from stuck boot marker');
      try {
        log('[RUNTIME DIAGNOSTIC] ' + JSON.stringify(buildRuntimeDiagnostic()));
      } catch (eDiag) {
        log('[RUNTIME DIAGNOSTIC] unavailable');
      }
    }

    try {
      var guardDiag = buildBootCacheDiagnostic();
      log('[BOOT CACHE GUARD DIAG] ' + JSON.stringify(guardDiag));

      var shouldRun = shouldRunBootCacheGuard();
      log('[BOOT CACHE GUARD] should_run=' + shouldRun);

      if (shouldRun) {
        var guardResult = await runBootCacheGuard();
        log('[BOOT CACHE GUARD RESULT] ' + JSON.stringify(guardResult));
      }
    } catch (guardErr) {
      log('[BOOT CACHE GUARD ERROR] ' + String((guardErr && guardErr.stack) || guardErr));
    }

    markBootStart();

    logBootStep('service worker');
    if ('serviceWorker' in navigator){
      try { await navigator.serviceWorker.register('./sw.js'); }
      catch (e) { log('[SW WARN] ' + String((e && e.message) || e)); }
    }

    logBootStep('themes load');
    try {
      State.themes = await loadThemes();
      logBootStep('themes loaded');
    } catch (e) {
      State.themes = {};
      log('[THEMES WARN] ' + String((e && e.message) || e));
      logBootStep('themes fallback');
    }

    logBootStep('config load');
    State.cfg = normalizeConfig(Storage.get('config', {}));
    logBootStep('config loaded');

    var app = {
      themes: State.themes,
      promptEngine: new PromptEngine(State.themes || {}),
      comfy: new ComfyClient(function(){
        var cfg = getConfig();
        return String(cfg.baseUrl || cfg.comfyBase || '').trim();
      }),
      toast: toast,
      log: log,
      routeTo: routeTo,
      getConfig: getConfig,
      setConfig: setConfig,
      buildExportDump: buildExportDump,
      downloadJson: downloadJson,
      exportAll: exportAll,
      importAll: importAll,
      resetAll: resetAll
    };

    State.app = app;
    registerModuleFactories(app);

    await initModule('agent_center', new AgentCenterModule(app));
    await initModule('workflow_center', new WorkflowCenterModule(app));
    await initModule('publishing_center', new PublishingCenterModule(app));
    await initModule('settings', new SettingsModule(app));

    logBootStep('nav mount');
    mountNav();
    logBootStep('nav mounted');

    uiStatus('READY', 'ok');

    var startView = resolveSafeBootStartView();
    logBootStep('start view chosen', startView);

    await routeTo(startView);

    var root = $('#view');
    if (!hasRenderableViewContent(root)) {
      log('[BOOT FALLBACK] Empty initial view detected');

      if (startView !== 'agent_center' && hasRouteAvailable('agent_center')) {
        log('[BOOT FALLBACK] Switching to agent_center');
        await routeTo('agent_center');
      }

      if (!hasRenderableViewContent(root)) {
        log('[BOOT FALLBACK] Switching to help');
        await routeTo('help');
      }
    }

    markBootSuccess();
    logBootStep('boot success');

    toast('Pronto ✅', 'ok');

  } catch (e) {
    console.error(e);
    markBootFailure(e);
    uiStatus('ERROR', 'bad');
    toast('Erro no boot', 'bad');
    log('[BOOT ERROR] ' + String((e && e.stack) || e));

    var root = $('#view');
    if (root){
      renderViewError(root, e, 'Erro no boot');
    }
  }
}

boot();
