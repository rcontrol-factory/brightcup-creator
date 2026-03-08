/* FILE: /js/modules/cultural_book_builder.js */
// Bright Cup Creator — Cultural Book Builder v0.4b SAFE
// Patch final:
// - remove linha abaixo do subtítulo no puzzle
// - subtítulo com mais respiro e melhor line-height
// - página de texto mais limpa e sem “bolha” pesada
// - ilustração só aparece quando houver espaço real
// - sem botão dentro da folha
// - swipe e navegação preservados
// - Safari/iOS compat

import { Storage } from '../core/storage.js';
import { generateWordSearch, normalizeWord as wsNormalizeWord } from '../core/wordsearch_gen.js';

function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, function(c){
    return ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    })[c];
  });
}

function normalizeWord(s){
  try { return wsNormalizeWord(s); } catch (e) {}
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
  var seen = new Set();
  var out = [];
  for (const it of list){
    var w = normalizeWord(it);
    if (!w) continue;
    if (seen.has(w)) continue;
    seen.add(w);
    out.push(w);
  }
  return out;
}

function wrap(text, max){
  max = Number(max || 72);
  var words = String(text || '').split(/\s+/g);
  var lines = [];
  var line = '';

  for (const w of words){
    if (!line) {
      line = w;
      continue;
    }
    if ((line + ' ' + w).length <= max) line += ' ' + w;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines.join('\n');
}

function iconLabel(icon){
  var map = {
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
  var m = plan.meta || {};
  var gridDefault = Number(m.grid_default || 15);
  var wppDefault  = Number(m.words_per_puzzle || 20);

  var pages = [];

  pages.push({
    kind:'text',
    icon:'history',
    title: m.title || 'MINAS GERAIS CULTURAL',
    meta: (m.subtitle || '').trim(),
    body: wrap(
      'Apresentação\n\n' +
      'Este livro é uma viagem por Minas Gerais: sabores, histórias, fé, trilhos e montanhas.\n\n' +
      'Cada seção traz um texto curto e um caça-palavras temático.\n\n' +
      'No final, você encontra o gabarito completo. Boa leitura e bom passatempo.',
      72
    ),
    sectionId: 'intro'
  });

  (plan.sections || []).forEach(function(s){
    pages.push({
      kind:'text',
      icon: s.icon,
      title: s.title,
      meta: 'Texto cultural',
      body: wrap(s.text || '', 72),
      sectionId: s.id
    });

    var titleTokens = String(s.title || '')
      .trim()
      .split(/\s+/g)
      .filter(Boolean);

    var rawHints = []
      .concat(s.wordHints || [])
      .concat(titleTokens)
      .concat(['Minas', 'Cultura', 'História', 'Uai']);

    var wordsNorm = uniqNorm(rawHints)
      .filter(function(w){ return w.length >= 3 && w.length <= gridDefault; })
      .slice(0, Math.max(6, wppDefault));

    var wordsDisplay = rawHints
      .map(displayWord)
      .map(function(w){ return w.trim(); })
      .filter(Boolean);

    var mapDisp = {};
    for (const d of wordsDisplay){
      var n = normalizeWord(d);
      if (!n) continue;
      var hasAccent = /[ÁÀÂÃÉÊÍÓÔÕÚÜÇ]/i.test(d);
      if (!mapDisp[n]) mapDisp[n] = d;
      else {
        var prevHas = /[ÁÀÂÃÉÊÍÓÔÕÚÜÇ]/i.test(mapDisp[n]);
        if (!prevHas && hasAccent) mapDisp[n] = d;
      }
    }

    var wordsDisplayPicked = wordsNorm.map(function(n){
      return mapDisp[n] || n;
    });

    pages.push({
      kind:'puzzle',
      icon: s.icon,
      title: 'Caça-Palavras — ' + s.title,
      meta: 'grade ' + gridDefault + 'x' + gridDefault + ' • palavras ' + wordsNorm.length,
      sectionId: s.id,
      sectionTitle: s.title,
      grid: gridDefault,
      wordsNorm: wordsNorm,
      wordsDisplay: wordsDisplayPicked
    });
  });

  pages.push({
    kind:'text',
    icon:'history',
    title:'Gabarito (no final)',
    meta:'(entra completo no Export PDF)',
    body: wrap(
      'O gabarito completo entra na fase do Export PDF (KDP).\n\n' +
      'Aqui no Builder a gente valida: ordem, texto, tema, grade e padrão editorial.',
      72
    ),
    sectionId: 'key'
  });

  pages.forEach(function(p, i){
    p.pageNo = i + 1;
  });

  return pages;
}

function seedKeyForPlan(plan){
  var pid = String((plan && plan.meta && plan.meta.id) || 'book');
  var ts = String((plan && plan.meta && plan.meta.createdAt) || '');
  return 'cultural:builder_cache:' + pid + ':' + ts;
}

function getPuzzleCache(plan){
  return Storage.get(seedKeyForPlan(plan), { puzzles:{} });
}

function setPuzzleCache(plan, cache){
  Storage.set(seedKeyForPlan(plan), cache || { puzzles:{} });
}

function ensurePuzzleGenerated(plan, page){
  if (!page || page.kind !== 'puzzle') return null;

  var cache = getPuzzleCache(plan);
  var key = 'p' + page.pageNo + ':' + (page.sectionId || '') + ':' + (page.grid || '');

  if (cache && cache.puzzles && cache.puzzles[key]) {
    return cache.puzzles[key];
  }

  var gen = generateWordSearch({
    size: page.grid || 15,
    words: page.wordsNorm || [],
    maxWords: (page.wordsNorm || []).length || 16,
    allowDiagonal: true,
    allowBackwards: true
  });

  var payload = {
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
  var N = grid && grid.length || 0;
  if (!N) return '<div class="ws-empty">Grade vazia</div>';

  var html = '<table class="ws-table" aria-label="Caça-palavras"><tbody>';
  for (var y = 0; y < N; y += 1){
    html += '<tr>';
    for (var x = 0; x < N; x += 1){
      html += '<td>' + esc((grid[y] && grid[y][x]) || '') + '</td>';
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  return html;
}

function renderWordsColumns(wordsDisplay){
  var list = (wordsDisplay || []).map(displayWord).filter(Boolean);
  if (!list.length) return '';

  var cols = 3;
  var buckets = Array.from({ length: cols }, function(){ return []; });
  var maxLen = 0;

  for (var i = 0; i < list.length; i += 1){
    var w = list[i];
    if (w.length > maxLen) maxLen = w.length;
    buckets[i % cols].push(w);
  }

  var shrink = Math.max(0.72, Math.min(1, 1 - Math.max(0, (maxLen - 14)) * 0.04));

  var colHtml = buckets.map(function(col){
    var items = col.map(function(w){
      return '<div class="ws-item"><span class="ws-word">' + esc(w) + '</span></div>';
    }).join('');
    return '<div class="ws-col">' + items + '</div>';
  }).join('');

  return '<div class="ws-words-cols" style="--wsw:' + shrink.toFixed(3) + '">' + colHtml + '</div>';
}

function bindSwipe(el, onPrev, onNext){
  if (!el) return;

  try {
    var prev = el.__bccSwipe;
    if (prev && typeof prev.teardown === 'function') prev.teardown();
  } catch (e) {}

  var startX = 0;
  var startY = 0;
  var dx = 0;
  var dy = 0;
  var tracking = false;
  var locked = false;
  var pointerId = null;

  var MIN_DIST = 42;
  var MAX_OFF_AXIS = 55;
  var COOLDOWN_MS = 220;

  var cooldown = function(){
    locked = true;
    setTimeout(function(){ locked = false; }, COOLDOWN_MS);
  };

  var shouldFire = function(){
    var adx = Math.abs(dx);
    var ady = Math.abs(dy);
    if (adx < MIN_DIST) return false;
    if (ady > MAX_OFF_AXIS) return false;
    if (adx < ady * 1.15) return false;
    return true;
  };

  var fire = function(){
    if (locked) return;
    if (!shouldFire()) return;
    cooldown();
    if (dx > 0) {
      if (typeof onPrev === 'function') onPrev();
    } else {
      if (typeof onNext === 'function') onNext();
    }
  };

  var onTouchStart = function(e){
    if (locked) return;
    var t = e && e.touches && e.touches[0];
    if (!t) return;
    tracking = true;
    startX = t.clientX;
    startY = t.clientY;
    dx = 0;
    dy = 0;
  };

  var onTouchMove = function(e){
    if (!tracking) return;
    var t = e && e.touches && e.touches[0];
    if (!t) return;
    dx = t.clientX - startX;
    dy = t.clientY - startY;

    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      try { e.preventDefault(); } catch (err) {}
    }
  };

  var onTouchEnd = function(){
    if (!tracking) return;
    tracking = false;
    fire();
  };

  var onTouchCancel = function(){
    tracking = false;
  };

  var onPointerDown = function(e){
    if (locked || !e) return;
    pointerId = e.pointerId;
    tracking = true;
    startX = e.clientX;
    startY = e.clientY;
    dx = 0;
    dy = 0;
    try { el.setPointerCapture(pointerId); } catch (err) {}
  };

  var onPointerMove = function(e){
    if (!tracking) return;
    if (pointerId !== null && e.pointerId !== pointerId) return;
    dx = e.clientX - startX;
    dy = e.clientY - startY;
    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      try { e.preventDefault(); } catch (err) {}
    }
  };

  var onPointerUp = function(e){
    if (!tracking) return;
    if (pointerId !== null && e.pointerId !== pointerId) return;
    tracking = false;
    try { if (pointerId !== null) el.releasePointerCapture(pointerId); } catch (err) {}
    pointerId = null;
    fire();
  };

  var onPointerCancel = function(e){
    if (pointerId !== null && e && e.pointerId !== pointerId) return;
    tracking = false;
    try { if (pointerId !== null) el.releasePointerCapture(pointerId); } catch (err) {}
    pointerId = null;
  };

  el.addEventListener('touchstart', onTouchStart, { passive: true });
  el.addEventListener('touchmove', onTouchMove, { passive: false });
  el.addEventListener('touchend', onTouchEnd, { passive: true });
  el.addEventListener('touchcancel', onTouchCancel, { passive: true });

  el.addEventListener('pointerdown', onPointerDown, { passive: true });
  el.addEventListener('pointermove', onPointerMove, { passive: false });
  el.addEventListener('pointerup', onPointerUp, { passive: true });
  el.addEventListener('pointercancel', onPointerCancel, { passive: true });

  el.__bccSwipe = {
    teardown: function(){
      try { el.removeEventListener('touchstart', onTouchStart); } catch (e) {}
      try { el.removeEventListener('touchmove', onTouchMove); } catch (e) {}
      try { el.removeEventListener('touchend', onTouchEnd); } catch (e) {}
      try { el.removeEventListener('touchcancel', onTouchCancel); } catch (e) {}
      try { el.removeEventListener('pointerdown', onPointerDown); } catch (e) {}
      try { el.removeEventListener('pointermove', onPointerMove); } catch (e) {}
      try { el.removeEventListener('pointerup', onPointerUp); } catch (e) {}
      try { el.removeEventListener('pointercancel', onPointerCancel); } catch (e) {}
    }
  };
}

function estimateTextLines(text){
  var raw = String(text || '');
  if (!raw) return 0;
  var parts = raw.split('\n');
  var total = 0;
  for (var i = 0; i < parts.length; i += 1){
    var seg = parts[i] || '';
    total += Math.max(1, Math.ceil(seg.length / 44));
  }
  return total;
}

function shouldShowIllustration(page){
  if (!page || page.kind !== 'text') return false;
  var body = String(page.body || '');
  var lines = estimateTextLines(body);
  var chars = body.length;
  if (chars > 720) return false;
  if (lines > 16) return false;
  return true;
}

export class CulturalBookBuilderModule {
  constructor(app){
    this.app = app;
    this.id = 'book';
    this.title = 'Livro (Builder)';
  }

  async init(){}

  render(root){
    var plan = Storage.get('cultural:book_plan', null);
    var seed = Storage.get('cultural:builder_seed', { mode:'FOLHEAR', pageIndex: 0 });

    var saveSeed = function(next){
      Storage.set('cultural:builder_seed', next);
    };

    root.innerHTML = `
      <style>
        .bb-wrap{ display:grid; gap:14px; }

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
          aspect-ratio: 6 / 9;
          touch-action: pan-y;
        }
        .page[data-size="8.5x11"]{ aspect-ratio: 8.5 / 11; }
        .page[data-size="6x9"]{ aspect-ratio: 6 / 9; }

        .page-inner{
          padding: 16px;
          height: 100%;
          overflow: hidden;
          display:grid;
          grid-template-rows: auto 1fr;
          gap:10px;
        }

        .page-head{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:12px;
          padding-bottom: 6px;
        }
        .page-title{
          font-size: clamp(20px, 4.4vw, 28px);
          line-height: 1.08;
          font-weight: 900;
          letter-spacing: -0.2px;
        }
        .page-meta{
          font-size: clamp(12px, 3.3vw, 15px);
          line-height: 1.3;
          opacity: .72;
          margin-top: 6px;
        }
        .page-no{
          font-size: 14px;
          opacity:.7;
          font-weight: 900;
          min-width: 52px;
          text-align:right;
          padding-top: 4px;
        }

        /* texto */
        .text-page{
          display:grid;
          grid-template-rows: 1fr auto;
          gap: 10px;
          min-height: 0;
        }
        .text-page.no-illus{
          grid-template-rows: 1fr;
        }
        .page-body{
          border: none;
          background: transparent;
          padding: 0;
          border-radius: 0;
          min-height: 0;
          overflow: hidden;
        }
        .page-body pre{
          margin:0;
          white-space:pre-wrap;
          overflow-wrap:anywhere;
          word-break:break-word;
          font-family: ui-serif, Georgia, "Times New Roman", serif;
          font-size: clamp(15px, 3.9vw, 18px);
          line-height: 1.45;
        }

        .illus{
          border: 1px dashed rgba(0,0,0,.28);
          background: #ffffff;
          padding: 8px 10px;
          border-radius: 10px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
        }
        .illus .t{ font-weight: 900; font-size: 13px; line-height: 1.2; }
        .illus .s{ opacity:.7; font-size: 11px; margin-top: 2px; line-height: 1.25; }
        .illus .badge{
          border: 1px solid rgba(0,0,0,.22);
          border-radius: 10px;
          padding: 6px 9px;
          font-weight: 900;
          font-size: 11px;
          opacity:.85;
          flex: 0 0 auto;
        }

        /* caça-palavras */
        .ws-frame{
          height: 100%;
          border: 2px solid rgba(0,0,0,.78);
          padding: 14px 14px 12px;
          display:flex;
          flex-direction:column;
          gap: 8px;
          overflow:hidden;
        }
        .ws-head{
          flex: 0 0 auto;
        }
        .ws-headline{
          text-align:center;
          font-weight: 900;
          letter-spacing: .7px;
          text-transform: uppercase;
          font-size: clamp(22px, 5.2vw, 34px);
          line-height: 1.04;
          margin-top: 2px;
        }
        .ws-subline{
          text-align:center;
          font-weight: 800;
          letter-spacing: .18px;
          font-size: 13px;
          line-height: 1.34;
          opacity: .82;
          margin-top: 6px;
          padding: 0 8px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ws-gridwrap{
          display:flex;
          justify-content:center;
          align-items:center;
          flex: 1 1 auto;
          overflow:hidden;
          padding-top: 2px;
          min-height: 0;
        }
        .ws-wordswrap{
          margin-top: 4px;
          overflow:hidden;
          padding-bottom: 0;
          flex: 0 0 auto;
        }

        .ws-box{
          border: none;
          background: transparent;
          padding: 0;
          border-radius: 0;
          overflow: hidden;
          max-width: 100%;
        }

        .ws-table{
          border-collapse: collapse;
          margin: 0 auto;
          border: 2px solid rgba(0,0,0,.55);
        }
        .ws-table td{
          border: 1px solid rgba(0,0,0,.35);
          width: 18px;
          height: 18px;
          text-align:center;
          vertical-align:middle;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-weight: 900;
          font-size: 12px;
          line-height: 1;
          padding: 0;
        }
        @media (max-width: 420px){
          .ws-table td{ width: 17px; height: 17px; font-size: 11px; }
        }

        .words-title{
          font-weight: 900;
          font-size: 11px;
          letter-spacing: .5px;
          text-transform: uppercase;
          margin: 2px 0 6px;
        }
        .words-grid{
          display:block;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-weight: 900;
          font-size: 11px;
        }
        .ws-words-cols{
          display:grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 6px 16px;
          font-size: calc(11px * var(--wsw, 1));
        }
        .ws-col{
          display:flex;
          flex-direction:column;
          gap: 5px;
          min-width: 0;
        }
        .ws-item{
          display:block;
          min-width: 0;
          white-space: nowrap;
          line-height: 1.18;
        }
        .ws-word{
          overflow: visible;
          text-overflow: clip;
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
          .ws-frame{ padding: 12px 12px 10px; gap: 7px; }
          .ws-subline{ font-size: 12px; margin-top: 5px; }
          .ws-table td{ width: 16px; height: 16px; font-size: 10px; }
          .ws-words-cols{ gap: 5px 12px; font-size: calc(10px * var(--wsw, 1)); }
          .words-title{ font-size: 10px; margin-bottom: 5px; }
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

    var area = root.querySelector('#bb_area');

    var renderEmpty = () => {
      area.innerHTML = `
        <div class="bb-empty">
          <p class="muted"><b>Nenhum livro carregado.</b> Isso pode acontecer se o Safari limpar o armazenamento.</p>
          <div class="row">
            <button class="btn primary" id="bb_go_agent">Abrir Cultural Agent</button>
          </div>
          <p class="bb-mini muted">Dica: no Agent, clique “Gerar Plano” e volte pra cá.</p>
        </div>
      `;
      var btn = area.querySelector('#bb_go_agent');
      if (btn) {
        btn.onclick = function(){
          var nav = document.querySelector('.navitem[data-view="cultural"]');
          if (nav && nav.click) nav.click();
        };
      }
    };

    var renderPage = (page, plan) => {
      if (!page) return '';

      var layout = (plan && plan.meta && plan.meta.layout) || {};
      var pageSize = layout.pageSize || (plan && plan.meta && plan.meta.format) || '6x9';
      var maxw = String(pageSize) === '8.5x11' ? '720px' : '560px';

      if (page.kind === 'text') {
        var showIllus = shouldShowIllustration(page);

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

                <div class="text-page ${showIllus ? '' : 'no-illus'}">
                  <div class="page-body"><pre>${esc(page.body || '')}</pre></div>

                  ${showIllus ? `
                    <div class="illus">
                      <div>
                        <div class="t">Ilustração P&B: ${esc(iconLabel(page.icon))}</div>
                        <div class="s">Slot reservado apenas quando houver espaço real na página.</div>
                      </div>
                      <div class="badge">Imagem</div>
                    </div>
                  ` : ``}
                </div>
              </div>
            </div>
          </div>
        `;
      }

      var gen = ensurePuzzleGenerated(plan, page);
      var gridHtml = renderGridHTML(gen && gen.grid);

      return `
        <div class="paper" style="--page-maxw:${esc(maxw)}">
          <div class="page" data-size="${esc(pageSize)}">
            <div class="page-inner">
              <div class="ws-frame">
                <div class="ws-head">
                  <div class="ws-headline">CAÇA-PALAVRAS</div>
                  <div class="ws-subline">${esc(page.sectionTitle || page.title || '')}</div>
                </div>

                <div class="ws-gridwrap">
                  <div class="ws-box">${gridHtml}</div>
                </div>

                <div class="ws-wordswrap">
                  <div class="words-title" style="text-align:center;">PALAVRAS</div>
                  <div class="words-grid">${renderWordsColumns(page.wordsDisplay || page.wordsNorm || [])}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    };

    var renderMain = () => {
      plan = Storage.get('cultural:book_plan', null);
      if (!plan) return renderEmpty();

      var pages = buildPagesFromPlan(plan);
      var mode = seed.mode === 'SPREAD' ? 'SPREAD' : 'FOLHEAR';
      var pageIndex = Math.max(0, Math.min(seed.pageIndex || 0, pages.length - 1));

      var save = function(){
        saveSeed({ mode: mode, pageIndex: pageIndex });
      };

      var goPrev = function(){
        pageIndex = Math.max(0, pageIndex - 1);
        save();
        paint();
      };

      var goNext = function(){
        pageIndex = Math.min(pages.length - 1, pageIndex + 1);
        save();
        paint();
      };

      area.innerHTML = `
        <div class="bb-toolbar">
          <div class="left">
            <span class="bb-mini"><b>${esc((plan.meta && plan.meta.title) || 'LIVRO')}</b></span>
            <span class="bb-mini">• estilo <b>${esc((plan.meta && plan.meta.layout && plan.meta.layout.style) || 'RETRO')}</b></span>
            <span class="bb-mini">• formato <b>${esc((plan.meta && plan.meta.layout && plan.meta.layout.pageSize) || (plan.meta && plan.meta.format) || '6x9')}</b></span>
          </div>
          <div class="right">
            <button class="btn" id="bb_prev">◀</button>
            <button class="btn" id="bb_next">▶</button>
          </div>
        </div>

        <div class="bb-top">
          <div class="bb-tabs">
            <button class="btn ${mode==='SPREAD' ? 'primary' : ''}" id="bb_mode_spread">Spread</button>
            <button class="btn ${mode==='FOLHEAR' ? 'primary' : ''}" id="bb_mode_folhear">Folhear</button>
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

      var view = area.querySelector('#bb_view');

      var paint = function(){
        var pos = area.querySelector('#bb_pos');
        if (pos) pos.textContent = (pageIndex + 1) + '/' + pages.length;

        if (mode === 'FOLHEAR') {
          var p = pages[pageIndex];
          view.innerHTML = renderPage(p, plan);
          bindSwipe(view, goPrev, goNext);
          return;
        }

        var left = pages[pageIndex];
        var right = pages[pageIndex + 1] || null;

        view.innerHTML = `
          <div class="spread">
            <div>${renderPage(left, plan)}</div>
            <div>${right ? renderPage(right, plan) : ''}</div>
          </div>
        `;

        bindSwipe(
          view,
          function(){
            pageIndex = Math.max(0, pageIndex - 2);
            save();
            paint();
          },
          function(){
            pageIndex = Math.min(pages.length - 1, pageIndex + 2);
            save();
            paint();
          }
        );
      };

      var prevBtn = area.querySelector('#bb_prev');
      var nextBtn = area.querySelector('#bb_next');
      var spreadBtn = area.querySelector('#bb_mode_spread');
      var folhearBtn = area.querySelector('#bb_mode_folhear');
      var goAgentBtn = area.querySelector('#bb_go_agent');
      var dlBtn = area.querySelector('#bb_download_plan');

      if (prevBtn) prevBtn.onclick = goPrev;
      if (nextBtn) nextBtn.onclick = goNext;

      if (spreadBtn) {
        spreadBtn.onclick = function(){
          mode = 'SPREAD';
          save();
          renderMain();
        };
      }

      if (folhearBtn) {
        folhearBtn.onclick = function(){
          mode = 'FOLHEAR';
          save();
          renderMain();
        };
      }

      if (goAgentBtn) {
        goAgentBtn.onclick = function(){
          var btn = document.querySelector('.navitem[data-view="cultural"]');
          if (btn && btn.click) btn.click();
        };
      }

      if (dlBtn) {
        dlBtn.onclick = () => {
          if (!plan) return;
          try {
            var blob = new Blob([JSON.stringify(plan, null, 2)], { type:'application/json' });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'book-plan-' + (((plan && plan.meta && plan.meta.id) || 'cultural')) + '-' + Date.now() + '.json';
            a.click();
            setTimeout(function(){ URL.revokeObjectURL(a.href); }, 4000);
            if (this.app && this.app.toast) this.app.toast('Plano baixado ✅');
          } catch (e) {
            if (this.app && this.app.toast) this.app.toast('Falha ao baixar', 'err');
          }
        };
      }

      paint();
    };

    renderMain();
  }
}
