/* FILE: /js/modules/cultural_book_builder.js */
// Bright Cup Creator — Cultural Book Builder v0.3d PADRÃO (1 ano)
// PATCH "FOLHA FIXA + GRADE CLÁSSICA":
// - Folha (paper) com tamanho FIXO (aspect-ratio 6x9) — não cresce com conteúdo
// - Conteúdo interno rola (quando precisar), sem estourar o tamanho da folha
// - Grade do caça-palavras estilo “revistinha clássica” (quadrado, sem cápsulas)
// - Lista de palavras em linha (separador), sem chips/cápsulas
// - Swipe para folhear (iPhone) volta a funcionar no card da folha

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

function uniq(list){
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

function pickWords(words, gridSize, maxCount){
  const maxLen = gridSize;
  const filtered = uniq(words).filter(w => w.length >= 3 && w.length <= maxLen);
  filtered.sort((a,b) => (Math.abs(a.length-7) - Math.abs(b.length-7)));
  return filtered.slice(0, Math.max(6, Number(maxCount || 0) || 0));
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

function displayWord(w){
  // DISPLAY pode manter acento/ç (só normaliza espaços)
  return String(w || '').trim().replace(/\s+/g,' ').toUpperCase();
}

function buildDefaultPlanMG(grid=15, wpp=20){
  // fallback: se storage limpar
  return {
    meta: {
      id: 'MG_CULTURAL_BOOK_01',
      title: 'MINAS GERAIS CULTURAL',
      subtitle: 'História • Sabores • Tradições • Curiosidades • Caça-Palavras',
      format: '6x9',
      pages_target: 60,
      language: 'pt-BR',
      grid_default: grid,
      words_per_puzzle: wpp,
      include_key: true,
      createdAt: new Date().toISOString()
    },
    sections: [
      { id:'intro_minas', icon:'mountain', title:'O que é Minas?', text:'Minas é serra no horizonte e café passado na hora.', wordHints:['MINAS','SERRA','CAFÉ','TRADIÇÃO','CULTURA'] }
    ]
  };
}

function buildPages(plan){
  const m = plan.meta || {};
  const gridDefault = Number(m.grid_default || 15);
  const wppDefault  = Number(m.words_per_puzzle || 20);

  const pages = [];

  pages.push({
    kind:'text',
    icon:'history',
    title: m.title || 'LIVRO',
    meta: (m.subtitle || '').trim(),
    body: wrap(
      `Apresentação\n\nEste livro é uma viagem por Minas Gerais: sabores, histórias, fé, trilhos e montanhas.\n\n` +
      `Cada seção traz um texto curto e um caça-palavras temático.\n\n` +
      `No final, você encontra o gabarito completo. Boa leitura e bom passatempo.`,
      72
    )
  });

  (plan.sections || []).forEach((s) => {
    pages.push({
      kind:'text',
      icon: s.icon,
      title: s.title,
      meta: 'Texto cultural',
      body: wrap(s.text || '', 72),
      sectionId: s.id
    });

    const rawHints = []
      .concat(s.wordHints || [])
      .concat([s.title, 'Minas', 'Cultura', 'História', 'Uai']);

    const wordsNorm = pickWords(rawHints, gridDefault, wppDefault);

    // DISPLAY: tenta preservar ortografia (acentos/ç) quando couber na grade
    const wordsDisplay = uniq(rawHints.map(displayWord))
      .filter(w => {
        const n = normalizeWord(w);
        return n.length >= 3 && n.length <= gridDefault;
      })
      .slice(0, Math.max(wordsNorm.length, 6));

    pages.push({
      kind:'puzzle',
      icon: s.icon,
      title: `Caça-Palavras — ${s.title}`,
      meta: `Grade ${gridDefault}x${gridDefault} • (preview editorial)`,
      sectionId: s.id,
      sectionTitle: s.title,
      grid: gridDefault,
      wordsNorm,
      wordsDisplay
    });
  });

  pages.push({
    kind:'text',
    icon:'history',
    title:'Gabarito (no final)',
    meta:'(entra completo no Export PDF)',
    body: wrap(
      `O gabarito completo entra na fase do Export PDF (KDP).\n\n` +
      `Aqui no Builder a gente valida: ordem, texto, tema, grade e padrão editorial.`,
      72
    )
  });

  pages.forEach((p,i)=> p.pageNo = i+1);
  return pages;
}

function seedKeyForPlan(plan){
  const pid = String(plan?.meta?.id || 'book');
  const ts = String(plan?.meta?.createdAt || '');
  return `cultural:builder_cache:${pid}:${ts}`;
}

function getPuzzleCache(plan){
  return Storage.get(seedKeyForPlan(plan), { puzzles:{} });
}
function setPuzzleCache(plan, cache){
  Storage.set(seedKeyForPlan(plan), cache || { puzzles:{} });
}

function ensurePuzzleGenerated(plan, page){
  if (!page || page.kind !== 'puzzle') return null;
  const cache = getPuzzleCache(plan);
  const key = `p${page.pageNo}:${page.sectionId || ''}:${page.grid || ''}`;
  if (cache?.puzzles?.[key]) return cache.puzzles[key];

  const gen = generateWordSearch({
    size: page.grid || 15,
    words: page.wordsNorm || [],
    maxWords: (page.wordsNorm || []).length || 16,
    allowDiagonal: true,
    allowBackwards: true
  });

  const payload = {
    size: gen.size,
    grid: gen.grid,
    placedCount: (gen.placed || []).length,
    wordsUsed: (gen.words || []).length
  };

  cache.puzzles = cache.puzzles || {};
  cache.puzzles[key] = payload;
  setPuzzleCache(plan, cache);

  return payload;
}

// ✅ grid render 1-container (sem rows) — evita corte no iPhone
function renderGridHTML(grid){
  const N = grid?.length || 0;
  if (!N) return '<div class="ws-empty">Grade vazia</div>';

  let html = `<div class="ws-grid" style="--n:${N}" role="img" aria-label="Caça-palavras">`;
  for (let y=0;y<N;y++){
    for (let x=0;x<N;x++){
      html += `<div class="ws-cell">${esc(grid[y][x] || '')}</div>`;
    }
  }
  html += '</div>';
  return html;
}

function renderWordsInline(wordsDisplay){
  const list = (wordsDisplay || []).map(displayWord).filter(Boolean);
  if (!list.length) return '';
  // separador “ — ” (clássico, ocupa menos altura)
  return list.map(w => `<span class="w">${esc(w)}</span>`).join('<span class="sep"> — </span>');
}

function bindSwipe(el, onPrev, onNext){
  if (!el) return;

  let startX = 0, startY = 0, tracking = false, locked = false;

  const onStart = (x,y) => { startX=x; startY=y; tracking=true; locked=false; };
  const onMove  = (x,y,ev) => {
    if (!tracking) return;
    const dx = x - startX;
    const dy = y - startY;
    if (!locked && Math.abs(dx) > 18 && Math.abs(dx) > Math.abs(dy) * 1.2) locked = true;
    if (locked) { try { ev.preventDefault(); } catch {} }
  };
  const onEnd   = (x,y) => {
    if (!tracking) return;
    tracking = false;

    const dx = x - startX;
    const dy = y - startY;
    if (Math.abs(dx) < 55) return;
    if (Math.abs(dx) < Math.abs(dy) * 1.2) return;

    if (dx > 0) onPrev?.();
    else onNext?.();
  };

  // ⚠️ touchstart PASSIVE true, touchmove PASSIVE false (para allow preventDefault)
  el.addEventListener('touchstart', (e)=>{
    const t = e.touches?.[0];
    if (!t) return;
    onStart(t.clientX, t.clientY);
  }, { passive:true });

  el.addEventListener('touchmove', (e)=>{
    const t = e.touches?.[0];
    if (!t) return;
    onMove(t.clientX, t.clientY, e);
  }, { passive:false });

  el.addEventListener('touchend', (e)=>{
    const t = e.changedTouches?.[0];
    if (!t) return;
    onEnd(t.clientX, t.clientY);
  }, { passive:true });

  // mouse (desktop)
  let mouseDown = false;
  el.addEventListener('mousedown', (e)=>{ mouseDown=true; onStart(e.clientX, e.clientY); });
  window.addEventListener('mousemove', (e)=>{ if(!mouseDown) return; onMove(e.clientX, e.clientY, e); }, { passive:false });
  window.addEventListener('mouseup', (e)=>{ if(!mouseDown) return; mouseDown=false; onEnd(e.clientX, e.clientY); });
}

export class CulturalBookBuilderModule {
  constructor(app){
    this.app = app;
    this.id = 'book';
    this.title = 'Livro (Builder)';
  }

  async init(){}

  render(root){
    let plan = Storage.get('cultural:book_plan', null);
    const seed = Storage.get('cultural:builder_seed', { mode:'FOLHEAR', pageIndex: 0 });
    const saveSeed = (next) => Storage.set('cultural:builder_seed', next);

    root.innerHTML = `
      <style>
        /* ===== Builder layout ===== */
        .bb-wrap{ display:grid; gap:14px; }
        .bb-toolbar{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; justify-content:space-between; }
        .bb-toolbar .left, .bb-toolbar .right{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; }

        .bb-top{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; justify-content:space-between; margin-top:6px; }
        .bb-tabs{ display:flex; gap:8px; align-items:center; }
        .bb-mini{ font-size:12px; opacity:.78; }

        /* ===== PAPER (folha fixa) ===== */
        .paper{
          width: min(560px, 100%);
          aspect-ratio: 2 / 3; /* 6x9 */
          background: #ffffff;
          color: #111;
          border: 1px solid rgba(0,0,0,.18);
          box-shadow: 0 14px 45px rgba(0,0,0,.22);
          border-radius: 10px;
          overflow: hidden;
          margin: 0 auto;
          position: relative;
        }
        .paper-inner{
          height: 100%;
          display:flex;
          flex-direction:column;
          padding: 14px 14px 12px 14px;
          gap: 10px;
        }

        .paper-head{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:12px;
          border-bottom: 1px solid rgba(0,0,0,.12);
          padding-bottom: 8px;
        }
        .paper-title{
          font-size: clamp(20px, 5.4vw, 30px);
          line-height: 1.05;
          font-weight: 900;
          letter-spacing: -0.3px;
        }
        .paper-meta{
          font-size: clamp(12px, 3.4vw, 15px);
          opacity: .72;
          margin-top: 4px;
        }
        .paper-no{
          font-size: 14px;
          opacity:.65;
          font-weight: 900;
          padding-top: 6px;
          min-width: 54px;
          text-align:right;
        }

        /* ===== Content area (scroll inside paper) ===== */
        .paper-body{
          flex: 1;
          min-height: 0;
          overflow: auto;
          padding: 8px 2px 2px 2px;
        }
        .paper-body pre{
          margin:0;
          white-space:pre-wrap;
          overflow-wrap:anywhere;
          word-break:break-word;
          font-family: ui-serif, Georgia, "Times New Roman", serif;
          font-size: clamp(15px, 4.0vw, 19px);
          line-height: 1.35;
        }

        /* ===== Puzzle ===== */
        .puzzle{
          display:flex;
          flex-direction:column;
          gap:10px;
          height: 100%;
        }
        .ws-frame{
          border: 1px solid rgba(0,0,0,.18);
          padding: 8px;
          display:flex;
          align-items:center;
          justify-content:center;
          overflow:hidden;
        }

        /* ✅ grade clássica, sem cápsulas e SEM corte */
        .ws-grid{
          --n: 15;
          width: 100%;
          max-width: 100%;
          display:grid;
          grid-template-columns: repeat(var(--n), 1fr);
          gap: 1px;
        }
        .ws-cell{
          aspect-ratio: 1 / 1;
          display:flex;
          align-items:center;
          justify-content:center;
          border: 1px solid #111;
          background: transparent;
          border-radius: 0;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-weight: 800;
          font-size: clamp(10px, 2.35vw, 15px);
          line-height: 1;
        }

        /* ===== Words (inline, compacto) ===== */
        .words-box{
          border-top: 1px solid rgba(0,0,0,.12);
          padding-top: 8px;
        }
        .words-title{
          font-size: 13px;
          font-weight: 900;
          opacity: .85;
          margin-bottom: 6px;
        }
        .words-line{
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
          font-size: clamp(12px, 3.3vw, 15px);
          line-height: 1.25;
          font-weight: 800;
          opacity: .92;
          word-break: break-word;
        }
        .words-line .w{ white-space: nowrap; }
        .words-line .sep{ opacity:.55; }

        /* ===== Foot ===== */
        .paper-foot{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          padding-top: 2px;
          font-size: 12px;
          opacity:.8;
        }

        /* spread */
        .spread{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap:14px;
          align-items:start;
        }
        @media (max-width: 860px){
          .spread{ grid-template-columns: 1fr; }
        }
      </style>

      <div class="bb-wrap">
        <div class="card">
          <h2>Livro Cultural — Builder</h2>
          <p class="muted">Preview visual do livro (folha fixa). Folheie e valide como produto final.</p>
          <div id="bb_area"></div>
        </div>
      </div>
    `;

    const area = root.querySelector('#bb_area');

    const renderEmpty = () => {
      area.innerHTML = `
        <div class="bb-empty">
          <p class="muted"><b>Nenhum livro carregado.</b> Isso pode acontecer se o Safari limpar o armazenamento.</p>
          <div class="row">
            <button class="btn primary" id="bb_make">Criar Livro Minas (PADRÃO)</button>
            <button class="btn" id="bb_go_agent">Abrir Cultural Agent</button>
          </div>
          <p class="bb-mini muted">Dica: exporte o plano em JSON no Cultural Agent para backup.</p>
        </div>
      `;

      area.querySelector('#bb_make').onclick = () => {
        plan = buildDefaultPlanMG(15, 20);
        Storage.set('cultural:book_plan', plan);
        this.app.toast?.('Livro Minas criado ✅');
        renderMain();
      };

      area.querySelector('#bb_go_agent').onclick = () => {
        const btn = document.querySelector('.navitem[data-view="cultural"]');
        btn?.click?.();
      };
    };

    const renderPaper = (page, plan, withButton=true) => {
      if (!page) return '';

      if (page.kind === 'text') {
        return `
          <div class="paper">
            <div class="paper-inner">
              <div class="paper-head">
                <div>
                  <div class="paper-title">${esc(page.title || '')}</div>
                  <div class="paper-meta">${esc(page.meta || '')}</div>
                </div>
                <div class="paper-no">p.${esc(String(page.pageNo || ''))}</div>
              </div>

              <div class="paper-body"><pre>${esc(page.body || '')}</pre></div>

              <div class="paper-foot">
                <span>Ilustração P&B: <b>${esc(iconLabel(page.icon))}</b></span>
                <span></span>
              </div>
            </div>
          </div>
        `;
      }

      const gen = ensurePuzzleGenerated(plan, page);
      const gridHtml = renderGridHTML(gen?.grid);

      return `
        <div class="paper">
          <div class="paper-inner">
            <div class="paper-head">
              <div>
                <div class="paper-title">${esc(page.title || '')}</div>
                <div class="paper-meta">${esc(page.meta || '')} • palavras ${esc(String(gen?.placedCount || 0))}</div>
              </div>
              <div class="paper-no">p.${esc(String(page.pageNo || ''))}</div>
            </div>

            <div class="paper-body">
              <div class="puzzle">
                <div class="ws-frame">${gridHtml}</div>

                <div class="words-box">
                  <div class="words-title">Palavras (ortografia)</div>
                  <div class="words-line">${renderWordsInline(page.wordsDisplay || page.wordsNorm || [])}</div>
                </div>

                <div style="margin-top:auto; font-size:12px; opacity:.72;">
                  Ilustração P&B (no PDF): <b>${esc(iconLabel(page.icon))}</b>
                </div>
              </div>
            </div>

            <div class="paper-foot">
              ${withButton ? `<button class="btn" data-send="ws">Enviar p/ Caça-palavras</button>` : `<span></span>`}
              <span></span>
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
        words: (page.wordsNorm || []).join('\n'),
        puzzleId: page.sectionId || '',
        sectionId: page.sectionId || '',
        sectionTitle: page.sectionTitle || '',
        output: '',
        ts: Date.now()
      };
      Storage.set('wordsearch:seed', ws);
      this.app.toast?.('Enviado ✅ (abra Caça-palavras e clique Gerar+Salvar)');
      try { this.app.log?.(`[BOOK] sent section="${page.sectionTitle || ''}" grid=${ws.size} words=${(page.wordsNorm||[]).length}`); } catch {}
    };

    const renderMain = () => {
      if (!plan) return renderEmpty();

      const pages = buildPages(plan);
      let mode = seed.mode === 'SPREAD' ? 'SPREAD' : 'FOLHEAR';
      let pageIndex = Math.max(0, Math.min(seed.pageIndex || 0, pages.length - 1));

      const save = () => saveSeed({ mode, pageIndex });

      const goPrev = () => { pageIndex = Math.max(0, pageIndex - (mode==='SPREAD'?2:1)); save(); paint(); };
      const goNext = () => { pageIndex = Math.min(pages.length - 1, pageIndex + (mode==='SPREAD'?2:1)); save(); paint(); };

      area.innerHTML = `
        <div class="bb-toolbar">
          <div class="left">
            <span class="bb-mini"><b>${esc(plan.meta?.title || 'LIVRO')}</b></span>
          </div>
          <div class="right">
            <button class="btn" id="bb_prev">◀</button>
            <button class="btn" id="bb_next">▶</button>
          </div>
        </div>

        <div class="bb-top">
          <div class="bb-tabs">
            <button class="btn ${mode==='SPREAD'?'primary':''}" id="bb_mode_spread">Spread</button>
            <button class="btn ${mode==='FOLHEAR'?'primary':''}" id="bb_mode_folhear">Folhear</button>
          </div>
          <div class="bb-mini">Página <b id="bb_pos"></b></div>
        </div>

        <div id="bb_view"></div>

        <div class="bb-toolbar" style="margin-top:10px;">
          <div class="left">
            <button class="btn" id="bb_download_plan">Baixar plano (JSON)</button>
            <button class="btn" id="bb_reset">Recriar Minas (PADRÃO)</button>
          </div>
          <div class="right">
            <button class="btn" id="bb_go_agent">Abrir Agent</button>
          </div>
        </div>
      `;

      const view = area.querySelector('#bb_view');

      const paint = () => {
        area.querySelector('#bb_pos').textContent = `${pageIndex+1}/${pages.length}`;

        if (mode === 'FOLHEAR') {
          const p = pages[pageIndex];
          view.innerHTML = renderPaper(p, plan, true);

          const paper = view.querySelector('.paper');
          bindSwipe(paper, goPrev, goNext);

          const btn = view.querySelector('[data-send="ws"]');
          if (btn) btn.onclick = () => sendPageToWordSearch(p, plan);
          return;
        }

        const left = pages[pageIndex];
        const right = pages[pageIndex+1] || null;

        view.innerHTML = `
          <div class="spread">
            <div>${renderPaper(left, plan, true)}</div>
            <div>${right ? renderPaper(right, plan, true) : ''}</div>
          </div>
        `;

        // swipe no container do spread
        bindSwipe(view, goPrev, goNext);

        const papers = view.querySelectorAll('.paper');
        papers.forEach((paperEl, idxPaper)=>{
          const page = idxPaper===0 ? left : right;
          const btn = paperEl.querySelector('[data-send="ws"]');
          if (btn && page) btn.onclick = () => sendPageToWordSearch(page, plan);
        });
      };

      area.querySelector('#bb_prev').onclick = goPrev;
      area.querySelector('#bb_next').onclick = goNext;

      area.querySelector('#bb_mode_spread').onclick = () => { mode='SPREAD'; pageIndex = Math.max(0, Math.min(pageIndex, pages.length-1)); save(); renderMain(); };
      area.querySelector('#bb_mode_folhear').onclick = () => { mode='FOLHEAR'; save(); renderMain(); };

      area.querySelector('#bb_reset').onclick = () => {
        plan = buildDefaultPlanMG(15, 20);
        Storage.set('cultural:book_plan', plan);
        Storage.set('cultural:builder_seed', { mode:'FOLHEAR', pageIndex: 0 });
        this.app.toast?.('Livro recriado ✅');
        renderMain();
      };

      area.querySelector('#bb_go_agent').onclick = () => {
        const btn = document.querySelector('.navitem[data-view="cultural"]');
        btn?.click?.();
      };

      area.querySelector('#bb_download_plan').onclick = () => {
        if (!plan) return;
        try{
          const blob = new Blob([JSON.stringify(plan, null, 2)], { type:'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `book-plan-${(plan?.meta?.id||'cultural')}-${Date.now()}.json`;
          a.click();
          setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
          this.app.toast?.('Plano baixado ✅');
        } catch {
          this.app.toast?.('Falha ao baixar', 'err');
        }
      };

      paint();
    };

    if (!plan) renderEmpty();
    else renderMain();
  }
}
