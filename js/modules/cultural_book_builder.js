/* FILE: /js/modules/cultural_book_builder.js */
// Bright Cup Creator — Cultural Book Builder v0.3b PADRÃO (1 ano)
// OBJETIVO:
// - Preview editorial do livro cultural (6x9) em "papel branco" no mobile.
// - Folhear como livro (sem scroll dentro da página).
// - Puzzle com quadriculado (grid) e palavras EM LINHA (horizontal wrap).
// - Geração editorial determinística (mesma seção => mesma grade) SEM depender do wordsearch module.
// - Botão "Enviar p/ Caça-palavras" mantém fluxo.

import { Storage } from '../core/storage.js';

function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function normalizeWord(s){
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
  return filtered.slice(0, maxCount);
}

function wrap(text, max=78){
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

function buildDefaultPlanMG(grid=15, wpp=20){
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
      {
        id:'intro_minas',
        icon:'mountain',
        title:'O que é Minas?',
        text:
          'Minas é serra no horizonte e café passado na hora. É conversa na porta, ' +
          'é tradição que atravessa gerações. Aqui, cultura não é enfeite: é jeito de viver.',
        wordHints:[
          'MINAS','MINEIRO','SERRA','MONTANHA','CULTURA','HISTORIA','TRADICAO','ACOLHIMENTO','CAFE','FOGAO','INTERIOR'
        ]
      },
      {
        id:'origem_minas',
        icon:'history',
        title:'Como começou Minas',
        text:
          'A história de Minas se mistura com caminhos antigos, trabalho duro e cidades que cresceram ' +
          'ao redor de rios, serras e rotas. O tempo deixa marca: na pedra, na fé e nas histórias contadas.',
        wordHints:[
          'HISTORIA','CAMINHO','SERRA','RIO','CIDADE','PATRIMONIO','MEMORIA','ORIGEM','TRADICAO'
        ]
      },
      {
        id:'queijo_minas',
        icon:'cheese',
        title:'A cultura do queijo mineiro',
        text:
          'Em Minas, queijo é linguagem. Tem queijo fresco, meia-cura, curado. ' +
          'E tem a Canastra, famosa no Brasil inteiro. Cada pedaço carrega clima, técnica e paciência.',
        wordHints:[
          'QUEIJO','CANASTRA','CURADO','MEIACURA','LEITE','FAZENDA','TRADICAO','SABOR','COALHO','CURA'
        ]
      },
      {
        id:'pao_de_queijo',
        icon:'bread',
        title:'Pão de queijo (receita simples)',
        text:
          'Receita base: polvilho, leite, óleo, ovos, queijo e sal. Mistura, sovar, bolear e assar. ' +
          'O segredo é o queijo e o ponto da massa — cada casa tem seu jeito.',
        wordHints:[
          'PAODEQUEIJO','POLVILHO','FORNO','MASSA','QUEIJO','LEITE','OVO','SAL','RECEITA','COZINHA'
        ]
      },
      {
        id:'cafe_minas',
        icon:'coffee',
        title:'Café e interior',
        text:
          'Café em Minas é ritual. Cheiro que acorda a casa, conversa que começa cedo, ' +
          'e o interior que ensina a valorizar o simples. É parte da identidade mineira.',
        wordHints:[
          'CAFE','COADOR','CHEIRO','MANHA','FAZENDA','INTERIOR','TRADICAO','TORRA','XICARA'
        ]
      },
      {
        id:'ferrovia',
        icon:'train',
        title:'Ferrovia e o “trem” mineiro',
        text:
          'O “trem” em Minas é mais que vagão: é expressão, é memória e é caminho. ' +
          'A ferrovia Vitória–Minas marca ligações entre regiões e histórias.',
        wordHints:[
          'FERROVIA','TREM','TRILHO','ESTACAO','VIAGEM','VITORIAMINAS','ROTA','PLATAFORMA','VAGAO'
        ]
      },
      {
        id:'pedras_preciosas',
        icon:'gem',
        title:'Pedras preciosas e brilho de Minas',
        text:
          'Minas também é conhecida por pedras e gemas. O brilho vem de longe: trabalho, comércio, ' +
          'histórias de garimpo e tradição regional.',
        wordHints:[
          'PEDRA','GEMA','GARIMPO','CRISTAL','BRILHO','MINERIO','OURO','PRATA','JOIA'
        ]
      },
      {
        id:'fe_religiosidade',
        icon:'church',
        title:'Fé e religiosidade',
        text:
          'Em muitas cidades, a fé aparece nas festas, nas procissões e nas igrejas. ' +
          'É cultura viva, que une famílias e mantém a história de pé.',
        wordHints:[
          'FE','IGREJA','SANTUARIO','PROCISSAO','TRADICAO','FESTA','DEVOTO','ROMARIA'
        ]
      },
      {
        id:'serras_paisagens',
        icon:'landscape',
        title:'Serras, paisagens e caminhos',
        text:
          'Minas é recorte de serra, estrada que sobe e desce, mirante e céu aberto. ' +
          'É natureza que convida a respirar e seguir adiante.',
        wordHints:[
          'SERRA','MIRANTE','ESTRADA','PAISAGEM','NATUREZA','TRILHA','VALE','CACHOEIRA'
        ]
      },
      {
        id:'voo_livre_valadares',
        icon:'paraglider',
        title:'Governador Valadares e o voo livre',
        text:
          'Governador Valadares é conhecida como capital mundial do voo livre. ' +
          'O Pico do Ibituruna virou símbolo: aventura, vento e gente do mundo inteiro olhando Minas do alto.',
        wordHints:[
          'VALADARES','IBITURUNA','VOOLIVRE','PARAPENTE','ASADELTA','PICO','VENTO','AVENTURA','MIRANTE'
        ]
      }
    ]
  };
}

/* =========================
   PUZZLE EDITORIAL (determinístico)
========================= */

function hashStr(s){
  s = String(s || '');
  let h = 2166136261 >>> 0;
  for (let i=0;i<s.length;i++){
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
function mulberry32(seed){
  let a = seed >>> 0;
  return function(){
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function randInt(rng, n){ return Math.floor(rng() * n); }
function shuffle(rng, arr){
  for (let i = arr.length - 1; i > 0; i--){
    const j = randInt(rng, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function makeEmptyGrid(N){
  return Array.from({length:N}, ()=>Array.from({length:N}, ()=>'')); // [y][x]
}
function placeWord(grid, word, dirs, rng, maxTries=260){
  const N = grid.length;
  const w = normalizeWord(word);
  if (!w) return null;

  const tryDirs = shuffle(rng, dirs.slice());
  for (const [dx,dy] of tryDirs){
    for (let tries=0; tries<maxTries; tries++){
      const x0 = randInt(rng, N), y0 = randInt(rng, N);
      const x1 = x0 + dx*(w.length-1);
      const y1 = y0 + dy*(w.length-1);
      if (x1<0||x1>=N||y1<0||y1>=N) continue;

      let ok = true;
      for (let k=0;k<w.length;k++){
        const x = x0 + dx*k, y = y0 + dy*k;
        const ch = grid[y][x];
        if (ch !== '' && ch !== w[k]) { ok=false; break; }
      }
      if (!ok) continue;

      const cells = [];
      for (let k=0;k<w.length;k++){
        const x = x0 + dx*k, y = y0 + dy*k;
        grid[y][x] = w[k];
        cells.push([x,y]);
      }
      return { word:w, cells };
    }
  }
  return null;
}
function fillRandom(grid, rng){
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let y=0;y<grid.length;y++){
    for (let x=0;x<grid.length;x++){
      if (!grid[y][x]) grid[y][x] = letters[randInt(rng, letters.length)];
    }
  }
}
function generateEditorialPuzzle({ seedKey, size, words, maxWords }){
  const N = Math.max(8, Math.min(30, Number(size || 15)));
  const seed = hashStr(seedKey || 'seed') ^ (N * 2654435761);
  const rng = mulberry32(seed >>> 0);

  const baseDirs = [[1,0],[0,1],[-1,0],[0,-1]];
  const diagDirs = [[1,1],[-1,-1],[1,-1],[-1,1]];
  const dirs = baseDirs.concat(diagDirs);

  let list = uniq(words || []).filter(w => w.length >= 3 && w.length <= N);
  list.sort((a,b)=> b.length - a.length);
  const limit = Math.max(6, Math.min(list.length, Number(maxWords || list.length)));
  list = list.slice(0, limit);

  const grid = makeEmptyGrid(N);
  const placed = [];
  const skipped = [];

  for (const w of list){
    const res = placeWord(grid, w, dirs, rng, 260);
    if (res) placed.push(res);
    else skipped.push(w);
  }

  fillRandom(grid, rng);
  return { size:N, words:list, placedCount: placed.length, skipped, grid };
}

function buildPages(plan){
  const m = plan.meta || {};
  const grid = Number(m.grid_default || 15);
  const wpp  = Number(m.words_per_puzzle || 20);

  const pages = [];

  pages.push({
    kind:'text',
    icon:'history',
    title: m.title || 'MINAS GERAIS CULTURAL',
    meta: (m.subtitle || '').trim(),
    body: wrap(
      `Apresentação\n\nEste livro é uma viagem por Minas Gerais: sabores, histórias, fé, trilhos e montanhas.\n\n` +
      `Cada seção traz um texto curto (com alma) e um caça-palavras temático.\n\n` +
      `No final, você encontra o gabarito completo. Boa leitura e bom passatempo.`,
      78
    )
  });

  (plan.sections || []).forEach((s) => {
    pages.push({
      kind:'text',
      icon: s.icon,
      title: s.title,
      meta: 'Texto cultural',
      body: wrap(s.text || '', 78),
      sectionId: s.id
    });

    const words = pickWords(
      [].concat(s.wordHints || []).concat([s.title, 'MINAS', 'CULTURA', 'HISTORIA']),
      grid,
      wpp
    );

    pages.push({
      kind:'puzzle',
      icon: s.icon,
      title: `Caça-Palavras — ${s.title}`,
      meta: 'Puzzle',
      sectionTitle: s.title,
      sectionId: s.id,
      grid,
      words
    });
  });

  pages.push({
    kind:'text',
    icon:'history',
    title:'Gabarito (no final)',
    meta:'(entra completo no Export PDF)',
    body: wrap(
      `O gabarito completo entra na fase do Export PDF (KDP).\n\n` +
      `Aqui no Builder a gente valida: ordem, texto, tema, palavras e padrão editorial.`,
      78
    )
  });

  pages.forEach((p, i) => p.pageNo = i + 1);
  return pages;
}

function buildSpreadsFromPages(pages){
  const spreads = [];
  for (let i = 0; i < pages.length; i += 2){
    spreads.push({ left: pages[i], right: pages[i+1] || null });
  }
  return spreads;
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
    const seed = Storage.get('cultural:builder_seed', { pageIndex: 0, mode: 'FOLHEAR' }); // mode: FOLHEAR|SPREAD

    const saveSeed = (pageIndex, mode) => Storage.set('cultural:builder_seed', {
      pageIndex: Number(pageIndex||0),
      mode: mode || 'FOLHEAR'
    });

    root.innerHTML = `
      <style>
        .bb-wrap{ display:grid; gap:14px; }

        .bb-top{ display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:10px; }
        .bb-top .title{ font-weight:900; letter-spacing:.2px; }
        .bb-top .hint{ opacity:.78; font-size:13px; }

        .bb-controls{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
        .bb-controls .btn{ min-width:88px; }

        .bb-paperShell{
          border-radius:18px;
          border:1px solid rgba(255,255,255,.12);
          background:rgba(0,0,0,.18);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          padding:14px;
        }

        /* "folha" 6x9 */
        .bb-paper{
          position:relative;
          border-radius:18px;
          background:#f7f7f7;
          color:#111;
          box-shadow: 0 10px 30px rgba(0,0,0,.25);
          border:1px solid rgba(0,0,0,.08);
          overflow:hidden;
        }
        .bb-paper::before{ content:""; display:block; padding-top:150%; } /* 6x9 ratio */
        .bb-paper > .bb-in{
          position:absolute; inset:18px;
          display:flex; flex-direction:column;
          gap:10px;
          overflow:hidden; /* SEM scroll na página */
        }

        .bb-head{ display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
        .bb-hTitle{ font-size:clamp(18px, 3.2vw, 26px); font-weight:900; line-height:1.08; }
        .bb-hMeta{ font-size:13px; opacity:.78; margin-top:2px; }
        .bb-pageNo{ font-size:14px; opacity:.55; font-weight:700; }

        .bb-bodyText{
          flex:1;
          border-radius:16px;
          background:#fff;
          border:1px solid rgba(0,0,0,.08);
          padding:14px;
          overflow:hidden; /* SEM scroll */
          display:flex;
        }
        .bb-bodyText pre{
          margin:0;
          white-space:pre-wrap;
          overflow-wrap:anywhere;
          word-break:break-word;
          font-family: ui-serif, Georgia, "Times New Roman", serif;
          font-size:clamp(14px, 2.4vw, 16px);
          line-height:1.35;
          width:100%;
        }

        /* Puzzle layout (sem scroll) */
        .bb-puzzleBox{
          flex:1;
          border-radius:16px;
          background:#fff;
          border:1px solid rgba(0,0,0,.08);
          padding:12px;
          display:flex;
          flex-direction:column;
          gap:10px;
          overflow:hidden; /* SEM scroll */
        }

        .bb-pRow{
          display:flex;
          align-items:center;
          gap:10px;
          font-size:13px;
          opacity:.72;
          flex-wrap:wrap;
        }

        /* MAIS SIMPLES: sem "quadrado dentro do quadrado" exagerado */
        .bb-gridArea{
          flex:1;
          border-radius:14px;
          border:1px solid rgba(0,0,0,.10);
          background:#fbfbfb;
          padding:10px;
          display:flex;
          align-items:center;
          justify-content:center;
          overflow:hidden;
        }

        .bb-grid{
          display:grid;
          gap:6px;
          grid-template-columns: repeat(var(--n), var(--cell));
          grid-template-rows: repeat(var(--n), var(--cell));
        }
        .bb-cell{
          width:var(--cell);
          height:var(--cell);
          border-radius:6px;
          border:1px solid rgba(0,0,0,.18);
          background:#fff;
          display:flex;
          align-items:center;
          justify-content:center;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-weight:800;
          font-size: calc(var(--cell) * 0.58);
          line-height:1;
        }

        /* PALAVRAS EM LINHA (horizontal) = sobra espaço */
        .bb-wordsLine{
          display:flex;
          flex-wrap:wrap;
          gap:8px;
          align-items:center;
          line-height:1.1;
          overflow:hidden;
        }
        .bb-word{
          display:inline-flex;
          padding:6px 10px;
          border-radius:999px;
          border:1px solid rgba(0,0,0,.14);
          background:#fff;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size:clamp(11px, 2.1vw, 13px);
          font-weight:800;
          letter-spacing:.2px;
          white-space:nowrap;
        }

        .bb-foot{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:10px;
          font-size:13px;
          opacity:.78;
        }
        .bb-foot .btn{
          background:#e9e9e9;
          border:1px solid rgba(0,0,0,.10);
        }

        /* Spread */
        .bb-spread{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap:14px;
        }
        @media (max-width: 860px){
          .bb-spread{ grid-template-columns: 1fr; }
        }

        .bb-bottomBar{
          display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:10px;
          margin-top:10px;
          opacity:.9;
        }
        .bb-mini{ font-size:12px; opacity:.78; }
      </style>

      <div class="bb-wrap">
        <div class="card">
          <h2>Livro Cultural — Builder</h2>
          <p class="muted">
            Preview visual do livro (<b>papel branco</b>). Folheie e valide como produto final.
          </p>

          <div id="bb_area"></div>
        </div>
      </div>
    `;

    const area = root.querySelector('#bb_area');

    const renderEmpty = () => {
      area.innerHTML = `
        <div class="bb-paperShell">
          <div class="bb-top">
            <div>
              <div class="title">Nenhum livro carregado</div>
              <div class="hint">Isso acontece quando o Safari limpa o armazenamento.</div>
            </div>
          </div>

          <div class="row" style="margin-top:10px">
            <button class="btn primary" id="bb_make">Criar Livro Minas (PADRÃO)</button>
            <button class="btn" id="bb_go_agent">Abrir Cultural Agent</button>
          </div>

          <p class="bb-mini" style="margin-top:10px">
            Dica: depois exporte o plano em JSON no Cultural Agent pra backup.
          </p>
        </div>
      `;

      area.querySelector('#bb_make').onclick = () => {
        plan = buildDefaultPlanMG(15, 20);
        Storage.set('cultural:book_plan', plan);
        saveSeed(0, 'FOLHEAR');
        this.app.toast?.('Livro Minas criado ✅');
        renderMain();
      };

      area.querySelector('#bb_go_agent').onclick = () => {
        const btn = document.querySelector('.navitem[data-view="cultural"]');
        btn?.click?.();
      };
    };

    const renderPaper = (container, page) => {
      const isPuzzle = page.kind === 'puzzle';
      const icon = iconLabel(page.icon);

      container.innerHTML = `
        <div class="bb-paper">
          <div class="bb-in">
            <div class="bb-head">
              <div>
                <div class="bb-hTitle">${esc(page.title || '')}</div>
                <div class="bb-hMeta">${esc(page.meta || '')}</div>
              </div>
              <div class="bb-pageNo">p.${esc(String(page.pageNo || ''))}</div>
            </div>

            ${
              isPuzzle
                ? `<div class="bb-puzzleBox">
                    <div class="bb-pRow">
                      <span>Prévia visual (editorial)</span>
                      <span>•</span>
                      <span>grade ${esc(String(page.grid))}x${esc(String(page.grid))}</span>
                      <span>•</span>
                      <span id="bb_pPlaced"></span>
                    </div>

                    <div class="bb-gridArea">
                      <div class="bb-grid" id="bb_grid"></div>
                    </div>

                    <div>
                      <div style="font-weight:900; opacity:.75; margin:2px 0 8px 0">Palavras</div>
                      <div class="bb-wordsLine" id="bb_words"></div>
                    </div>

                    <div class="bb-foot">
                      <span>Ilustração P&B: <b>${esc(icon)}</b></span>
                      <button class="btn" id="bb_send_ws">Enviar p/ Caça-palavras</button>
                    </div>
                  </div>`
                : `<div class="bb-bodyText"><pre>${esc(page.body || '')}</pre></div>
                   <div class="bb-foot">
                     <span>Ilustração P&B: <b>${esc(icon)}</b></span>
                     <span></span>
                   </div>`
            }
          </div>
        </div>
      `;

      if (isPuzzle){
        const seedKey = `${plan?.meta?.id||'BOOK'}::${page.sectionId||page.sectionTitle||page.title}::${page.grid}`;
        const gen = generateEditorialPuzzle({
          seedKey,
          size: page.grid,
          words: page.words || [],
          maxWords: (page.words || []).length
        });

        const gridEl = container.querySelector('#bb_grid');
        const wordsEl = container.querySelector('#bb_words');
        const placedEl = container.querySelector('#bb_pPlaced');

        placedEl.textContent = `palavras colocadas ${gen.placedCount}`;

        const N = gen.size;
        gridEl.style.setProperty('--n', String(N));
        gridEl.innerHTML = gen.grid.flat().map(ch => `<div class="bb-cell">${esc(ch)}</div>`).join('');

        // Palavras em linha (chips)
        wordsEl.innerHTML = (gen.words || []).map(w => `<span class="bb-word">${esc(w)}</span>`).join('');

        // Auto-fit do tamanho da célula (pra nunca cortar)
        const fit = () => {
          const areaEl = container.querySelector('.bb-gridArea');
          if (!areaEl) return;

          const r = areaEl.getBoundingClientRect();
          const pad = 24; // margem segura
          const availW = Math.max(120, r.width - pad);
          const availH = Math.max(120, r.height - pad);

          const cell = Math.floor(Math.min(availW / N, availH / N));
          const safeCell = Math.max(14, Math.min(30, cell));
          gridEl.style.setProperty('--cell', `${safeCell}px`);
        };

        requestAnimationFrame(()=>{ fit(); setTimeout(fit, 60); });
        window.addEventListener('resize', fit, { passive:true });

        // Enviar pro Caça-palavras (produção)
        const btn = container.querySelector('#bb_send_ws');
        btn.onclick = () => {
          const ws = {
            title: `Caça-Palavras — ${page.sectionTitle || page.title || ''}`,
            preset: (Number(page.grid) === 13 ? 'BR_POCKET' : 'BR_PLUS'),
            size: page.grid,
            includeKey: true,
            words: (page.words || []).join('\n'),
            output: '',
            ts: Date.now()
          };
          Storage.set('wordsearch:seed', ws);
          this.app.toast?.('Enviado ✅ (abra Caça-palavras e clique Gerar)');
          this.app.log?.(`[BOOK] sent section="${page.sectionTitle||''}" grid=${page.grid} words=${(page.words||[]).length}`);
        };
      }
    };

    const renderMain = () => {
      if (!plan) return renderEmpty();

      const pages = buildPages(plan);
      const spreads = buildSpreadsFromPages(pages);

      let mode = seed.mode === 'SPREAD' ? 'SPREAD' : 'FOLHEAR';
      let pageIndex = Math.max(0, Math.min(Number(seed.pageIndex||0), pages.length - 1));

      const setMode = (m) => {
        mode = (m === 'SPREAD') ? 'SPREAD' : 'FOLHEAR';
        saveSeed(pageIndex, mode);
        draw();
      };

      const clampPage = () => {
        pageIndex = Math.max(0, Math.min(pageIndex, pages.length - 1));
        saveSeed(pageIndex, mode);
      };

      const next = () => { pageIndex++; clampPage(); draw(); };
      const prev = () => { pageIndex--; clampPage(); draw(); };

      const draw = () => {
        area.innerHTML = `
          <div class="bb-top">
            <div>
              <div class="title">${esc(plan.meta?.title || 'LIVRO')}</div>
              <div class="hint">No mobile: arraste a tela, ou use ◀ ▶.</div>
            </div>

            <div class="bb-controls">
              <button class="btn ${mode==='SPREAD'?'primary':''}" id="bb_mode_spread">Spread</button>
              <button class="btn ${mode==='FOLHEAR'?'primary':''}" id="bb_mode_folhear">Folhear</button>
              <button class="btn" id="bb_prev">◀</button>
              <button class="btn" id="bb_next">▶</button>
            </div>
          </div>

          <div class="bb-paperShell">
            <div id="bb_view"></div>

            <div class="bb-bottomBar">
              <div class="bb-mini">Página <b id="bb_pos"></b></div>
              <div class="bb-controls">
                <button class="btn" id="bb_download">Baixar plano (JSON)</button>
                <button class="btn" id="bb_reset">Recriar Minas (PADRÃO)</button>
              </div>
            </div>
          </div>
        `;

        area.querySelector('#bb_mode_spread').onclick = () => setMode('SPREAD');
        area.querySelector('#bb_mode_folhear').onclick = () => setMode('FOLHEAR');
        area.querySelector('#bb_prev').onclick = prev;
        area.querySelector('#bb_next').onclick = next;

        area.querySelector('#bb_reset').onclick = () => {
          plan = buildDefaultPlanMG(15, 20);
          Storage.set('cultural:book_plan', plan);
          pageIndex = 0;
          saveSeed(pageIndex, mode);
          this.app.toast?.('Livro recriado ✅');
          draw();
        };

        area.querySelector('#bb_download').onclick = () => {
          const blob = new Blob([JSON.stringify(plan, null, 2)], { type:'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `book-plan-${(plan.meta?.id||'book')}-${Date.now()}.json`;
          a.click();
          setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
          this.app.toast?.('Plano baixado ✅');
        };

        const view = area.querySelector('#bb_view');
        const pos = area.querySelector('#bb_pos');

        // Swipe (folhear)
        let x0 = null;
        view.addEventListener('touchstart', (e)=>{
          x0 = e.touches?.[0]?.clientX ?? null;
        }, { passive:true });
        view.addEventListener('touchend', (e)=>{
          if (x0 == null) return;
          const x1 = e.changedTouches?.[0]?.clientX ?? x0;
          const dx = x1 - x0;
          x0 = null;
          if (Math.abs(dx) < 45) return;
          if (dx < 0) next(); else prev();
        }, { passive:true });

        if (mode === 'SPREAD'){
          const spreadIndex = Math.floor(pageIndex / 2);
          const sp = spreads[spreadIndex] || spreads[0];
          view.innerHTML = `
            <div class="bb-spread">
              <div id="bb_left"></div>
              <div id="bb_right"></div>
            </div>
          `;
          const left = view.querySelector('#bb_left');
          const right = view.querySelector('#bb_right');

          renderPaper(left, sp.left);
          if (sp.right) renderPaper(right, sp.right);
          else right.innerHTML = `<div class="bb-paper"><div class="bb-in"></div></div>`;

          pos.textContent = `${pageIndex+1}/${pages.length}`;
        } else {
          view.innerHTML = `<div id="bb_one"></div>`;
          const one = view.querySelector('#bb_one');
          renderPaper(one, pages[pageIndex]);
          pos.textContent = `${pageIndex+1}/${pages.length}`;
        }
      };

      draw();
    };

    if (!plan) renderEmpty();
    else renderMain();
  }
}
