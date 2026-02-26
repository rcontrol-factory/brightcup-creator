/* FILE: /js/modules/cultural_book_builder.js */
// Bright Cup Creator — Cultural Book Builder v0.4b (FIXED PAPER + NO DOUBLE SWIPE)
// Patch:
// - Folha (paper) fica FIXA: não expande conforme conteúdo (conteúdo rola dentro)
// - Corrige bug do "folhear pula 2 páginas" (swipe duplicado vindo do Spread/parent)
// - Lista de palavras sem cápsulas (revistinha)
// - Grade continua quadradinha e encaixada

import { Storage } from '../core/storage.js';

const $esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));

const nowISO = () => new Date().toISOString();

function safeInt(n, d=0){
  const x = parseInt(String(n ?? ''), 10);
  return Number.isFinite(x) ? x : d;
}

function normalizeWord(s){
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
    .replace(/\s+/g, ' ')
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

function shuffle(arr, rnd=Math.random){
  const a = arr.slice();
  for (let i=a.length-1;i>0;i--){
    const j = Math.floor(rnd()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

function mulberry32(seed){
  let t = seed >>> 0;
  return function(){
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function makeEmptyGrid(n, fill=''){
  const g = [];
  for (let r=0;r<n;r++){
    const row = new Array(n);
    row.fill(fill);
    g.push(row);
  }
  return g;
}

function canPlace(grid, word, r, c, dr, dc){
  const n = grid.length;
  for (let i=0;i<word.length;i++){
    const rr = r + dr*i, cc = c + dc*i;
    if (rr<0||cc<0||rr>=n||cc>=n) return false;
    const ch = grid[rr][cc];
    if (ch && ch !== word[i]) return false;
  }
  return true;
}

function placeWord(grid, word, r, c, dr, dc){
  for (let i=0;i<word.length;i++){
    grid[r + dr*i][c + dc*i] = word[i];
  }
}

function fillGridRandom(grid, rnd){
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r=0;r<grid.length;r++){
    for (let c=0;c<grid.length;c++){
      if (!grid[r][c]) grid[r][c] = letters[Math.floor(rnd()*letters.length)];
    }
  }
}

function generateWordSearch(wordsNorm, size, seed=Date.now()){
  const n = size;
  const rnd = mulberry32(seed);

  const dirs = [
    [0,1],[1,0],[0,-1],[-1,0],
    [1,1],[1,-1],[-1,1],[-1,-1]
  ];

  const grid = makeEmptyGrid(n, '');
  const placed = [];
  const triesPerWord = 220;

  const words = shuffle(wordsNorm, rnd).sort((a,b)=>b.length-a.length);

  for (const w of words){
    let ok = false;
    const d = shuffle(dirs, rnd);
    for (let t=0;t<triesPerWord && !ok;t++){
      const drdc = d[Math.floor(rnd()*d.length)];
      const dr = drdc[0], dc = drdc[1];
      const r = Math.floor(rnd()*n);
      const c = Math.floor(rnd()*n);
      if (!canPlace(grid, w, r, c, dr, dc)) continue;
      placeWord(grid, w, r, c, dr, dc);
      placed.push({ word:w, r, c, dr, dc });
      ok = true;
    }
  }

  fillGridRandom(grid, rnd);

  return { grid, placed, placedCount: placed.length, seed };
}

function esc(s){ return $esc(s); }

function renderGridHTML(grid){
  const n = Array.isArray(grid) ? grid.length : 0;
  if (!n) return '<div class="muted">Sem grade</div>';

  let html = `<table class="ws-table" data-n="${n}"><tbody>`;
  for (let r=0;r<n;r++){
    html += '<tr>';
    for (let c=0;c<n;c++){
      const ch = String(grid[r][c] || '').toUpperCase().slice(0,1);
      html += `<td>${esc(ch)}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  return html;
}

function renderWordsColumns(words){
  const list = (words || []).map(displayWord).filter(Boolean);
  return list.map(w => `<div class="word-item">${esc(w)}</div>`).join('');
}

function iconLabel(icon){
  const m = {
    mountain: 'História',
    history: 'História',
    cheese: 'Queijo',
    bread: 'Receita',
    coffee: 'Café',
    train: 'Ferrovia',
    gem: 'Pedras',
    church: 'Fé',
    landscape: 'Paisagem',
    paraglider: 'Voo livre'
  };
  return m[String(icon||'')] || 'História';
}

function ensureBookPlan(){
  const plan = Storage.get('cultural:book_plan', null);
  return plan;
}

function buildPagesFromPlan(plan){
  const pages = [];
  let p = 1;

  const m = plan?.meta || {};
  // capa/intro
  pages.push({
    kind:'text',
    pageNo: p++,
    title: (m.title || 'LIVRO').toUpperCase(),
    meta: (m.subtitle || ''),
    body: `Apresentação\n\n${(plan?.sections?.[0]?.text || 'Este livro é uma viagem cultural.')}\n\nNo final, você encontra o gabarito completo. Boa leitura e bom passatempo.`,
    icon:'history'
  });

  const grid = safeInt(m.grid_default, 13);
  const wpp  = safeInt(m.words_per_puzzle, 16);

  (plan.sections || []).forEach((s) => {
    // página texto da seção
    pages.push({
      kind:'text',
      pageNo: p++,
      title: s.title,
      meta: 'Texto cultural',
      body: (s.text || '').trim(),
      icon: s.icon || 'history',
      sectionId: s.id
    });

    // página puzzle
    const wordsDisplay = []
      .concat(s.wordHints || [])
      .concat([s.title, 'Minas', 'Cultura', 'História', 'Uai'])
      .map(displayWord);

    const wordsNorm = uniqNorm(wordsDisplay).filter(w => w.length >= 3 && w.length <= grid).slice(0, Math.max(6, wpp));

    pages.push({
      kind:'puzzle',
      pageNo: p++,
      title: `Caça-Palavras — ${s.title}`,
      meta: `Prévia visual (editorial) • grade ${grid}x${grid}`,
      icon: s.icon || 'history',
      sectionId: s.id,
      wordsDisplay: wordsDisplay,
      wordsNorm: wordsNorm,
      size: grid,
      maxWords: wpp
    });
  });

  // gabarito (placeholder)
  pages.push({
    kind:'text',
    pageNo: p++,
    title: 'Gabarito',
    meta: 'Respostas',
    body: 'Gabarito completo (em breve).',
    icon:'history'
  });

  return pages;
}

function ensurePuzzleGenerated(plan, page){
  const key = `cultural:puzzle:${plan?.meta?.id || 'book'}:${page.sectionId || page.pageNo}`;
  const existing = Storage.get(key, null);
  if (existing && existing.grid && existing.placedCount != null) return existing;

  const seed = Date.now();
  const gen = generateWordSearch(page.wordsNorm || [], page.size || 13, seed);
  Storage.set(key, gen);
  return gen;
}

function bindSwipeOnce(el, onPrev, onNext){
  if (!el) return;

  // Bind only once per element, but allow callbacks to be updated on each render.
  if (el.__bbSwipeBound){
    el.__bbSwipePrev = onPrev;
    el.__bbSwipeNext = onNext;
    return;
  }
  el.__bbSwipeBound = true;
  el.__bbSwipePrev = onPrev;
  el.__bbSwipeNext = onNext;

  // Prefer pointer events (works on modern iOS). Fallback to touch if needed.
  const state = { startX:0, startY:0, tracking:false, locked:false, pid:null };

  const isInteractive = (t) => {
    try { return !!t?.closest?.('button,a,input,textarea,select,label,[role="button"]'); } catch {}
    return false;
  };

  const start = (x,y) => { state.startX=x; state.startY=y; state.tracking=true; state.locked=false; };
  const move  = (x,y,ev) => {
    if (!state.tracking) return;
    const dx = x - state.startX;
    const dy = y - state.startY;

    // lock horizontal swipe only if clearly horizontal
    if (!state.locked && Math.abs(dx) > 18 && Math.abs(dx) > Math.abs(dy) * 1.2) state.locked = true;
    if (state.locked) {
      try { ev.preventDefault?.(); } catch {}
      try { ev.stopPropagation?.(); } catch {}
    }
  };
  const end   = (x,y,ev) => {
    if (!state.tracking) return;
    state.tracking = false;

    const dx = x - state.startX;
    const dy = y - state.startY;

    if (Math.abs(dx) < 55) return;
    if (Math.abs(dx) < Math.abs(dy) * 1.2) return;

    try { ev?.stopPropagation?.(); } catch {}

    // Call the latest callbacks (avoid double-advance when parent+child are both bound)
    if (dx > 0) el.__bbSwipePrev?.();
    else el.__bbSwipeNext?.();
  };

  // Pointer events
  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (isInteractive(e.target)) return;
    state.pid = e.pointerId;
    start(e.clientX, e.clientY);
    try { el.setPointerCapture?.(e.pointerId); } catch {}
  };
  const onPointerMove = (e) => {
    if (!state.tracking) return;
    if (state.pid != null && e.pointerId !== state.pid) return;
    move(e.clientX, e.clientY, e);
  };
  const onPointerUp = (e) => {
    if (!state.tracking) return;
    if (state.pid != null && e.pointerId !== state.pid) return;
    end(e.clientX, e.clientY, e);
    state.pid = null;
  };

  // Touch fallback (older engines)
  const onTouchStart = (e) => {
    if (isInteractive(e.target)) return;
    const t = e.touches?.[0]; if (!t) return;
    start(t.clientX, t.clientY);
  };
  const onTouchMove = (e) => {
    const t = e.touches?.[0]; if (!t) return;
    move(t.clientX, t.clientY, e);
  };
  const onTouchEnd = (e) => {
    const t = e.changedTouches?.[0]; if (!t) return;
    end(t.clientX, t.clientY, e);
  };

  el.style.touchAction = 'pan-y';

  el.addEventListener('pointerdown', onPointerDown, { passive:true });
  el.addEventListener('pointermove', onPointerMove, { passive:false });
  el.addEventListener('pointerup', onPointerUp, { passive:true });
  el.addEventListener('pointercancel', onPointerUp, { passive:true });

  el.addEventListener('touchstart', onTouchStart, { passive:true });
  el.addEventListener('touchmove', onTouchMove, { passive:false });
  el.addEventListener('touchend', onTouchEnd, { passive:true });
}

export class CulturalBookBuilderModule {
  constructor(app){
    this.app = app;
    this.id = 'book';
    this.title = 'Builder';
  }

  async init(){}

  render(root){
    const plan = ensureBookPlan();
    if (!plan){
      root.innerHTML = `
        <div class="card">
          <h2>Builder</h2>
          <p class="muted">Nenhum plano encontrado. Abra o Cultural Agent e gere o plano do livro.</p>
        </div>
      `;
      return;
    }

    const seed = Storage.get('book:seed', {
      mode: 'FOLHEAR',
      pageIndex: 0
    });

    const pages = buildPagesFromPlan(plan);
    let mode = seed.mode || 'FOLHEAR';
    let pageIndex = safeInt(seed.pageIndex, 0);
    if (pageIndex < 0) pageIndex = 0;
    if (pageIndex > pages.length-1) pageIndex = pages.length-1;

    const save = () => Storage.set('book:seed', { mode, pageIndex });

    const renderPage = (page, opts={}) => {
      const maxw = plan?.meta?.format === '8.5x11' ? 720 : 560;
      const withSend = !!opts.withSend;

      if (page.kind === 'text') {
        return `
          <div class="page">
            <div class="page-inner">
              <div class="page-head">
                <div class="page-title">${esc(page.title || '')}</div>
                <div class="page-no">p.${esc(page.pageNo)}</div>
              </div>

              <div class="page-scroll">
                <div class="page-meta">${esc(page.meta || '')}</div>
                <div class="page-body"><pre>${esc(page.body || '')}</pre></div>

                <div class="illus-slot">
                  <div class="illus-left">
                    <div class="illus-title">Ilustração P&B: ${esc(iconLabel(page.icon))}</div>
                    <div class="illus-desc">Slot reservado (entra no Export/IA) — nesta página de texto.</div>
                  </div>
                  <div class="illus-badge">Imagem</div>
                </div>
              </div>

              <div class="page-foot">
                <span></span>
                <span class="bb-mini muted"></span>
              </div>
            </div>
          </div>
        `;
      }

      const gen = ensurePuzzleGenerated(plan, page);
      const gridHtml = renderGridHTML(gen?.grid);

      return `
        <div class="paper" style="--page-maxw:${esc(maxw)}">
          <div class="page">
            <div class="page-inner">
              <div class="page-head">
                <div>
                  <div class="page-title">${esc(page.title || '')}</div>
                  <div class="page-meta">${esc(page.meta || '')} • palavras colocadas ${esc(String(gen?.placedCount || 0))}</div>
                </div>
                <div class="page-no">p.${esc(String(page.pageNo || ''))}</div>
              </div>

              <div class="page-scroll">
                <div class="ws-box">${gridHtml}</div>

                <div class="words-box">
                  <div class="words-title">Palavras</div>
                  <div class="words-grid">${renderWordsColumns(page.wordsDisplay || page.wordsNorm || [])}</div>
                </div>
              </div>

              <div class="page-foot">
                ${
                  withSend
                    ? `<button class="btn" data-send="ws">Enviar p/ Caça-Palavras</button>`
                    : `<span></span>`
                }
                <span></span>
              </div>
            </div>
          </div>
        </div>
      `;
    };

    root.innerHTML = `
      <style>
        .bb-toolbar{
          display:flex; align-items:center; justify-content:space-between;
          gap:12px; padding: 10px 8px; margin-bottom: 10px;
        }
        .bb-toolbar .left, .bb-toolbar .right{ display:flex; gap:10px; align-items:center; }
        .bb-toolbar .pill{
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.10);
          padding: 7px 12px; border-radius: 999px;
          color: rgba(255,255,255,.86);
          font-weight: 700;
        }
        .bb-toolbar .btn{
          background: rgba(255,255,255,.10);
          border: 1px solid rgba(255,255,255,.14);
          color: rgba(255,255,255,.92);
          padding: 9px 12px;
          border-radius: 12px;
          font-weight: 800;
        }
        .bb-toolbar .btn.primary{
          background: rgba(44,134,255,.25);
          border-color: rgba(44,134,255,.35);
        }

        .paper{
          display:flex; justify-content:center;
          padding: 6px 0 14px 0;
        }

        .page{
          background: rgba(250,250,250,0.95);
          color:#0b0f16;
          border-radius:22px;
          border:1px solid rgba(0,0,0,.10);
          box-shadow: 0 18px 60px rgba(0,0,0,.18);
          overflow:hidden;
          /* FIX: folha com tamanho FIXO (não expande) */
          height: min(calc(100vh - 290px), 840px);
          aspect-ratio: 2 / 3; /* 6x9 */
          width: auto;
          max-width: min(92vw, var(--page-maxw, 560px));
        }

        .page-inner{
          height:100%;
          padding: 16px 16px 14px 16px;
          display:flex;
          flex-direction:column;
          gap:10px;
        }

        .page-head{
          display:flex; justify-content:space-between; gap:10px;
        }
        .page-title{
          font-size: 34px;
          line-height: 1.06;
          font-weight: 950;
          letter-spacing: -0.6px;
        }
        .page-meta{
          font-size: 16px;
          opacity: .64;
          margin-top: 2px;
        }
        .page-no{
          opacity:.55;
          font-weight: 900;
          font-size: 18px;
          padding-top: 4px;
        }

        /* ✅ Conteúdo rola dentro da folha (folha fixa) */
        .page-scroll{
          flex:1;
          overflow:auto;
          -webkit-overflow-scrolling: touch;
          display:grid;
          gap:10px;
          padding-right: 2px; /* evita corte no iOS */
        }

        .page-body{
          border-radius: 16px;
          border: 1px solid rgba(0,0,0,.10);
          background: rgba(255,255,255,.65);
          padding: 16px;
        }
        .page-body pre{
          margin:0;
          white-space: pre-wrap;
          font-family: ui-serif, Georgia, "Times New Roman", Times, serif;
          font-size: 32px;
          line-height: 1.26;
          letter-spacing: .2px;
        }

        .illus-slot{
          border-radius: 16px;
          border: 2px dashed rgba(0,0,0,.22);
          background: rgba(255,255,255,.45);
          padding: 12px 12px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 10px;
        }
        .illus-title{ font-weight: 950; font-size: 20px; }
        .illus-desc{ opacity:.62; font-weight: 700; }
        .illus-badge{
          background: rgba(0,0,0,.10);
          border: 1px solid rgba(0,0,0,.15);
          padding: 10px 12px;
          border-radius: 14px;
          font-weight: 900;
          opacity:.8;
        }

        /* ✅ Caça-palavras estilo "revistinha" (quadradinho) */
        .ws-box{
          border-radius: 14px;
          border: 1px solid rgba(0,0,0,.18);
          background: transparent;
          padding: 8px;
        }
        .ws-table{
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }
        .ws-table td{
          border: 1px solid rgba(0,0,0,.55);
          padding: 0;
          text-align: center;
          vertical-align: middle;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-weight: 900;
          font-size: clamp(12px, 2.9vw, 18px);
          line-height: 1;
          aspect-ratio: 1 / 1;
        }

        /* ✅ Lista de palavras sem "cápsulas" */
        .words-box{
          border-radius: 14px;
          border: 1px solid rgba(0,0,0,.18);
          background: transparent;
          padding: 8px 10px;
        }
        .words-title{
          font-size: 15px;
          font-weight: 900;
          opacity:.8;
          margin-bottom: 6px;
        }
        .words-grid{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px 18px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: clamp(12px, 3.2vw, 16px);
          font-weight: 900;
          letter-spacing: .2px;
        }
        .word-item{
          padding-bottom: 2px;
          border-bottom: 1px dotted rgba(0,0,0,.20);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Footer fixo e compacto */
        .page-foot{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          padding-top: 4px;
          opacity:.86;
          font-size: 13px;
        }

        .muted{ opacity:.66; }
        .bb-mini{ font-weight: 800; }

        @media (max-width: 860px){
          .page-title{ font-size: 32px; }
          .page-body pre{ font-size: 30px; }
        }
      </style>

      <div class="bb-toolbar">
        <div class="left">
          <button class="btn" id="bb_spread">Spread</button>
          <button class="btn" id="bb_flip">Folhear</button>
          <span class="pill">Página ${pageIndex+1}/${pages.length}</span>
        </div>
        <div class="right">
          <button class="btn" id="bb_prev">◀</button>
          <button class="btn" id="bb_next">▶</button>
        </div>
      </div>

      <div id="bb_view"></div>
    `;

    const view = root.querySelector('#bb_view');
    const btnSpread = root.querySelector('#bb_spread');
    const btnFlip = root.querySelector('#bb_flip');
    const btnPrev = root.querySelector('#bb_prev');
    const btnNext = root.querySelector('#bb_next');

    const paint = () => {
      const goPrev = () => {
        pageIndex = Math.max(0, pageIndex - (mode === 'SPREAD' ? 2 : 1));
        save();
        paint();
      };
      const goNext = () => {
        pageIndex = Math.min(pages.length - 1, pageIndex + (mode === 'SPREAD' ? 2 : 1));
        save();
        paint();
      };

      btnSpread.classList.toggle('primary', mode === 'SPREAD');
      btnFlip.classList.toggle('primary', mode === 'FOLHEAR');

      // ✅ IMPORTANT: swipe bound ONLY on view (single element), callbacks updated every paint
      bindSwipeOnce(view, goPrev, goNext);

      if (mode === 'SPREAD'){
        const left = pages[pageIndex];
        const right = pages[Math.min(pages.length-1, pageIndex+1)];
        view.innerHTML = `
          <div class="paper">
            <div style="display:flex; gap:14px; justify-content:center; width:100%; flex-wrap:wrap;">
              ${renderPage(left, { withSend: left.kind==='puzzle' })}
              ${right && right !== left ? renderPage(right, { withSend: right.kind==='puzzle' }) : ''}
            </div>
          </div>
        `;
      } else {
        const page = pages[pageIndex];
        view.innerHTML = `
          <div class="paper">
            ${renderPage(page, { withSend: page.kind==='puzzle' })}
          </div>
        `;
      }

      // bind buttons inside view
      view.querySelectorAll('[data-send="ws"]').forEach((b) => {
        b.onclick = () => {
          const page = pages[pageIndex];
          if (!page || page.kind !== 'puzzle') return;
          const ws = {
            title: page.title,
            preset: page.size <= 13 ? 'BR_POCKET' : 'BR_PLUS',
            size: page.size,
            maxWords: page.maxWords,
            includeKey: true,
            words: (page.wordsNorm || []).join('\n'),
            puzzleId: page.sectionId || String(page.pageNo),
            sectionId: page.sectionId || '',
            sectionTitle: page.title || '',
            output: '',
            ts: Date.now()
          };
          Storage.set('wordsearch:seed', ws);
          try { this.app.toast?.('Enviado ✅ (abra Caça-Palavras)'); } catch {}
          try { this.app.log?.(`[BOOK] send->wordsearch page=${page.pageNo} size=${page.size} words=${(page.wordsNorm||[]).length}`); } catch {}
        };
      });

      btnPrev.onclick = goPrev;
      btnNext.onclick = goNext;
    };

    btnSpread.onclick = () => { mode = 'SPREAD'; save(); paint(); };
    btnFlip.onclick   = () => { mode = 'FOLHEAR'; save(); paint(); };

    paint();

    try { this.app.log?.(`[BOOK] render ok pages=${pages.length} at ${nowISO()}`); } catch {}
  }
}
