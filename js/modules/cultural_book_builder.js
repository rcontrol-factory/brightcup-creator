/* FILE: /js/modules/cultural_book_builder.js */
// Bright Cup Creator — Cultural Book Builder v0.4b PADRÃO (1 ano)
// v0.4b FIX:
// - Grid sempre cabe no iPhone: mede largura REAL do viewport e recalcula cell
// - Word list sem "..." (remove ellipsis + permite quebrar linha)
// - Não usa título da seção como palavra (evita "OQUEEMINAS" etc.)
// - Mantém folha fixa e swipe sem pular 2 páginas

import { Storage } from '../core/storage.js';

const $esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function normWordGrid(s){
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

function uniq(list){
  const seen = new Set();
  const out = [];
  for (const it of list){
    const key = String(it||'').trim().toUpperCase();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

function makeFillChar(){
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return A[Math.floor(Math.random()*A.length)];
}

function makeEmptyGrid(size){
  const g = [];
  for (let r=0;r<size;r++){
    const row = [];
    for (let c=0;c<size;c++) row.push('');
    g.push(row);
  }
  return g;
}

function canPlaceWord(grid, word, r, c, dr, dc){
  const n = word.length;
  const size = grid.length;
  const rr = r + dr*(n-1);
  const cc = c + dc*(n-1);
  if (rr < 0 || rr >= size || cc < 0 || cc >= size) return false;

  for (let i=0;i<n;i++){
    const R = r + dr*i;
    const C = c + dc*i;
    const ch = word[i];
    const cur = grid[R][C];
    if (cur && cur !== ch) return false;
  }
  return true;
}

function placeWord(grid, word, r, c, dr, dc){
  for (let i=0;i<word.length;i++){
    const R = r + dr*i;
    const C = c + dc*i;
    grid[R][C] = word[i];
  }
}

function generateWordSearch(size, words){
  const directions = [
    {dr:0, dc:1},   // →
    {dr:1, dc:0},   // ↓
    {dr:1, dc:1},   // ↘
    {dr:-1, dc:1},  // ↗
  ];

  const grid = makeEmptyGrid(size);
  const placed = [];
  const failures = [];

  const sorted = [...words].sort((a,b)=>b.length-a.length);

  for (const w of sorted){
    let ok = false;
    for (let t=0;t<280;t++){
      const dir = directions[Math.floor(Math.random()*directions.length)];
      const r = Math.floor(Math.random()*size);
      const c = Math.floor(Math.random()*size);
      if (canPlaceWord(grid, w, r, c, dir.dr, dir.dc)){
        placeWord(grid, w, r, c, dir.dr, dir.dc);
        placed.push(w);
        ok = true;
        break;
      }
    }
    if (!ok) failures.push(w);
  }

  for (let r=0;r<size;r++){
    for (let c=0;c<size;c++){
      if (!grid[r][c]) grid[r][c] = makeFillChar();
    }
  }

  return { grid, placed, failures };
}

function wrapLines(text, max=72){
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

function resolveLayout(meta){
  const L = (meta && meta.layout) || {};
  return {
    paperMaxW: Number(L.paperMaxW || 520),
    pageH:     Number(L.pageH || 720),
    pad:       Number(L.pad || 22),
    titleSize: Number(L.titleSize || 26),
    metaSize:  Number(L.metaSize || 13),
    bodySize:  Number(L.bodySize || 18),
    gridGap:   Number(L.gridGap || 2),
    gridBorder:Number(L.gridBorder || 2),
    gridCell:  Number(L.gridCell || 26),
    gridFont:  Number(L.gridFont || 14),
    wordsSize: Number(L.wordsSize || 16),
    wordsCols: Number(L.wordsCols || 3),
  };
}

function styleTag(layout){
  return `
<style>
  .bc-bookwrap{ display:flex; flex-direction:column; gap:12px; }

  .bc-toolbar{
    display:flex; align-items:center; justify-content:space-between;
    gap:10px; flex-wrap:wrap;
    padding:10px 12px;
    border:1px solid rgba(255,255,255,.10);
    border-radius:16px;
    background:rgba(0,0,0,.16);
    backdrop-filter: blur(8px);
  }
  .bc-toolbar .left, .bc-toolbar .right{ display:flex; gap:10px; align-items:center; flex-wrap:wrap; }

  .bc-btn{
    appearance:none;
    border:1px solid rgba(255,255,255,.14);
    background:rgba(255,255,255,.06);
    color:rgba(255,255,255,.92);
    padding:10px 12px;
    border-radius:14px;
    font-weight:800;
    letter-spacing:.2px;
  }
  .bc-btn.primary{ background:rgba(90,160,255,.20); border-color:rgba(90,160,255,.35); }
  .bc-btn:active{ transform: translateY(1px); }

  .bc-view{ display:flex; justify-content:center; padding:10px 0 18px; }

  .bc-pageViewport{
    width:min(${layout.paperMaxW}px, calc(100vw - 28px));
    height:${layout.pageH}px;
    overflow:hidden;
    border-radius:26px;
    background: linear-gradient(180deg, rgba(255,255,255,.95), rgba(245,248,248,.95));
    box-shadow: 0 18px 46px rgba(0,0,0,.35);
    border:1px solid rgba(0,0,0,.08);
  }

  .bc-paper{
    height:100%;
    width:100%;
    display:flex;
    flex-direction:column;
    padding:${layout.pad}px;
    box-sizing:border-box;
    overflow:hidden;
  }

  .bc-head{ display:flex; justify-content:space-between; gap:10px; align-items:flex-start; margin-bottom:8px; }
  .bc-title{
    margin:0;
    font-size:${layout.titleSize}px;
    line-height:1.04;
    letter-spacing:-0.3px;
    color:#141a1f;
    font-weight:900;
  }
  .bc-pno{ font-weight:800; color:rgba(20,26,31,.55); font-size:16px; padding-top:4px; }

  .bc-meta{
    display:flex; gap:10px; align-items:center; flex-wrap:wrap;
    font-size:${layout.metaSize}px;
    color:rgba(20,26,31,.55);
    margin: 2px 0 10px;
  }
  .bc-hr{ height:1px; background:rgba(20,26,31,.12); margin: 6px 0 14px; flex:0 0 auto; }

  .bc-body{
    flex: 1 1 auto;
    overflow:hidden;
    display:flex;
    flex-direction:column;
    gap:14px;
  }

  .bc-textBox{
    border:1px solid rgba(20,26,31,.10);
    border-radius:18px;
    background:rgba(255,255,255,.55);
    padding:16px 16px;
    overflow:hidden;
  }
  .bc-text{
    white-space:pre-wrap;
    font-size:${layout.bodySize}px;
    line-height:1.35;
    color:#141a1f;
    font-family: ui-serif, Georgia, "Times New Roman", Times, serif;
  }

  .bc-puzzleWrap{
    flex: 1 1 auto;
    display:flex;
    flex-direction:column;
    gap:12px;
    overflow:hidden;
  }

  .bc-grid{
    width:100%;
    display:grid;
    gap:${layout.gridGap}px;
    background:transparent;
    padding:0;
    overflow:hidden;
  }

  .bc-cell{
    display:flex;
    align-items:center;
    justify-content:center;
    aspect-ratio: 1 / 1;
    border:${layout.gridBorder}px solid rgba(20,26,31,.65);
    border-radius:0;
    font-weight:900;
    color:#111;
    background: rgba(255,255,255,.92);
    font-family: ui-monospace, Menlo, Consolas, "SFMono-Regular", monospace;
  }

  .bc-wordsTitle{
    margin: 0;
    font-size: 34px;
    letter-spacing:-0.5px;
    color:#141a1f;
    font-weight:900;
  }

  .bc-wordsGrid{
    display:grid;
    grid-template-columns: repeat(${layout.wordsCols}, 1fr);
    gap: 8px 18px;
    margin-top: 8px;
    overflow:hidden;
  }

  .bc-wordRow{
    display:flex;
    align-items:flex-end;
    gap:10px;
    min-width:0;
  }

  /* IMPORTANT: sem "..." */
  .bc-word{
    font-weight:900;
    font-size:${layout.wordsSize}px;
    letter-spacing:.6px;
    color:#141a1f;
    text-transform:uppercase;
    white-space:normal;       /* permite quebrar linha */
    overflow:visible;         /* sem corte */
    text-overflow:clip;
    word-break:break-word;
    line-height:1.05;
  }

  .bc-dots{
    flex:1;
    border-bottom: 3px dotted rgba(20,26,31,.20);
    transform: translateY(-3px);
    min-width:18px;
  }

  .bc-foot{
    margin-top:auto;
    padding-top:12px;
    color:rgba(20,26,31,.60);
    font-size:15px;
  }

  @media (max-width: 420px){
    .bc-pageViewport{ height:${Math.max(640, Math.floor(layout.pageH*0.92))}px; }
    .bc-title{ font-size:${Math.max(22, layout.titleSize-4)}px; }
    .bc-wordsTitle{ font-size: 30px; }
    .bc-wordsGrid{ grid-template-columns: repeat(3, 1fr); }
  }
</style>
`;
}

function buildWordsGridHTML(words){
  const clean = uniq(words.map(displayWord)).filter(Boolean);
  return `
    <div class="bc-wordsGrid">
      ${clean.map(w => `
        <div class="bc-wordRow">
          <div class="bc-word">${$esc(w)}</div>
          <div class="bc-dots"></div>
        </div>
      `).join('')}
    </div>
  `;
}

function calcGridCell(layout, size, viewportW){
  // viewportW = largura REAL do bb_viewport (no iPhone isso resolve o corte)
  const pad = layout.pad;
  const effectiveW = Math.min(layout.paperMaxW, Number(viewportW || layout.paperMaxW));
  const usable = Math.max(240, effectiveW - pad*2);
  const gapTotal = (size-1) * layout.gridGap;
  const cell = Math.floor((usable - gapTotal) / size);
  return clamp(cell, 16, 34);
}

function gridHTML(layout, grid, viewportW){
  const size = grid.length || 0;
  const cell = calcGridCell(layout, size, viewportW);
  const cols = `repeat(${size}, ${cell}px)`;

  const font = clamp(Math.floor(cell*0.52), 10, 16);

  return `
    <div class="bc-grid" style="grid-template-columns:${cols}; justify-content:center;">
      ${grid.map(row => row.map(ch => `
        <div class="bc-cell" style="width:${cell}px; font-size:${font}px;">${$esc(ch)}</div>
      `).join('')).join('')}
    </div>
  `;
}

function pagePuzzleHTML(page, layout, viewportW){
  const meta = page.meta || {};
  const title = page.title || 'Caça-Palavras';
  const pno = page.pageLabel || '';

  const grid = page.grid || [];
  const size = Number(meta.size || grid.length || 15);
  const placed = Number(meta.placed || 0);

  const words = (page.wordsDisplay && page.wordsDisplay.length)
    ? page.wordsDisplay
    : (page.words || []);

  return `
    <div class="bc-paper">
      <div class="bc-head">
        <h1 class="bc-title">${$esc(title)}</h1>
        <div class="bc-pno">${$esc(pno)}</div>
      </div>

      <div class="bc-meta">
        <span>grade ${size}x${size}</span>
        <span>•</span>
        <span>palavras ${placed || words.length || 0}</span>
      </div>

      <div class="bc-hr"></div>

      <div class="bc-body">
        <div class="bc-puzzleWrap">
          ${gridHTML(layout, grid, viewportW)}
          <div>
            <h2 class="bc-wordsTitle">Palavras</h2>
            ${buildWordsGridHTML(words)}
          </div>
        </div>

        <div class="bc-foot">Ilustração P&amp;B: <b>${$esc(page.illustrationLabel || title)}</b></div>
      </div>
    </div>
  `;
}

function pageTextHTML(page, layout){
  const title = page.title || 'Texto';
  const pno = page.pageLabel || '';
  const txt = String(page.text || '').trim();

  return `
    <div class="bc-paper">
      <div class="bc-head">
        <h1 class="bc-title">${$esc(title)}</h1>
        <div class="bc-pno">${$esc(pno)}</div>
      </div>

      <div class="bc-meta"><span>Texto cultural</span></div>
      <div class="bc-hr"></div>

      <div class="bc-body">
        <div class="bc-textBox">
          <div class="bc-text">${$esc(wrapLines(txt, 72))}</div>
        </div>
        <div class="bc-foot">Ilustração P&amp;B: <b>${$esc(page.illustrationLabel || 'História')}</b></div>
      </div>
    </div>
  `;
}

function buildBookPagesFromPlan(plan){
  const meta = plan?.meta || {};
  const secs = plan?.sections || [];
  const pages = [];

  pages.push({
    type:'text',
    title: (meta.title || 'LIVRO').toUpperCase(),
    pageLabel: 'p.1',
    text: [
      'Apresentação ' + (meta.subtitle ? ('— ' + meta.subtitle) : ''),
      '',
      'Este livro é uma viagem por Minas Gerais: sabores, histórias, fé, trilhos e montanhas.',
      'Cada seção traz um texto curto e um caça-palavras temático.',
      'Boa leitura e bom passatempo.'
    ].join('\n'),
    illustrationLabel: 'História'
  });

  let p = 2;
  for (const s of secs){
    pages.push({
      type:'text',
      title: s.title,
      pageLabel: `p.${p++}`,
      text: s.text || '',
      illustrationLabel: s.illustration || (s.title || 'História')
    });

    // IMPORTANT: não usa s.title como palavra (evita OQUEEMINAS etc.)
    const hints = []
      .concat(s.wordHints || [])
      .concat(['Minas', 'Cultura', 'História', 'Uai']);

    const wordsNorm = uniq(hints.map(normWordGrid))
      .filter(Boolean)
      .filter(w => w.length >= 3);

    const size = Number(meta.grid_default || 15);
    const maxWords = Number(meta.words_per_puzzle || 14);

    const filtered = wordsNorm.filter(w => w.length <= size);
    const picked = filtered.slice(0, maxWords);

    const gen = generateWordSearch(size, picked);

    const map = new Map();
    for (const raw of hints){
      const n = normWordGrid(raw);
      if (!n) continue;
      if (!map.has(n)) map.set(n, displayWord(raw));
    }

    const wordsDisplay = gen.placed.map(n => map.get(n) || n);

    pages.push({
      type:'puzzle',
      title: `Caça-Palavras — ${s.title}`,
      pageLabel: `p.${p++}`,
      grid: gen.grid,
      words: gen.placed,
      wordsDisplay,
      meta: { size, placed: gen.placed.length },
      illustrationLabel: s.title
    });
  }

  return pages;
}

export class CulturalBookBuilderModule {
  constructor(app){
    this.app = app;
    this.id = 'book';
    this.title = 'Book Builder';
    this._navLock = false;
    this._navTs = 0;
  }

  async init(){}

  render(root){
    const plan = Storage.get('cultural:book_plan', null);
    const fallback = Storage.get('cultural:seed', null);

    const planMeta = plan?.meta || {};
    const layout = resolveLayout(planMeta);

    root.innerHTML = `
      ${styleTag(layout)}
      <div class="bc-bookwrap">
        <div class="bc-toolbar">
          <div class="left">
            <button class="bc-btn" id="bb_spread">Spread</button>
            <button class="bc-btn primary" id="bb_folhear">Folhear</button>
            <span class="muted" id="bb_pageLabel" style="opacity:.85;font-weight:800;"></span>
          </div>
          <div class="right">
            <button class="bc-btn" id="bb_prev">◀</button>
            <button class="bc-btn" id="bb_next">▶</button>
            <button class="bc-btn" id="bb_download_plan">Baixar plano (JSON)</button>
            <button class="bc-btn" id="bb_rebuild">Recriar Minas (PADRÃO)</button>
          </div>
        </div>

        <div class="bc-view">
          <div class="bc-pageViewport" id="bb_viewport"></div>
        </div>
      </div>
    `;

    const $ = (s)=>root.querySelector(s);
    const viewport = $('#bb_viewport');
    const pageLabel = $('#bb_pageLabel');

    const renderMain = () => {
      let currentPlan = Storage.get('cultural:book_plan', null);

      if (!currentPlan && fallback?.planText){
        // placeholder
      }

      if (!currentPlan){
        viewport.innerHTML = `
          <div class="bc-paper">
            <div class="bc-head">
              <h1 class="bc-title">Nenhum plano</h1>
              <div class="bc-pno"></div>
            </div>
            <div class="bc-meta"><span>Abra o Cultural Agent e clique “Gerar Plano do Livro (MG)”</span></div>
            <div class="bc-hr"></div>
            <div class="bc-body">
              <div class="bc-textBox"><div class="bc-text">Sem conteúdo ainda.</div></div>
              <div class="bc-foot">Ilustração P&amp;B: <b>—</b></div>
            </div>
          </div>
        `;
        pageLabel.textContent = 'Página 0/0';
        return;
      }

      const pages = buildBookPagesFromPlan(currentPlan);
      Storage.set('book:pages', pages);

      let idx = Storage.get('book:idx', 0);
      idx = clamp(idx, 0, Math.max(0, pages.length-1));
      Storage.set('book:idx', idx);

      const paint = () => {
        const pagesNow = Storage.get('book:pages', pages) || pages;
        let i = Storage.get('book:idx', idx);
        i = clamp(i, 0, Math.max(0, pagesNow.length-1));

        const page = pagesNow[i];
        pageLabel.textContent = `Página ${i+1}/${pagesNow.length}`;

        // MEDIDA REAL do viewport (resolve corte lateral no iPhone)
        const vw = viewport?.clientWidth || (currentPlan?.meta?.layout?.paperMaxW || 520);

        const lay = resolveLayout(currentPlan.meta || {});
        if (page.type === 'puzzle'){
          viewport.innerHTML = pagePuzzleHTML(page, lay, vw);
        } else {
          viewport.innerHTML = pageTextHTML(page, lay);
        }
      };

      const nav = (dir) => {
        const now = Date.now();
        if (this._navLock) return;
        if (now - this._navTs < 260) return;

        this._navLock = true;
        this._navTs = now;

        const pagesNow = Storage.get('book:pages', pages) || pages;
        let i = Storage.get('book:idx', idx);
        i = clamp(i + dir, 0, Math.max(0, pagesNow.length-1));
        Storage.set('book:idx', i);

        paint();
        setTimeout(()=>{ this._navLock = false; }, 220);
      };

      $('#bb_prev').onclick = ()=>nav(-1);
      $('#bb_next').onclick = ()=>nav(+1);

      // swipe
      let startX = 0;
      let startY = 0;
      let tracking = false;

      viewport.ontouchstart = (e) => {
        if (!e.touches || e.touches.length !== 1) return;
        const t = e.touches[0];
        startX = t.clientX;
        startY = t.clientY;
        tracking = true;
      };

      viewport.ontouchmove = (e) => {
        if (!tracking) return;
        if (!e.touches || e.touches.length !== 1) return;
        const t = e.touches[0];
        const dx = t.clientX - startX;
        const dy = t.clientY - startY;
        if (Math.abs(dy) > Math.abs(dx)) return;
        e.preventDefault?.();
      };

      viewport.ontouchend = (e) => {
        if (!tracking) return;
        tracking = false;
        const changed = e.changedTouches && e.changedTouches[0];
        if (!changed) return;
        const dx = changed.clientX - startX;
        const dy = changed.clientY - startY;
        if (Math.abs(dy) > 40) return;
        if (Math.abs(dx) < 40) return;
        if (dx < 0) nav(+1);
        else nav(-1);
      };

      $('#bb_spread').onclick = () => this.app.toast?.('Spread (em breve)');
      $('#bb_folhear').onclick = () => this.app.toast?.('Folhear ativo ✅');

      $('#bb_rebuild').onclick = () => {
        try{
          const btn = document.querySelector('.navitem[data-view="cultural"]');
          btn?.click?.();
          setTimeout(()=>{
            const buildBtn = document.querySelector('#ca_build');
            buildBtn?.click?.();
            this.app.toast?.('Recriado ✅');
          }, 350);
        } catch {
          this.app.toast?.('Falha ao recriar', 'err');
        }
      };

      $('#bb_download_plan').onclick = () => {
        try{
          const p = Storage.get('cultural:book_plan', null);
          if (!p){ this.app.toast?.('Sem plano'); return; }
          const blob = new Blob([JSON.stringify(p, null, 2)], { type:'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `book-plan-${(p?.meta?.id||'cultural')}-${Date.now()}.json`;
          a.click();
          setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
          this.app.toast?.('Plano baixado ✅');
        } catch {
          this.app.toast?.('Falha ao baixar', 'err');
        }
      };

      paint();
      // re-paint curto depois pra garantir medida certa no iOS (às vezes viewport muda após render)
      setTimeout(()=>{ try{ paint(); } catch {} }, 60);
    };

    renderMain();
  }
}
