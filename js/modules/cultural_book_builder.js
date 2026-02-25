/* FILE: /js/modules/cultural_book_builder.js */
// Bright Cup Creator — Cultural Book Builder v0.3 PADRÃO (1 ano)
// Objetivo: preview editorial do livro cultural (6x9) de forma LIMPA e VISUAL no mobile.
// - Se não existir plano (Safari limpou storage): gera plano padrão MG aqui mesmo.
// - Esconde especificações técnicas da UI (specs ficam internas).
// - Modo Folhear no mobile (1 página) + modo Spread (2 páginas).
// - Puzzle com prévia VISÍVEL (grade simples) para validação editorial.
// - Backup anti-Safari: exportar/importar plano JSON aqui.
// - Não gera PDF ainda (isso vem no Exporter).

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

/* === PREVIEW PUZZLE (SIMPLES, RÁPIDO, VISUAL) ===========================
   Isso NÃO substitui o gerador oficial do módulo Caça-palavras.
   Aqui é só para você VER o livro “folheável” e validar editorial.
======================================================================== */
function makeRng(seed){
  let x = (seed >>> 0) || 123456789;
  return () => {
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17; x >>>= 0;
    x ^= x << 5;  x >>>= 0;
    return (x >>> 0) / 4294967296;
  };
}

function randomLetter(rng){
  const A = 65;
  return String.fromCharCode(A + Math.floor(rng()*26));
}

function tryPlaceWord(grid, word, rng){
  const n = grid.length;
  const dirs = [
    [ 1, 0], [-1, 0],
    [ 0, 1], [ 0,-1],
    [ 1, 1], [-1,-1],
    [ 1,-1], [-1, 1],
  ];
  const attempts = 160;
  const w = word;
  for (let t=0; t<attempts; t++){
    const d = dirs[Math.floor(rng()*dirs.length)];
    const dx = d[0], dy = d[1];
    const x0 = Math.floor(rng()*n);
    const y0 = Math.floor(rng()*n);
    const x1 = x0 + dx*(w.length-1);
    const y1 = y0 + dy*(w.length-1);
    if (x1 < 0 || x1 >= n || y1 < 0 || y1 >= n) continue;

    // check overlap compatibility
    let ok = true;
    for (let i=0; i<w.length; i++){
      const x = x0 + dx*i;
      const y = y0 + dy*i;
      const cell = grid[y][x];
      if (cell !== '.' && cell !== w[i]) { ok = false; break; }
    }
    if (!ok) continue;

    // place
    for (let i=0; i<w.length; i++){
      const x = x0 + dx*i;
      const y = y0 + dy*i;
      grid[y][x] = w[i];
    }
    return true;
  }
  return false;
}

function buildPreviewGrid(size, words, seed){
  const rng = makeRng(seed);
  const grid = Array.from({length:size}, () => Array.from({length:size}, () => '.'));
  const placed = [];
  const list = (words || []).slice().sort((a,b)=>b.length-a.length);

  for (const w of list){
    if (!w) continue;
    if (w.length > size) continue;
    const ok = tryPlaceWord(grid, w, rng);
    if (ok) placed.push(w);
  }
  // fill blanks
  for (let y=0; y<size; y++){
    for (let x=0; x<size; x++){
      if (grid[y][x] === '.') grid[y][x] = randomLetter(rng);
    }
  }
  const lines = grid.map(row => row.join(' ')).join('\n');
  return { lines, placedCount: placed.length };
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
      72
    )
  });

  (plan.sections || []).forEach((s) => {
    pages.push({
      kind:'text',
      icon: s.icon,
      title: s.title,
      meta: 'Texto cultural',
      body: wrap(s.text || '', 72)
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
      72
    )
  });

  pages.forEach((p, i) => p.pageNo = i + 1);
  return pages;
}

function downloadText(filename, text){
  try{
    const blob = new Blob([text], { type:'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 4000);
  }catch{}
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
    const seed = Storage.get('cultural:builder_seed', { pageIndex: 0, mode: 'spread' }); // mode: spread | folio
    const ui = Storage.get('cultural:builder_ui', {});

    root.innerHTML = `
      <style>
        .bb-wrap{ display:grid; gap:14px; }
        .bb-toolbar{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; justify-content:space-between; }
        .bb-toolbar .left, .bb-toolbar .right{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
        .bb-mode{ display:flex; gap:8px; align-items:center; }
        .bb-mode .chip{
          border:1px solid rgba(255,255,255,.14);
          background:rgba(0,0,0,.12);
          padding:8px 10px;
          border-radius:999px;
          font-size:12px;
          cursor:pointer;
          user-select:none;
        }
        .bb-mode .chip.active{
          border-color: rgba(140,220,255,.35);
          background: rgba(20,120,160,.20);
        }

        .bb-spread{ display:grid; grid-template-columns: 1fr 1fr; gap:14px; }
        .bb-folio{ display:grid; grid-template-columns: 1fr; gap:14px; }

        /* ===== PAPER PAGE (VISUAL) ===== */
        .bb-page{
          border-radius:18px;
          border:1px solid rgba(255,255,255,.10);
          background:rgba(0,0,0,.18);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          padding:14px;
          position:relative;
          overflow:hidden;
        }
        .bb-page::before{ content:""; display:block; padding-top:150%; } /* 6x9 ratio */
        .bb-page > .bb-inner{ position:absolute; inset:14px; display:flex; flex-direction:column; gap:10px; }

        .paper{
          flex:1;
          border-radius:14px;
          background: rgba(255,255,255,.96);
          color:#111;
          box-shadow: 0 12px 32px rgba(0,0,0,.22);
          border: 1px solid rgba(0,0,0,.08);
          overflow:hidden;
          display:flex;
          flex-direction:column;
        }
        .paper-head{
          padding:12px 14px 10px 14px;
          border-bottom: 1px solid rgba(0,0,0,.08);
          display:flex; align-items:flex-start; justify-content:space-between; gap:10px;
        }
        .paper-title{
          font-size:15px;
          font-weight:900;
          letter-spacing:.2px;
          overflow-wrap:anywhere;
        }
        .paper-meta{
          font-size:12px;
          color: rgba(0,0,0,.62);
          overflow-wrap:anywhere;
          margin-top:2px;
        }
        .paper-pageno{
          font-size:12px;
          color: rgba(0,0,0,.55);
          white-space:nowrap;
        }
        .paper-body{
          padding:12px 14px;
          overflow:auto;
        }
        .paper-body pre{
          margin:0;
          white-space:pre-wrap;
          overflow-wrap:anywhere;
          word-break:break-word;
          font-family: ui-serif, Georgia, "Times New Roman", serif;
          font-size:14px;
          line-height:1.36;
        }
        .paper-foot{
          padding:10px 14px;
          border-top: 1px solid rgba(0,0,0,.08);
          display:flex; justify-content:space-between; align-items:center; gap:10px;
          font-size:12px;
          color: rgba(0,0,0,.62);
        }

        .puzzle-grid{
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size:12px;
          line-height:1.15;
          letter-spacing: .5px;
          color:#111;
        }
        .puzzle-words{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap:6px 14px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size:12px;
          color:#111;
          opacity:.95;
        }

        .bb-footer{ display:flex; justify-content:space-between; align-items:center; gap:10px; font-size:12px; opacity:.86; }
        .bb-mini{ font-size:12px; opacity:.78; }
        .bb-empty{ display:grid; gap:10px; }

        .bb-navbtn{ width:44px; min-width:44px; text-align:center; }
        .bb-swipehint{ font-size:12px; opacity:.72; }

        @media (max-width: 860px){
          .bb-spread{ grid-template-columns: 1fr; }
        }
      </style>

      <div class="bb-wrap">
        <div class="card">
          <h2>Livro Cultural — Builder</h2>
          <p class="muted">
            Preview <b>visual</b> do livro (papel branco). Folheie e valide como produto final.
          </p>
          <div id="bb_area"></div>
        </div>
      </div>
    `;

    const area = root.querySelector('#bb_area');

    const saveSeed = () => Storage.set('cultural:builder_seed', seed);

    const goView = (viewId) => {
      const btn = document.querySelector(`.navitem[data-view="${viewId}"]`);
      btn?.click?.();
    };

    const renderEmpty = () => {
      area.innerHTML = `
        <div class="bb-empty">
          <p class="muted"><b>Nenhum livro carregado.</b> Isso acontece quando o Safari limpa o armazenamento.</p>
          <div class="row">
            <button class="btn primary" id="bb_make">Criar Livro Minas (PADRÃO)</button>
            <button class="btn" id="bb_go_agent">Abrir Cultural Agent</button>
          </div>
          <div class="row">
            <button class="btn" id="bb_export">Baixar plano (JSON)</button>
            <label class="btn" for="bb_import" style="cursor:pointer;">Importar plano</label>
            <input id="bb_import" type="file" accept="application/json" style="display:none" />
          </div>
          <p class="bb-mini muted">Dica: exporte o plano em JSON pra nunca perder no Safari.</p>
        </div>
      `;

      area.querySelector('#bb_make').onclick = () => {
        plan = buildDefaultPlanMG(15, 20);
        Storage.set('cultural:book_plan', plan);
        seed.pageIndex = 0;
        saveSeed();
        this.app.toast?.('Livro Minas criado ✅');
        renderMain();
      };

      area.querySelector('#bb_go_agent').onclick = () => goView('cultural');

      area.querySelector('#bb_export').onclick = () => {
        const p = plan || buildDefaultPlanMG(15, 20);
        downloadText(`brightcup_plan_${p.meta?.id || 'book'}.json`, JSON.stringify(p, null, 2));
        this.app.toast?.('Plano baixado ✅');
      };

      area.querySelector('#bb_import').onchange = async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        try{
          const txt = await f.text();
          const obj = JSON.parse(txt);
          if (!obj || !obj.meta || !obj.sections) throw new Error('invalid');
          plan = obj;
          Storage.set('cultural:book_plan', plan);
          seed.pageIndex = 0;
          saveSeed();
          this.app.toast?.('Plano importado ✅');
          renderMain();
        }catch{
          this.app.toast?.('JSON inválido ❌');
        }
        e.target.value = '';
      };
    };

    const renderMain = () => {
      if (!plan) return renderEmpty();

      const pages = buildPages(plan);
      seed.pageIndex = Math.max(0, Math.min(seed.pageIndex || 0, pages.length - 1));
      seed.mode = (seed.mode === 'folio' || seed.mode === 'spread') ? seed.mode : 'spread';
      saveSeed();

      area.innerHTML = `
        <div class="bb-toolbar">
          <div class="left">
            <span class="bb-mini"><b>${esc(plan.meta?.title || 'LIVRO')}</b></span>
            <span class="bb-swipehint muted">No mobile: arraste para o lado (folhear).</span>
          </div>

          <div class="right">
            <div class="bb-mode">
              <div class="chip ${seed.mode==='spread'?'active':''}" id="bb_mode_spread">Spread</div>
              <div class="chip ${seed.mode==='folio'?'active':''}" id="bb_mode_folio">Folhear</div>
            </div>
            <button class="btn bb-navbtn" id="bb_prev">◀</button>
            <button class="btn bb-navbtn" id="bb_next">▶</button>
          </div>
        </div>

        <div id="bb_pages"></div>

        <div class="bb-footer">
          <span class="bb-mini">Página <b id="bb_pos"></b></span>
          <div class="row" style="gap:8px;">
            <button class="btn" id="bb_export2">Baixar plano (JSON)</button>
            <button class="btn" id="bb_reset">Recriar Minas (PADRÃO)</button>
          </div>
        </div>
      `;

      const pagesHost = area.querySelector('#bb_pages');
      const pos = area.querySelector('#bb_pos');

      const renderPaper = (p) => {
        const icon = iconLabel(p.icon);
        const pageno = p.pageNo || '';
        const title = p.title || '';
        const meta = p.meta || '';
        const isPuzzle = p.kind === 'puzzle';

        let bodyHtml = '';
        if (!isPuzzle){
          bodyHtml = `<pre>${esc(p.body || '')}</pre>`;
        } else {
          const seedNum = (plan.meta?.id ? plan.meta.id.length : 7) * 1000 + (p.pageNo || 1) * 77 + (p.words?.length || 0);
          const { lines, placedCount } = buildPreviewGrid(Number(p.grid||15), p.words || [], seedNum);
          const wordsHtml = (p.words || []).map(w => `<div>${esc(w)}</div>`).join('');

          bodyHtml = `
            <div class="bb-mini" style="margin-bottom:8px; color:rgba(0,0,0,.65)">
              Prévia visual (editorial) • grade ${esc(String(p.grid))}x${esc(String(p.grid))} • palavras colocadas ${esc(String(placedCount))}
            </div>
            <pre class="puzzle-grid">${esc(lines)}</pre>
            <div style="height:10px"></div>
            <div class="bb-mini" style="margin:4px 0 6px 0; color:rgba(0,0,0,.65)">Palavras</div>
            <div class="puzzle-words">${wordsHtml}</div>
          `;
        }

        const footerRight = isPuzzle
          ? `<button class="btn" data-send="1">Enviar p/ Caça-palavras</button>`
          : `<span></span>`;

        return `
          <div class="paper">
            <div class="paper-head">
              <div>
                <div class="paper-title">${esc(title)}</div>
                <div class="paper-meta">${esc(meta)}</div>
              </div>
              <div class="paper-pageno">p.${esc(String(pageno))}</div>
            </div>
            <div class="paper-body">${bodyHtml}</div>
            <div class="paper-foot">
              <span>Ilustração P&B: <b>${esc(icon)}</b></span>
              ${footerRight}
            </div>
          </div>
        `;
      };

      const render = () => {
        const i = seed.pageIndex || 0;

        if (seed.mode === 'folio'){
          const p = pages[i];
          pagesHost.className = 'bb-folio';
          pagesHost.innerHTML = `
            <div class="bb-page" id="bb_one"><div class="bb-inner">${renderPaper(p)}</div></div>
          `;
          pos.textContent = `${i+1}/${pages.length}`;

          const sendBtn = pagesHost.querySelector('[data-send="1"]');
          if (sendBtn){
            sendBtn.onclick = () => {
              const pz = pages[i];
              const ws = {
                title: pz.title || `Caça-Palavras — ${pz.sectionTitle || ''}`,
                preset: 'BR_POCKET',
                size: pz.grid,
                includeKey: true,
                words: (pz.words || []).join('\n'),
                output: '',
                ts: Date.now()
              };
              Storage.set('wordsearch:seed', ws);
              this.app.toast?.('Enviado ✅ (abra Caça-palavras e clique Gerar)');
              this.app.log?.(`[BOOK] sent page=${pz.pageNo} section="${pz.sectionTitle||''}" grid=${pz.grid} words=${(pz.words||[]).length}`);
              goView('wordsearch');
            };
          }
        } else {
          const left = pages[i];
          const right = pages[i+1] || { kind:'text', icon:'history', title:'', meta:'', body:'', pageNo: (left?.pageNo||i+1)+1 };
          pagesHost.className = 'bb-spread';
          pagesHost.innerHTML = `
            <div class="bb-page" id="bb_left"><div class="bb-inner">${renderPaper(left)}</div></div>
            <div class="bb-page" id="bb_right"><div class="bb-inner">${renderPaper(right)}</div></div>
          `;
          pos.textContent = `${i+1}/${pages.length}`;

          // botão enviar no RIGHT se for puzzle
          const sendBtn = pagesHost.querySelector('#bb_right [data-send="1"]');
          if (sendBtn){
            sendBtn.onclick = () => {
              const pz = right;
              const ws = {
                title: pz.title || `Caça-Palavras — ${pz.sectionTitle || ''}`,
                preset: 'BR_POCKET',
                size: pz.grid,
                includeKey: true,
                words: (pz.words || []).join('\n'),
                output: '',
                ts: Date.now()
              };
              Storage.set('wordsearch:seed', ws);
              this.app.toast?.('Enviado ✅ (abra Caça-palavras e clique Gerar)');
              this.app.log?.(`[BOOK] sent page=${pz.pageNo} section="${pz.sectionTitle||''}" grid=${pz.grid} words=${(pz.words||[]).length}`);
              goView('wordsearch');
            };
          }
        }

        saveSeed();
      };

      const prev = () => {
        if (seed.mode === 'spread'){
          seed.pageIndex = Math.max(0, (seed.pageIndex||0) - 2);
        } else {
          seed.pageIndex = Math.max(0, (seed.pageIndex||0) - 1);
        }
        render();
      };

      const next = () => {
        if (seed.mode === 'spread'){
          seed.pageIndex = Math.min(pages.length - 1, (seed.pageIndex||0) + 2);
        } else {
          seed.pageIndex = Math.min(pages.length - 1, (seed.pageIndex||0) + 1);
        }
        render();
      };

      area.querySelector('#bb_prev').onclick = prev;
      area.querySelector('#bb_next').onclick = next;

      area.querySelector('#bb_mode_spread').onclick = () => {
        seed.mode = 'spread';
        // alinha pra par (página esquerda)
        seed.pageIndex = Math.max(0, (seed.pageIndex||0) - ((seed.pageIndex||0) % 2));
        saveSeed();
        renderMain();
      };
      area.querySelector('#bb_mode_folio').onclick = () => {
        seed.mode = 'folio';
        saveSeed();
        renderMain();
      };

      // swipe (mobile)
      let x0 = null;
      const onTouchStart = (e) => { x0 = e.touches?.[0]?.clientX ?? null; };
      const onTouchEnd = (e) => {
        if (x0 == null) return;
        const x1 = e.changedTouches?.[0]?.clientX ?? null;
        if (x1 == null) { x0 = null; return; }
        const dx = x1 - x0;
        x0 = null;
        if (Math.abs(dx) < 42) return;
        if (dx > 0) prev(); else next();
      };
      pagesHost.addEventListener('touchstart', onTouchStart, { passive:true });
      pagesHost.addEventListener('touchend', onTouchEnd, { passive:true });

      area.querySelector('#bb_export2').onclick = () => {
        downloadText(`brightcup_plan_${plan.meta?.id || 'book'}.json`, JSON.stringify(plan, null, 2));
        this.app.toast?.('Plano baixado ✅');
      };

      area.querySelector('#bb_reset').onclick = () => {
        plan = buildDefaultPlanMG(15, 20);
        Storage.set('cultural:book_plan', plan);
        seed.pageIndex = 0;
        seed.mode = 'folio';
        saveSeed();
        this.app.toast?.('Livro recriado ✅');
        renderMain();
      };

      render();
    };

    if (!plan) renderEmpty();
    else renderMain();
  }
}
