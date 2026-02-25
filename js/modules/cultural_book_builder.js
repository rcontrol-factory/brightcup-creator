/* FILE: /js/modules/cultural_book_builder.js */
// Bright Cup Creator — Cultural Book Builder v0.3 PADRÃO (1 ano)
// Objetivo: preview editorial do livro cultural (6x9) de forma LIMPA e VISUAL no mobile.
// - Se não existir plano (Safari limpou storage): gera plano padrão MG aqui mesmo.
// - NÃO mostra “spec técnica” (isso fica interno).
// - Mostra páginas em “papel branco” (visual final).
// - Mostra grade real do caça-palavras dentro da página (preview).
// - Sem scroll dentro da folha (só scroll da tela).
// - Export PDF vem no Exporter (fase 4).

import { Storage } from '../core/storage.js';
import { generateWordSearch, normalizeWord as normWS } from '../core/wordsearch_gen.js';

function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function normalizeWord(s){
  // usa o mesmo padrão do gerador (garantia)
  try { return normWS(s); } catch { /* fallback */ }
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
  // puxa palavras “boas de achar” (tamanho médio)
  filtered.sort((a,b) => (Math.abs(a.length-7) - Math.abs(b.length-7)));
  return filtered.slice(0, Math.max(6, Number(maxCount || 0) || 0));
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
  const grid = Number(m.grid_default || 13);
  const wpp  = Number(m.words_per_puzzle || 16);

  const pages = [];

  pages.push({
    kind:'text',
    icon:'history',
    title: m.title || 'LIVRO CULTURAL',
    subtitle: (m.subtitle || '').trim(),
    body: wrap(
      `Apresentação\n\n` +
      `Este livro é uma viagem por Minas Gerais: sabores, histórias, fé, trilhos e montanhas.\n\n` +
      `Cada tema traz um texto curto (com alma) e um caça-palavras.\n\n` +
      `No final, você encontra o gabarito completo. Boa leitura e bom passatempo.`,
      72
    )
  });

  (plan.sections || []).forEach((s) => {
    pages.push({
      kind:'text',
      icon: s.icon,
      title: s.title,
      subtitle: 'Texto cultural',
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
      subtitle: 'Puzzle',
      sectionId: s.id || s.title,
      sectionTitle: s.title,
      grid,
      words
    });
  });

  pages.push({
    kind:'text',
    icon:'history',
    title:'Gabarito (no final)',
    subtitle:'(entra completo no Export PDF)',
    body: wrap(
      `O gabarito completo entra na fase do Export PDF (KDP).\n\n` +
      `Aqui no Builder a gente valida: ordem, texto, tema, palavras e padrão editorial.`,
      72
    )
  });

  pages.forEach((p, i) => p.pageNo = i + 1);
  return pages;
}

function hashKey(s){
  // hash simples mobile-safe
  let h = 2166136261;
  const str = String(s || '');
  for(let i=0;i<str.length;i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function getPuzzleCache(planId){
  return Storage.get(`cultural:puzzle_cache:${planId}`, {});
}
function setPuzzleCache(planId, cache){
  Storage.set(`cultural:puzzle_cache:${planId}`, cache || {});
}

function buildPuzzlePreview(plan, page){
  const planId = plan?.meta?.id || 'PLAN';
  const cache = getPuzzleCache(planId);

  const sig = `${planId}|${page.sectionId}|${page.grid}|${(page.words||[]).join(',')}`;
  const key = hashKey(sig);

  if (cache[key] && cache[key].gridText && cache[key].wordsPlaced != null){
    return cache[key];
  }

  const ws = generateWordSearch({
    size: page.grid,
    words: page.words || [],
    maxWords: (page.words || []).length,
    allowDiagonal: true,
    allowBackwards: true
  });

  const out = {
    size: ws.size,
    gridText: ws.gridText,
    wordsPlaced: (ws.placed || []).length,
    wordsUsed: (ws.words || []).length
  };

  cache[key] = out;
  setPuzzleCache(planId, cache);

  return out;
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
      mode: 'flip',        // flip | spread
      pageIndex: 0
    });

    const saveSeed = () => Storage.set('cultural:builder_seed', seed);

    root.innerHTML = `
      <style>
        .bb-wrap{ display:grid; gap:14px; }
        .bb-top{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; justify-content:space-between; }
        .bb-top .left,.bb-top .right{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; }

        /* controles */
        .bb-pill{ display:inline-flex; gap:6px; align-items:center; }
        .bb-seg{
          display:inline-flex;
          border:1px solid rgba(255,255,255,.12);
          border-radius:14px;
          overflow:hidden;
          background:rgba(0,0,0,.18);
        }
        .bb-seg button{
          border:0;
          background:transparent;
          color:inherit;
          padding:10px 12px;
          font-weight:800;
          opacity:.85;
        }
        .bb-seg button.active{
          background:rgba(255,255,255,.10);
          opacity:1;
        }

        /* palco */
        .bb-stage{
          display:grid;
          gap:14px;
          justify-items:center;
        }

        /* “papel” */
        .bb-paper{
          width:min(520px, 96vw);
          aspect-ratio: 2 / 3; /* 6x9 */
          background:#f7f7f7;
          color:#121212;
          border-radius:16px;
          box-shadow: 0 12px 36px rgba(0,0,0,.35);
          border: 1px solid rgba(0,0,0,.10);
          overflow:hidden; /* papel pode cortar o que passar */
          position:relative;
        }

        .bb-paper-inner{
          position:absolute; inset:18px;
          display:flex; flex-direction:column; gap:10px;
          overflow:visible; /* <- NUNCA scroll interno */
        }

        .bb-head{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:12px;
        }
        .bb-title{
          font-size: clamp(16px, 4.6vw, 20px);
          font-weight: 900;
          letter-spacing: .2px;
          line-height:1.05;
        }
        .bb-sub{
          font-size: 12px;
          opacity:.70;
          margin-top:2px;
          line-height:1.15;
        }
        .bb-pno{
          font-size: 12px;
          opacity:.70;
          white-space:nowrap;
        }

        .bb-body{
          flex:1;
          border:1px solid rgba(0,0,0,.10);
          border-radius:14px;
          background:#ffffff;
          padding:12px;
          overflow:visible; /* <- NUNCA scroll interno */
          display:flex;
          flex-direction:column;
          gap:10px;
          min-height:0;
        }

        .bb-body pre{
          margin:0;
          white-space:pre-wrap;
          overflow-wrap:anywhere;
          word-break:break-word;
          font-family: ui-serif, Georgia, "Times New Roman", serif;
          font-size: clamp(13px, 3.2vw, 15px);
          line-height:1.35;
        }

        .bb-grid pre{
          margin:0;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: clamp(14px, 3.6vw, 17px);
          line-height:1.22;
          letter-spacing:.10em;
        }

        .bb-words{
          column-count: 2;
          column-gap: 18px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: clamp(11px, 2.8vw, 12px);
          line-height: 1.12;
        }
        .bb-words div{ break-inside: avoid; margin: 0 0 6px 0; }

        .bb-foot{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          font-size:12px;
          opacity:.75;
        }

        .bb-actions{
          display:flex; gap:10px; flex-wrap:wrap; justify-content:center;
        }

        .bb-mini{ font-size:12px; opacity:.78; }

        /* spread (desktop) */
        .bb-spread{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap:14px;
          justify-content:center;
          align-items:start;
          width:100%;
        }
        .bb-spread .bb-paper{
          width:min(460px, 46vw);
        }

        @media (max-width: 980px){
          .bb-spread{ grid-template-columns: 1fr; }
          .bb-spread .bb-paper{ width:min(520px, 96vw); }
        }
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

    const goCulturalAgent = () => {
      const btn = document.querySelector('.navitem[data-view="cultural"]');
      btn?.click?.();
    };

    const renderEmpty = () => {
      area.innerHTML = `
        <div style="display:grid; gap:10px;">
          <p class="muted"><b>Nenhum livro carregado.</b> Isso acontece quando o Safari limpa o armazenamento.</p>
          <div class="row">
            <button class="btn primary" id="bb_make">Criar Livro Minas (PADRÃO)</button>
            <button class="btn" id="bb_go_agent">Abrir Cultural Agent</button>
          </div>
          <p class="bb-mini muted">Dica: depois baixe o plano (JSON) para backup.</p>
        </div>
      `;
      area.querySelector('#bb_make').onclick = () => {
        // Pocket por padrão (menos dor de cabeça, cabe melhor no papel)
        plan = buildDefaultPlanMG(13, 16);
        Storage.set('cultural:book_plan', plan);
        seed.pageIndex = 0;
        seed.mode = 'flip';
        saveSeed();
        this.app.toast?.('Livro Minas criado ✅');
        renderMain();
      };
      area.querySelector('#bb_go_agent').onclick = () => goCulturalAgent();
    };

    const renderPaperText = (p) => {
      const subtitle = p.subtitle ? `<div class="bb-sub">${esc(p.subtitle)}</div>` : '';
      return `
        <div class="bb-paper">
          <div class="bb-paper-inner">
            <div class="bb-head">
              <div>
                <div class="bb-title">${esc(p.title || '')}</div>
                ${subtitle}
              </div>
              <div class="bb-pno">p.${esc(String(p.pageNo || ''))}</div>
            </div>

            <div class="bb-body">
              <pre>${esc(p.body || '')}</pre>
            </div>

            <div class="bb-foot">
              <span>Ilustração P&B: <b>${esc(iconLabel(p.icon))}</b></span>
              <span></span>
            </div>
          </div>
        </div>
      `;
    };

    const renderPaperPuzzle = (p, planRef) => {
      const prev = buildPuzzlePreview(planRef, p);
      const subtitle = p.subtitle ? `<div class="bb-sub">${esc(p.subtitle)}</div>` : '';

      const wordsHtml = (p.words || []).map(w => `<div>${esc(w)}</div>`).join('');

      return `
        <div class="bb-paper">
          <div class="bb-paper-inner">
            <div class="bb-head">
              <div>
                <div class="bb-title">${esc(p.title || '')}</div>
                ${subtitle}
              </div>
              <div class="bb-pno">p.${esc(String(p.pageNo || ''))}</div>
            </div>

            <div class="bb-body">
              <div class="bb-mini" style="opacity:.70;">
                Prévia visual (editorial).
              </div>
              <div class="bb-grid">
                <pre>${esc(prev.gridText || '')}</pre>
              </div>

              <div style="height:4px;"></div>

              <div class="bb-mini" style="opacity:.70;">Palavras</div>
              <div class="bb-words">${wordsHtml}</div>
            </div>

            <div class="bb-foot">
              <span>Ilustração P&B: <b>${esc(iconLabel(p.icon))}</b></span>
              <button class="btn" data-send="1">Enviar p/ Caça-palavras</button>
            </div>
          </div>
        </div>
      `;
    };

    const renderMain = () => {
      if (!plan) return renderEmpty();

      const pages = buildPages(plan);

      let idx = Math.max(0, Math.min(Number(seed.pageIndex || 0), pages.length - 1));
      seed.pageIndex = idx;
      saveSeed();

      const title = plan.meta?.title || 'LIVRO';

      area.innerHTML = `
        <div class="bb-top">
          <div class="left">
            <span class="bb-mini"><b>${esc(title)}</b></span>
            <span class="bb-mini muted">No mobile: arraste para o lado (folhear).</span>
          </div>

          <div class="right">
            <div class="bb-seg" role="tablist" aria-label="Modo">
              <button class="${seed.mode==='spread'?'active':''}" id="bb_mode_spread">Spread</button>
              <button class="${seed.mode!=='spread'?'active':''}" id="bb_mode_flip">Folhear</button>
            </div>
            <button class="btn" id="bb_prev">◀</button>
            <button class="btn" id="bb_next">▶</button>
          </div>
        </div>

        <div class="bb-stage" id="bb_stage"></div>

        <div class="bb-actions">
          <button class="btn" id="bb_json">Baixar plano (JSON)</button>
          <button class="btn" id="bb_reset">Recriar Minas (PADRÃO)</button>
        </div>

        <div class="bb-mini muted" style="margin-top:6px;">
          Página <b id="bb_pos"></b>
        </div>
      `;

      const stage = area.querySelector('#bb_stage');
      const pos = area.querySelector('#bb_pos');

      const isWide = () => window.matchMedia && window.matchMedia('(min-width: 980px)').matches;

      const renderStage = () => {
        const mode = (seed.mode === 'spread' && isWide()) ? 'spread' : 'flip';
        pos.textContent = `${idx+1}/${pages.length}`;

        const p1 = pages[idx];
        const p2 = pages[idx+1];

        if (mode === 'spread' && p2){
          stage.innerHTML = `
            <div class="bb-spread" id="bb_spread">
              <div>${p1.kind === 'puzzle' ? renderPaperPuzzle(p1, plan) : renderPaperText(p1)}</div>
              <div>${p2.kind === 'puzzle' ? renderPaperPuzzle(p2, plan) : renderPaperText(p2)}</div>
            </div>
          `;
        } else {
          stage.innerHTML = `
            <div id="bb_flip">
              ${p1.kind === 'puzzle' ? renderPaperPuzzle(p1, plan) : renderPaperText(p1)}
            </div>
          `;
        }

        // bind send button(s)
        stage.querySelectorAll('[data-send="1"]').forEach((btnEl) => {
          btnEl.onclick = () => {
            const page = pages[idx];
            if (!page || page.kind !== 'puzzle') return;

            const ws = {
              title: page.title || `Caça-Palavras`,
              preset: (page.grid <= 13 ? 'BR_POCKET' : 'BR_PLUS'),
              size: page.grid,
              maxWords: (page.words || []).length,
              includeKey: true,
              words: (page.words || []).join('\n'),
              output: '',
              ts: Date.now()
            };

            Storage.set('wordsearch:seed', ws);
            this.app.toast?.('Enviado ✅ (abra Caça-palavras e clique Gerar)');
            this.app.log?.(`[BOOK] sent section="${page.sectionTitle}" grid=${page.grid} words=${(page.words||[]).length}`);
          };
        });

        bindSwipe();
      };

      const bindSwipe = () => {
        const paper = stage.querySelector('.bb-paper');
        if (!paper) return;

        let x0 = null, y0 = null;

        paper.ontouchstart = (e) => {
          const t = e.touches && e.touches[0];
          if (!t) return;
          x0 = t.clientX;
          y0 = t.clientY;
        };

        paper.ontouchend = (e) => {
          if (x0 == null || y0 == null) return;
          const t = e.changedTouches && e.changedTouches[0];
          if (!t) return;

          const dx = t.clientX - x0;
          const dy = t.clientY - y0;

          x0 = null; y0 = null;

          // só considera swipe horizontal forte
          if (Math.abs(dx) < 70) return;
          if (Math.abs(dy) > 70) return;

          if (dx < 0) {
            idx = Math.min(pages.length - 1, idx + 1);
          } else {
            idx = Math.max(0, idx - 1);
          }
          seed.pageIndex = idx;
          saveSeed();
          renderStage();
        };
      };

      area.querySelector('#bb_prev').onclick = () => {
        idx = Math.max(0, idx - 1);
        seed.pageIndex = idx; saveSeed();
        renderStage();
      };

      area.querySelector('#bb_next').onclick = () => {
        idx = Math.min(pages.length - 1, idx + 1);
        seed.pageIndex = idx; saveSeed();
        renderStage();
      };

      area.querySelector('#bb_mode_spread').onclick = () => {
        seed.mode = 'spread'; saveSeed();
        renderStage();
      };
      area.querySelector('#bb_mode_flip').onclick = () => {
        seed.mode = 'flip'; saveSeed();
        renderStage();
      };

      area.querySelector('#bb_reset').onclick = () => {
        plan = buildDefaultPlanMG(13, 16);
        Storage.set('cultural:book_plan', plan);
        seed.pageIndex = 0;
        seed.mode = 'flip';
        Storage.set('cultural:builder_seed', seed);
        this.app.toast?.('Livro recriado ✅');
        renderMain();
      };

      area.querySelector('#bb_json').onclick = () => {
        try{
          const data = JSON.stringify(plan, null, 2);
          const blob = new Blob([data], { type:'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = (plan?.meta?.id || 'cultural_plan') + '.json';
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(()=>URL.revokeObjectURL(url), 1500);
          this.app.toast?.('Plano baixado ✅');
        } catch(e){
          this.app.toast?.('Falha ao baixar JSON');
          this.app.log?.('[BOOK] json export failed: ' + (e?.message || e));
        }
      };

      // re-render ao girar / mudar largura
      const onResize = () => renderStage();
      window.addEventListener('resize', onResize, { passive:true });

      renderStage();
    };

    if (!plan) renderEmpty();
    else renderMain();
  }
}
