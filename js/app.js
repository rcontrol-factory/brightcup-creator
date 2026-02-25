import { Storage } from './core/storage.js';
import { PromptEngine } from './core/prompt_engine.js';
import { ComfyClient } from './core/comfy.js';
import { ColoringModule } from './modules/coloring.js';
import { CoversModule } from './modules/covers.js';
import { WordSearchModule } from './modules/wordsearch.js';
import { CrosswordModule } from './modules/crossword.js';
import { MandalaModule } from './modules/mandala.js';
import { SettingsModule } from './modules/settings.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const State = {
  themes: null,
  activeView: 'coloring',
  toastTimer: null,
  storage: new Storage('bcc:'),
  prompt: null,
  comfy: null,
  modules: new Map(),
};

function toast(msg, type = 'info') {
  const el = $('#toast');
  el.textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(State.toastTimer);
  State.toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

function setBusy(isBusy) {
  const b = $('#busy');
  b.hidden = !isBusy;
  b.setAttribute('aria-busy', String(!!isBusy));
}

async function loadThemes() {
  const res = await fetch('./data/themes.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('Falha ao carregar themes.json');
  return await res.json();
}

function routeTo(viewId) {
  State.activeView = viewId;
  $$('.navbtn').forEach(b => b.classList.toggle('active', b.dataset.view === viewId));
  $$('.view').forEach(v => v.hidden = (v.id !== `view-${viewId}`));
  const mod = State.modules.get(viewId);
  mod?.onShow?.();
}

function wireNav() {
  $$('.navbtn').forEach(btn => {
    btn.addEventListener('click', () => routeTo(btn.dataset.view));
  });
  $('#btnHelp').addEventListener('click', () => {
    $('#dlgHelp').showModal();
  });
  $('#btnCloseHelp').addEventListener('click', () => $('#dlgHelp').close());
}

async function boot() {
  setBusy(true);
  try {
    if ('serviceWorker' in navigator) {
      try { await navigator.serviceWorker.register('./sw.js'); } catch {}
    }

    State.themes = await loadThemes();
    const cfg = await State.storage.getJSON('config', {});

    State.prompt = new PromptEngine(State.themes);
    State.comfy = new ComfyClient(cfg.comfyBaseUrl || '', cfg.comfyApiKey || '');

    State.modules.set('coloring', new ColoringModule({ $, $$, State, toast, setBusy }));
    State.modules.set('covers', new CoversModule({ $, $$, State, toast, setBusy }));
    State.modules.set('wordsearch', new WordSearchModule({ $, $$, State, toast, setBusy }));
    State.modules.set('crossword', new CrosswordModule({ $, $$, State, toast, setBusy }));
    State.modules.set('mandala', new MandalaModule({ $, $$, State, toast, setBusy }));
    State.modules.set('settings', new SettingsModule({ $, $$, State, toast, setBusy }));

    for (const mod of State.modules.values()) await mod.init?.();

    wireNav();
    routeTo(cfg.lastView || 'coloring');

    toast('Pronto ✅', 'ok');
  } catch (e) {
    console.error(e);
    toast(`Erro no boot: ${e?.message || e}`, 'err');
  } finally {
    setBusy(false);
  }
}

boot();
