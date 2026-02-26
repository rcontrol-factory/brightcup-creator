/* FILE: /js/modules/cultural_book_builder.js */
// Bright Cup Creator — Cultural Book Builder v0.3c PADRÃO (1 ano)
// PATCH MINIMO (SEM QUEBRAR PADRÃO):
// - Grade quadriculada não pode cortar: ajustar CSS pra “caber sempre” no papel branco.
// - NÃO mexer em lógica, spreads, seed, cache, pipeline.

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

function getCache(){
  return Storage.get('cultural:builder_cache', {});
}
function setCache(cache){
  Storage.set('cultural:builder_cache', cache || {});
}

function parseGridText(gridText){
  const rows = String(gridText || '').trim().split(/\n+/).map(r => r.trim()).filter(Boolean);
  const grid = rows.map(r => {
    const parts = r.split(/\s+/).filter(Boolean);
    if (parts.length > 1) return parts.map(x => (x||'').slice(0,1));
    return r.split('').filter(Boolean);
  });
  const N = grid.length ? grid.length : 0;
  return { N, grid };
}

function buildSpreads(plan){
  const m = plan.meta || {};
  const grid = Number(m.grid_default || 15);
  const wpp  = Number(m.words_per_puzzle || 20);

  const cache = getCache();
  const spreads = [];

  spreads.push({
    left: {
      kind:'text',
      icon:'history',
      title: m.title || 'MINAS GERAIS CULTURAL',
      meta: (m.subtitle || '').trim(),
      body: wrap(
        `Apresentação\n\n` +
        `Este livro é uma viagem por Minas Gerais: sabores, histórias, fé, trilhos e montanhas.\n\n` +
        `Cada seção traz um texto curto (com alma) e um caça-palavras temático.\n\n` +
        `No final, você encontra o gabarito completo.\n\n` +
        `Boa leitura e bom passatempo.`,
        74
      ),
      pageNo: 1
    },
    right: {
      kind:'text',
      icon:'history',
      title: 'Como usar',
      meta: 'Preview editorial',
      body: wrap(
        `• Use ◀ ▶ para folhear.\n` +
        `• Cada spread é: TEXTO (esq.) + PUZZLE (dir.).\n` +
        `• A grade exibida aqui é preview visual.\n` +
        `• O PDF final (KDP) entra no Exporter.\n\n` +
        `Dica: se o Safari limpar o storage, recrie o livro e baixe o plano (JSON) para backup.`,
        74
      ),
      pageNo: 2
    }
  });

  let pageNo = 3;

  (plan.sections || []).forEach((s) => {
    const left = {
      kind:'text',
      icon: s.icon,
      title: s.title,
      meta: 'Texto cultural',
      body: wrap(s.text || '', 74),
      pageNo: pageNo++
    };

    const words = pickWords(
      [].concat(s.wordHints || []).concat([s.title, 'MINAS', 'CULTURA', 'HISTORIA']),
      grid,
      wpp
    );

    const cacheKey = `${s.id || s.title || 'sec'}__${grid}__${words.join('|')}`;
    let preview = cache[cacheKey];

    if (!preview || !preview.gridText) {
      const gen = generateWordSearch({
        size: grid,
        words,
        maxWords: words.length,
        allowDiagonal: true,
        allowBackwards: true
      });
      preview = {
        gridText: gen.gridText,
        keyText: gen.keyText,
        placedCount: (gen.placed || []).length,
        words: gen.words
      };
      cache[cacheKey] = preview;

      const keys = Object.keys(cache);
      if (keys.length > 80) {
        for (let i = 0; i < 20; i++) delete cache[keys[i]];
      }
      setCache(cache);
    }

    const right = {
      kind:'puzzle',
      icon: s.icon,
      title: `Caça-Palavras — ${s.title}`,
      meta: `Prévia visual (editorial) • grade ${grid}x${grid} • palavras colocadas ${preview.placedCount ?? 0}`,
      grid,
      words: preview.words || words,
      gridText: preview.gridText || '',
      sectionTitle: s.title,
      pageNo: pageNo++
    };

    spreads.push({ left, right });
  });

  spreads.push({
    left: {
      kind:'text',
      icon:'history',
      title:'Gabarito (no final)',
      meta:'(entra completo no Export PDF)',
      body: wrap(
        `O gabarito completo entra na fase do Export PDF (KDP).\n\n` +
        `Aqui no Builder a gente valida: ordem, texto, tema, palavras e padrão editorial.`,
        74
      ),
      pageNo: pageNo++
    },
    right: {
      kind:'text',
      icon:'history',
      title:'',
      meta:'',
      body:'',
      pageNo: pageNo++
    }
  });

  return { spreads };
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

    root.innerHTML = `
      <style>
        .bb-wrap{ display:grid; gap:14px; }
        .bb-toolbar{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; justify-content:space-between; }
        .bb-toolbar .left, .bb-toolbar .right{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; }

        .bb-mode{ display:flex; gap:8px; align-items:center; }
        .bb-mode .btn{ padding:10px 12px; }

        .bb-stage{ display:grid; gap:12px; }
        .bb-spread{ display:grid; grid-template-columns: 1fr 1fr; gap:14px; }

        .bb-page{
          border-radius:18px;
          border:1px solid rgba(255,255,255,.14);
          background:rgba(255,255,255,.92);
          color:#0f1620;
          box-shadow: 0 10px 34px rgba(0,0,0,.22);
          padding:14px;
          position:relative;
          overflow:hidden;
        }
        .bb-page::before{ content:""; display:block; padding-top:150%; }
        .bb-page > .bb-inner{ position:absolute; inset:14px; display:flex; flex-direction:column; gap:10px; }

        .bb-head{ display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
        .bb-title{ font-size:18px; font-weight:900; letter-spacing:.2px; overflow-wrap:anywhere; }
        .bb-meta{ font-size:12px; opacity:.72; overflow-wrap:anywhere; }

        .bb-body{
          flex:1;
          border-radius:14px;
          border:1px solid rgba(15,22,32,.12);
          background:rgba(255,255,255,.88);
          padding:12px;
          overflow:hidden;
          display:flex;
          flex-direction:column;
          gap:10px;
        }
        .bb-body pre{
          margin:0;
          white-space:pre-wrap;
          overflow-wrap:anywhere;
          word-break:break-word;
          font-family: ui-serif, Georgia, "Times New Roman", serif;
          font-size:15px;
          line-height:1.28;
        }

        /* ===== PATCH MINIMO: GRADE NÃO PODE CORTAR ===== */
        .bb-gridwrap{
          flex:1;
          border-radius:12px;
          border:1px solid rgba(15,22,32,.14);
          background:rgba(255,255,255,.98);
          padding:6px;                 /* era 10px */
          display:flex;
          align-items:stretch;          /* era center */
          justify-content:stretch;       /* era center */
          overflow:hidden;
          min-height: 0;                /* importante no iOS flex */
        }
        .bb-grid{
          display:grid;
          gap:1px;                      /* era 2px */
          width:100%;
          height:100%;
          max-width:100%;
          max-height:100%;
          aspect-ratio: 1 / 1;
        }
        .bb-cell{
          display:flex;
          align-items:center;
          justify-content:center;
          border:1px solid rgba(15,22,32,.22);
          border-radius:2px;            /* era 3px */
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-weight:800;
          color:#0f1620;
          background:rgba(255,255,255,1);
          user-select:none;
          line-height:1;
        }
        /* ============================================== */

        .bb-words{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap:4px 14px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size:12px;
          opacity:.92;
          overflow:hidden;
        }

        .bb-footer{ display:flex; justify-content:space-between; align-items:center; gap:10px; font-size:12px; opacity:.82; }
        .bb-mini{ font-size:12px; opacity:.78; }

        .bb-empty{ display:grid; gap:10px; }

        @media (max-width: 860px){
          .bb-spread{ grid-template-columns: 1fr; }
        }
      </style>

      <div class="bb-wrap">
        <div class="card">
          <h2>Livro Cultural — Builder</h2>
          <p class="muted">Preview visual do livro (<b>papel branco</b>). Folheie e valide como produto final.</p>
          <div id="bb_area"></div>
        </div>
      </div>
    `;

    const area = root.querySelector('#bb_area');

    const gotoAgent = () => {
      const btn = document.querySelector('.navitem[data-view="cultural"]');
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
          <p class="bb-mini muted">Dica: depois exporte o plano em JSON no Cultural Agent para backup.</p>
        </div>
      `;

      area.querySelector('#bb_make').onclick = () => {
        plan = buildDefaultPlanMG(15, 20);
        Storage.set('cultural:book_plan', plan);
        Storage.set('cultural:builder_seed', { mode:'SPREAD', pos:0 });
        Storage.set('cultural:builder_cache', {});
        this.app.toast?.('Livro Minas criado ✅');
        renderMain();
      };

      area.querySelector('#bb_go_agent').onclick = () => gotoAgent();
    };

    const saveSeed = (patch={}) => {
      const next = Object.assign({}, Storage.get('cultural:builder_seed', { mode:'SPREAD', pos:0 }), patch);
      Storage.set('cultural:builder_seed', next);
      return next;
    };

    const renderGridHTML = (gridText, gridN) => {
      const parsed = parseGridText(gridText);
      const N = gridN || parsed.N || 15;
      const grid = parsed.grid;

      if (!grid || !grid.length) {
        return `<div class="bb-gridwrap"><div class="bb-mini muted">Sem grade (preview)</div></div>`;
      }

      // PATCH MINIMO: fonte levemente menor pra não estourar no iPhone (e não cortar)
      const fontPx = (N <= 13) ? 15 : (N <= 15) ? 13 : 11;

      const cells = [];
      for (let y = 0; y < grid.length; y++){
        for (let x = 0; x < grid[y].length; x++){
          const ch = grid[y][x] || '';
          cells.push(`<div class="bb-cell" style="font-size:${fontPx}px">${esc(ch)}</div>`);
        }
      }

      return `
        <div class="bb-gridwrap">
          <div class="bb-grid" style="grid-template-columns:repeat(${N}, 1fr)">
            ${cells.join('')}
          </div>
        </div>
      `;
    };

    const renderMain = () => {
      if (!plan) return renderEmpty();

      const built = buildSpreads(plan);
      const spreads = built.spreads;

      let state = Storage.get('cultural:builder_seed', { mode:'SPREAD', pos: 0 });
      let mode = (state.mode === 'FOLIO') ? 'FOLIO' : 'SPREAD';
      let pos = Number(state.pos || 0);

      const clamp = () => {
        if (mode === 'SPREAD') {
          pos = Math.max(0, Math.min(pos, spreads.length - 1));
        } else {
          const maxPage = spreads.length * 2 - 1;
          pos = Math.max(0, Math.min(pos, maxPage));
        }
      };

      const totalPages = spreads[spreads.length-1]?.right?.pageNo || (spreads.length*2);

      area.innerHTML = `
        <div class="bb-toolbar">
          <div class="left">
            <span class="bb-mini"><b>${esc(plan.meta?.title || 'LIVRO')}</b></span>
            <span class="bb-mini muted">No mobile: arraste a tela, ou use ◀ ▶.</span>
          </div>
          <div class="right">
            <div class="bb-mode">
              <button class="btn ${mode==='SPREAD'?'primary':''}" id="bb_mode_sp">Spread</button>
              <button class="btn ${mode==='FOLIO'?'primary':''}" id="bb_mode_fo">Folhear</button>
            </div>
            <button class="btn" id="bb_prev">◀</button>
            <button class="btn" id="bb_next">▶</button>
          </div>
        </div>

        <div class="bb-stage" id="bb_stage"></div>

        <div class="bb-footer">
          <span class="bb-mini">Página <b id="bb_pos"></b></span>
          <div class="row" style="gap:10px">
            <button class="btn" id="bb_json">Baixar plano (JSON)</button>
            <button class="btn" id="bb_reset">Recriar Minas (PADRÃO)</button>
          </div>
        </div>
      `;

      const stage = area.querySelector('#bb_stage');
      const posEl = area.querySelector('#bb_pos');

      const pageHtml = (p) => {
        if (!p) return '';
        const isPuzzle = p.kind === 'puzzle';

        const body = isPuzzle
          ? `
              <div class="bb-body">
                ${renderGridHTML(p.gridText || '', p.grid || 15)}
                <div>
                  <div class="bb-meta" style="margin:4px 0 6px 0">Palavras</div>
                  <div class="bb-words">${(p.words||[]).map(w=>`<div>${esc(w)}</div>`).join('')}</div>
                </div>
              </div>
            `
          : `
              <div class="bb-body">
                <pre>${esc(p.body || '')}</pre>
              </div>
            `;

        const footer = isPuzzle
          ? `
              <div class="bb-footer">
                <span>Ilustração P&B: <b>${esc(iconLabel(p.icon))}</b></span>
                <button class="btn" data-send="1">Enviar p/ Caça-palavras</button>
              </div>
            `
          : `
              <div class="bb-footer">
                <span>Ilustração P&B: <b>${esc(iconLabel(p.icon))}</b></span>
                <span></span>
              </div>
            `;

        return `
          <div class="bb-page">
            <div class="bb-inner">
              <div class="bb-head">
                <div>
                  <div class="bb-title">${esc(p.title || '')}</div>
                  <div class="bb-meta">${esc(p.meta || '')}</div>
                </div>
                <div class="bb-meta">p.${esc(String(p.pageNo || ''))}</div>
              </div>
              ${body}
              ${footer}
            </div>
          </div>
        `;
      };

      const render = () => {
        clamp();
        saveSeed({ mode, pos });

        stage.innerHTML = '';

        if (mode === 'SPREAD') {
          const sp = spreads[pos];
          stage.innerHTML = `<div class="bb-spread">${pageHtml(sp.left)}${pageHtml(sp.right)}</div>`;
          posEl.textContent = `${sp.left.pageNo}/${totalPages}`;
        } else {
          const spreadIndex = Math.floor(pos / 2);
          const isRight = (pos % 2) === 1;
          const sp = spreads[spreadIndex];
          const p = isRight ? sp.right : sp.left;
          stage.innerHTML = pageHtml(p);
          posEl.textContent = `${p.pageNo}/${totalPages}`;
        }

        stage.querySelectorAll('[data-send]').forEach((btn) => {
          btn.onclick = () => {
            let pz = null;
            if (mode === 'SPREAD') {
              const sp = spreads[pos];
              pz = (sp.right && sp.right.kind === 'puzzle') ? sp.right : null;
            } else {
              const sp = spreads[Math.floor(pos/2)];
              const p = (pos%2) ? sp.right : sp.left;
              pz = (p && p.kind === 'puzzle') ? p : null;
            }
            if (!pz) { this.app.toast?.('Abra uma página de puzzle ✅'); return; }

            const ws = {
              title: pz.title || `Caça-Palavras — ${pz.sectionTitle || ''}`,
              preset: (pz.grid === 13) ? 'BR_POCKET' : 'BR_PLUS',
              size: pz.grid,
              includeKey: true,
              words: (pz.words || []).join('\n'),
              output: '',
              ts: Date.now()
            };
            Storage.set('wordsearch:seed', ws);
            this.app.toast?.('Enviado ✅ (abra Caça-palavras e clique Gerar)');
            this.app.log?.(`[BOOK] sent section="${pz.sectionTitle}" grid=${pz.grid} words=${(pz.words||[]).length}`);
          };
        });
      };

      area.querySelector('#bb_mode_sp').onclick = () => { mode='SPREAD'; pos = Math.floor(pos/2); render(); };
      area.querySelector('#bb_mode_fo').onclick = () => {
        if (mode === 'SPREAD') pos = pos * 2;
        mode='FOLIO';
        render();
      };

      area.querySelector('#bb_prev').onclick = () => { pos = pos - 1; render(); };
      area.querySelector('#bb_next').onclick = () => { pos = pos + 1; render(); };

      area.querySelector('#bb_reset').onclick = () => {
        plan = buildDefaultPlanMG(15, 20);
        Storage.set('cultural:book_plan', plan);
        Storage.set('cultural:builder_seed', { mode:'SPREAD', pos:0 });
        Storage.set('cultural:builder_cache', {});
        this.app.toast?.('Livro recriado ✅');
        renderMain();
      };

      area.querySelector('#bb_json').onclick = () => {
        if (!plan) return;
        const blob = new Blob([JSON.stringify(plan, null, 2)], { type:'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `book-plan-${(plan.meta?.id||'book')}-${Date.now()}.json`;
        a.click();
        setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
        this.app.toast?.('Plano baixado ✅');
      };

      // swipe no mobile
      let x0 = null;
      stage.addEventListener('touchstart', (e)=>{ x0 = e.touches?.[0]?.clientX ?? null; }, { passive:true });
      stage.addEventListener('touchend', (e)=>{
        const x1 = e.changedTouches?.[0]?.clientX ?? null;
        if (x0 == null || x1 == null) return;
        const dx = x1 - x0;
        if (Math.abs(dx) < 40) return;
        pos = (dx < 0) ? (pos + 1) : (pos - 1);
        render();
      }, { passive:true });

      render();
    };

    if (!plan) renderEmpty();
    else renderMain();
  }
}
