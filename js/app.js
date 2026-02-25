/* FILE: /js/app.js */
// Bright Cup Creator — /js/app.js (PADRÃO) + Mobile Hamburger UX

import { Storage } from './core/storage.js';
import { PromptEngine } from './core/prompt_engine.js';
import { ComfyClient } from './core/comfy.js';

import { ColoringModule } from './modules/coloring.js';
import { CoversModule } from './modules/covers.js';
import { WordSearchModule } from './modules/wordsearch.js';
import { CrosswordModule } from './modules/crossword.js';
import { MandalaModule } from './modules/mandala.js';
import { SettingsModule } from './modules/settings.js';
import { CulturalAgentModule } from './modules/cultural_agent.js';
import { CulturalBookBuilderModule } from './modules/cultural_book_builder.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const State = {
  themes: null,
  cfg: Storage.get('config', {}),
  activeView: null,
  modules: new Map(),
  toastTimer: null,
};

function uiStatus(text, kind = 'ok') {
  const el = $('#uiStatus');
  if (!el) return;
  el.textContent = text;
  el.classList.remove('ok', 'warn', 'bad');
  el.classList.add(kind);
}

function toast(msg, type = 'info') {
  const el = $('#toast');
  if (!el) return;
  el.hidden = false;
  el.textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(State.toastTimer);
  State.toastTimer = setTimeout(() => {
    el.classList.remove('show');
    el.hidden = true;
  }, 2600);
}

function log(line) {
  const el = $('#log');
  if (!el) return;
  const t = typeof line === 'string' ? line : JSON.stringify(line, null, 2);
  el.textContent += t + '\n';
  el.scrollTop = el.scrollHeight;
}

async function loadThemes() {
  const res = await fetch('./data/themes.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('Falha ao carregar themes.json');
  return await res.json();
}

function mergeConfig(patch) {
  State.cfg = { ...(State.cfg || {}), ...(patch || {}) };
  Storage.set('config', State.cfg);
}

function getConfig() { return State.cfg || {}; }
function setConfig(patch) { mergeConfig(patch); }

function exportAll() {
  const keys = Storage.listKeys();
  const data = {};
  keys.forEach(k => { data[k] = Storage.get(k, null); });
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `brightcup-backup-${Date.now()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  toast('Backup exportado ✅', 'ok');
}

function helpRender(root) {
  root.innerHTML = `
    <div class="grid">
      <div class="card">
        <h2>Ajuda rápida</h2>
        <p class="muted">
          Linha Cultural Brasil: <b>Cultural Agent</b> → gerar plano → <b>Livro (Builder)</b> para validar →
          depois Export PDF (KDP).
          <br/><br/>
          Linha Coloring (USA/Global) permanece separada.
        </p>
      </div>
    </div>
  `;
}

/* === Mobile Hamburger UX === */
function navOpen(on){
  document.body.classList.toggle('nav-open', !!on);
}
function navToggle(){
  navOpen(!document.body.classList.contains('nav-open'));
}
function navClose(){
  navOpen(false);
}

function mountNav() {
  // nav buttons
  $$('.navitem').forEach(btn => btn.addEventListener('click', () => {
    routeTo(btn.dataset.view);
    navClose(); // no mobile, fecha após escolher
  }));

  // top actions
  $('#btnHelp')?.addEventListener('click', () => { routeTo('help'); navClose(); });
  $('#btnExport')?.addEventListener('click', () => exportAll());

  // logs
  $('#btnClear')?.addEventListener('click', () => { const el = $('#log'); if (el) el.textContent = ''; });
  $('#btnCopyLog')?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('#log')?.textContent || ''); toast('Logs copiados ✅', 'ok'); }
    catch { toast('Falha ao copiar logs', 'err'); }
  });

  // hamburger
  $('#btnMenu')?.addEventListener('click', () => navToggle());
  $('#navOverlay')?.addEventListener('click', () => navClose());
}

function setActiveNav(viewId) {
  $$('.navitem').forEach(b => b.classList.toggle('active', b.dataset.view === viewId));
}

function routeTo(viewId) {
  State.activeView = viewId;
  mergeConfig({ lastView: viewId });
  setActiveNav(viewId);

  const root = $('#view');
  if (!root) return;

  if (viewId === 'help') return helpRender(root);

  const mod = State.modules.get(viewId);
  if (!mod) {
    root.innerHTML = `<div class="card"><h2>View não encontrada</h2><p class="muted">${viewId}</p></div>`;
    return;
  }

  try {
    mod.render?.(root);
    mod.onShow?.();
  } catch (e) {
    console.error(e);
    root.innerHTML = `<div class="card"><h2>Erro ao renderizar</h2><pre class="log">${String(e?.stack || e)}</pre></div>`;
    toast('Erro ao renderizar view', 'err');
  }
}

async function boot() {
  uiStatus('BOOT', 'warn');
  log(`[BOOT] ${new Date().toISOString()}`);

  try {
    if ('serviceWorker' in navigator) { try { await navigator.serviceWorker.register('./sw.js'); } catch {} }
    State.themes = await loadThemes();

    const app = {
      themes: State.themes,
      promptEngine: new PromptEngine(State.themes),
      comfy: new ComfyClient(() => (getConfig().comfyBase || '').trim()),
      toast, log,
      getConfig, setConfig,
      exportAll,
      saveProject: (obj) => { Storage.set('project:last', obj); toast('Projeto salvo ✅', 'ok'); },
    };

    // módulos
    State.modules.set('coloring', new ColoringModule(app));
    State.modules.set('covers', new CoversModule(app));
    State.modules.set('wordsearch', new WordSearchModule(app));
    State.modules.set('crossword', new CrosswordModule(app));
    State.modules.set('mandala', new MandalaModule(app));

    // Linha Cultural Brasil (separada do coloring)
    State.modules.set('cultural', new CulturalAgentModule(app));
    State.modules.set('book', new CulturalBookBuilderModule(app));

    State.modules.set('settings', new SettingsModule(app));

    for (const m of State.modules.values()) { try { await m.init?.(); } catch {} }

    mountNav();
    uiStatus('READY', 'ok');

    const start = getConfig().lastView || 'coloring';
    routeTo(start);

    toast('Pronto ✅', 'ok');
  } catch (e) {
    console.error(e);
    uiStatus('ERROR', 'bad');
    toast(`Erro no boot: ${e?.message || e}`, 'err');
    log(`[ERROR] ${String(e?.stack || e)}`);
  }
}

boot();
