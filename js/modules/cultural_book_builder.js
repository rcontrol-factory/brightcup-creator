/* FILE: /js/modules/cultural_book_builder.js */
// Bright Cup Creator — Cultural Book Builder v0.4a PADRÃO (1 ano)
// V0.4a:
// - Builder = só folhear/aprovar (layout vem do Agent via plan.meta.layout)
// - Visual “folha de papel” (sem bolhas/cápsulas)
// - Grade estilo revistinha: quadrado/linhas (sem cápsula)
// - Palavras sem chips/cápsulas (colunas simples)
// - Ilustração aparece só nas páginas de TEXTO (não no puzzle)
// - Swipe mobile mais confiável (bind no container + touch-action)

import { Storage } from '../core/storage.js';
import { generateWordSearch, normalizeWord as wsNormalizeWord } from '../core/wordsearch_gen.js';

function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function normalizeWord(s){
  try { return wsNormalizeWord(s); } catch {}
  return String(s || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g,'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^A-Z0-9]/g,'');
}

function displayWord(s){
  return String(s || '')
    .trim()
    .replace(/\s+/g,' ')
    .toUpperCase();
}

function uniqNorm(list){
  const seen = new Set();
  const out = [];
  for (const it of list){
    const w = normalizeWord(it);
    if (!w) continue;
    if (seen.has(w)) continue;
    seen.add(w);
    out.push(w);
  }
  return out;
}

function wrap(text, max=72){
  const words = String(text||'').split(/\s+/g);
  const lines = [];
  let line = '';
  for (const w of words){
    if (!line) { line = w; continue; }
    if ((line + ' ' + w).length <= max) line += ' ' + w;
    else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  return lines.join('\n');
}

function iconLabel(icon){
  const map = {
    mountain: 'Serra / Montanha',
    history: 'História',
    cheese: 'Queijo',
    bread: 'Receita',
    coffee: 'Café',
    train: 'Ferrovia',
    gem: 'Pedras / Gemas',
    church: 'Fé / Igreja',
    landscape: 'Paisagem',
    paraglider: 'Voo livre'
  };
  return map[icon] || (icon || 'ilustração');
}

function buildPagesFromPlan(plan){
  const m = plan.meta || {};
  const gridDefault = Number(m.grid_default || 15);
  const wppDefault  = Number(m.words_per_puzzle || 20);

  const pages = [];

  // capa/apresentação
  pages.push({
    kind:'text',
    icon:'history',
    title: m.title || 'MINAS GERAIS CULTURAL',
    meta: (m.subtitle || '').trim(),
    body: wrap(
      `Apresentação\n\nEste livro é uma viagem por Minas Gerais: sabores, histórias, fé, trilhos e montanhas.\n\n` +
      `Cada seção traz um texto curto e um caça-palavras temático.\n\n` +
      `No final, você encontra o gabarito completo. Boa leitura e bom passatempo.`,
      72
    ),
    sectionId: 'intro'
  });

  (plan.sections || []).forEach((s) => {
    // página de texto (tem ilustração)
    pages.push({
      kind:'text',
      icon: s.icon,
      title: s.title,
      meta: 'Texto cultural',
      body: wrap(s.text || '', 72),
      sectionId: s.id
    });

    // página de puzzle (SEM ilustração)
    // Evita frases longas (ex: "O que é Minas?") como "palavra" no puzzle.
    // Se o Agent não mandou wordHints, a gente usa fallback com tokens do título.
    const titleTokens = String(s.title || '')
      .trim()
      .split(/\s+/g)
      .filter(Boolean);
    const rawHints = []
      .concat(s.wordHints || [])
      .concat(titleTokens)
      .concat(['Minas', 'Cultura', 'História', 'Uai']);

    // palavras normalizadas p/ grade
    const wordsNorm = uniqNorm(rawHints)
      .filter(w => w.length >= 3 && w.length <= gridDefault)
      .slice(0, Math.max(6, wppDefault));

    // palavras display (com ortografia se existir)
    // aqui o plan normalmente já tem as wordHints “bonitas”
    const wordsDisplay = rawHints
      .map(displayWord)
      .map(w => w.trim())
      .filter(Boolean);

    // map display por norm (preferir a versão com acento/ç se existir)
    const mapDisp = {};
    for (const d of wordsDisplay){
      const n = normalizeWord(d);
      if (!n) continue;
      if (!mapDisp[n] || mapDisp[n].length < d.length) mapDisp[n] = d;
    }

    const finalDisplay = wordsNorm.map(n => mapDisp[n] || n);

    pages.push({
      kind:'puzzle',
      icon: s.icon,
      title: s.title,
      sectionTitle: s.title,
      meta: `Caça-Palavras ${gridDefault}x${gridDefault}`,
      grid: gridDefault,
      wordsNorm,
      wordsDisplay: finalDisplay,
      sectionId: s.id,
      sectionTitle: s.title
    });
  });

  // gabarito (placeholder: o WordSearch module usa includeKey; aqui só reserva)
  pages.push({
    kind:'text',
    icon:'history',
    title:'GABARITO',
    meta:'Respostas',
    body: wrap(
      `Gabarito\n\nAs soluções completas são geradas no módulo Caça-Palavras ao exportar.\n\n` +
      `Esta página é reservada para o gabarito final no PDF.`,
      72
    ),
    sectionId:'key'
  });

  // numeração
  pages.forEach((p, i) => (p.pageNo = i + 1));
  return pages;
}

function seedKeyForPlan(plan){
  const id = plan?.meta?.id || 'cultural';
  return `cultural:seed:${id}`;
}

function getPuzzleCache(plan){
  const key = `cultural:puzzle_cache:${plan?.meta?.id || 'cultural'}`;
  return Storage.get(key) || {};
}

function setPuzzleCache(plan, cache){
  const key = `cultural:puzzle_cache:${plan?.meta?.id || 'cultural'}`;
  Storage.set(key, cache || {});
}

function ensurePuzzleGenerated(plan, page){
  if (!page || page.kind !== 'puzzle') return null;

  const cache = getPuzzleCache(plan);
  const pid = page.sectionId || page.title || String(page.pageNo || '');
  if (cache[pid]) return cache[pid];

  const size = Number(page.grid || 15);
  const words = (page.wordsNorm || []).slice(0, 40);

  const res = generateWordSearch({
    size,
    words,
    fillMode: 'RANDOM',
    includeKey: true
  });

  const item = {
    size,
    words,
    placedCount: res?.placedCount || 0,
    grid: res?.grid || [],
    key: res?.key || null
  };

  cache[pid] = item;
  setPuzzleCache(plan, cache);
  return item;
}

function renderGridHTML(grid){
  const g = grid || [];
  if (!g.length) return '';
  const rows = g.length;
  const cols = g[0]?.length || 0;

  let html = `<table class="ws-table" aria-label="Grade ${rows} por ${cols}">`;
  for (let r=0; r<rows; r++){
    html += `<tr>`;
    for (let c=0; c<cols; c++){
      html += `<td>${esc(g[r][c] || '')}</td>`;
    }
    html += `</tr>`;
  }
  html += `</table>`;
  return html;
}

function renderWordsColumns(wordsDisplay){
  const list = (wordsDisplay || []).map(displayWord).filter(Boolean);
  if (!list.length) return '';

  // 3 colunas (estilo impresso) + "leader" pontilhado
  const cols = 3;
  const buckets = Array.from({ length: cols }, () => []);
  let maxLen = 0;
  for (let i = 0; i < list.length; i++) {
    const w = list[i];
    if (w.length > maxLen) maxLen = w.length;
    buckets[i % cols].push(w);
  }

  // shrink automático se tiver palavra muito longa (evita quebra feia)
  // 14+ começa a apertar — reduz gradual até ~0.72
  const shrink = Math.max(0.72, Math.min(1, 1 - Math.max(0, (maxLen - 14)) * 0.04));

  const colHtml = buckets.map(col => {
    const items = col.map(w => (
      `<div class="ws-item"><span class="ws-word">${esc(w)}</span><span class="ws-leader" aria-hidden="true"></span></div>`
    )).join('');
    return `<div class="ws-col">${items}</div>`;
  }).join('');

  return `<div class="ws-words-cols" style="--wsw:${shrink.toFixed(3)}">${colHtml}</div>`;
}

function bindSwipe(el, onPrev, onNext){
  if (!el) return;

  // Teardown seguro: se este container for re-renderizado, não acumula listeners
  try {
    if (el.__bccSwipeAbort) el.__bccSwipeAbort.abort();
  } catch {}
  const ac = new AbortController();
  try { el.__bccSwipeAbort = ac; } catch {}

  // Preferir Pointer Events (iOS moderno), com fallback por touch
  let pointerId = null;
  let startX = 0, startY = 0;
  let dx = 0, dy = 0;
  let moved = false;
  let handled = false;
  let locked = false;

  const MIN_DIST = 42;
  const MAX_OFF_AXIS = 55;
  const COOLDOWN_MS = 220;

  const reset = () => {
    pointerId = null;
    startX = 0; startY = 0;
    dx = 0; dy = 0;
    moved = false;
    handled = false;
  };

  const cooldown = () => {
    locked = true;
    setTimeout(() => { locked = false; }, COOLDOWN_MS);
  };

  const tryFire = () => {
    if (handled || locked) return;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    if (adx < MIN_DIST) return;
    if (ady > MAX_OFF_AXIS) return;
    if (adx < ady * 1.15) return;

    handled = true;
    cooldown();

    if (dx > 0) onPrev?.();
    else onNext?.();
  };

  // Pointer
  el.addEventListener('pointerdown', (e) => {
    if (locked) return;
    if (e.pointerType === 'mouse') return; // comportamento mobile
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    dx = 0; dy = 0;
    moved = false;
    handled = false;
    try { el.setPointerCapture(pointerId); } catch {}
  }, { passive: true, signal: ac.signal });

  el.addEventListener('pointermove', (e) => {
    if (pointerId == null) return;
    if (e.pointerId !== pointerId) return;
    dx = e.clientX - startX;
    dy = e.clientY - startY;

    if (!moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) moved = true;

    // se for horizontal, impede scroll
    if (moved && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      try { e.preventDefault(); } catch {}
    }
  }, { passive: false, signal: ac.signal });

  el.addEventListener('pointerup', (e) => {
    if (pointerId == null) return;
    if (e.pointerId !== pointerId) return;
    tryFire();
    try { el.releasePointerCapture(pointerId); } catch {}
    reset();
  }, { passive: true, signal: ac.signal });

  el.addEventListener('pointercancel', (e) => {
    if (pointerId == null) return;
    if (e.pointerId !== pointerId) return;
    try { el.releasePointerCapture(pointerId); } catch {}
    reset();
  }, { passive: true, signal: ac.signal });

  // Touch fallback (caso Pointer não dispare em algum webview)
  el.addEventListener('touchstart', (e) => {
    if (locked) return;
    const t = e.touches?.[0];
    if (!t) return;
    startX = t.clientX;
    startY = t.clientY;
    dx = 0; dy = 0;
    moved = false;
    handled = false;
  }, { passive: true, signal: ac.signal });

  el.addEventListener('touchmove', (e) => {
    const t = e.touches?.[0];
    if (!t) return;
    dx = t.clientX - startX;
    dy = t.clientY - startY;

    if (!moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) moved = true;

    if (moved && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      try { e.preventDefault(); } catch {}
    }
  }, { passive: false, signal: ac.signal });

  el.addEventListener('touchend', () => {
    tryFire();
  }, { passive: true, signal: ac.signal });

  el.addEventListener('touchcancel', () => {
    reset();
  }, { passive: true, signal: ac.signal });
}

export class CulturalBookBuilder {
  constructor(app){
    this.app = app;
  }

  mount(root){
    this.root = root;
    this.render();
  }

  render(){
    const root = this.root;
    if (!root) return;

    const plan = Storage.get('cultural:book_plan') || null;
    const pages = plan ? buildPagesFromPlan(plan) : [];
    let idx = 0;

    const renderMain = () => {
      root.innerHTML = `
        <div class="bb-wrap">
          <div class="bb-head">
            <div>
              <div class="bb-title">Cultural Book Builder</div>
              <div class="bb-sub">Builder = só folhear/aprovar. O Agent define layout e conteúdo.</div>
              <div class="bb-mini">
                <span>• páginas <b>${esc(String(pages.length || 0))}</b></span>
                <span>• estilo <b>${esc(plan?.meta?.layout?.style || 'RETRO')}</b></span>
              </div>
            </div>

            <div class="bb-actions">
              <button class="btn" data-act="prev">◀</button>
              <button class="btn" data-act="next">▶</button>
              <button class="btn" data-act="download">Baixar plano</button>
            </div>
          </div>

          <div class="bb-stage" data-stage></div>
        </div>
      `;

      const stage = root.querySelector('[data-stage]');
      const btnPrev = root.querySelector('[data-act="prev"]');
      const btnNext = root.querySelector('[data-act="next"]');

      const goPrev = () => { idx = Math.max(0, idx - 1); paint(); };
      const goNext = () => { idx = Math.min((pages.length||1)-1, idx + 1); paint(); };

      btnPrev?.addEventListener('click', goPrev);
      btnNext?.addEventListener('click', goNext);

      bindSwipe(stage, goPrev, goNext);

      const renderPage = (page, plan, withSend=true) => {
        if (!page) return '';
        const layout = plan?.meta?.layout || {};
        const pageSize = layout.pageSize || plan?.meta?.format || '6x9';
        const maxw = (String(pageSize) === '8.5x11') ? '720px' : '560px';

        if (page.kind === 'text') {
          return `
            <div class="paper" style="--page-maxw:${esc(maxw)}">
              <div class="page" data-size="${esc(pageSize)}">
                <div class="page-inner">
                  <div class="page-head">
                    <div>
                      <div class="page-title">${esc(page.title || '')}</div>
                      <div class="page-meta">${esc(page.meta || '')}</div>
                    </div>
                    <div class="page-no">p.${esc(String(page.pageNo || ''))}</div>
                  </div>

                  <div class="page-body">
                    <pre class="page-text">${esc(page.body || '')}</pre>
                  </div>

                  <div class="illus">
                    <div>
                      <div class="t">Ilustração P&B: ${esc(iconLabel(page.icon))}</div>
                      <div class="s">Slot reservado (entra no Export/IA) — nesta página de texto.</div>
                    </div>
                    <div class="badge">Imagem</div>
                  </div>
                </div>
              </div>
            </div>
          `;
        }

        const gen = ensurePuzzleGenerated(plan, page);
        const gridHtml = renderGridHTML(gen?.grid);

        return `
          <div class="paper" style="--page-maxw:${esc(maxw)}">
            <div class="page" data-size="${esc(pageSize)}">
              <div class="page-inner">
                <div class="page-head">
                  <div>
                    <div class="page-title ws-title">CAÇA-PALAVRAS — ${esc(page.sectionTitle || page.title || '')}</div>
                    <div class="page-meta ws-meta">${esc(page.meta || '')}</div>
                  </div>
                  <div class="page-no">p.${esc(String(page.pageNo || ''))}</div>
                </div>

                <div class="ws-box">${gridHtml}</div>

                <div class="words-box">
                  <div class="words-title">Palavras</div>
                  <div class="words-grid">${renderWordsColumns(page.wordsDisplay || page.wordsNorm || [])}</div>
                </div>

                ${
                  withSend
                    ? `<div style="display:flex; justify-content:flex-end;">
                        <button class="btn" data-send="ws">Enviar p/ Caça-Palavras</button>
                      </div>`
                    : ``
                }
              </div>
            </div>
          </div>
        `;
      };

      const sendPageToWordSearch = (page, plan) => {
        if (!page || page.kind !== 'puzzle') return;
        const ws = {
          title: page.title || `Caça-Palavras ${page.grid}x${page.grid}`,
          preset: (page.grid || 15) <= 13 ? 'BR_POCKET' : 'BR_PLUS',
          size: page.grid || 15,
          maxWords: (page.wordsNorm || []).length || 16,
          includeKey: true,
          words: (page.wordsNorm || []).join('\n'), // normalizado
          puzzleId: page.sectionId || '',
          sectionId: page.sectionId || '',
          sectionTitle: page.sectionTitle || '',
          output: '',
          ts: Date.now()
        };
        Storage.set('wordsearch:seed', ws);
        this.app.toast?.('Enviado ✅ (abra Caça-Palavras e clique Gerar+Salvar)');
        try { this.app.log?.(`[BOOK] sent section="${page.sectionTitle || page.title}" => wordsearch:seed`); } catch {}
      };

      const paint = () => {
        if (!stage) return;

        if (!plan){
          stage.innerHTML = `
            <div class="bb-empty">
              <div class="bb-card">
                <h3>Sem plano</h3>
                <p>Gere um plano no Cultural Agent e salve em <code>cultural:book_plan</code>.</p>
              </div>
            </div>
          `;
          return;
        }

        const page = pages[idx];
        stage.innerHTML = `
          <style>
            .bb-wrap{ display:grid; gap:12px; }
            .bb-head{
              display:flex; align-items:flex-start; justify-content:space-between; gap:12px;
              padding:12px;
              border:1px solid rgba(255,255,255,.10);
              border-radius:14px;
              background: rgba(0,0,0,.18);
            }
            .bb-title{ font-weight:900; letter-spacing:.2px; font-size:14px; }
            .bb-sub{ opacity:.85; font-size:12px; margin-top:4px; }
            .bb-mini{ display:flex; gap:10px; opacity:.85; font-size:12px; margin-top:6px; flex-wrap:wrap; }
            .bb-actions{ display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end; }
            .btn{
              border:1px solid rgba(255,255,255,.14);
              background:rgba(255,255,255,.06);
              color:#fff;
              padding:8px 10px;
              border-radius:10px;
              font-weight:800;
              letter-spacing:.2px;
            }
            .btn:active{ transform:translateY(1px); }

            .bb-stage{
              width:100%;
              display:flex;
              justify-content:center;
              align-items:flex-start;
              touch-action: pan-y;
            }

            .bb-empty{ padding:22px; display:flex; justify-content:center; }
            .bb-card{
              max-width:720px;
              border:1px solid rgba(255,255,255,.10);
              border-radius:14px;
              background: rgba(0,0,0,.18);
              padding:16px;
            }
            .bb-card h3{ margin:0 0 6px; }
            .bb-card p{ margin:0; opacity:.85; }

            /* PAPER + PAGE */
            .paper{
              width: 100%;
              display:flex;
              justify-content:center;
            }

            .page{
              background: #ffffff;
              color: #0b0f16;
              border-radius: 0;
              border: 1px solid rgba(0,0,0,.75);
              box-shadow: 0 10px 28px rgba(0,0,0,.22);
              overflow:hidden;
              position:relative;
              width: min(100%, var(--page-maxw, 560px));
              aspect-ratio: 6 / 9; /* default */
              touch-action: pan-y; /* swipe horizontal tratado no bindSwipe */
            }
            .page[data-size="8.5x11"]{ aspect-ratio: 8.5 / 11; }
            .page[data-size="6x9"]{ aspect-ratio: 6 / 9; }

            .page-inner{
              padding: 18px;
              height: 100%;
              overflow: hidden;
              display:grid;
              grid-template-rows: auto 1fr;
              gap:10px;
            }

            .page-head{
              display:flex; align-items:flex-start; justify-content:space-between; gap:12px;
              border-bottom: 1px solid rgba(0,0,0,.12);
              padding-bottom: 10px;
            }
            .page-title{
              /* menor e mais “impresso” (evita ocupar área do puzzle) */
              font-size: clamp(20px, 4.6vw, 28px);
              line-height: 1.06;
              font-weight: 900;
              letter-spacing: -0.2px;
              text-transform: uppercase;
            }
            .ws-title{
              font-size: 15px;
              letter-spacing: .6px;
              text-transform: uppercase;
            }
            .page-meta{
              font-size: clamp(13px, 3.7vw, 16px);
              opacity: .72;
              margin-top: 6px;
            }
            .ws-meta{
              font-size: 11px;
              opacity: .72;
              margin-top: 6px;
            }
            .page-no{
              font-size: 14px;
              opacity:.7;
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
              font-weight: 900;
              white-space:nowrap;
              margin-top: 2px;
            }

            .page-body{
              overflow:hidden; /* fixo */
            }
            .page-text{
              margin: 0;
              white-space:pre-wrap;
              overflow-wrap:anywhere;
              word-break:break-word;
              font-family: ui-serif, Georgia, "Times New Roman", serif;
              font-size: clamp(16px, 4.2vw, 19px);
              line-height: 1.42;
            }

            /* caça-palavras: grade quadriculada (revistinha) */
            .ws-box{
              border: none;
              background: transparent;
              padding: 0;
              border-radius: 0;
              overflow: hidden;
            }
            .ws-table{
              border-collapse: collapse;
              margin: 0 auto;
              border: 2px solid rgba(0,0,0,.55);
            }
            .ws-table td{
              border: 1px solid rgba(0,0,0,.35);
              width: 22px;
              height: 22px;
              text-align:center;
              vertical-align:middle;
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
              font-weight: 900;
              font-size: 14px;
              line-height: 1;
              padding: 0;
            }
            @media (max-width: 420px){
              .ws-table td{ width: 20px; height: 20px; font-size: 13px; }
            }

            /* palavras: estilo “impresso”, 3 colunas e sem quebrar */
            .words-box{
              border: none;
              background: transparent;
              padding: 0;
              border-radius: 0;
            }
            .words-title{
              font-weight: 900;
              font-size: 12px;
              letter-spacing: .6px;
              text-transform: uppercase;
              margin: 10px 0 6px;
            }
            .words-grid{
              display:block;
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
              font-weight: 900;
              font-size: 13px;
            }
            .ws-words-cols{
              display:grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 7px 18px;
              font-size: calc(13px * var(--wsw, 1));
            }
            .ws-col{
              display:flex;
              flex-direction:column;
              gap: 6px;
              min-width: 0;
            }
            .ws-item{
              display:flex;
              align-items:baseline;
              gap: 8px;
              min-width: 0;
              white-space: nowrap;
            }
            .ws-word{
              overflow: visible;
              text-overflow: clip;
            }
            .ws-leader{
              flex: 1;
              border-bottom: 1px dotted rgba(0,0,0,.55);
              transform: translateY(-2px);
            }

            .ws-w{
              white-space: nowrap;
              word-break: normal;
              overflow: visible;
              text-overflow: clip;
            }

            /* ilustração (só no TEXTO) */
            .illus{
              border: 1px dashed rgba(0,0,0,.35);
              border-radius: 12px;
              padding: 12px;
              display:flex;
              justify-content:space-between;
              gap:12px;
              align-items:center;
              background: rgba(0,0,0,.03);
            }
            .illus .t{ font-weight: 900; }
            .illus .s{ opacity:.75; font-size: 12px; margin-top: 2px; }
            .illus .badge{
              font-weight: 900;
              border: 1px solid rgba(0,0,0,.25);
              border-radius: 999px;
              padding: 6px 10px;
              font-size: 12px;
              background: rgba(255,255,255,.75);
            }
          </style>

          ${renderPage(page, plan, true)}
        `;

        const sendBtn = stage.querySelector('[data-send="ws"]');
        sendBtn?.addEventListener('click', () => sendPageToWordSearch(page, plan));
      };

      root.querySelector('[data-act="download"]')?.addEventListener('click', () => {
        try {
          const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `book-plan-${(plan?.meta?.id||'cultural')}-${Date.now()}.json`;
          a.click();
          setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
          this.app.toast?.('Plano baixado ✅');
        } catch {
          this.app.toast?.('Falha ao baixar', 'err');
        }
      });

      paint();
    };

    renderMain();
  }
}
