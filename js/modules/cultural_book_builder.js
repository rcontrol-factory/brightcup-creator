/* FILE: /js/modules/cultural_book_builder.js */
// Bright Cup Creator — Cultural Book Builder v0.3 PADRÃO (1 ano)
// OBJETIVO: Preview editorial do livro (6x9) NO PADRÃO LIVRO, bonito no mobile.
// ✅ Puzzle com grade quadriculada (sem cortar)
// ✅ Lista de palavras horizontal (wrap) para caber na página
// ✅ Modos: Spread (2 páginas) e Folhear (1 página)
// ✅ Seed persistido (modo + página)
// ✅ Fallback: se Safari limpar storage, cria livro Minas (PADRÃO)

import { Storage } from '../core/storage.js';
import { generateWordSearch } from '../core/wordsearch_gen.js';

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
  // prioriza perto de 7 letras (boa distribuição)
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

function presetFromGrid(grid){
  const g = Number(grid || 0);
  if (g <= 13) return 'BR_POCKET';
  return 'BR_PLUS';
}

function buildDefaultPlanMG(grid=13, wpp=16){
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
          'é tradição que atravessa gerações. Aqui, cultura não é enfeite: é jeito de viver.\n\n' +
          'E tem um detalhe: mineiro fala pouco, mas entende muito.\n' +
          'Se alguém te oferecer café e pão de queijo… você aceitou a amizade sem perceber.',
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
          'ao redor de rios, serras e rotas. O tempo deixa marca: na pedra, na fé e nas histórias contadas.\n\n' +
          'E por aqui história não fica só em livro: fica na conversa — e na memória do povo.',
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
          'O segredo é o queijo e o ponto da massa — cada casa tem seu jeito.\n\n' +
          'Causo real: cada família diz que a dela é “a receita certa”.\n' +
          'O mais mineiro disso tudo é que… todo mundo está “certo” ao mesmo tempo.',
        wordHints:[
          'PAODEQUEIJO','POLVILHO','FORNO','MASSA','QUEIJO','LEITE','OVO','SAL','RECEITA','COZINHA','CANASTRA'
        ]
      },
      {
        id:'cafe_minas',
        icon:'coffee',
        title:'Café e interior',
        text:
          'Café em Minas é ritual. Cheiro que acorda a casa, conversa que começa cedo, ' +
          'e o interior que ensina a valorizar o simples. É parte da identidade mineira.\n\n' +
          'E o café em Minas não é só bebida: é convite.\n' +
          'Se ouvir “passa aqui rapidinho”… pode saber: vai ter café e prosa.',
        wordHints:[
          'CAFE','COADOR','CHEIRO','MANHA','FAZENDA','INTERIOR','TRADICAO','TORRA','XICARA','PROSA'
        ]
      },
      {
        id:'ferrovia',
        icon:'train',
        title:'Ferrovia e o “trem” mineiro',
        text:
          'Em Minas, “trem” não é só vagão: é quase um idioma.\n' +
          'Você fala “pega aquele trem ali” e pronto — serve pra chave, sacola, panela, controle… tudo vira “trem”.\n\n' +
          'Tem gente que diz que é economia de palavras. Outros juram que é só pra sobrar tempo de passar um café.\n\n' +
          'E existe o trem de verdade: trilho, estação, viagem e história. A ferrovia Vitória–Minas marcou caminhos e memórias.\n\n' +
          'Agora me diz: o “trem” é o objeto… ou é a desculpa perfeita pra prosear?',
        wordHints:[
          'FERROVIA','TREM','TRILHO','ESTACAO','VIAGEM','VITORIAMINAS','ROTA','PLATAFORMA','VAGAO','PROSEAR'
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
          'É cultura viva, que une famílias e mantém a história de pé.\n\n' +
          'Festa, procissão, igreja antiga… fé misturada com comunidade.\n' +
          'Em cidade pequena, isso vira calendário do ano — e memória da vida inteira.',
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
          'É natureza que convida a respirar e seguir adiante.\n\n' +
          'E tem o “uai”… que dá discussão boa.\n' +
          'Tem gente que fala “uai é de Minas”, tem gente que fala “uai é de Goiás”.\n' +
          'A verdade? O uai é do Brasil — mas o mineiro usa com uma calma que é só dele.',
        wordHints:[
          'SERRA','MIRANTE','ESTRADA','PAISAGEM','NATUREZA','TRILHA','VALE','CACHOEIRA','UAI'
        ]
      },
      {
        id:'voo_livre_valadares',
        icon:'paraglider',
        title:'Governador Valadares e o voo livre',
        text:
          'Governador Valadares é conhecida como capital mundial do voo livre. ' +
          'O Pico do Ibituruna virou símbolo: aventura, vento e gente do mundo inteiro olhando Minas do alto.\n\n' +
          'Lá de cima, Minas parece mapa vivo: serra, rio, cidade e horizonte.\n' +
          'É liberdade com aquele “uai” quando o vento muda.',
        wordHints:[
          'VALADARES','IBITURUNA','VOOLIVRE','PARAPENTE','ASADELTA','PICO','VENTO','AVENTURA','MIRANTE'
        ]
      }
    ]
  };
}

function buildPages(plan){
  const m = plan.meta || {};
  const grid = Number(m.grid_default || 13);
  const wpp  = Number(m.words_per_puzzle || 16);

  const pages = [];

  // capa/apresentação
  pages.push({
    kind:'text',
    icon:'history',
    title: m.title || 'LIVRO CULTURAL',
    meta: (m.subtitle || '').trim(),
    body: wrap(
      `Apresentação\n\n` +
      `Este livro é uma viagem por Minas Gerais: sabores, histórias, fé, trilhos e montanhas.\n\n` +
      `Cada seção traz um texto curto (com alma) e um caça-palavras temático.\n\n` +
      `Boa leitura e bom passatempo.`,
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

    const words = pickWords(
      []
        .concat(s.wordHints || [])
        .concat([s.title, 'MINAS', 'CULTURA', 'HISTORIA', 'UAI']),
      grid,
      wpp
    );

    pages.push({
      kind:'puzzle',
      icon: s.icon,
      title: `Caça-Palavras — ${s.title}`,
      meta: `Prévia visual (editorial) • grade ${grid}x${grid} • palavras ${words.length}`,
      sectionTitle: s.title,
      sectionId: s.id,
      grid,
      words
    });
  });

  // gabarito placeholder (fase export)
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

function makePuzzlePreview(puzzle){
  const grid = puzzle.grid || 13;
  const words = puzzle.words || [];

  // gera grade real (determinística leve) — seed baseado no título/sectionId
  // (não precisa ser “o final” aqui; é visual editorial)
  const gen = generateWordSearch({
    size: grid,
    words,
    maxWords: words.length,
    allowDiagonal: true,
    allowBackwards: true
  });

  return gen;
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

    const seed = Storage.get('cultural:builder_seed', {
      mode: 'FOLHEAR', // FOLHEAR | SPREAD
      pageIndex: 0
    });

    root.innerHTML = `
      <style>
        .bb-wrap{ display:grid; gap:14px; }
        .bb-top{
          display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between;
          gap:10px;
        }
        .bb-top h2{ margin:0; }
        .bb-help{ opacity:.82; }
        .bb-controls{
          display:flex; gap:10px; flex-wrap:wrap; align-items:center;
        }
        .bb-toggle{
          display:flex; gap:8px; padding:6px; border-radius:999px;
          border:1px solid rgba(255,255,255,.14);
          background: rgba(0,0,0,.18);
        }
        .bb-toggle button{
          border-radius:999px;
          padding:8px 12px;
        }

        /* "papel branco" */
        .bb-paper{
          background:#f2f3f5;
          color:#101214;
          border-radius:18px;
          border:1px solid rgba(0,0,0,.08);
          box-shadow: 0 10px 30px rgba(0,0,0,.18);
          overflow:hidden;
        }
        .bb-paper-head{
          padding:14px 16px 10px 16px;
          border-bottom:1px solid rgba(0,0,0,.10);
        }
        .bb-paper-title{
          font-weight:900;
          font-size:24px;
          line-height:1.05;
          letter-spacing:-.2px;
        }
        .bb-paper-meta{
          margin-top:6px;
          font-size:14px;
          opacity:.76;
        }
        .bb-paper-body{
          padding:14px 16px 14px 16px;
        }

        .bb-textbox{
          border-radius:14px;
          border:1px solid rgba(0,0,0,.12);
          background: rgba(255,255,255,.70);
          padding:14px;
          min-height: 360px;
        }
        .bb-textbox pre{
          margin:0;
          white-space:pre-wrap;
          word-break:break-word;
          font-family: ui-serif, Georgia, "Times New Roman", serif;
          font-size:18px;
          line-height:1.35;
        }

        /* puzzle */
        .bb-puzzle{
          display:grid;
          gap:12px;
        }
        .bb-gridwrap{
          border-radius:14px;
          border:1px solid rgba(0,0,0,.14);
          background: rgba(255,255,255,.76);
          padding:10px;
        }
        .bb-grid{
          display:grid;
          width:100%;
          aspect-ratio: 1 / 1;
          border-radius:10px;
          overflow:hidden;
          border:1px solid rgba(0,0,0,.10);
        }
        .bb-cell{
          display:flex;
          align-items:center;
          justify-content:center;
          border:1px solid rgba(0,0,0,.10);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-weight:800;
          user-select:none;
        }

        .bb-words{
          border-radius:14px;
          border:1px solid rgba(0,0,0,.10);
          background: rgba(255,255,255,.70);
          padding:12px 14px;
        }
        .bb-words .label{
          font-size:14px;
          opacity:.75;
          margin-bottom:8px;
        }
        .bb-wordsline{
          display:flex;
          flex-wrap:wrap;
          gap:10px 14px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size:14px;
          line-height:1.2;
        }
        .bb-wordsline span{
          white-space:nowrap;
        }

        .bb-paper-foot{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          padding:12px 16px;
          border-top:1px solid rgba(0,0,0,.10);
          background: rgba(255,255,255,.55);
        }
        .bb-foot-left{ font-size:14px; opacity:.85; }
        .bb-foot-right{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; }

        .bb-pages{
          display:grid;
          gap:14px;
        }
        .bb-spread{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap:14px;
          align-items:start;
        }
        @media (max-width: 860px){
          .bb-spread{ grid-template-columns: 1fr; }
        }
      </style>

      <div class="bb-wrap">
        <div class="card">
          <div class="bb-top">
            <div>
              <h2>Livro Cultural — Builder</h2>
              <div class="muted bb-help">Preview visual do livro (<b>papel branco</b>). Folheie e valide como produto final.</div>
            </div>
            <div class="bb-controls">
              <div class="bb-toggle">
                <button class="btn" id="bb_mode_spread">Spread</button>
                <button class="btn" id="bb_mode_folhear">Folhear</button>
              </div>
              <button class="btn" id="bb_prev">◀</button>
              <button class="btn" id="bb_next">▶</button>
            </div>
          </div>

          <div class="muted" style="margin-top:10px">
            <b id="bb_bookname"></b>
            <span style="margin-left:10px">No mobile: arraste a tela, ou use ◀ ▶.</span>
          </div>

          <div id="bb_area" style="margin-top:12px"></div>

          <div class="row" style="margin-top:12px">
            <button class="btn" id="bb_download_plan">Baixar plano (JSON)</button>
            <button class="btn" id="bb_reset">Recriar Minas (PADRÃO)</button>
          </div>

          <div class="muted" style="margin-top:10px">
            Página <b id="bb_pagepos"></b>
          </div>
        </div>
      </div>
    `;

    const area = root.querySelector('#bb_area');
    const bookname = root.querySelector('#bb_bookname');
    const posEl = root.querySelector('#bb_pagepos');

    const saveSeed = (mode, pageIndex) => {
      Storage.set('cultural:builder_seed', {
        mode: mode || seed.mode || 'FOLHEAR',
        pageIndex: Number.isFinite(pageIndex) ? pageIndex : (seed.pageIndex || 0)
      });
    };

    const ensurePlan = () => {
      if (!plan) {
        plan = buildDefaultPlanMG(13, 16);
        Storage.set('cultural:book_plan', plan);
      }
      return plan;
    };

    const renderPaper = (page) => {
      const pageNo = page?.pageNo || 1;
      const title = page?.title || '';
      const meta = page?.meta || '';
      const icon = page?.icon || 'history';

      const rightBtn = (page.kind === 'puzzle')
        ? `<button class="btn" id="bb_send_ws">Enviar p/ Caça-palavras</button>`
        : '';

      let bodyHtml = '';

      if (page.kind === 'puzzle') {
        const gen = makePuzzlePreview(page);

        // cell sizing: calcula fonte pela N (13/15/17)
        const N = gen.size;
        const fontPx = (N >= 17) ? 12 : (N >= 15 ? 13 : 14);

        const gridStyle = `grid-template-columns: repeat(${N}, 1fr);`;
        const cells = [];
        for (let y=0; y<N; y++){
          for (let x=0; x<N; x++){
            const ch = gen.grid?.[y]?.[x] || '';
            cells.push(`<div class="bb-cell" style="font-size:${fontPx}px">${esc(ch)}</div>`);
          }
        }

        const wordsLine = (gen.words || []).map(w => `<span>${esc(w)}</span>`).join('');

        bodyHtml = `
          <div class="bb-puzzle">
            <div class="bb-gridwrap">
              <div class="bb-grid" style="${gridStyle}">
                ${cells.join('')}
              </div>
            </div>

            <div class="bb-words">
              <div class="label">Palavras</div>
              <div class="bb-wordsline">${wordsLine}</div>
            </div>
          </div>
        `;
      } else {
        bodyHtml = `
          <div class="bb-textbox">
            <pre>${esc(page.body || '')}</pre>
          </div>
        `;
      }

      return `
        <div class="bb-paper" data-page="${esc(String(pageNo))}">
          <div class="bb-paper-head">
            <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:10px">
              <div>
                <div class="bb-paper-title">${esc(title)}</div>
                <div class="bb-paper-meta">${esc(meta)}</div>
              </div>
              <div class="bb-paper-meta">p.${esc(String(pageNo))}</div>
            </div>
          </div>

          <div class="bb-paper-body">
            ${bodyHtml}
          </div>

          <div class="bb-paper-foot">
            <div class="bb-foot-left">Ilustração P&amp;B: <b>${esc(iconLabel(icon))}</b></div>
            <div class="bb-foot-right">${rightBtn}</div>
          </div>
        </div>
      `;
    };

    const renderMain = () => {
      ensurePlan();
      const pages = buildPages(plan);

      let mode = (seed.mode === 'SPREAD' || seed.mode === 'FOLHEAR') ? seed.mode : 'FOLHEAR';
      let pageIndex = Math.max(0, Math.min(seed.pageIndex || 0, pages.length - 1));

      const setModeButtons = () => {
        const bS = root.querySelector('#bb_mode_spread');
        const bF = root.querySelector('#bb_mode_folhear');
        if (mode === 'SPREAD') { bS.classList.add('primary'); bF.classList.remove('primary'); }
        else { bF.classList.add('primary'); bS.classList.remove('primary'); }
      };

      const updatePos = () => {
        posEl.textContent = `${pageIndex + 1}/${pages.length}`;
        saveSeed(mode, pageIndex);
      };

      const wirePuzzleSend = () => {
        const paper = area.querySelector('.bb-paper');
        if (!paper) return;
        const pageNo = parseInt(paper.getAttribute('data-page') || '1', 10);
        const p = pages.find(x => x.pageNo === pageNo);
        if (!p || p.kind !== 'puzzle') return;

        const btn = paper.querySelector('#bb_send_ws');
        if (!btn) return;

        btn.onclick = () => {
          const ws = {
            title: `Caça-Palavras — ${p.sectionTitle || p.title || 'Seção'}`,
            preset: presetFromGrid(p.grid),
            size: p.grid,
            maxWords: (p.words || []).length,
            includeKey: true,
            words: (p.words || []).join('\n'),
            puzzleId: p.sectionId || '',
            sectionId: p.sectionId || '',
            sectionTitle: p.sectionTitle || ''
          };
          Storage.set('wordsearch:seed', ws);
          this.app.toast?.('Enviado ✅ (abra Caça-palavras e clique Gerar+Salvar)');
          try { this.app.log?.(`[BOOK] sent section="${p.sectionTitle || ''}" id=${p.sectionId || ''} grid=${p.grid} words=${(p.words||[]).length}`); } catch {}
        };
      };

      const render = () => {
        setModeButtons();

        bookname.textContent = String(plan.meta?.title || 'LIVRO');

        if (mode === 'SPREAD') {
          const left = pages[pageIndex];
          const right = pages[pageIndex + 1] || null;

          area.innerHTML = `
            <div class="bb-spread">
              <div>${renderPaper(left)}</div>
              <div>${right ? renderPaper(right) : ''}</div>
            </div>
          `;
        } else {
          const page = pages[pageIndex];
          area.innerHTML = `<div class="bb-pages">${renderPaper(page)}</div>`;
        }

        wirePuzzleSend();
        updatePos();
      };

      // controls
      root.querySelector('#bb_mode_spread').onclick = () => { mode = 'SPREAD'; render(); };
      root.querySelector('#bb_mode_folhear').onclick = () => { mode = 'FOLHEAR'; render(); };

      root.querySelector('#bb_prev').onclick = () => {
        if (mode === 'SPREAD') pageIndex = Math.max(0, pageIndex - 2);
        else pageIndex = Math.max(0, pageIndex - 1);
        render();
      };

      root.querySelector('#bb_next').onclick = () => {
        if (mode === 'SPREAD') pageIndex = Math.min(pages.length - 1, pageIndex + 2);
        else pageIndex = Math.min(pages.length - 1, pageIndex + 1);
        render();
      };

      root.querySelector('#bb_reset').onclick = () => {
        plan = buildDefaultPlanMG(13, 16);
        Storage.set('cultural:book_plan', plan);
        Storage.set('cultural:builder_seed', { mode: 'FOLHEAR', pageIndex: 0 });
        this.app.toast?.('Livro recriado ✅');
        renderMain();
      };

      root.querySelector('#bb_download_plan').onclick = () => {
        try{
          const blob = new Blob([JSON.stringify(plan, null, 2)], { type:'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `book-plan-${(plan?.meta?.id||'cultural')}-${Date.now()}.json`;
          a.click();
          setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
          this.app.toast?.('Plano baixado ✅');
        } catch(e){
          this.app.toast?.('Falha ao baixar');
          try { this.app.log?.('[BOOK] download failed: ' + (e?.message || e)); } catch {}
        }
      };

      render();
    };

    renderMain();
  }
}
