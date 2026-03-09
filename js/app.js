/* FILE: /js/app.js */
// Bright Cup Creator — /js/app.js
// Boot defensivo + orquestração principal da árvore atual
// Safari/iPhone/PWA safe

import { Storage } from './core/storage.js';
import { PromptEngine } from './core/prompt_engine.js';
import { ComfyClient } from './core/comfy_client.js';

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

const State = {
  themes: null,
  cfg: null,
  activeView: null,
  modules: new Map(),
  toastTimer: null
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
  try {
    return JSON.parse(JSON.stringify(v));
  } catch (e) {
    return v;
  }
}

function safeSessionGet(key, fallback){
  try {
    var raw = sessionStorage.getItem(key);
    return raw == null ? fallback : raw;
  } catch (e) {
    return fallback;
  }
}

function safeSessionSet(key, value){
  try {
    sessionStorage.setItem(key, String(value));
  } catch (e) {}
}

function safeSessionRemove(key){
  try {
    sessionStorage.removeItem(key);
  } catch (e) {}
}

function safeLocalRemove(key){
  try {
    localStorage.removeItem(key);
  } catch (e) {}
}

function toIntSafe(v, fallback){
  var n = parseInt(v, 10);
  if (!isFinite(n)) return typeof fallback === 'number' ? fallback : 0;
  return n;
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

    safeSessionRemove('bcc:view:rendering');
    safeSessionRemove('bcc:view:pending');
    safeSessionRemove('bcc:navigation:pending');
    safeSessionRemove('bcc:last_route_attempt');
    safeSessionRemove('bcc:last_render_error');

    safeLocalRemove('bcc:view:rendering');
    safeLocalRemove('bcc:view:pending');
    safeLocalRemove('bcc:navigation:pending');
    safeLocalRemove('bcc:last_route_attempt');
    safeLocalRemove('bcc:last_render_error');
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

  try {
    keys = Storage.listKeys();
  } catch (e) {
    keys = [];
  }

  for (i = 0; i < keys.length; i += 1){
    k = keys[i];
    try {
      data[k] = Storage.get(k, null);
    } catch (e2) {
      data[k] = null;
    }
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

  if (!src) {
    throw new Error('Payload de importação inválido.');
  }

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

  try {
    keys = Storage.listKeys();
  } catch (e) {
    keys = [];
  }

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
          Agent Center → Workflow Center → Publishing Center → Export/Release
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
function navToggle(){
  navOpen(!document.body.classList.contains('nav-open'));
}
function navClose(){
  navOpen(false);
}

function safeClipboardCopy(text){
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }

  return new Promise(function(resolve, reject){
    try {
      var ta = document.createElement('textarea');
      ta.value = text || '';
      ta.setAttribute('readonly', 'readonly');
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

function bindNavClicks(){
  $$('.navitem').forEach(function(btn){
    if (btn.__bccNavBound) return;
    btn.__bccNavBound = true;

    btn.addEventListener('click', function(){
      routeTo(btn.dataset.view);
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

  ensureNavItem('coloring_agent', 'Coloring Agent', 'publishing_center');
  ensureNavItem('coloring_book', 'Coloring Builder', 'coloring_agent');
  ensureNavItem('coloring_review', 'Coloring Review', 'coloring_book');
  ensureNavItem('test_book_center', 'Test Book Center', 'coloring_review');
  ensureNavItem('master_test_book_center', 'Master Test Book Center', 'test_book_center');
  ensureNavItem('master_test_book_export_center', 'Master Test Book Export Center', 'master_test_book_center');
  ensureNavItem('export_center', 'Export Center', 'master_test_book_export_center');
  ensureNavItem('release_center', 'Release Center', 'export_center');
}

function mountNav(){
  ensureDynamicNavItems();
  bindNavClicks();

  var btnHelp = $('#btnHelp');
  if (btnHelp && !btnHelp.__bccBound){
    btnHelp.__bccBound = true;
    btnHelp.addEventListener('click', function(){
      routeTo('help');
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
        .then(function(){
          toast('Logs copiados ✅', 'ok');
        })
        .catch(function(){
          toast('Falha ao copiar logs', 'bad');
        });
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

function routeTo(viewId){
  var root = $('#view');
  var chosen = viewId || 'workflow_center';

  State.activeView = chosen;
  mergeConfig({ lastView: chosen });
  setActiveNav(chosen);

  safeSessionSet('bcc:last_route_attempt', chosen);

  if (!root) return;

  if (chosen === 'help'){
    helpRender(root);
    return;
  }

  var mod = State.modules.get(chosen);

  if (!mod){
    root.innerHTML = '<div class="card"><h2>View não encontrada</h2><p class="muted">' + escapeHtml(chosen) + '</p></div>';
    return;
  }

  try {
    safeSessionSet('bcc:view:rendering', chosen);

    if (typeof mod.render !== 'function') {
      throw new Error('Módulo sem render().');
    }

    mod.render(root);

    if (typeof mod.onShow === 'function') {
      mod.onShow();
    }

    safeSessionRemove('bcc:view:rendering');
    safeSessionRemove('bcc:last_render_error');
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

  if (last && State.modules.has(last)) return last;

  if (State.modules.has('workflow_center')) return 'workflow_center';
  if (State.modules.has('publishing_center')) return 'publishing_center';
  if (State.modules.has('agent_center')) return 'agent_center';
  if (State.modules.has('release_center')) return 'release_center';
  if (State.modules.has('master_test_book_export_center')) return 'master_test_book_export_center';
  if (State.modules.has('master_test_book_center')) return 'master_test_book_center';
  if (State.modules.has('test_book_center')) return 'test_book_center';
  if (State.modules.has('coloring_review')) return 'coloring_review';
  if (State.modules.has('coloring_book')) return 'coloring_book';
  if (State.modules.has('coloring_agent')) return 'coloring_agent';
  if (State.modules.has('cultural')) return 'cultural';
  if (State.modules.has('book')) return 'book';
  if (State.modules.has('coloring')) return 'coloring';
  return 'help';
}

async function initModule(id, mod){
  State.modules.set(id, mod);

  if (mod && typeof mod.init === 'function'){
    try {
      await mod.init();
    } catch (e) {
      log('[MODULE INIT ERROR][' + id + '] ' + String((e && e.stack) || e));
    }
  }
}

document.addEventListener('bcc:navigate', function(e){
  try {
    if (!e || !e.detail) return;
    var view = e.detail.view;
    if (!view) return;
    routeTo(view);
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
    }

    markBootStart();

    if ('serviceWorker' in navigator){
      try {
        await navigator.serviceWorker.register('./sw.js');
      } catch (e) {
        log('[SW WARN] ' + String((e && e.message) || e));
      }
    }

    try {
      State.themes = await loadThemes();
    } catch (e) {
      State.themes = {};
      log('[THEMES WARN] ' + String((e && e.message) || e));
    }

    State.cfg = normalizeConfig(Storage.get('config', {}));

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

    await initModule('agent_center', new AgentCenterModule(app));
    await initModule('workflow_center', new WorkflowCenterModule(app));
    await initModule('publishing_center', new PublishingCenterModule(app));

    await initModule('coloring', new ColoringModule(app));
    await initModule('coloring_agent', new ColoringAgentModule(app));
    await initModule('coloring_book', new ColoringBookBuilderModule(app));
    await initModule('coloring_review', new ColoringReviewModule(app));

    await initModule('test_book_center', new TestBookCenterModule(app));
    await initModule('master_test_book_center', new MasterTestBookCenterModule(app));
    await initModule('master_test_book_export_center', new MasterTestBookExportCenterModule(app));

    await initModule('export_center', new ExportCenterModule(app));
    await initModule('release_center', new ReleaseCenterModule(app));

    await initModule('covers', new CoversModule(app));
    await initModule('wordsearch', new WordSearchModule(app));
    await initModule('crossword', new CrosswordModule(app));
    await initModule('mandala', new MandalaModule(app));

    await initModule('cultural', new CulturalAgentModule(app));
    await initModule('book', new CulturalBookBuilderModule(app));

    await initModule('settings', new SettingsModule(app));

    mountNav();

    uiStatus('READY', 'ok');
    routeTo(getSafeStartView());
    markBootSuccess();
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
