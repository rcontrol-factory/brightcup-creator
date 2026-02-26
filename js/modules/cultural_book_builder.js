/* FILE: /js/modules/cultural_book_builder.js */
// Bright Cup Creator — Cultural Book Builder v0.3 (PADRÃO 1 ano)
// Objetivo: preview editorial do livro cultural (6x9) de forma LIMPA no mobile.
// - Visual "papel branco" (parece PDF)
// - Sem scroll dentro da página (auto-fit)
// - Mostra Spread (2 páginas) e Folhear (1 página)
// - Puzzle mostra grade quadriculada quando existir puzzle salvo em cultural:puzzles
// - Não gera PDF ainda (isso vem no Exporter futuramente)

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

function normId(s){
  return String(s||'')
    .trim()
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'_')
    .replace(/^_+|_+$/g,'')
    .slice(0,90) || ('puzzle_' + Date.now());
}

function getPuzzlesMap(){
  return Storage.get('cultural:puzzles', {}); // {id: puzzleObj}
}

function parseGridText(gridText){
  const rows = String(gridText||'').trim().split(/\n+/).map(r => r.trim()).filter(Boolean);
  const grid = rows.map(r => r.split(/\s+/).filter(Boolean));
  return grid;
}

function renderGridTableHTML(grid){
  const N = grid.length || 0;
  if (!N) return `<div class="bb-mini muted">Grade vazia.</div>`;
  const cells = grid.map(row => row.map(ch => `<div class="bb-cell">${esc(ch || '')}</div>`).join('')).join('');
  return `<div class="bb-grid" style="--n:${N}">${cells}</div>`;
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
      74
    )
  });

  (plan.sections || []).forEach((s) => {
    pages.push({
      kind:'text',
      icon: s.icon,
      title: s.title,
      meta: 'Texto cultural',
      body: wrap(s.text || '', 74)
    });

    const words = pickWords(
      [].concat(s.wordHints || []).concat([s.title, 'MINAS', 'CULTURA', 'HISTORIA']),
      grid,
      wpp
    );

    pages.push({
      kind:'puzzle',
      icon: s.icon,
      sectionId: s.id || normId(s.title),
      sectionTitle: s.title,
      title: `Caça-Palavras — ${s.title}`,
      meta: 'Puzzle',
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
      74
    )
  });

  pages.forEach((p, i) => p.pageNo = i + 1);
  return pages;
}

function autoFit(el, minPx=12, maxPx=18){
  if (!el) return;
  let size = maxPx;
  el.style.fontSize = size + 'px';
  // tenta reduzir até caber
  for (let i=0; i<16; i++){
    if (el.scrollHeight <= el.clientHeight + 1) break;
    size -= 1;
    if (size < minPx) break;
    el.style.fontSize = size + 'px';
  }
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
    const seed = Storage.get('cultural:builder_seed', { idx: 0, mode: 'SPREAD' }); // SPREAD | FLIP

    root.innerHTML = `
      <style>
        .bb-wrap{ display:grid; gap:14px; }
        .bb-toolbar{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; justify-content:space-between; }
        .bb-toolbar .left, .bb-toolbar .right{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
        .bb-mode{ display:flex; border:1px solid rgba(255,255,255,.12); border-radius:999px; overflow:hidden; }
        .bb-mode button{ border:0; background:transparent; color:inherit; padding:8px 12px; font-weight:800; opacity:.9; }
        .bb-mode button.active{ background:rgba(255,255,255,.10); opacity:1; }

        .bb-spread{ display:grid; grid-template-columns: 1fr 1fr; gap:14px; }
        @media (max-width: 860px){ .bb-spread{ grid-template-columns: 1fr; } }

        /* folha (papel) */
        .bb-page{
          border-radius:18px;
          border:1px solid rgba(0,0,0,.08);
          background:rgba(255,255,255,.94);
          color:#0b1220;
          box-shadow: 0 18px 55px rgba(0,0,0,.25);
          padding:14px;
          position:relative;
          overflow:hidden;
        }
        .bb-page::before{ content:""; display:block; padding-top:150%; } /* 6x9 ratio */
        .bb-inner{ position:absolute; inset:14px; display:flex; flex-direction:column; gap:10px; min-height:0; }

        .bb-head{ display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
        .bb-title{ font-size:20px; font-weight:1000; letter-spacing:.2px; }
        .bb-meta{ font-size:12px; opacity:.70; }
        .bb-body{
          flex:1;
          border-radius:14px;
          border:1px solid rgba(0,0,0,.08);
          background:rgba(255,255,255,.90);
          padding:12px;
          overflow:hidden; /* sem scroll dentro */
          min-height:0;
        }
        .bb-body pre{
          margin:0;
          white-space:pre-wrap;
          overflow-wrap:anywhere;
          word-break:break-word;
          font-family: ui-serif, Georgia, "Times New Roman", serif;
          font-size:16px;
          line-height:1.35;
          height:100%;
          overflow:hidden;
        }

        .bb-gridWrap{
          flex:1;
          border-radius:14px;
          border:1px solid rgba(0,0,0,.10);
          background:#fff;
          padding:10px;
          overflow:hidden; /* sem scroll */
          min-height:0;
          display:flex;
          flex-direction:column;
          gap:10px;
        }
        .bb-grid{
          display:grid;
          grid-template-columns: repeat(var(--n), 1fr);
          gap:0;
          border:1px solid rgba(0,0,0,.15);
          border-radius:10px;
          overflow:hidden;
          width:100%;
          flex:1;
          min-height:0;
        }
        .bb-cell{
          display:flex;
          align-items:center;
          justify-content:center;
          aspect-ratio:1/1;
          border-right:1px solid rgba(0,0,0,.10);
          border-bottom:1px solid rgba(0,0,0,.10);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-weight:900;
          font-size:14px;
          line-height:1;
        }
        .bb-cell:nth-child(${1}){} /* noop */

        .bb-words{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap:6px 14px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size:12px;
          opacity:.92;
          overflow:hidden;
        }

        .bb-footer{ display:flex; justify-content:space-between; align-items:center; gap:10px; font-size:12px; opacity:.80; }
        .bb-mini{ font-size:12px; opacity:.78; }
        .bb-empty{ display:grid; gap:10px; }
      </style>

      <div class="bb-wrap">
        <div class="card">
          <h2>Livro Cultural — Builder</h2>
          <p class="muted">
            Preview visual do livro (papel branco). <b>Folheie</b> e valide como produto final.
          </p>
          <div id="bb_area"></div>
        </div>
      </div>
    `;

    const area = root.querySelector('#bb_area');

    const saveSeed = (idx, mode) => Storage.set('cultural:builder_seed', { idx, mode });

    const renderEmpty = () => {
      area.innerHTML = `
        <div class="bb-empty">
          <p class="muted"><b>Nenhum livro carregado.</b> Isso acontece quando o Safari limpa o armazenamento.</p>
          <div class="row">
            <button class="btn primary" id="bb_make">Criar Livro Minas (PADRÃO)</button>
            <button class="btn" id="bb_go_agent">Abrir Cultural Agent</button>
          </div>
          <p class="bb-mini muted">Dica: depois exporte o plano em JSON no Cultural Agent para backup.</p>
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

    const renderMain = () => {
      if (!plan) return renderEmpty();

      const pages = buildPages(plan);
      let idx = Math.max(0, Math.min(seed.idx || 0, pages.length - 1));
      let mode = (seed.mode === 'FLIP' || seed.mode === 'SPREAD') ? seed.mode : 'SPREAD';

      area.innerHTML = `
        <div class="bb-toolbar">
          <div class="left">
            <span class="bb-mini"><b>${esc(plan.meta?.title || 'LIVRO')}</b></span>
            <span class="bb-mini muted">No mobile: arraste para o lado (folhear).</span>
          </div>

          <div class="right">
            <div class="bb-mode" role="tablist" aria-label="Modo">
              <button id="bb_mode_spread" class="${mode==='SPREAD'?'active':''}">Spread</button>
              <button id="bb_mode_flip" class="${mode==='FLIP'?'active':''}">Folhear</button>
            </div>
            <button class="btn" id="bb_prev">◀</button>
            <button class="btn" id="bb_next">▶</button>
          </div>
        </div>

        <div class="bb-spread" id="bb_pages"></div>

        <div class="bb-footer">
          <span class="bb-mini">Página <b id="bb_pos"></b></span>
          <div class="row" style="gap:10px;">
            <button class="btn" id="bb_export_plan">Baixar plano (JSON)</button>
            <button class="btn" id="bb_reset">Recriar Minas (PADRÃO)</button>
          </div>
        </div>
      `;

      const pagesWrap = area.querySelector('#bb_pages');
      const posEl = area.querySelector('#bb_pos');

      const exportPlan = () => {
        try{
          const blob = new Blob([JSON.stringify(plan, null, 2)], { type:'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `book-plan-${(plan.meta?.id||'book')}-${Date.now()}.json`;
          a.click();
          setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
          this.app.toast?.('Plano baixado ✅');
        } catch {
          this.app.toast?.('Falha ao baixar plano', 'err');
        }
      };

      const renderOnePage = (p) => {
        if (p.kind === 'text') {
          return `
            <div class="bb-page">
              <div class="bb-inner">
                <div class="bb-head">
                  <div>
                    <div class="bb-title">${esc(p.title)}</div>
                    <div class="bb-meta">${esc(p.meta || '')}</div>
                  </div>
                  <div class="bb-meta">p.${esc(String(p.pageNo))}</div>
                </div>

                <div class="bb-body"><pre class="bb-fitText">${esc(p.body || '')}</pre></div>

                <div class="bb-footer">
                  <span>Ilustração P&B: <b>${esc(iconLabel(p.icon))}</b></span>
                  <span></span>
                </div>
              </div>
            </div>
          `;
        }

        // PUZZLE
        const puzzles = getPuzzlesMap();
        const pid = p.sectionId || normId(p.sectionTitle || p.title || '');
        const saved = puzzles[pid];

        let gridHTML = `
          <div class="bb-mini muted">
            Prévia editorial: gere e <b>salve</b> este puzzle no Caça-palavras para aparecer quadriculado aqui.
          </div>
        `;

        if (saved?.gridText) {
          const grid = parseGridText(saved.gridText);
          gridHTML = renderGridTableHTML(grid);
        }

        const wordsHtml = (p.words || []).map(w => `<div>${esc(w)}</div>`).join('');

        return `
          <div class="bb-page">
            <div class="bb-inner">
              <div class="bb-head">
                <div>
                  <div class="bb-title">${esc(p.title)}</div>
                  <div class="bb-meta">${esc(p.meta || '')}</div>
                </div>
                <div class="bb-meta">p.${esc(String(p.pageNo))}</div>
              </div>

              <div class="bb-gridWrap">
                <div class="bb-mini muted">Grade ${esc(String(p.grid))}x${esc(String(p.grid))} • palavras ${esc(String((p.words||[]).length))}</div>
                <div style="flex:1; min-height:0; overflow:hidden;">${gridHTML}</div>
                <div>
                  <div class="bb-meta" style="margin:8px 0 6px 0">Palavras</div>
                  <div class="bb-words bb-fitWords">${wordsHtml}</div>
                </div>
              </div>

              <div class="bb-footer">
                <span>Ilustração P&B: <b>${esc(iconLabel(p.icon))}</b></span>
                <button class="btn" data-sendws="1">Enviar p/ Caça-palavras</button>
              </div>
            </div>
          </div>
        `;
      };

      const bindFit = () => {
        // auto-fit texto (sem rolagem dentro)
        pagesWrap.querySelectorAll('.bb-fitText').forEach(pre => autoFit(pre, 12, 18));
        // auto-fit lista de palavras (se lotar)
        pagesWrap.querySelectorAll('.bb-fitWords').forEach(div => autoFit(div, 10, 12));
      };

      const bindPuzzleSend = () => {
        pagesWrap.querySelectorAll('[data-sendws="1"]').forEach(btn => {
          btn.onclick = () => {
            const p = pages[idx];
            if (!p || p.kind !== 'puzzle') return;

            const preset = Number(p.grid) <= 13 ? 'BR_POCKET' : 'BR_PLUS';
            const ws = {
              title: `Caça-Palavras — ${p.sectionTitle || ''}`,
              preset,
              size: p.grid,
              includeKey: true,
              words: (p.words || []).join('\n'),
              puzzleId: p.sectionId || normId(p.sectionTitle || p.title || ''), // ID estável
              output: '',
              ts: Date.now()
            };
            Storage.set('wordsearch:seed', ws);
            this.app.toast?.('Enviado ✅ (abra Caça-palavras, gere e SALVE)');
            this.app.log?.(`[BOOK] sent puzzleId=${ws.puzzleId} grid=${ws.size} words=${(p.words||[]).length}`);
          };
        });
      };

      const renderAt = () => {
        pagesWrap.innerHTML = '';

        if (mode === 'FLIP') {
          const p = pages[idx];
          pagesWrap.innerHTML = renderOnePage(p);
          posEl.textContent = `${idx+1}/${pages.length}`;
        } else {
          const left = pages[idx];
          const right = pages[idx+1] || { kind:'text', icon:'history', title:'', meta:'', body:'', pageNo: (left?.pageNo||0)+1 };
          pagesWrap.innerHTML = renderOnePage(left) + renderOnePage(right);
          posEl.textContent = `${idx+1}/${pages.length}`;
        }

        bindFit();
        bindPuzzleSend();
        saveSeed(idx, mode);
      };

      // swipe (folhear)
      let sx = 0, st = 0;
      pagesWrap.addEventListener('touchstart', (e)=>{
        if (!e.touches?.length) return;
        sx = e.touches[0].clientX;
        st = Date.now();
      }, { passive:true });

      pagesWrap.addEventListener('touchend', (e)=>{
        const dx = (e.changedTouches?.[0]?.clientX ?? sx) - sx;
        const dt = Date.now() - st;
        if (Math.abs(dx) < 55 || dt > 900) return;
        if (dx < 0) { idx = Math.min(pages.length - 1, idx + (mode==='SPREAD'?2:1)); renderAt(); }
        else { idx = Math.max(0, idx - (mode==='SPREAD'?2:1)); renderAt(); }
      });

      area.querySelector('#bb_prev').onclick = () => { idx = Math.max(0, idx - (mode==='SPREAD'?2:1)); renderAt(); };
      area.querySelector('#bb_next').onclick = () => { idx = Math.min(pages.length - 1, idx + (mode==='SPREAD'?2:1)); renderAt(); };

      area.querySelector('#bb_mode_spread').onclick = () => {
        mode = 'SPREAD';
        area.querySelector('#bb_mode_spread').classList.add('active');
        area.querySelector('#bb_mode_flip').classList.remove('active');
        renderAt();
      };
      area.querySelector('#bb_mode_flip').onclick = () => {
        mode = 'FLIP';
        area.querySelector('#bb_mode_flip').classList.add('active');
        area.querySelector('#bb_mode_spread').classList.remove('active');
        renderAt();
      };

      area.querySelector('#bb_export_plan').onclick = () => exportPlan();

      area.querySelector('#bb_reset').onclick = () => {
        plan = buildDefaultPlanMG(15, 20);
        Storage.set('cultural:book_plan', plan);
        saveSeed(0, mode);
        this.app.toast?.('Livro recriado ✅');
        renderMain();
      };

      renderAt();
    };

    if (!plan) renderEmpty();
    else renderMain();
  }
}
