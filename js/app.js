/* FILE: /js/app.js */
// Bright Cup Creator — /js/app.js
// Boot defensivo + navegação alinhada com arquitetura:
// Agent Center → Workflow Center → Publishing Center → Fluxos operacionais
// Safari/iOS/PWA safe

import { Storage } from './core/storage.js';
import { PromptEngine } from './core/prompt_engine.js';
import { ComfyClient } from './core/comfy_client.js';

import { AgentCenterModule } from './modules/agent_center.js';
import { WorkflowCenterModule } from './modules/workflow_center.js';
import { PublishingCenterModule } from './modules/publishing_center.js';

import { ColoringAgentModule } from './modules/coloring_agent.js';
import { ColoringBookBuilderModule } from './modules/coloring_book_builder.js';
import { ColoringReviewModule } from './modules/coloring_review.js';

import { TestBookCenterModule } from './modules/test_book_center.js';
import { MasterTestBookCenterModule } from './modules/master_test_book_center.js';
import { MasterTestBookExportCenterModule } from './modules/master_test_book_export_center.js';

import { ExportCenterModule } from './modules/export_center.js';
import { ReleaseCenterModule } from './modules/release_center.js';

import { CulturalAgentModule } from './modules/cultural_agent.js';
import { CulturalBookBuilderModule } from './modules/cultural_book_builder.js';

import { SettingsModule } from './modules/settings.js';

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

function escapeHtml(s){
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
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
  },2600);
}

function log(line){
  var el = $('#log');
  if (!el) return;

  var txt = typeof line === 'string' ? line : JSON.stringify(line,null,2);
  el.textContent += txt + '\n';
  el.scrollTop = el.scrollHeight;
}

async function loadThemes(){
  var res = await fetch('./data/themes.json',{cache:'no-cache'});
  if (!res.ok) throw new Error('Falha ao carregar themes.json');
  return await res.json();
}

function mergeConfig(patch){
  var next = normalizeConfig(Object.assign({},State.cfg || {},patch || {}));
  State.cfg = next;
  Storage.set('config',next);
}

function getConfig(){
  State.cfg = normalizeConfig(State.cfg || Storage.get('config',{}));
  return State.cfg;
}

function setConfig(patch){
  mergeConfig(patch || {});
  return getConfig();
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
          No fluxo de coloring, a execução passa por Builder e Review antes da etapa de publicação.
        </p>
      </div>
    </div>
  `;
}

function navOpen(on){
  document.body.classList.toggle('nav-open',!!on);
}
function navToggle(){
  navOpen(!document.body.classList.contains('nav-open'));
}
function navClose(){
  navOpen(false);
}

function bindNavClicks(){
  $$('.navitem').forEach(function(btn){
    if (btn.__bccNavBound) return;
    btn.__bccNavBound = true;

    btn.addEventListener('click',function(){
      routeTo(btn.dataset.view);
      navClose();
    });
  });
}

function ensureNavItem(viewId,label,afterView){
  var existing = document.querySelector('.navitem[data-view="'+viewId+'"]');
  if (existing) return;

  var anchor = afterView ? document.querySelector('.navitem[data-view="'+afterView+'"]') : null;
  var parent = anchor ? anchor.parentNode : null;

  if (!parent){
    var any = document.querySelector('.navitem');
    parent = any ? any.parentNode : null;
  }

  if (!parent) return;

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'navitem';
  btn.dataset.view = viewId;
  btn.textContent = label;

  if (anchor && anchor.nextSibling) parent.insertBefore(btn,anchor.nextSibling);
  else parent.appendChild(btn);
}

function ensureDynamicNavItems(){
  ensureNavItem('agent_center','Agent Center');
  ensureNavItem('workflow_center','Workflow Center','agent_center');
  ensureNavItem('publishing_center','Publishing Center','workflow_center');

  ensureNavItem('coloring_book','Coloring Builder','publishing_center');
  ensureNavItem('coloring_review','Coloring Review','coloring_book');
  ensureNavItem('test_book_center','Test Book Center','coloring_review');

  ensureNavItem('export_center','Export Center','test_book_center');
  ensureNavItem('release_center','Release Center','export_center');
}

function mountNav(){
  ensureDynamicNavItems();
  bindNavClicks();

  var btnHelp = $('#btnHelp');
  if (btnHelp && !btnHelp.__bccBound){
    btnHelp.__bccBound = true;
    btnHelp.addEventListener('click',function(){
      routeTo('help');
      navClose();
    });
  }

  var btnMenu = $('#btnMenu');
  if (btnMenu && !btnMenu.__bccBound){
    btnMenu.__bccBound = true;
    btnMenu.addEventListener('click',navToggle);
  }

  var navOverlay = $('#navOverlay');
  if (navOverlay && !navOverlay.__bccBound){
    navOverlay.__bccBound = true;
    navOverlay.addEventListener('click',navClose);
  }
}

function setActiveNav(viewId){
  $$('.navitem').forEach(function(b){
    b.classList.toggle('active',b.dataset.view === viewId);
  });
}

function renderViewError(root,err,title){
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
  mergeConfig({lastView:chosen});
  setActiveNav(chosen);

  if (!root) return;

  if (chosen === 'help'){
    helpRender(root);
    return;
  }

  var mod = State.modules.get(chosen);

  if (!mod){
    root.innerHTML = '<div class="card"><h2>View não encontrada</h2><p class="muted">'+escapeHtml(chosen)+'</p></div>';
    return;
  }

  try{
    mod.render(root);
  }catch(e){
    console.error(e);
    log('[ROUTE ERROR]['+chosen+'] ' + String((e && e.stack) || e));
    renderViewError(root,e,'Erro ao abrir view');
  }
}

function getSafeStartView(){
  var last = getConfig().lastView;

  if (last && State.modules.has(last)) return last;

  if (State.modules.has('workflow_center')) return 'workflow_center';
  if (State.modules.has('publishing_center')) return 'publishing_center';
  if (State.modules.has('agent_center')) return 'agent_center';
  if (State.modules.has('test_book_center')) return 'test_book_center';
  if (State.modules.has('coloring_review')) return 'coloring_review';
  if (State.modules.has('coloring_book')) return 'coloring_book';

  return 'agent_center';
}

async function initModule(id,mod){
  State.modules.set(id,mod);
  if (mod && typeof mod.init === 'function'){
    try{
      await mod.init();
    }catch(e){
      log('[MODULE INIT ERROR]['+id+'] '+String((e && e.stack) || e));
    }
  }
}

document.addEventListener('bcc:navigate',function(e){
  try{
    if (!e || !e.detail) return;
    var view = e.detail.view;
    if (!view) return;
    routeTo(view);
  }catch(err){}
});

async function boot(){
  uiStatus('BOOT','warn');
  log('[BOOT] '+new Date().toISOString());

  try{

    if ('serviceWorker' in navigator){
      try{
        await navigator.serviceWorker.register('./sw.js');
      }catch(e){
        log('[SW WARN] '+String((e && e.message) || e));
      }
    }

    try{
      State.themes = await loadThemes();
    }catch(e){
      State.themes = {};
      log('[THEMES WARN] '+String((e && e.message) || e));
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
      routeTo: routeTo,
      getConfig: getConfig,
      setConfig: setConfig
    };

    await initModule('agent_center',new AgentCenterModule(app));
    await initModule('workflow_center',new WorkflowCenterModule(app));
    await initModule('publishing_center',new PublishingCenterModule(app));

    await initModule('coloring_agent',new ColoringAgentModule(app));
    await initModule('coloring_book',new ColoringBookBuilderModule(app));
    await initModule('coloring_review',new ColoringReviewModule(app));

    await initModule('test_book_center',new TestBookCenterModule(app));
    await initModule('master_test_book_center',new MasterTestBookCenterModule(app));
    await initModule('master_test_book_export_center',new MasterTestBookExportCenterModule(app));

    await initModule('export_center',new ExportCenterModule(app));
    await initModule('release_center',new ReleaseCenterModule(app));

    await initModule('cultural',new CulturalAgentModule(app));
    await initModule('book',new CulturalBookBuilderModule(app));

    await initModule('settings',new SettingsModule(app));

    mountNav();

    uiStatus('READY','ok');

    routeTo(getSafeStartView());
    toast('Pronto ✅','ok');

  }catch(e){
    console.error(e);
    uiStatus('ERROR','bad');
    toast('Erro no boot','err');
    log('[BOOT ERROR] '+String((e && e.stack) || e));

    var root = $('#view');
    if (root){
      renderViewError(root,e,'Erro no boot');
    }
  }
}

boot();
