/* FILE: /js/app.js */
// Bright Cup Creator — /js/app.js
// Patch de integração do Coloring Agent
// - integra /js/modules/coloring_agent.js
// - mantém boot defensivo
// - mantém compatibilidade com módulos estáveis
// - Comfy permanece como legado/compat, não como fluxo principal

import { Storage } from './core/storage.js';
import { PromptEngine } from './core/prompt_engine.js';
import { ComfyClient } from './core/comfy_client.js';

import { ColoringModule } from './modules/coloring.js';
import { ColoringAgentModule } from './modules/coloring_agent.js';
import { CoversModule } from './modules/covers.js';
import { WordSearchModule } from './modules/wordsearch.js';
import { CrosswordModule } from './modules/crossword.js';
import { MandalaModule } from './modules/mandala.js';
import { SettingsModule } from './modules/settings.js';
import { CulturalAgentModule } from './modules/cultural_agent.js';
import { CulturalBookBuilderModule } from './modules/cultural_book_builder.js';

const $ = function(sel, root){ return (root || document).querySelector(sel); };
const $$ = function(sel, root){ return Array.from((root || document).querySelectorAll(sel)); };

const State = {
  themes: null,
  cfg: normalizeConfig(Storage.get('config', {})),
  activeView: null,
  modules: new Map(),
  toastTimer: null
};

function normalizeConfig(cfg){
  var safe = cfg && typeof cfg === 'object' ? cfg : {};
  var base = String(safe.baseUrl || safe.comfyBase || '').trim();

  return Object.assign({}, safe, {
    baseUrl: base,
    comfyBase: base
  });
}

function uiStatus(text, kind){
  var el = $('#uiStatus');
  if (!el) return;
  el.textContent = text;
  el.classList.remove('ok', 'warn', 'bad');
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

async function loadThemes(){
  var res = await fetch('./data/themes.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('Falha ao carregar themes.json');
  return await res.json();
}

function mergeConfig(patch){
  var next = normalizeConfig(Object.assign({}, State.cfg || {}, patch || {}));
  State.cfg = next;
  Storage.set('config', next);

  try {
    localStorage.setItem(Storage.prefix + 'comfy:base_url', JSON.stringify(next.baseUrl || ''));
  } catch (e) {}
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
  var keys = Storage.listKeys();
  var data = {};
  var i, k;

  for (i = 0; i < keys.length; i += 1){
    k = keys[i];
    data[k] = Storage.get(k, null);
  }

  return {
    exportedAt: new Date().toISOString(),
    data: data
  };
}

function downloadJson(filename, obj){
  var blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();

  setTimeout(function(){
    URL.revokeObjectURL(a.href);
  }, 5000);
}

function exportAll(){
  var dump = buildExportDump();

  try {
    downloadJson('brightcup-backup-' + Date.now() + '.json', dump);
    toast('Backup exportado ✅', 'ok');
  } catch (e) {
    toast('Falha ao exportar backup', 'err');
    log('[EXPORT ERROR] ' + String((e && e.stack) || e));
  }

  return dump;
}

function importAll(payload){
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payload de importação inválido.');
  }

  var data = payload.data && typeof payload.data === 'object' ? payload.data : payload;
  var keys = Object.keys(data);
  var i, k;

  for (i = 0; i < keys.length; i += 1){
    k = keys[i];
    Storage.set(k, data[k]);
  }

  var importedCfg = Storage.get('config', {});
  State.cfg = normalizeConfig(importedCfg);
  Storage.set('config', State.cfg);

  try {
    localStorage.setItem(Storage.prefix + 'comfy:base_url', JSON.stringify(State.cfg.baseUrl || ''));
  } catch (e) {}

  toast('Backup importado ✅', 'ok');
  return true;
}

function resetAll(){
  var keys = Storage.listKeys();
  var i;

  for (i = 0; i < keys.length; i += 1){
    Storage.del(keys[i]);
  }

  try {
    localStorage.removeItem(Storage.prefix + 'comfy:base_url');
  } catch (e) {}

  State.cfg = normalizeConfig({});
  State.activeView = null;
  toast('Dados resetados ✅', 'ok');
  return true;
}

function helpRender(root){
  root.innerHTML = `
    <div class="grid">
      <div class="card">
        <h2>Ajuda rápida</h2>
        <p class="muted">
          Linha Cultural Brasil: <b>Cultural Agent</b> → gerar plano → <b>Livro (Builder)</b>.
          <br/><br/>
          Linha Coloring: <b>Coloring Agent</b> → planejar cenas → evoluir para geração e validação.
          <br/><br/>
          O fluxo legado de imagem externa continua apenas como compatibilidade temporária.
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

function ensureColoringAgentNav(){
  var existing = document.querySelector('.navitem[data-view="coloring_agent"]');
  if (existing) return;

  var anchor = document.querySelector('.navitem[data-view="coloring"]');
  var parent = anchor ? anchor.parentNode : null;

  if (!parent) {
    var any = document.querySelector('.navitem');
    parent = any ? any.parentNode : null;
  }

  if (!parent) return;

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'navitem';
  btn.dataset.view = 'coloring_agent';
  btn.textContent = 'Coloring Agent';

  if (anchor && anchor.nextSibling) parent.insertBefore(btn, anchor.nextSibling);
  else parent.appendChild(btn);
}

function mountNav(){
  ensureColoringAgentNav();
  bindNavClicks();

  var btnHelp = $('#btnHelp');
  if (btnHelp && !btnHelp.__bccBound) {
    btnHelp.__bccBound = true;
    btnHelp.addEventListener('click', function(){
      routeTo('help');
      navClose();
    });
  }

  var btnExport = $('#btnExport');
  if (btnExport && !btnExport.__bccBound) {
    btnExport.__bccBound = true;
    btnExport.addEventListener('click', function(){
      exportAll();
    });
  }

  var btnClear = $('#btnClear');
  if (btnClear && !btnClear.__bccBound) {
    btnClear.__bccBound = true;
    btnClear.addEventListener('click', function(){
      var el = $('#log');
      if (el) el.textContent = '';
    });
  }

  var btnCopyLog = $('#btnCopyLog');
  if (btnCopyLog && !btnCopyLog.__bccBound) {
    btnCopyLog.__bccBound = true;
    btnCopyLog.addEventListener('click', async function(){
      try {
        await safeClipboardCopy(($('#log') && $('#log').textContent) || '');
        toast('Logs copiados ✅', 'ok');
      } catch (e) {
        toast('Falha ao copiar logs', 'err');
      }
    });
  }

  var btnMenu = $('#btnMenu');
  if (btnMenu && !btnMenu.__bccBound) {
    btnMenu.__bccBound = true;
    btnMenu.addEventListener('click', function(){
      navToggle();
    });
  }

  var navOverlay = $('#navOverlay');
  if (navOverlay && !navOverlay.__bccBound) {
    navOverlay.__bccBound = true;
    navOverlay.addEventListener('click', function(){
      navClose();
    });
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
  var chosen = viewId || 'coloring_agent';

  State.activeView = chosen;
  mergeConfig({ lastView: chosen });
  setActiveNav(chosen);

  if (!root) return;

  if (chosen === 'help') {
    helpRender(root);
    return;
  }

  var mod = State.modules.get(chosen);

  if (!mod) {
    root.innerHTML = '<div class="card"><h2>View não encontrada</h2><p class="muted">' + escapeHtml(chosen) + '</p></div>';
    return;
  }

  try {
    if (typeof mod.render !== 'function') {
      throw new Error('Módulo sem render().');
    }

    mod.render(root);

    if (typeof mod.onShow === 'function') {
      mod.onShow();
    }
  } catch (e) {
    console.error(e);
    log('[ROUTE ERROR][' + chosen + '] ' + String((e && e.stack) || e));
    renderViewError(root, e, 'Erro ao abrir view');
    toast('Erro ao renderizar view', 'err');
  }
}

function getSafeStartView(){
  var last = getConfig().lastView || 'coloring_agent';
  if (last === 'help') return 'help';
  if (State.modules.has(last)) return last;

  if (State.modules.has('coloring_agent')) return 'coloring_agent';
  if (State.modules.has('cultural')) return 'cultural';
  if (State.modules.has('coloring')) return 'coloring';

  return 'help';
}

async function initModule(id, mod){
  State.modules.set(id, mod);

  if (mod && typeof mod.init === 'function') {
    try {
      await mod.init();
    } catch (e) {
      log('[MODULE INIT ERROR][' + id + '] ' + String((e && e.stack) || e));
    }
  }
}

async function boot(){
  uiStatus('BOOT', 'warn');
  log('[BOOT] ' + new Date().toISOString());

  try {
    if ('serviceWorker' in navigator) {
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

    var app = {
      themes: State.themes,
      promptEngine: new PromptEngine(State.themes || {}),
      comfy: new ComfyClient(function(){
        var cfg = getConfig();
        return String(cfg.baseUrl || cfg.comfyBase || '').trim();
      }),
      toast: toast,
      log: log,
      getConfig: getConfig,
      setConfig: setConfig,
      exportAll: exportAll,
      importAll: importAll,
      resetAll: resetAll,
      saveProject: function(obj){
        Storage.set('project:last', obj);
        toast('Projeto salvo ✅', 'ok');
      }
    };

    await initModule('coloring_agent', new ColoringAgentModule(app));
    await initModule('coloring', new ColoringModule(app));
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
    toast('Pronto ✅', 'ok');
  } catch (e) {
    console.error(e);
    uiStatus('ERROR', 'bad');
    toast('Erro no boot: ' + ((e && e.message) || e), 'err');
    log('[BOOT ERROR] ' + String((e && e.stack) || e));

    var root = $('#view');
    if (root) {
      renderViewError(root, e, 'Erro no boot');
    }
  }
}

function escapeHtml(s){
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

boot();
