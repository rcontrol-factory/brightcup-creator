/* FILE: /js/modules/cultural_book_builder.js */
// Bright Cup Creator — Cultural Book Builder v0.4a PADRÃO
// PATCH (FIX REAL):
// - Página FIXA (aspect-ratio 2/3) -> caça-palavras não estica a tela
// - bindSwipe idempotente + throttle -> não pula 2 páginas no folhear

import { Storage } from '../core/storage.js';

// ---- helpers ----
const $esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));

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

function parseWords(text){
  return String(text || '')
    .split(/\r?\n+/)
    .map(x => x.trim())
    .filter(Boolean);
}

// ---- wordsearch engine (simple, deterministic-ish) ----
function makeRng(seed){
  let x = seed >>> 0;
  return () => {
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17; x >>>= 0;
    x ^= x << 5;  x >>>= 0;
    return (x >>> 0) / 4294967296;
  };
}

function randomInt(rng, a, b){
  return a + Math.floor(rng() * (b - a + 1));
}

const DIRS = [
  {dx:1, dy:0},   // →
  {dx:-1, dy:0},  // ←
  {dx:0, dy:1},   // ↓
  {dx:0, dy:-1},  // ↑
  {dx:1, dy:1},   // ↘
  {dx:-1, dy:-1}, // ↖
  {dx:1, dy:-1},  // ↗
  {dx:-1, dy:1},  // ↙
];

function canPlace(grid, word, x, y, dx, dy){
  const N = grid.length;
  for (let i=0;i<word.length;i++){
    const xx = x + dx*i;
    const yy = y + dy*i;
    if (xx<0 || yy<0 || xx>=N || yy>=N) return false;
    const cell = grid[yy][xx];
    if (cell !== '' && cell !== word[i]) return false;
  }
  return true;
}

function doPlace(grid, word, x, y, dx, dy){
  const coords = [];
  for (let i=0;i<word.length;i++){
    const xx = x + dx*i;
    const yy = y + dy*i;
    grid[yy][xx] = word[i];
    coords.push({x:xx,y:yy});
  }
  return coords;
}

function fillRandom(grid, rng){
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const N = grid.length;
  for (let y=0;y<N;y++){
    for (let x=0;x<N;x++){
      if (!grid[y][x]) grid[y][x] = letters[randomInt(rng,0,25)];
    }
  }
}

function generateWordSearch({size=15, words=[], seed=1}){
  const rng = makeRng(seed);
  const N = size;
  const grid = Array.from({length:N}, () => Array.from({length:N}, () => ''));
  const placed = [];

  // sort long->short for better placement
  const wnorm = words
    .map(w => normalizeWord(w))
    .filter(w => w.length >= 3 && w.length <= N);
  wnorm.sort((a,b) => b.length - a.length);

  for (const w of wnorm){
    let ok = false;
    // try a bunch of attempts
    for (let t=0;t<220;t++){
      const dir = DIRS[randomInt(rng,0,DIRS.length-1)];
      const dx = dir.dx, dy = dir.dy;
      const x = randomInt(rng,0,N-1);
      const y = randomInt(rng,0,N-1);
      if (!canPlace(grid, w, x,y,dx,dy)) continue;
      const coords = doPlace(grid, w, x,y,dx,dy);
      placed.push({word:w, x, y, dx, dy, coords});
      ok = true;
      break;
    }
    // if can't place, skip
    if (!ok) continue;
  }

  fillRandom(grid, rng);
  return { grid, placed };
}

// ---- rendering helpers ----
function renderGridHTML(grid){
  const N = grid?.length || 0;
  if (!N) return '<div class="ws-empty">Grade vazia</div>';

  let html = '<table class="ws-table" aria-label="Caça-palavras"><tbody>';
  for (let y=0;y<N;y++){
    html += '<tr>';
    for (let x=0;x<N;x++){
      html += `<td>${$esc(grid[y][x])}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  return html;
}

function renderWordsGrid(words){
  const list = (words || []).map(displayWord).filter(Boolean);
  if (!list.length) return '<div class="muted">Sem palavras</div>';
  return `<div class="words-grid">${list.map(w => `<div class="ws-w">${$esc(w)}</div>`).join('')}</div>`;
}

function wrapLines(text, max=68){
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

// swipe binding (idempotent) — evita pular 2 páginas
function bindSwipe(el, onPrev, onNext){
  if (!el) return;

  // ✅ mantém um único listener por elemento, e só troca callbacks
  if (!el.__bbSwipe){
    el.__bbSwipe = { onPrev: null, onNext: null, lastFire: 0 };

    let startX = 0, startY = 0, tracking = false, locked = false;

    const fire = (fn) => {
      const now = Date.now();
      if (now - (el.__bbSwipe.lastFire || 0) < 350) return; // throttle
      el.__bbSwipe.lastFire = now;
      try { fn && fn(); } catch {}
    };

    const onStart = (x,y) => { startX=x; startY=y; tracking=true; locked=false; };
    const onMove  = (x,y,ev) => {
      if (!tracking) return;
      const dx = x - startX;
      const dy = y - startY;

      // só horizontal
      if (Math.abs(dx) < 10) return;
      if (Math.abs(dy) > Math.abs(dx)) return;

      if (ev?.cancelable) ev.preventDefault();

      if (!locked && Math.abs(dx) > 85){
        locked = true;
        tracking = false;

        if (dx > 0) fire(el.__bbSwipe.onPrev);
        else fire(el.__bbSwipe.onNext);
      }
    };
    const onEnd = () => { tracking=false; locked=false; };

    // Touch (iOS)
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

    el.addEventListener('touchend', ()=>onEnd(), { passive:true });

    // Mouse (desktop)
    el.addEventListener('mousedown', (e)=>{
      onStart(e.clientX, e.clientY);
    });

    window.addEventListener('mousemove', (e)=>{
      if (!tracking) return;
      onMove(e.clientX, e.clientY, e);
    }, { passive:false });

    window.addEventListener('mouseup', ()=>onEnd());
  }

  // atualiza callbacks sem duplicar listener
  el.__bbSwipe.onPrev = onPrev;
  el.__bbSwipe.onNext = onNext;
}

export class CulturalBookBuilderModule {
  constructor(app){
    this.app = app;
    this.id = 'book';
    this.title = 'Builder';
  }

  async init(){}

  render(root){
    const seed = Storage.get('book:seed', {
      mode: 'FOLHEAR',
      idx: 0
    });

    const plan = Storage.get('cultural:book_plan', null);
    const wsSeed = Storage.get('wordsearch:seed', null);

    // build pages from plan
    const pages = [];
    if (plan?.meta){
      // cover
      pages.push({
        type:'cover',
        title: plan.meta.title || 'LIVRO',
        subtitle: plan.meta.subtitle || '',
        p: 1
      });
      // for each section: text + puzzle
      (plan.sections || []).forEach((s, i) => {
        pages.push({
          type:'text',
          title: s.title,
          text: s.text,
          illus: s?.title ? `Ilustração P&B: ${s.title.split('(')[0].trim()}` : '',
          p: pages.length + 1
        });

        pages.push({
          type:'puzzle',
          title: `Caça-Palavras — ${s.title}`,
          sectionId: s.id,
          grid: plan.meta.grid_default || 15,
          wordsPerPuzzle: plan.meta.words_per_puzzle || 16,
          words: (s.wordHints || []),
          illus: `Ilustração P&B (no PDF): ${s.title.split('(')[0].trim()}`,
          p: pages.length + 1
        });
      });

      // answer key placeholder
      if (plan.meta.include_key){
        pages.push({
          type:'key',
          title: 'Gabarito completo',
          text: 'Slot do gabarito — o Export/IA gera o gabarito final.',
          p: pages.length + 1
        });
      }
    }

    const total = pages.length || 1;
    const clampIdx = (n) => Math.max(0, Math.min(total-1, n));
    let idx = clampIdx(seed.idx || 0);

    const go = (n) => {
      idx = clampIdx(n);
      Storage.set('book:seed', { ...seed, idx });
      paint();
    };

    const goPrev = () => go(idx - 1);
    const goNext = () => go(idx + 1);

    const setMode = (m) => {
      Storage.set('book:seed', { ...seed, mode: m, idx });
      paint();
    };

    const pageMaxW = () => {
      // tenta deixar confortável no mobile
      const w = Math.min(560, Math.max(340, Math.floor(window.innerWidth * 0.92)));
      return w;
    };

    root.innerHTML = `
      <style>
        .bb-wrap{ display:flex; flex-direction:column; gap:12px; }
        .bb-top{ display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; }
        .bb-title{ font-weight:800; letter-spacing:.3px; }
        .bb-controls{ display:flex; gap:8px; align-items:center; }
        .btn{ border:1px solid rgba(255,255,255,.15); background: rgba(255,255,255,.08); color:#fff; border-radius:12px; padding:10px 12px; font-weight:700; }
        .btn.primary{ background: rgba(120,180,255,.18); border-color: rgba(120,180,255,.28); }
        .btn.on{ background: rgba(255,255,255,.14); }
        .bb-nav{ display:flex; gap:8px; align-items:center; }
        .bb-meta{ opacity:.75; font-size:13px; }
        .bb-view{ display:flex; justify-content:center; align-items:center; }

        .paper{
          background: rgba(255,255,255,0.10);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 18px;
          padding: 14px;
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
          /* ✅ página fixa (6x9 ~ 2:3). impede o puzzle de esticar a tela */
          aspect-ratio: 2 / 3;
          max-height: 78vh;
          touch-action: pan-y; /* ajuda swipe horizontal sem travar scroll vertical */
        }

        .page-inner{
          padding: 18px;
          display:flex;
          flex-direction:column;
          gap: 12px;
          height: 100%;
          box-sizing:border-box;
        }

        .page-head{ display:flex; flex-direction:column; gap:6px; }
        .page-head h1{ margin:0; font-size: 34px; line-height: 1.05; letter-spacing:-.6px; }
        .page-head .sub{ opacity:.7; font-weight:600; }

        .page-body{
          border: 1px solid rgba(0,0,0,.12);
          background: #ffffff;
          padding: 14px;
          border-radius: 12px;
          flex: 1;
          overflow: auto;
          -webkit-overflow-scrolling: touch;
        }

        .page-body pre{
          margin:0;
          white-space:pre-wrap;
          font-family: ui-serif, Georgia, 'Times New Roman', serif;
          font-size: 28px;
          line-height: 1.26;
          letter-spacing: .1px;
        }

        .page-foot{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:8px;
          opacity:.72;
          font-weight:700;
        }

        .ws-box{
          border: 1px solid rgba(0,0,0,.14);
          background: #ffffff;
          padding: 12px;
          border-radius: 12px;
          flex: 1;
          overflow:auto;
          -webkit-overflow-scrolling: touch;
        }

        .ws-title{ font-weight:900; font-size: 28px; margin:0; letter-spacing:-.3px; }
        .ws-meta{ opacity:.65; font-weight:700; margin-top:6px; }
        .ws-table{ border-collapse:collapse; margin-top:10px; width:100%; table-layout:fixed; }
        .ws-table td{
          border:1px solid rgba(0,0,0,.55);
          text-align:center;
          font-weight:900;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 16px;
          height: 22px;
        }

        .words-box{
          border: 1px solid rgba(0,0,0,.12);
          background:#ffffff;
          padding: 12px;
          border-radius: 12px;
        }

        .words-box h3{ margin:0 0 8px 0; font-size: 16px; opacity:.8; }
        .words-grid{ display:flex; flex-wrap:wrap; gap:10px 18px; }
        .ws-w{ font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight:900; letter-spacing:.5px; }

        .illus{
          border: 1px dashed rgba(0,0,0,.28);
          background: rgba(255,255,255,.8);
          padding: 12px;
          border-radius: 12px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
        }
        .illus .label{ font-weight:900; }
        .illus .hint{ opacity:.7; font-weight:700; }
        .illus .imgbtn{
          border:1px solid rgba(0,0,0,.2);
          background: rgba(0,0,0,.06);
          border-radius: 12px;
          padding: 8px 10px;
          font-weight:900;
        }

        .muted{ opacity:.7; }

        @media (max-width: 420px){
          .page-head h1{ font-size: 30px; }
          .page-body pre{ font-size: 26px; }
          .ws-table td{ font-size: 15px; height: 21px; }
        }
      </style>

      <div class="bb-wrap">
        <div class="bb-top">
          <div>
            <div class="bb-title">Builder</div>
            <div class="bb-meta">${plan ? $esc(plan.meta?.title || 'Livro') : 'Sem plano ainda'} • ${pages.length ? `Página ${idx+1}/${pages.length}` : '0/0'}</div>
          </div>

          <div class="bb-controls">
            <button class="btn ${seed.mode==='SPREAD'?'on':''}" id="bb_spread">Spread</button>
            <button class="btn ${seed.mode==='FOLHEAR'?'on':''}" id="bb_folhear">Folhear</button>
            <div class="bb-nav">
              <button class="btn" id="bb_prev">◀</button>
              <button class="btn" id="bb_next">▶</button>
            </div>
          </div>
        </div>

        <div class="bb-view" id="bb_view"></div>
      </div>
    `;

    const view = root.querySelector('#bb_view');
    const btnSpread = root.querySelector('#bb_spread');
    const btnFolhear = root.querySelector('#bb_folhear');
    const btnPrev = root.querySelector('#bb_prev');
    const btnNext = root.querySelector('#bb_next');

    btnSpread.onclick = () => setMode('SPREAD');
    btnFolhear.onclick = () => setMode('FOLHEAR');

    btnPrev.onclick = () => {
      if (seed.mode === 'SPREAD') go(idx - 2);
      else goPrev();
    };
    btnNext.onclick = () => {
      if (seed.mode === 'SPREAD') go(idx + 2);
      else goNext();
    };

    const makePage = (p) => {
      if (!p) return `<div class="paper"><div class="page" style="--page-maxw:${pageMaxW()}px"><div class="page-inner"><div class="muted">Sem página</div></div></div></div>`;

      if (p.type === 'cover'){
        return `
          <div class="paper">
            <div class="page" style="--page-maxw:${pageMaxW()}px">
              <div class="page-inner">
                <div class="page-head">
                  <h1>${$esc(p.title || '')}</h1>
                  <div class="sub">${$esc(p.subtitle || '')}</div>
                </div>
                <div class="page-body">
                  <pre>${$esc('Apresentação\n\nEste livro é uma viagem por Minas Gerais: sabores, histórias, fé, trilhos e montanhas.\nCada seção traz um texto curto e um caça-palavras temático.\nNo final, você encontra o gabarito completo.\nBoa leitura e bom passatempo.')}</pre>
                </div>
                <div class="page-foot">
                  <div class="muted">Ilustração P&B: História</div>
                  <div class="muted">p.${p.p}</div>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      if (p.type === 'text'){
        return `
          <div class="paper">
            <div class="page" style="--page-maxw:${pageMaxW()}px">
              <div class="page-inner">
                <div class="page-head">
                  <h1>${$esc(p.title || '')}</h1>
                  <div class="sub">Texto cultural</div>
                </div>
                <div class="page-body">
                  <pre>${$esc(wrapLines(p.text || '', 60))}</pre>
                </div>
                <div class="illus">
                  <div>
                    <div class="label">${$esc(p.illus || 'Ilustração P&B')}</div>
                    <div class="hint">Slot reservado (entra no Export/IA) — nesta página de texto.</div>
                  </div>
                  <button class="imgbtn" type="button">Imagem</button>
                </div>
                <div class="page-foot">
                  <div class="muted"></div>
                  <div class="muted">p.${p.p}</div>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      if (p.type === 'puzzle'){
        const size = Number(p.grid || 15) || 15;
        const words = (p.words || []).slice(0, Number(p.wordsPerPuzzle || 16) || 16);
        const seedNum = (Date.now() + (idx*997)) >>> 0;
        const { grid, placed } = generateWordSearch({ size, words, seed: seedNum });

        const placedCount = placed.length;
        return `
          <div class="paper">
            <div class="page" style="--page-maxw:${pageMaxW()}px">
              <div class="page-inner">
                <div class="page-head">
                  <h1>${$esc(p.title || '')}</h1>
                  <div class="sub ws-meta">Prévia visual (editorial) • grade ${size}x${size} • palavras colocadas ${placedCount}</div>
                </div>

                <div class="ws-box">
                  ${renderGridHTML(grid)}
                </div>

                <div class="words-box">
                  <h3>Palavras</h3>
                  ${renderWordsGrid(words)}
                </div>

                <div class="page-foot">
                  <div class="muted">${$esc(p.illus || '')}</div>
                  <div class="muted">p.${p.p}</div>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      if (p.type === 'key'){
        return `
          <div class="paper">
            <div class="page" style="--page-maxw:${pageMaxW()}px">
              <div class="page-inner">
                <div class="page-head">
                  <h1>${$esc(p.title || '')}</h1>
                  <div class="sub">Gabarito</div>
                </div>
                <div class="page-body">
                  <pre>${$esc(p.text || '')}</pre>
                </div>
                <div class="page-foot">
                  <div class="muted"></div>
                  <div class="muted">p.${p.p}</div>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      return `<div class="paper"><div class="page" style="--page-maxw:${pageMaxW()}px"><div class="page-inner"><div class="muted">Tipo desconhecido</div></div></div></div>`;
    };

    const paint = () => {
      const mode = Storage.get('book:seed', seed).mode || 'FOLHEAR';

      if (!pages.length){
        view.innerHTML = `<div class="paper"><div class="page" style="--page-maxw:${pageMaxW()}px"><div class="page-inner"><div class="muted">Gere o plano no Cultural Agent.</div></div></div></div>`;
        return;
      }

      if (mode === 'SPREAD'){
        const p1 = pages[idx] || null;
        const p2 = pages[idx+1] || null;
        view.innerHTML = `
          <div style="display:flex; gap:12px; align-items:flex-start; justify-content:center; flex-wrap:wrap">
            ${makePage(p1)}
            ${makePage(p2)}
          </div>
        `;
        bindSwipe(view, () => go(idx - 2), () => go(idx + 2));
      } else {
        const p = pages[idx] || null;
        view.innerHTML = makePage(p);
        const card = view.querySelector('.page');
        bindSwipe(card, goPrev, goNext);
      }
    };

    paint();
  }
}
