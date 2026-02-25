/* FILE: /js/modules/cultural_book_builder.js */
// Bright Cup Creator — Cultural Book Builder v0.2 PADRÃO (1 ano)
// Objetivo: preview editorial do livro cultural (6x9) de forma LIMPA no mobile.
// - Se não existir plano (Safari limpou storage): gera plano padrão MG aqui mesmo.
// - Esconde especificações técnicas da UI (specs ficam internas).
// - Mostra spreads (duas páginas): texto + puzzle.
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

function buildSpreads(plan){
  const m = plan.meta || {};
  const grid = Number(m.grid_default || 15);
  const wpp  = Number(m.words_per_puzzle || 20);

  const pages = [];

  // página inicial (apresentação)
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

  // seções
  (plan.sections || []).forEach((s) => {
    pages.push({
      kind:'text',
      icon: s.icon,
      title: s.title,
      meta: 'Texto cultural',
      body: wrap(s.text || '', 78)
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

  // gabarito placeholder (real entra no Export PDF)
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

  const spreads = [];
  for (let i = 0; i < pages.length; i += 2){
    const left = pages[i];
    const right = pages[i+1] || { kind:'text', icon:'history', title:'', meta:'', body:'', pageNo: left.pageNo + 1 };

    spreads.push({
      left: {
        title: left.title || '',
        meta: left.meta || '',
        body: left.kind === 'puzzle'
          ? `Página reservada para puzzle.\n(Visualização completa no painel da direita.)`
          : (left.body || ''),
        icon: left.icon,
        pageNo: left.pageNo
      },
      right: {
        kind: right.kind,
        title: right.title || '',
        meta: right.meta || '',
        icon: right.icon,
        pageNo: right.pageNo || (left.pageNo + 1),
        grid: right.grid || grid,
        words: right.words || [],
        sectionTitle: right.sectionTitle || right.title || ''
      }
    });
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
    const seed = Storage.get('cultural:builder_seed', { spreadIndex: 0 });

    root.innerHTML = `
      <style>
        .bb-wrap{ display:grid; gap:14px; }
        .bb-toolbar{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; justify-content:space-between; }
        .bb-toolbar .left, .bb-toolbar .right{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
        .bb-spread{ display:grid; grid-template-columns: 1fr 1fr; gap:14px; }
        .bb-page{
          border-radius:18px;
          border:1px solid rgba(255,255,255,.12);
          background:rgba(0,0,0,.18);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          padding:14px;
          position:relative;
          overflow:hidden;
        }
        .bb-page::before{ content:""; display:block; padding-top:150%; } /* 6x9 ratio */
        .bb-page > .bb-inner{ position:absolute; inset:14px; display:flex; flex-direction:column; gap:10px; }
        .bb-head{ display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
        .bb-title{ font-size:16px; font-weight:900; letter-spacing:.2px; overflow-wrap:anywhere; }
        .bb-meta{ font-size:12px; opacity:.78; overflow-wrap:anywhere; }
        .bb-body{
          flex:1;
          border-radius:14px;
          border:1px solid rgba(255,255,255,.10);
          background:rgba(0,0,0,.16);
          padding:12px;
          overflow:auto;
        }
        .bb-body pre{
          margin:0;
          white-space:pre-wrap;
          overflow-wrap:anywhere;
          word-break:break-word;
          font-family: ui-serif, Georgia, "Times New Roman", serif;
          font-size:14px;
          line-height:1.32;
        }
        .bb-gridbox{
          flex:1;
          border-radius:14px;
          border:1px dashed rgba(255,255,255,.16);
          background:rgba(0,0,0,.10);
          display:flex; align-items:center; justify-content:center;
          text-align:center;
          padding:12px;
        }
        .bb-words{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap:6px 14px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size:12px;
          opacity:.92;
          overflow-wrap:anywhere;
        }
        .bb-footer{ display:flex; justify-content:space-between; align-items:center; gap:10px; font-size:12px; opacity:.82; }
        .bb-mini{ font-size:12px; opacity:.78; }
        .bb-empty{
          display:grid;
          gap:10px;
        }
        @media (max-width: 860px){
          .bb-spread{ grid-template-columns: 1fr; }
        }
      </style>

      <div class="bb-wrap">
        <div class="card">
          <h2>Livro Cultural — Builder</h2>
          <p class="muted">
            Tela limpa pra validar o livro <b>como livro</b> (texto + puzzle). Sem mostrar “spec técnica”.
          </p>

          <div id="bb_area"></div>
        </div>
      </div>
    `;

    const area = root.querySelector('#bb_area');

    const renderEmpty = () => {
      area.innerHTML = `
        <div class="bb-empty">
          <p class="muted"><b>Nenhum livro carregado.</b> Isso acontece quando o Safari limpa o armazenamento.</p>
          <div class="row">
            <button class="btn primary" id="bb_make">Criar Livro Minas (PADRÃO)</button>
            <button class="btn" id="bb_go_agent">Abrir Cultural Agent</button>
          </div>
          <p class="bb-mini muted">Dica: depois você pode exportar o plano em JSON no Cultural Agent para backup.</p>
        </div>
      `;

      area.querySelector('#bb_make').onclick = () => {
        const grid = 15;
        const wpp = 20;
        plan = buildDefaultPlanMG(grid, wpp);
        Storage.set('cultural:book_plan', plan);
        this.app.toast?.('Livro Minas criado ✅');
        renderMain();
      };

      area.querySelector('#bb_go_agent').onclick = () => {
        // navegação: simula clique no navitem cultural
        const btn = document.querySelector('.navitem[data-view="cultural"]');
        btn?.click?.();
      };
    };

    const renderMain = () => {
      if (!plan) return renderEmpty();

      const spreads = buildSpreads(plan);
      let idx = Math.max(0, Math.min(seed.spreadIndex || 0, spreads.length - 1));

      const saveIdx = () => Storage.set('cultural:builder_seed', { spreadIndex: idx });

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

        <div class="bb-spread">
          <div class="bb-page" id="bb_left"><div class="bb-inner"></div></div>
          <div class="bb-page" id="bb_right"><div class="bb-inner"></div></div>
        </div>

        <div class="bb-footer">
          <span class="bb-mini">Spread <b id="bb_pos"></b></span>
          <button class="btn" id="bb_reset">Recriar livro Minas (PADRÃO)</button>
        </div>
      `;

      const leftInner = area.querySelector('#bb_left .bb-inner');
      const rightInner = area.querySelector('#bb_right .bb-inner');

      const renderSpread = () => {
        const sp = spreads[idx];

        leftInner.innerHTML = `
          <div class="bb-head">
            <div>
              <div class="bb-title">${esc(sp.left.title)}</div>
              <div class="bb-meta">${esc(sp.left.meta || '')}</div>
            </div>
            <div class="bb-meta">p.${esc(String(sp.left.pageNo))}</div>
          </div>
          <div class="bb-body"><pre>${esc(sp.left.body || '')}</pre></div>
          <div class="bb-footer">
            <span>Ilustração P&B: <b>${esc(iconLabel(sp.left.icon))}</b></span>
            <span></span>
          </div>
        `;

        const wordsHtml = (sp.right.words || []).map(w => `<div>${esc(w)}</div>`).join('');
        rightInner.innerHTML = `
          <div class="bb-head">
            <div>
              <div class="bb-title">${esc(sp.right.title)}</div>
              <div class="bb-meta">${esc(sp.right.meta || '')}</div>
            </div>
            <div class="bb-meta">p.${esc(String(sp.right.pageNo))}</div>
          </div>

          <div class="bb-gridbox">
            <div>
              <div><b>CAÇA-PALAVRAS ${esc(String(sp.right.grid))}x${esc(String(sp.right.grid))}</b></div>
              <div class="bb-mini">A grade real entra no Caça-palavras e no Export PDF.</div>
            </div>
          </div>

          <div>
            <div class="bb-meta" style="margin:8px 0 6px 0">Palavras</div>
            <div class="bb-words">${wordsHtml}</div>
          </div>

          <div class="bb-footer">
            <button class="btn" id="bb_send_ws">Enviar p/ Caça-palavras</button>
            <span></span>
          </div>
        `;

        area.querySelector('#bb_pos').textContent = `${idx+1}/${spreads.length}`;

        rightInner.querySelector('#bb_send_ws').onclick = () => {
          const ws = {
            title: `Caça-Palavras — ${sp.right.sectionTitle}`,
            preset: 'BR_POCKET',
            size: sp.right.grid,
            includeKey: true,
            words: (sp.right.words || []).join('\n'),
            output: '',
            ts: Date.now()
          };
          Storage.set('wordsearch:seed', ws);
          this.app.toast?.('Enviado ✅ (abra Caça-palavras e clique Gerar)');
          this.app.log?.(`[BOOK] sent section="${sp.right.sectionTitle}" grid=${sp.right.grid} words=${(sp.right.words||[]).length}`);
        };

        saveIdx();
      };

      area.querySelector('#bb_prev').onclick = () => { idx = Math.max(0, idx - 1); renderSpread(); };
      area.querySelector('#bb_next').onclick = () => { idx = Math.min(spreads.length - 1, idx + 1); renderSpread(); };

      area.querySelector('#bb_reset').onclick = () => {
        plan = buildDefaultPlanMG(15, 20);
        Storage.set('cultural:book_plan', plan);
        Storage.set('cultural:builder_seed', { spreadIndex: 0 });
        this.app.toast?.('Livro recriado ✅');
        renderMain();
      };

      renderSpread();
    };

    if (!plan) renderEmpty();
    else renderMain();
  }
}
