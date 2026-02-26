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
    const rawHints = []
      .concat(s.wordHints || [])
      .concat([s.title, 'Minas', 'Cultura', 'História', 'Uai']);

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
      const hasAccent = /[ÁÀÂÃÉÊÍÓÔÕÚÜÇ]/i.test(d);
      if (!mapDisp[n]) mapDisp[n] = d;
      else {
        const prevHas = /[ÁÀÂÃÉÊÍÓÔÕÚÜÇ]/i.test(mapDisp[n]);
        if (!prevHas && hasAccent) mapDisp[n] = d;
      }
    }
    const wordsDisplayPicked = wordsNorm.map(n => mapDisp[n] || n);

    pages.push({
      kind:'puzzle',
      icon: s.icon,
      title: `Caça-Palavras — ${s.title}`,
      meta: `Prévia visual (editorial) • grade ${gridDefault}x${gridDefault}`,
      sectionId: s.id,
      sectionTitle: s.title,
      grid: gridDefault,
      wordsNorm,
      wordsDisplay: wordsDisplayPicked
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
    ),
    sectionId: 'key'
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

function renderGridHTML(grid){
  const N = grid?.length || 0;
  if (!N) return '<div class="ws-empty">Grade vazia</div>';

  let html = '<table class="ws-table" aria-label="Caça-palavras"><tbody>';
  for (let y=0;y<N;y++){
    html += '<tr>';
    for (let x=0;x<N;x++){
      html += `<td>${esc(grid[y][x] || '')}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  return html;
}

function renderWordsColumns(wordsDisplay){
  const list = (wordsDisplay || []).map(displayWord).filter(Boolean);
  if (!list.length) return '';

  // 2 colunas no mobile, 3 colunas no desktop
  return list.map(w => `<div class="ws-w">${esc(w)}</div>`).join('');
}

function bindSwipe(el, onPrev, onNext){
  if (!el) return;

  let startX = 0, startY = 0, tracking = false, locked = false;

  const onStart = (x,y) => { startX=x; startY=y; tracking=true; locked=false; };
  const onMove  = (x,y,ev) => {
    if (!tracking) return;
    const dx = x - startX;
    const dy = y - startY;

    // quando detectar swipe horizontal, trava e impede scroll
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

  // touch
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
        .bb-wrap{ display:grid; gap:14px; }

        /* folha (sem bolha) */
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
          touch-action: pan-y; /* ajuda swipe horizontal */
        }

        .page-inner{
          padding: 16px;
          display:grid;
          gap:10px;
        }

        .page-head{
          display:flex; align-items:flex-start; justify-content:space-between; gap:12px;
          border-bottom: 1px solid rgba(0,0,0,.12);
          padding-bottom: 10px;
        }
        .page-title{
          font-size: clamp(22px, 6.0vw, 32px);
          line-height: 1.06;
          font-weight: 900;
          letter-spacing: -0.2px;
        }
        .page-meta{
          font-size: clamp(13px, 3.7vw, 16px);
          opacity: .72;
          margin-top: 6px;
        }
        .page-no{
          font-size: 14px;
          opacity:.7;
          font-weight: 900;
          min-width: 52px;
          text-align:right;
          padding-top: 6px;
        }

        /* texto */
        .page-body{
          border: 1px solid rgba(0,0,0,.12);
          background: #ffffff;
          padding: 14px;
          border-radius: 12px;
        }
        .page-body pre{
          margin:0;
          white-space:pre-wrap;
          overflow-wrap:anywhere;
          word-break:break-word;
          font-family: ui-serif, Georgia, "Times New Roman", serif;
          font-size: clamp(16px, 4.2vw, 19px);
          line-height: 1.42;
        }

        /* caça-palavras: grade quadriculada (revistinha) */
        .ws-box{
          border: 1px solid rgba(0,0,0,.14);
          background: #ffffff;
          padding: 12px;
          border-radius: 12px;
          overflow:auto;
        }
        .ws-table{
          border-collapse: collapse;
          margin: 0 auto;
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

        /* palavras: simples, sem cápsula */
        .words-box{
          border: 1px solid rgba(0,0,0,.14);
          background: #ffffff;
          padding: 12px;
          border-radius: 12px;
        }
        .words-title{
          font-weight: 900;
          font-size: 16px;
          margin-bottom: 10px;
        }
        .words-grid{
          display:grid;
          grid-template-columns: repeat(2, minmax(0,1fr));
          gap: 6px 18px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-weight: 900;
          font-size: 14px;
        }
        @media (min-width: 920px){
          .words-grid{ grid-template-columns: repeat(3, minmax(0,1fr)); }
        }
        .ws-w{ white-space:nowrap; }

        /* ilustração (só no TEXTO) */
        .illus{
          border: 1px dashed rgba(0,0,0,.35);
          background: #ffffff;
          padding: 10px 12px;
          border-radius: 12px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
        }
        .illus .t{ font-weight: 900; }
        .illus .s{ opacity:.7; font-size: 12px; margin-top: 2px; }
        .illus .badge{
          border: 1px solid rgba(0,0,0,.25);
          border-radius: 10px;
          padding: 7px 10px;
          font-weight: 900;
          font-size: 12px;
          opacity:.85;
        }

        .bb-toolbar{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; justify-content:space-between; }
        .bb-toolbar .left, .bb-toolbar .right{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
        .bb-top{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; justify-content:space-between; margin-top:6px; }
        .bb-tabs{ display:flex; gap:8px; align-items:center; }
        .bb-mini{ font-size:12px; opacity:.78; }

        .spread{ display:grid; grid-template-columns: 1fr 1fr; gap:14px; }
        @media (max-width: 860px){
          .spread{ grid-template-columns: 1fr; }
          .page-inner{ padding: 14px; }
        }
      </style>

      <div class="bb-wrap">
        <div class="card">
          <h2>Livro Cultural — Builder</h2>
          <p class="muted">Preview visual do livro (<b>folha limpa</b>). <b>O Agent define layout</b>. Aqui é só folhear e aprovar.</p>
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
            <button class="btn primary" id="bb_go_agent">Abrir Cultural Agent</button>
          </div>
          <p class="bb-mini muted">Dica: no Agent, clique “Gerar Plano” e volte pra cá.</p>
        </div>
      `;
      area.querySelector('#bb_go_agent').onclick = () => {
        const btn = document.querySelector('.navitem[data-view="cultural"]');
        btn?.click?.();
      };
    };

    const renderPage = (page, plan, withSend=true) => {
      if (!page) return '';
      const layout = plan?.meta?.layout || {};
      const pageSize = layout.pageSize || plan?.meta?.format || '6x9';
      const maxw = (String(pageSize) === '8.5x11') ? '720px' : '560px';

      if (page.kind === 'text') {
        return `
          <div class="paper" style="--page-maxw:${esc(maxw)}">
            <div class="page">
              <div class="page-inner">
                <div class="page-head">
                  <div>
                    <div class="page-title">${esc(page.title || '')}</div>
                    <div class="page-meta">${esc(page.meta || '')}</div>
                  </div>
                  <div class="page-no">p.${esc(String(page.pageNo || ''))}</div>
                </div>

                <div class="page-body"><pre>${esc(page.body || '')}</pre></div>

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
          <div class="page">
            <div class="page-inner">
              <div class="page-head">
                <div>
                  <div class="page-title">${esc(page.title || '')}</div>
                  <div class="page-meta">${esc(page.meta || '')} • palavras colocadas ${esc(String(gen?.placedCount || 0))}</div>
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
      try { this.app.log?.(`[BOOK] sent section="${page.sectionTitle || ''}" grid=${ws.size} words=${(page.wordsNorm||[]).length}`); } catch {}
    };

    const renderMain = () => {
      plan = Storage.get('cultural:book_plan', null);
      if (!plan) return renderEmpty();

      const pages = buildPagesFromPlan(plan);
      let mode = seed.mode === 'SPREAD' ? 'SPREAD' : 'FOLHEAR';
      let pageIndex = Math.max(0, Math.min(seed.pageIndex || 0, pages.length - 1));

      const save = () => saveSeed({ mode, pageIndex });

      const goPrev = () => { pageIndex = Math.max(0, pageIndex - 1); save(); paint(); };
      const goNext = () => { pageIndex = Math.min(pages.length - 1, pageIndex + 1); save(); paint(); };

      area.innerHTML = `
        <div class="bb-toolbar">
          <div class="left">
            <span class="bb-mini"><b>${esc(plan.meta?.title || 'LIVRO')}</b></span>
            <span class="bb-mini">• estilo <b>${esc(plan.meta?.layout?.style || 'RETRO')}</b></span>
            <span class="bb-mini">• formato <b>${esc(plan.meta?.layout?.pageSize || plan.meta?.format || '6x9')}</b></span>
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
          <div class="bb-mini">Página <b id="bb_pos"></b> • <span class="bb-mini muted">No mobile: arraste pro lado (folhear)</span></div>
        </div>

        <div id="bb_view"></div>

        <div class="bb-toolbar" style="margin-top:10px;">
          <div class="left">
            <button class="btn" id="bb_download_plan">Baixar plano (JSON)</button>
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
          view.innerHTML = renderPage(p, plan, true);

          // swipe no container (mais confiável)
          bindSwipe(view, goPrev, goNext);

          const btn = view.querySelector('[data-send="ws"]');
          if (btn) btn.onclick = () => sendPageToWordSearch(p, plan);
          return;
        }

        const left = pages[pageIndex];
        const right = pages[pageIndex+1] || null;

        view.innerHTML = `
          <div class="spread">
            <div>${renderPage(left, plan, true)}</div>
            <div>${right ? renderPage(right, plan, true) : ''}</div>
          </div>
        `;

        bindSwipe(
          view,
          ()=>{ pageIndex = Math.max(0, pageIndex - 2); save(); paint(); },
          ()=>{ pageIndex = Math.min(pages.length - 1, pageIndex + 2); save(); paint(); }
        );

        const sendBtns = view.querySelectorAll('[data-send="ws"]');
        sendBtns.forEach((b, i)=>{
          const page = i===0 ? left : right;
          b.onclick = () => sendPageToWordSearch(page, plan);
        });
      };

      area.querySelector('#bb_prev').onclick = goPrev;
      area.querySelector('#bb_next').onclick = goNext;

      area.querySelector('#bb_mode_spread').onclick = () => { mode='SPREAD'; save(); renderMain(); };
      area.querySelector('#bb_mode_folhear').onclick = () => { mode='FOLHEAR'; save(); renderMain(); };

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

    renderMain();
  }
}
