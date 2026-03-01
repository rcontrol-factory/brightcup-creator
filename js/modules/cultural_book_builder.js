/* cultural_book_builder.js
   Bright Cup Creator — Cultural Book Builder (folheamento/preview editorial)
   - Renderiza páginas fixas com aspecto de livro (8.5x11 por padrão)
   - Suporta páginas de texto e páginas de caça-palavras
   - Swipe estável (1 página por gesto)
*/

(function(){
  const MOD = {};
  const VERSION = '1.0.0';

  // ---------- utils ----------
  function esc(s){
    return String(s ?? '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/\"/g,'&quot;')
      .replace(/\'/g,'&#39;');
  }

  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  function normalizeWord(w){
    return String(w||'')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')   // remove acentos
      .replace(/[^A-Za-z0-9]/g,'')                      // só alnum
      .toUpperCase();
  }

  function displayWord(w){
    // mantém acentos/space do display se vier assim; fallback para string
    return String(w||'').trim();
  }

  // ---------- puzzle: word placement ----------
  function tryPlaceWord(grid, word, x, y, dx, dy){
    const n = grid.length;
    for (let i=0;i<word.length;i++){
      const xx = x + dx*i, yy = y + dy*i;
      if (xx<0||yy<0||xx>=n||yy>=n) return false;
      const c = grid[yy][xx];
      if (c && c !== word[i]) return false;
    }
    for (let i=0;i<word.length;i++){
      const xx = x + dx*i, yy = y + dy*i;
      grid[yy][xx] = word[i];
    }
    return true;
  }

  function fillRandom(grid){
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let y=0;y<grid.length;y++){
      for (let x=0;x<grid.length;x++){
        if (!grid[y][x]) grid[y][x] = letters[Math.floor(Math.random()*letters.length)];
      }
    }
  }

  function generateWordSearch(words, size){
    const n = size;
    const grid = Array.from({length:n}, ()=> Array(n).fill(''));
    const dirs = [
      [1,0],[0,1],[1,1],[-1,1],
      [-1,0],[0,-1],[-1,-1],[1,-1],
    ];

    const placed = [];
    const sorted = [...words].sort((a,b)=> b.length - a.length);

    for (const w of sorted){
      const word = normalizeWord(w);
      if (!word || word.length < 3) continue;
      if (word.length > n) continue;

      let ok = false;
      for (let attempt=0; attempt<260 && !ok; attempt++){
        const [dx,dy] = dirs[Math.floor(Math.random()*dirs.length)];
        const x = Math.floor(Math.random()*n);
        const y = Math.floor(Math.random()*n);
        if (tryPlaceWord(grid, word, x,y, dx,dy)){
          ok = true;
          placed.push(word);
        }
      }
    }

    fillRandom(grid);
    return { grid, placed };
  }

  // ---------- words list: columns ----------
  function renderWordsColumns(wordsDisplay){
    const list = (wordsDisplay || [])
      .map(displayWord)
      .filter(Boolean)
      .map(s => s.trim())
      .filter(s => s.length >= 2);

    if (!list.length) return '';

    // 3 colunas (equilíbrio simples por “round-robin”)
    const cols = 3;
    const buckets = Array.from({length:cols}, ()=>[]);
    list.forEach((w,i)=> buckets[i % cols].push(w));

    const colHtml = buckets.map(col => {
      const items = col.map(w => `
        <div class="ws-item">
          <span class="ws-word">${esc(w)}</span>
          <span class="ws-leader"></span>
        </div>
      `).join('');
      return `<div class="ws-col">${items}</div>`;
    }).join('');

    return `<div class="ws-words-cols">${colHtml}</div>`;
  }

  // ---------- swipe ----------
  function bindSwipe(el, onPrev, onNext){
    if (!el) return;

    // evita múltiplos binds (causa “pular 2 páginas” quando re-renderiza)
    try {
      if (el.dataset && el.dataset.swipeBound === '1') return;
      if (el.dataset) el.dataset.swipeBound = '1';
    } catch {}

    let startX = 0;
    let startY = 0;
    let dx = 0;
    let dy = 0;
    let down = false;

    function onStart(e){
      const t = e.touches ? e.touches[0] : e;
      startX = t.clientX; startY = t.clientY;
      dx = 0; dy = 0;
      down = true;
    }

    function onMove(e){
      if (!down) return;
      const t = e.touches ? e.touches[0] : e;
      dx = t.clientX - startX;
      dy = t.clientY - startY;
      // scroll vertical continua; só bloqueia quando já virou swipe horizontal
      if (Math.abs(dx) > 18 && Math.abs(dx) > Math.abs(dy)) {
        try { e.preventDefault(); } catch {}
      }
    }

    function onEnd(){
      if (!down) return;
      down = false;
      if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy)){
        if (dx > 0) onPrev && onPrev();
        else onNext && onNext();
      }
    }

    el.addEventListener('touchstart', onStart, {passive:true});
    el.addEventListener('touchmove', onMove, {passive:false});
    el.addEventListener('touchend', onEnd, {passive:true});

    // desktop
    el.addEventListener('mousedown', onStart);
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseup', onEnd);
    el.addEventListener('mouseleave', onEnd);
  }

  // ---------- rendering ----------
  function buildPagesFromPlan(plan){
    const pages = [];

    const book = plan?.book || {};
    const sections = book?.sections || [];
    const size = book?.pageSize || '8.5x11';

    const gridDefault = plan?.puzzles?.defaultGrid || 15;

    // capa simples (opcional)
    if (book?.title){
      pages.push({
        type:'cover',
        title: String(book.title),
        meta: '',
        text: book?.subtitle ? String(book.subtitle) : '',
        illustrationTag: 'Capa',
      });
    }

    // miolo
    for (const s of sections){
      // texto
      pages.push({
        type:'text',
        title: s.title || 'Texto',
        meta: 'Texto cultural',
        text: s.text || '',
        illustrationTag: s.illustrationTag || (s.title || ''),
      });

      // puzzle
      const wantPuzzle = s.wordsearch || s.puzzle || s.wordSearch;
      if (wantPuzzle){
        // Evita frases longas (ex: "O que é Minas?") como "palavra" no puzzle.
        // Se o Agent não mandou wordHints, a gente usa fallback com tokens do título.
        const titleTokens = String(s.title || '')
          .split(/\s+/g)
          .map(t => t.trim())
          .filter(Boolean)
          .filter(t => t.length >= 3);

        const rawHints = []
          .concat(s.wordHints || [])
          .concat(titleTokens)
          .concat(['Minas','Cultura','História','Uai']);

        const wordsNorm = rawHints
          .map(normalizeWord)
          .filter(Boolean)
          .filter(w => w.length >= 3 && w.length <= gridDefault);

        // dedupe mantendo ordem
        const seen = new Set();
        const uniq = [];
        for (const w of wordsNorm){
          if (!seen.has(w)){ seen.add(w); uniq.push(w); }
        }

        const gridSize = s.gridSize || gridDefault;
        const { grid, placed } = generateWordSearch(uniq, gridSize);

        // display words: usa original dos hints, mas só os que cabem
        const displayHints = (s.wordHints && s.wordHints.length) ? s.wordHints : titleTokens;
        const wordsDisplayPicked = (displayHints || [])
          .map(displayWord)
          .map(w => w.trim())
          .filter(Boolean)
          .filter(w => normalizeWord(w).length >= 3 && normalizeWord(w).length <= gridSize);

        pages.push({
          type:'wordsearch',
          title: `Caça-Palavras — ${s.title || 'Tema'}`,
          meta: `grade ${gridSize}x${gridSize}`,
          gridSize,
          grid,
          placedCount: placed.length,
          wordsDisplay: wordsDisplayPicked.length ? wordsDisplayPicked : placed,
          illustrationTag: s.illustrationTag || (s.title || ''),
        });
      }
    }

    // contra-capa
    pages.push({
      type:'end',
      title: 'Fim',
      meta: '',
      text: '',
      illustrationTag: '',
    });

    return { pages, pageSize: size };
  }

  function renderTableGrid(grid){
    const rows = grid.map(r => {
      const tds = r.map(c => `<td>${esc(c)}</td>`).join('');
      return `<tr>${tds}</tr>`;
    }).join('');
    return `<table class="ws-table" aria-label="Caça-palavras"><tbody>${rows}</tbody></table>`;
  }

  function renderPage(p, index, total){
    const pageNum = index+1;

    if (p.type === 'wordsearch'){
      const grid = renderTableGrid(p.grid || []);
      const words = renderWordsColumns(p.wordsDisplay || []);
      const meta = `${esc(p.meta || '')} · palavras ${esc(p.wordsDisplay?.length ?? p.placedCount ?? 0)}`;

      return `
        <div class="page ws-page" data-page="${pageNum}">
          <div class="page-head">
            <div class="page-title-row">
              <h1 class="page-title">${esc(p.title || '')}</h1>
              <div class="page-num">p.${pageNum}</div>
            </div>
            <div class="page-meta">${meta}</div>
            <div class="rule"></div>
          </div>

          <div class="ws-box">
            ${grid}
          </div>

          <div class="words-box">
            <div class="words-title">Palavras</div>
            ${words || ''}
          </div>

          <div class="page-foot">
            <div class="foot-note">Ilustração P&amp;B: <b>${esc(p.illustrationTag || '')}</b></div>
            <button class="btn-send" type="button" data-action="send-puzzle">Enviar p/ Caça-palavras</button>
          </div>
        </div>
      `;
    }

    if (p.type === 'cover'){
      return `
        <div class="page cover-page" data-page="${pageNum}">
          <div class="cover-center">
            <div class="cover-title">${esc(p.title || '')}</div>
            ${p.text ? `<div class="cover-subtitle">${esc(p.text)}</div>` : ''}
          </div>
          <div class="cover-foot">Ilustração P&amp;B: <b>${esc(p.illustrationTag || 'Capa')}</b></div>
        </div>
      `;
    }

    if (p.type === 'end'){
      return `
        <div class="page end-page" data-page="${pageNum}">
          <div class="end-center">— FIM —</div>
        </div>
      `;
    }

    // texto
    return `
      <div class="page text-page" data-page="${pageNum}">
        <div class="page-head">
          <div class="page-title-row">
            <h1 class="page-title">${esc(p.title || '')}</h1>
            <div class="page-num">p.${pageNum}</div>
          </div>
          ${p.meta ? `<div class="page-meta">${esc(p.meta)}</div>` : ''}
          <div class="rule"></div>
        </div>

        <div class="text-box">
          <div class="text-content">${esc(p.text || '').replace(/\n/g,'<br>')}</div>
        </div>

        <div class="ill-slot">
          <div class="ill-title">Ilustração P&amp;B: <b>${esc(p.illustrationTag || '')}</b></div>
          <div class="ill-sub">Slot reservado (entra no Export/IA) — nesta página de texto.</div>
        </div>
      </div>
    `;
  }

  function renderUI(root, state){
    const { pages=[] } = state;

    const html = `
      <style>
        .bc-builder{
          color:#0b1220;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        }

        .book-viewport{
          width:min(920px, 92vw);
          margin: 0 auto;
          padding: 14px 0 10px;
          user-select: none;
        }

        .toolbar{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 10px;
          margin: 4px 0 10px;
        }

        .toolbar-left{display:flex; gap:8px; align-items:center;}
        .toolbar-right{display:flex; gap:8px; align-items:center;}

        .pill{
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.06);
          color: rgba(255,255,255,.85);
          font-weight: 700;
          font-size: 14px;
        }

        .btn{
          padding: 8px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.06);
          color: rgba(255,255,255,.90);
          font-weight: 700;
          font-size: 14px;
        }

        .btn:active{transform: translateY(1px);}

        .page-wrap{
          display:flex;
          justify-content:center;
          align-items:center;
        }

        .page{
          width: min(860px, 92vw);
          aspect-ratio: 8.5 / 11;
          background: #f6f7f9;
          border-radius: 22px;
          box-shadow: 0 10px 30px rgba(0,0,0,.18);
          overflow: hidden; /* página fixa, sem crescer */
          position: relative;
          padding: 18px;
        }

        .page-head{padding-bottom: 6px;}
        .page-title-row{display:flex; align-items:flex-start; justify-content:space-between; gap:10px;}
        .page-title{
          /* menor e mais “impresso” (evita ocupar área do puzzle) */
          font-size: clamp(20px, 4.6vw, 28px);
          line-height: 1.06;
          font-weight: 900;
          letter-spacing: -0.2px;
          margin: 0;
          max-width: calc(100% - 70px);
        }

        .page-num{
          font-weight: 800;
          font-size: 20px;
          opacity: .55;
          padding-top: 4px;
        }

        .page-meta{
          font-size: 14px;
          opacity: .70;
          margin-top: 8px;
        }

        .rule{
          height: 1px;
          background: rgba(0,0,0,.12);
          margin-top: 10px;
        }

        .text-box{
          margin-top: 14px;
          background: rgba(255,255,255,.85);
          border: 1px solid rgba(0,0,0,.10);
          border-radius: 18px;
          padding: 18px;
          height: calc(100% - 180px);
          overflow: hidden;
        }

        .text-content{
          font-family: ui-serif, Georgia, 'Times New Roman', Times, serif;
          font-size: 30px;
          line-height: 1.32;
          letter-spacing: 0.1px;
        }

        .ill-slot{
          position: absolute;
          left: 18px;
          right: 18px;
          bottom: 18px;
          border: 2px dashed rgba(0,0,0,.18);
          border-radius: 18px;
          padding: 12px 14px;
          background: rgba(255,255,255,.55);
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 12px;
        }

        .ill-title{font-weight:900;}
        .ill-sub{opacity:.75; font-size:14px; max-width: 72%;}

        /* wordsearch page layout */
        .ws-page{
          display:grid;
          grid-template-rows: auto 1fr auto auto;
          gap: 12px;
        }

        .ws-box{
          /* sem card arredondado/scroll interno */
          border: none;
          background: transparent;
          padding: 0;
          border-radius: 0;
          overflow: hidden;
        }

        .ws-table{
          border-collapse:collapse;
          border: 2px solid rgba(0,0,0,.55);
          width:100%;
          table-layout: fixed;
        }

        .ws-table td{
          border: 1px solid rgba(0,0,0,.55);
          text-align:center;
          vertical-align:middle;
          font-weight: 900;
          font-size: clamp(14px, 2.4vw, 22px);
          padding: 0;
          height: clamp(22px, 3.2vw, 34px);
          box-shadow: inset 0 0 0 2px rgba(0,0,0,.12);
        }

        /* palavras: estilo revista/impressa, sem “bolha” */
        .words-box{
          border: none;
          background: transparent;
          padding: 0;
          border-radius: 0;
        }

        .words-title{
          font-weight: 900;
          font-size: 26px;
          margin: 6px 0 10px 0;
        }

        .words-grid{
          display:grid;
          grid-template-columns: repeat(3, minmax(0,1fr));
          gap: 8px 18px;
        }

        .ws-w{
          font-weight: 900;
          letter-spacing: .5px;
          font-size: 20px;
          line-height: 1.15;
          white-space: normal;
          overflow: visible;
          text-overflow: clip;
          word-break: break-word;
          border-bottom: 3px dotted rgba(0,0,0,.22);
          padding-bottom: 6px;
        }

        /* novo renderer (líder pontilhado) */
        .ws-words-cols{
          display:grid;
          grid-template-columns: repeat(3, minmax(0,1fr));
          gap: 10px 22px;
        }

        .ws-item{
          display:flex;
          align-items:flex-end;
          gap: 10px;
          margin-bottom: 8px;
        }

        .ws-word{
          font-weight: 900;
          letter-spacing: .4px;
          font-size: 20px;
          line-height: 1.1;
          white-space: normal;
          word-break: break-word;
        }

        .ws-leader{
          flex:1;
          border-bottom: 3px dotted rgba(0,0,0,.22);
          transform: translateY(-2px);
          min-width: 14px;
        }

        .page-foot{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 10px;
        }

        .foot-note{opacity:.75;}

        .btn-send{
          padding: 10px 14px;
          border-radius: 14px;
          border: 1px solid rgba(0,0,0,.15);
          background: rgba(0,0,0,.06);
          font-weight: 900;
          color: rgba(0,0,0,.55);
        }

        /* cover */
        .cover-page{
          background: #f6f7f9;
          display:flex;
          flex-direction:column;
          justify-content:space-between;
        }
        .cover-center{padding: 52px 22px; text-align:center;}
        .cover-title{font-weight: 900; font-size: 52px; letter-spacing: -0.4px;}
        .cover-subtitle{margin-top: 12px; opacity:.75; font-size: 20px;}
        .cover-foot{padding: 18px; opacity:.70;}

        .end-page{
          display:flex;
          align-items:center;
          justify-content:center;
          font-weight: 900;
          font-size: 42px;
        }

        @media (max-width: 430px){
          .text-content{font-size: 26px;}
          .words-title{font-size: 24px;}
          .ws-word, .ws-w{font-size: 18px;}
          .ws-table td{font-size: 16px;}
          .ws-words-cols{gap: 8px 14px;}
        }

        @media print{
          body{background:#fff;}
          .page{
            box-shadow:none;
            border-radius: 0;
            width: 8.5in;
            height: 11in;
            aspect-ratio: auto;
          }
        }
      </style>

      <div class="bc-builder">
        <div class="book-viewport">
          <div class="toolbar">
            <div class="toolbar-left">
              <button class="btn" data-action="spread">Spread</button>
              <button class="btn" data-action="flip">Folhear</button>
              <div class="pill">Página ${state.pageIndex+1}/${pages.length || 0}</div>
              <button class="btn" data-action="prev">◀️</button>
              <button class="btn" data-action="next">▶️</button>
            </div>
            <div class="toolbar-right">
              <button class="btn" data-action="download-plan">Baixar plano (JSON)</button>
              <button class="btn" data-action="rebuild">Recriar (PADRÃO)</button>
            </div>
          </div>

          <div class="page-wrap">
            ${pages.length ? renderPage(pages[state.pageIndex], state.pageIndex, pages.length) : `<div class="pill">Sem páginas ainda</div>`}
          </div>
        </div>
      </div>
    `;

    root.innerHTML = html;

    // attach actions
    const wrap = root.querySelector('.page-wrap');
    bindSwipe(wrap, ()=> state.goPrev(), ()=> state.goNext());

    root.querySelectorAll('[data-action]').forEach(btn=>{
      btn.addEventListener('click', (e)=>{
        const act = btn.getAttribute('data-action');
        if (act === 'prev') state.goPrev();
        if (act === 'next') state.goNext();
        if (act === 'spread') state.setMode('spread');
        if (act === 'flip') state.setMode('flip');
        if (act === 'download-plan') state.downloadPlan();
        if (act === 'rebuild') state.rebuild();
      });
    });
  }

  // ---------- state ----------
  function createState(root, plan){
    const st = {
      root,
      plan,
      pages: [],
      pageIndex: 0,
      mode: 'flip',

      build(){
        const res = buildPagesFromPlan(st.plan || {});
        st.pages = res.pages || [];
        st.pageIndex = clamp(st.pageIndex, 0, Math.max(0, st.pages.length-1));
      },

      render(){
        renderUI(st.root, st);
      },

      setMode(m){
        st.mode = m || 'flip';
        st.render();
      },

      goPrev(){
        st.pageIndex = clamp(st.pageIndex - 1, 0, Math.max(0, st.pages.length-1));
        st.render();
      },

      goNext(){
        st.pageIndex = clamp(st.pageIndex + 1, 0, Math.max(0, st.pages.length-1));
        st.render();
      },

      downloadPlan(){
        try{
          const blob = new Blob([JSON.stringify(st.plan || {}, null, 2)], {type:'application/json'});
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'brightcup-plan.json';
          a.click();
          setTimeout(()=> URL.revokeObjectURL(a.href), 1200);
        }catch(err){
          console.error(err);
        }
      },

      rebuild(){
        st.build();
        st.render();
      }
    };

    st.build();
    return st;
  }

  // ---------- public API ----------
  MOD.mount = function(rootEl, plan){
    const st = createState(rootEl, plan || {});
    st.render();
    return st;
  };

  MOD.VERSION = VERSION;

  // attach to window for loader
  window.CulturalBookBuilder = MOD;
})();
