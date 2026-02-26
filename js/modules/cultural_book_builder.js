/* FILE: /js/modules/cultural_book_builder.js */
/**
 * Bright Cup Creator — Cultural Book Builder (Preview + PDF Export)
 * v0.8f FIX (page fixed + no internal scroll + swipe single step + words auto columns)
 *
 * Ajustes:
 * - Folha/página fica FIXA (não cresce com conteúdo)
 * - Remove “rolagem dentro da folha” (overflow interno)
 * - Swipe/folhear não pula 2 páginas (bind idempotente)
 * - Lista de palavras auto-ajusta colunas e fonte p/ caber (sem cortar)
 */

import { Storage } from '../core/storage.js';

const $esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function splitWords(raw){
  const out = [];
  String(raw || '').split(/\r?\n+/g).forEach(line=>{
    const t = line.trim();
    if (!t) return;
    out.push(t);
  });
  return out;
}

// Mantém “ortografia” (acentos/ç) para DISPLAY
function displayWord(s){
  return String(s || '').trim().replace(/\s+/g,' ').toUpperCase();
}

function renderWordsColumns(items){
  const safe = (items || []).map(displayWord).filter(Boolean);
  return safe.map(w => `<div class="ws-w">${$esc(w)}</div>`).join('');
}

function wordsGridVars(items){
  const n = Array.isArray(items) ? items.length : 0;
  let cols = 2;
  if (n > 12) cols = 3;
  if (n > 18) cols = 4;

  // diminui fonte conforme aumenta colunas
  let wfs = 14;
  if (cols === 3) wfs = 13;
  if (cols === 4) wfs = 12;

  return `--cols:${cols};--wfs:${wfs}px;`;
}

function bindSwipe(el, onPrev, onNext){
  if (!el) return;

  // atualiza callbacks (pra não precisar rebinder sempre)
  el.__bbSwipeHandlers = { onPrev, onNext };

  // garante que só binda 1 vez por elemento
  if (el.__bbSwipeBound) return;
  el.__bbSwipeBound = true;

  let sx = 0, sy = 0, dx = 0, dy = 0, dragging = false, pid = null;

  const getH = () => el.__bbSwipeHandlers || {};
  const callPrev = () => { try { getH().onPrev?.(); } catch {} };
  const callNext = () => { try { getH().onNext?.(); } catch {} };

  const onStart = (x, y, pointerId) => {
    sx = x; sy = y; dx = 0; dy = 0; dragging = true; pid = pointerId ?? null;
  };

  const onMove = (x, y) => {
    if (!dragging) return;
    dx = x - sx;
    dy = y - sy;
  };

  const onEnd = () => {
    if (!dragging) return;
    dragging = false;

    // threshold
    if (Math.abs(dx) > 38 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      if (dx > 0) callPrev();
      else callNext();
    }
    dx = 0; dy = 0; pid = null;
  };

  el.addEventListener('touchstart', (e) => {
    const t = e.touches?.[0];
    if (!t) return;
    onStart(t.clientX, t.clientY, null);
  }, { passive:true });

  el.addEventListener('touchmove', (e) => {
    const t = e.touches?.[0];
    if (!t) return;
    onMove(t.clientX, t.clientY);
  }, { passive:true });

  el.addEventListener('touchend', () => onEnd(), { passive:true });

  // mouse fallback
  el.addEventListener('mousedown', (e) => onStart(e.clientX, e.clientY, 'mouse'));
  window.addEventListener('mousemove', (e) => {
    if (!dragging || pid !== 'mouse') return;
    onMove(e.clientX, e.clientY);
  }, { passive:true });
  window.addEventListener('mouseup', () => {
    if (!dragging || pid !== 'mouse') return;
    onEnd();
  }, { passive:true });
}

function getBookPlan(){
  return Storage.get('cultural:book_plan', null);
}

function getBookPages(plan){
  // Transformação simples: alterna texto e puzzle por seção (padrão atual)
  // pages: capa + intro + pares (texto/puzzle) + gabarito
  const pages = [];
  const m = plan?.meta || {};
  const sections = plan?.sections || [];

  // capa
  pages.push({
    kind:'cover',
    title: (m.title || 'LIVRO').toUpperCase(),
    subtitle: m.subtitle || '',
    number: 1
  });

  // páginas por seção
  let p = 2;
  sections.forEach((s) => {
    pages.push({
      kind:'text',
      title: s.title || '',
      body: String(s.text || ''),
      illoHint: s.title || '',
      number: p++
    });

    pages.push({
      kind:'puzzle',
      title: `Caça-Palavras — ${s.title || ''}`,
      gridSize: Number(m.grid_default || 15),
      placed: Number(s?.placedCount || 0),
      // seeds salvos pelo wordsearch (quando aplicado pelo agente)
      grid: s?.grid || null,
      wordsDisplay: s?.wordsDisplay || null,
      wordsNorm: s?.wordsNorm || null,
      illoHint: (s?.illoHint || s?.title || ''),
      number: p++
    });
  });

  // gabarito (placeholder)
  if (m.include_key) {
    pages.push({
      kind:'key',
      title: 'Gabarito',
      body: 'Gabarito completo entra aqui (Export/IA).',
      number: p++
    });
  }

  return pages;
}

function ensureGrid(page){
  // se já veio pronto, usa
  if (Array.isArray(page.grid) && page.grid.length) return page.grid;

  // fallback: cria grade aleatória (A-Z) só pra preview (não final)
  const size = clamp(Number(page.gridSize||15), 10, 21);
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const grid = [];
  for (let r=0;r<size;r++){
    const row = [];
    for (let c=0;c<size;c++){
      row.push(letters[(Math.random()*letters.length)|0]);
    }
    grid.push(row);
  }
  return grid;
}

function renderGridTable(grid){
  const size = grid?.length || 0;
  const rows = (grid || []).map(row => {
    const tds = row.map(ch => `<td>${$esc(ch)}</td>`).join('');
    return `<tr>${tds}</tr>`;
  }).join('');
  return `
    <table class="ws-table" style="--grid:${size}">
      <tbody>${rows}</tbody>
    </table>
  `;
}

export class CulturalBookBuilderModule {
  constructor(app){
    this.app = app;
    this.id = 'book';
    this.title = 'Book Builder';
    this._pageIndex = 0;
    this._mode = 'FOLHEAR'; // or SPREAD
  }

  async init(){}

  render(root){
    const plan = getBookPlan();
    const pages = plan ? getBookPages(plan) : [];

    root.innerHTML = `
      <div class="grid">
        <div class="card">
          <h2>Book Builder</h2>
          <p class="muted">
            Folha fixa (preview editorial). Folheie e valide como produto final.
          </p>

          <div class="row">
            <button class="btn" id="bb_spread">Spread</button>
            <button class="btn primary" id="bb_folhear">Folhear</button>
            <div class="pill" id="bb_pagepill">Página ${pages.length? (this._pageIndex+1) : 0}/${pages.length}</div>
            <button class="btn icon" id="bb_prev" title="Anterior">◀</button>
            <button class="btn icon" id="bb_next" title="Próximo">▶</button>
          </div>

          <div class="row">
            <button class="btn" id="bb_export_plan">Baixar plano (JSON)</button>
            <button class="btn" id="bb_rebuild">Recriar Minas (PADRÃO)</button>
            <button class="btn" id="bb_open_agent">Abrir Agent</button>
          </div>
        </div>

        <div class="card">
          <div id="bb_view" class="bb-view"></div>
        </div>
      </div>

      <style>
        .bb-view{
          padding: 8px 0;
          user-select:none;
        }
        .paper{
          width: 100%;
          display:flex;
          justify-content:center;
        }
        .page{
          background: #f7f7f5;
          color: #0b0f16;
          border-radius: 14px;
          border: 1px solid rgba(0,0,0,.18);
          box-shadow: 0 14px 44px rgba(0,0,0,.22);
          overflow:hidden;
          position:relative;
          width: min(100%, var(--page-maxw, 560px));
          aspect-ratio: var(--page-ar, 2 / 3);
          height:auto; max-height:min(78vh,780px);
          touch-action: pan-y;
        }
        .page-inner{
          padding: 16px;
          height:100%;
          display:flex;
          flex-direction:column;
          gap:10px;
        }
        .page-head{
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:12px;
        }
        .page-title{
          font-size: 34px;
          line-height: 1.05;
          font-weight: 900;
          letter-spacing:-.02em;
          margin:0;
        }
        .page-sub{
          margin-top: 6px;
          font-size: 18px;
          opacity:.78;
        }
        .pnum{
          opacity:.55;
          font-weight:900;
          font-size: 18px;
          margin-top: 6px;
        }
        .divider{
          height:1px;
          background: rgba(0,0,0,.12);
          margin: 2px 0 0 0;
        }
        .page-body{
          border: 1px solid rgba(0,0,0,.12);
          background: #ffffff;
          padding: 14px;
          border-radius: 12px;
          flex:1;
          min-height:0;
          overflow:hidden;
        }

        /* TEXT */
        .text-body{
          font-family: Georgia, serif;
          font-size: 22px;
          line-height: 1.25;
          white-space: pre-wrap;
        }

        /* PUZZLE */
        .ws-box{
          border: 1px solid rgba(0,0,0,.14);
          background: #ffffff;
          padding: 12px;
          border-radius: 12px;
          overflow:hidden;
          flex: 1;
          min-height: 0;
          display:flex;
          align-items:center;
          justify-content:center;
        }
        .ws-table{
          border-collapse: collapse;
          margin: 0 auto;
        }
        .ws-table td{
          border: 1px solid rgba(0,0,0,.35);
          width: 1.9em;
          height: 1.9em;
          text-align:center;
          vertical-align:middle;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-weight: 900;
          font-size: clamp(12px, 3.2vw, 16px);
          line-height: 1;
          padding: 0;
        }

        .words-box{
          border: 1px solid rgba(0,0,0,.14);
          background: #ffffff;
          padding: 12px;
          border-radius: 12px;
          max-height: 34%;
          overflow:hidden;
        }
        .words-title{
          font-weight: 900;
          font-size: 22px;
          margin: 0;
        }
        .words-grid{
          display:grid;
          grid-template-columns: repeat(var(--cols, 2), minmax(0,1fr));
          gap: 6px 18px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-weight: 900;
          font-size: var(--wfs, 14px);
          margin-top: 10px;
        }
        .ws-w{
          white-space:nowrap;
          border-bottom: 1px dotted rgba(0,0,0,.22);
          padding-bottom: 2px;
        }

        /* CAPA */
        .cover{
          display:flex;
          flex-direction:column;
          justify-content:center;
          height:100%;
          gap: 14px;
        }
        .cover h1{
          margin:0;
          font-size: 44px;
          line-height:1.02;
          letter-spacing:-.02em;
        }
        .cover .sub{
          font-size: 18px;
          opacity:.78;
        }

        /* footer hint */
        .hint{
          margin-top:auto;
          font-size: 14px;
          opacity:.65;
        }
      </style>
    `;

    const $ = (s) => root.querySelector(s);
    const view = $('#bb_view');
    const pill = $('#bb_pagepill');

    const updatePill = () => {
      pill.textContent = `Página ${pages.length ? (this._pageIndex + 1) : 0}/${pages.length}`;
    };

    const renderPage = (page) => {
      if (!page) return `<div class="paper"><div class="page"><div class="page-inner"><p class="muted">Sem páginas</p></div></div></div>`;

      if (page.kind === 'cover'){
        return `
          <div class="paper">
            <div class="page">
              <div class="page-inner">
                <div class="cover">
                  <div>
                    <h1>${$esc(page.title || '')}</h1>
                    <div class="sub">${$esc(page.subtitle || '')}</div>
                  </div>
                  <div class="hint">Prévia editorial • folha fixa</div>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      if (page.kind === 'puzzle'){
        const grid = ensureGrid(page);
        const words = page.wordsDisplay || page.wordsNorm || [];
        return `
          <div class="paper">
            <div class="page">
              <div class="page-inner">
                <div class="page-head">
                  <div>
                    <h1 class="page-title">${$esc(page.title || '')}</h1>
                    <div class="page-sub">Prévia visual (editorial) • grade ${grid.length}x${grid.length} • palavras colocadas ${Number(page.placed || words.length || 0)}</div>
                  </div>
                  <div class="pnum">p.${$esc(page.number || '')}</div>
                </div>
                <div class="divider"></div>

                <div class="ws-box">
                  ${renderGridTable(grid)}
                </div>

                <div class="words-box">
                  <h3 class="words-title">Palavras</h3>
                  <div class="words-grid" style="${wordsGridVars(words)}">
                    ${renderWordsColumns(words)}
                  </div>
                </div>

                <div class="hint">Ilustração P&amp;B: ${$esc(page.illoHint || '')}</div>
              </div>
            </div>
          </div>
        `;
      }

      // text / key
      return `
        <div class="paper">
          <div class="page">
            <div class="page-inner">
              <div class="page-head">
                <div>
                  <h1 class="page-title">${$esc(page.title || '')}</h1>
                  <div class="page-sub">Texto cultural</div>
                </div>
                <div class="pnum">p.${$esc(page.number || '')}</div>
              </div>
              <div class="divider"></div>

              <div class="page-body">
                <div class="text-body">${$esc(page.body || '')}</div>
              </div>

              <div class="hint">Ilustração P&amp;B: ${$esc(page.illoHint || page.title || '')}</div>
            </div>
          </div>
        </div>
      `;
    };

    const paint = () => {
      updatePill();
      if (!pages.length){
        view.innerHTML = `<div class="paper"><div class="page"><div class="page-inner"><p class="muted">Nenhum plano carregado. Abra o Agent e gere um plano.</p></div></div></div>`;
        return;
      }
      const page = pages[this._pageIndex];
      view.innerHTML = renderPage(page);

      // swipe: 1 passo por gesto (sem bind duplicado)
      bindSwipe(view,
        () => { this._pageIndex = clamp(this._pageIndex - 1, 0, pages.length - 1); paint(); },
        () => { this._pageIndex = clamp(this._pageIndex + 1, 0, pages.length - 1); paint(); }
      );
    };

    // buttons
    $('#bb_prev').onclick = () => {
      this._pageIndex = clamp(this._pageIndex - 1, 0, pages.length - 1);
      paint();
    };
    $('#bb_next').onclick = () => {
      this._pageIndex = clamp(this._pageIndex + 1, 0, pages.length - 1);
      paint();
    };

    $('#bb_spread').onclick = () => { this._mode = 'SPREAD'; this.app.toast?.('Modo Spread'); };
    $('#bb_folhear').onclick = () => { this._mode = 'FOLHEAR'; this.app.toast?.('Modo Folhear'); };

    $('#bb_export_plan').onclick = () => {
      if (!plan){ this.app.toast?.('Sem plano'); return; }
      try{
        const blob = new Blob([JSON.stringify(plan, null, 2)], { type:'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `book-plan-${(plan?.meta?.id||'cultural')}-${Date.now()}.json`;
        a.click();
        setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
        this.app.toast?.('Plano exportado ✅');
      } catch(e){
        this.app.toast?.('Falha ao exportar');
        try { this.app.log?.('[BOOK] export failed: ' + (e?.message || e)); } catch {}
      }
    };

    $('#bb_rebuild').onclick = () => {
      // botão “PADRÃO” (só dispara o agente/roteiro do app)
      try{
        const btn = document.querySelector('.navitem[data-view="cultural"]');
        btn?.click?.();
        this.app.toast?.('Abra o Agent e clique “Gerar Plano do Livro (MG)”');
      } catch {
        this.app.toast?.('Falha');
      }
    };

    $('#bb_open_agent').onclick = () => {
      const btn = document.querySelector('.navitem[data-view="cultural"]');
      btn?.click?.();
    };

    paint();
    try { this.app.log?.(`[BOOK] render ok pages=${pages.length}`); } catch {}
  }
}
