/* FILE: /js/modules/cultural_book_builder.js */
// Bright Cup Creator — Cultural Book Builder v0.3d PADRÃO (1 ano)
// PATCH "REVISTINHA":
// - Grade clássica (quadrada, linhas finas) -> sem cápsula/bolha
// - Container da grade com overflow:auto -> não corta no iPhone
// - Palavras em linha (horizontal) separadas por " — " -> sem chips
// - Título/meta responsivos no mobile
// - Swipe folhear mantido (bindSwipe)

import { Storage } from '../core/storage.js';
import { generateWordSearch, normalizeWord as wsNormalizeWord } from '../core/wordsearch_gen.js';

function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function normalizeWord(s){
  try { return wsNormalizeWord(s); } catch {}
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

// display: mantém acento/ç (ortografia correta)
function displayWord(w){
  return String(w ?? '').trim().toUpperCase();
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
          'MINAS','MINEIRO','SERRA','MONTANHA','CULTURA','HISTÓRIA','TRADIÇÃO','ACOLHIMENTO','CAFÉ','FOGÃO','INTERIOR'
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
          'HISTÓRIA','CAMINHO','SERRA','RIO','CIDADE','PATRIMÔNIO','MEMÓRIA','ORIGEM','TRADIÇÃO'
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
          'QUEIJO','CANASTRA','CURADO','MEIA-CURA','LEITE','FAZENDA','TRADIÇÃO','SABOR','COALHO','CURA'
        ]
      },
      {
        id:'pao_de_queijo',
        icon:'bread',
        title:'Pão de queijo (receita mineira simples)',
        text:
          'Receita base: polvilho, leite, óleo, ovos, queijo e sal. Mistura, sovar, bolear e assar. ' +
          'O segredo é o queijo e o ponto da massa — cada casa tem seu jeito.',
        wordHints:[
          'PÃO-DE-QUEIJO','POLVILHO','FORNO','MASSA','QUEIJO','LEITE','OVO','SAL','RECEITA','COZINHA'
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
          'CAFÉ','COADOR','CHEIRO','MANHÃ','FAZENDA','INTERIOR','TRADIÇÃO','TORRA','XÍCARA'
        ]
      },
      {
        id:'ferrovia',
        icon:'train',
        title:'Ferrovia e o “trem” mineiro',
        text:
          'O “trem” em Minas é mais que vagão: é expressão, é memória e é caminho. ' +
          'A ferrovia Vitória–Minas, por exemplo, marca ligações entre regiões e histórias.',
        wordHints:[
          'FERROVIA','TREM','TRILHO','ESTAÇÃO','VIAGEM','VITÓRIA-MINAS','ROTA','PLATAFORMA','VAGÃO'
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
          'PEDRA','GEMA','GARIMPO','CRISTAL','BRILHO','MINÉRIO','OURO','PRATA','JOIA'
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
          'FÉ','IGREJA','SANTUÁRIO','PROCISSÃO','TRADIÇÃO','FESTA','DEVOTO','ROMARIA'
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
          'VALADARES','IBITURUNA','VOO LIVRE','PARAPENTE','ASA-DELTA','PICO','VENTO','AVENTURA','MIRANTE'
        ]
      }
    ]
  };
}

function buildPages(plan){
  const m = plan.meta || {};
  const gridDefault = Number(m.grid_default || 15);
  const wppDefault  = Number(m.words_per_puzzle || 20);

  const pages = [];

  pages.push({
    kind:'text',
    icon:'history',
    title: m.title || 'MINAS GERAIS CULTURAL',
    meta: (m.subtitle || '').trim(),
    body: wrap(
      `Apresentação\n\nEste livro é uma viagem por Minas Gerais: sabores, histórias, fé, trilhos e montanhas.\n\n` +
      `Cada seção traz um texto curto e um caça-palavras temático.\n\n` +
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
      body: wrap(s.text || '', 72),
      sectionId: s.id
    });

    const rawHints = [].concat(s.wordHints || []).concat([s.title, 'MINAS', 'CULTURA', 'HISTÓRIA', 'UAI']);
    const wordsNorm = pickWords(rawHints, gridDefault, wppDefault);

    // displayWords: mantém ortografia (com acento/ç) mas filtra pelo tamanho da palavra normalizada
    const wordsDisplay = uniq(rawHints.map(displayWord))
      .filter(w => {
        const n = normalizeWord(w);
        return n.length >= 3 && n.length <= gridDefault;
      })
      .slice(0, Math.max(wordsNorm.length, 6));

    pages.push({
      kind:'puzzle',
      icon: s.icon,
      title: `Caça-Palavras — ${s.title}`,
      meta: `Prévia visual (editorial) • grade ${gridDefault}x${gridDefault} • palavras ${wordsNorm.length}`,
      sectionId: s.id,
      sectionTitle: s.title,
      grid: gridDefault,
      wordsNorm,
      wordsDisplay
    });
  });

  pages.push({
    kind:'text',
    icon:'history',
    title:'Gabarito (no final)',
    meta:'(entra completo no Export PDF)',
    body: wrap(
      `O gabarito completo entra na fase do Export PDF (KDP).\n\n` +
      `Aqui no Builder a gente valida: ordem, texto, tema, grade e padrão editorial.`,
      72
    )
  });

  pages.forEach((p,i)=> p.pageNo = i+1);
  return pages;
}

function seedKeyForPlan(plan){
  const pid = String(plan?.meta?.id || 'book');
  const ts = String(plan?.meta?.createdAt || '');
  return `cultural:builder_cache:${pid}:${ts}`;
}

function getPuzzleCache(plan){
  return Storage.get(seedKeyForPlan(plan), { puzzles:{} });
}

function setPuzzleCache(plan, cache){
  Storage.set(seedKeyForPlan(plan), cache || { puzzles:{} });
}

function ensurePuzzleGenerated(plan, page){
  if (!page || page.kind !== 'puzzle') return null;
  const cache = getPuzzleCache(plan);
  const key = `p${page.pageNo}:${page.sectionId || ''}:${page.grid || ''}`;
  if (cache?.puzzles?.[key]) return cache.puzzles[key];

  const gen = generateWordSearch({
    size: page.grid || 15,
    words: page.wordsNorm || [],
    maxWords: (page.wordsNorm || []).length || 16,
    allowDiagonal: true,
    allowBackwards: true
  });

  const payload = {
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
  const N = grid?.length || 0;
  if (!N) return '<div class="ws-empty">Grade vazia</div>';

  let html = `<div class="ws-grid" data-n="${N}" role="img" aria-label="Caça-palavras">`;
  for (let y=0;y<N;y++){
    html += '<div class="ws-row">';
    for (let x=0;x<N;x++){
      html += `<div class="ws-cell">${esc(grid[y][x] || '')}</div>`;
    }
    html += '</div>';
  }
  html += '</div>';
  return html;
}

// ✅ Palavras em linha (horizontal), separadas por " — "
function renderWordsInline(wordsDisplay){
  const list = (wordsDisplay || []).map(displayWord).filter(Boolean);
  if (!list.length) return '';
  return `<div class="words-inline">${list.map(w => esc(w)).join(' <span class="sep">—</span> ')}</div>`;
}

function bindSwipe(el, onPrev, onNext){
  if (!el) return;
  let startX = 0, startY = 0, tracking = false, locked = false;

  const onStart = (x,y) => { startX=x; startY=y; tracking=true; locked=false; };
  const onMove  = (x,y,ev) => {
    if (!tracking) return;
    const dx = x - startX;
    const dy = y - startY;
    if (!locked && Math.abs(dx) > 18 && Math.abs(dx) > Math.abs(dy) * 1.2) locked = true;
    if (locked) { try { ev.preventDefault(); } catch {} }
  };
  const onEnd   = (x,y) => {
    if (!tracking) return;
    tracking = false;

    const dx = x - startX;
    const dy = y - startY;
    if (Math.abs(dx) < 55) return;
    if (Math.abs(dx) < Math.abs(dy) * 1.2) return;

    if (dx > 0) onPrev?.();
    else onNext?.();
  };

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

  el.addEventListener('touchend', (e)=>{
    const t = e.changedTouches?.[0];
    if (!t) return;
    onEnd(t.clientX, t.clientY);
  }, { passive:true });

  let mouseDown = false;
  el.addEventListener('mousedown', (e)=>{ mouseDown=true; onStart(e.clientX, e.clientY); });
  window.addEventListener('mousemove', (e)=>{ if(!mouseDown) return; onMove(e.clientX, e.clientY, e); }, { passive:false });
  window.addEventListener('mouseup', (e)=>{ if(!mouseDown) return; mouseDown=false; onEnd(e.clientX, e.clientY); });
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
    const seed = Storage.get('cultural:builder_seed', { mode:'FOLHEAR', pageIndex: 0 });

    const saveSeed = (next) => Storage.set('cultural:builder_seed', next);

    root.innerHTML = `
      <style>
        .bb-wrap{ display:grid; gap:14px; }
        .bb-toolbar{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; justify-content:space-between; }
        .bb-toolbar .left, .bb-toolbar .right{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
        .bb-top{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; justify-content:space-between; margin-top:6px; }
        .bb-tabs{ display:flex; gap:8px; align-items:center; }
        .bb-mini{ font-size:12px; opacity:.78; }

        .page-card{
          background: rgba(255,255,255,0.92);
          color: #0b0f16;
          border-radius: 22px;
          border: 1px solid rgba(0,0,0,.08);
          box-shadow: 0 18px 60px rgba(0,0,0,.18);
          overflow:hidden;
          position:relative;
        }
        .page-inner{
          padding: 16px 16px 14px 16px;
          display:grid;
          gap:10px;
        }
        .page-head{
          display:flex; align-items:flex-start; justify-content:space-between; gap:12px;
          border-bottom: 1px solid rgba(0,0,0,.08);
          padding-bottom: 8px;
        }
        .page-title{
          font-size: clamp(22px, 6.0vw, 34px);
          line-height: 1.03;
          font-weight: 900;
          letter-spacing: -0.35px;
        }
        .page-meta{
          font-size: clamp(13px, 3.6vw, 16px);
          opacity: .65;
          margin-top: 4px;
        }
        .page-no{
          font-size: 16px;
          opacity:.55;
          font-weight: 800;
          padding-top: 6px;
          min-width: 52px;
          text-align:right;
        }

        .page-body{
          border-radius: 16px;
          border: 1px solid rgba(0,0,0,.10);
          background: rgba(255,255,255,0.55);
          padding: 12px;
        }
        .page-body pre{
          margin:0;
          white-space:pre-wrap;
          overflow-wrap:anywhere;
          word-break:break-word;
          font-family: ui-serif, Georgia, "Times New Roman", serif;
          font-size: clamp(16px, 4.3vw, 20px);
          line-height: 1.35;
        }

        .puzzle-wrap{ display:grid; gap:10px; }

        /* ✅ Container com overflow -> NÃO CORTA */
        .ws-frame{
          border-radius: 16px;
          border: 1px solid rgba(0,0,0,.14);
          background: rgba(255,255,255,0.65);
          padding: 10px;
          max-width: 100%;
          overflow: auto;
          -webkit-overflow-scrolling: touch;
        }

        /* ✅ Grade clássica "revistinha" */
        .ws-grid{
          display:grid;
          width: max-content;
          margin: 0 auto;
          padding: 4px;
          background: rgba(255,255,255,0.92);
          border: 1px solid rgba(0,0,0,.22);
        }
        .ws-row{
          display:grid;
          grid-auto-flow: column;
        }
        .ws-cell{
          width:  clamp(16px, 4.6vw, 24px);
          height: clamp(16px, 4.6vw, 24px);
          display:flex;
          align-items:center;
          justify-content:center;
          border: 1px solid rgba(0,0,0,.28);
          background: rgba(255,255,255,0.98);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-weight: 900;
          font-size: clamp(12px, 2.8vw, 16px);
          line-height: 1;
          border-radius: 0; /* 🔥 sem cápsula */
          letter-spacing: 0.1px;
          user-select: none;
        }

        /* ✅ Palavras em linha (horizontal) */
        .words-box{
          border-radius: 16px;
          border: 1px solid rgba(0,0,0,.10);
          background: rgba(255,255,255,0.55);
          padding: 10px 12px;
        }
        .words-title{
          font-size: 16px;
          font-weight: 900;
          opacity: .72;
          margin-bottom: 8px;
        }
        .words-inline{
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: clamp(13px, 3.6vw, 17px);
          font-weight: 900;
          letter-spacing: 0.15px;
          line-height: 1.35;
          opacity: .92;
          word-break: break-word;
          overflow-wrap: anywhere;
        }
        .words-inline .sep{
          opacity: .35;
          padding: 0 4px;
        }

        /* ✅ Slot de imagem compacto */
        .illus-slot{
          border-radius: 14px;
          border: 1px dashed rgba(0,0,0,.22);
          background: rgba(255,255,255,0.42);
          padding: 9px 10px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
        }
        .illus-left{ display:grid; gap:2px; }
        .illus-title{ font-size: 14px; font-weight: 900; opacity:.74; }
        .illus-desc{ font-size: 12px; opacity:.58; }
        .illus-badge{
          font-size: 12px;
          font-weight: 900;
          padding: 7px 9px;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,.14);
          background: rgba(255,255,255,0.65);
          opacity:.9;
        }

        .page-foot{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          padding-top: 4px;
          opacity:.88;
          font-size: 13px;
        }

        .spread{ display:grid; grid-template-columns: 1fr 1fr; gap:14px; }
        @media (max-width: 860px){
          .spread{ grid-template-columns: 1fr; }
          .page-inner{ padding: 14px; }
          .ws-frame{ padding: 9px; }
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

    const renderEmpty = () => {
      area.innerHTML = `
        <div class="bb-empty">
          <p class="muted"><b>Nenhum livro carregado.</b> Isso pode acontecer se o Safari limpar o armazenamento.</p>
          <div class="row">
            <button class="btn primary" id="bb_make">Criar Livro Minas (PADRÃO)</button>
            <button class="btn" id="bb_go_agent">Abrir Cultural Agent</button>
          </div>
          <p class="bb-mini muted">Dica: exporte o plano em JSON no Cultural Agent para backup.</p>
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

    const renderPageCard = (page, plan, withButton=true) => {
      if (!page) return '';

      if (page.kind === 'text') {
        return `
          <div class="page-card">
            <div class="page-inner">
              <div class="page-head">
                <div>
                  <div class="page-title">${esc(page.title || '')}</div>
                  <div class="page-meta">${esc(page.meta || '')}</div>
                </div>
                <div class="page-no">p.${esc(String(page.pageNo || ''))}</div>
              </div>

              <div class="page-body"><pre>${esc(page.body || '')}</pre></div>

              <div class="page-foot">
                <span>Ilustração P&B: <b>${esc(iconLabel(page.icon))}</b></span>
                <span></span>
              </div>
            </div>
          </div>
        `;
      }

      const gen = ensurePuzzleGenerated(plan, page);
      const gridHtml = renderGridHTML(gen?.grid);

      return `
        <div class="page-card">
          <div class="page-inner">
            <div class="page-head">
              <div>
                <div class="page-title">${esc(page.title || '')}</div>
                <div class="page-meta">${esc(page.meta || '')}</div>
              </div>
              <div class="page-no">p.${esc(String(page.pageNo || ''))}</div>
            </div>

            <div class="puzzle-wrap">
              <div class="ws-frame">${gridHtml}</div>

              <div class="words-box">
                <div class="words-title">Palavras</div>
                ${renderWordsInline(page.wordsDisplay || page.wordsNorm || [])}
              </div>

              <div class="illus-slot">
                <div class="illus-left">
                  <div class="illus-title">Ilustração P&B: ${esc(iconLabel(page.icon))}</div>
                  <div class="illus-desc">Slot reservado (a imagem entra aqui no modo Export/IA).</div>
                </div>
                <div class="illus-badge">Imagem</div>
              </div>
            </div>

            <div class="page-foot">
              ${
                withButton ? `<button class="btn" data-send="ws">Enviar p/ Caça-palavras</button>` : `<span></span>`
              }
              <span></span>
            </div>
          </div>
        </div>
      `;
    };

    const sendPageToWordSearch = (page, plan) => {
      if (!page || page.kind !== 'puzzle') return;
      const ws = {
        title: page.title || `Caça-Palavras ${page.grid}x${page.grid}`,
        preset: (page.grid || 15) <= 13 ? 'BR_POCKET' : 'BR_PLUS',
        size: page.grid || 15,
        maxWords: (page.wordsNorm || []).length || 16,
        includeKey: true,
        words: (page.wordsNorm || []).join('\n'),
        puzzleId: page.sectionId || '',
        sectionId: page.sectionId || '',
        sectionTitle: page.sectionTitle || '',
        output: '',
        ts: Date.now()
      };
      Storage.set('wordsearch:seed', ws);
      this.app.toast?.('Enviado ✅ (abra Caça-palavras e clique Gerar+Salvar)');
      try { this.app.log?.(`[BOOK] sent section="${page.sectionTitle || ''}" grid=${ws.size} words=${(page.wordsNorm||[]).length}`); } catch {}
    };

    const renderMain = () => {
      if (!plan) return renderEmpty();

      const pages = buildPages(plan);
      let mode = seed.mode === 'SPREAD' ? 'SPREAD' : 'FOLHEAR';
      let pageIndex = Math.max(0, Math.min(seed.pageIndex || 0, pages.length - 1));

      const save = () => saveSeed({ mode, pageIndex });

      const goPrev = () => { pageIndex = Math.max(0, pageIndex - 1); save(); paint(); };
      const goNext = () => { pageIndex = Math.min(pages.length - 1, pageIndex + 1); save(); paint(); };

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

        <div class="bb-top">
          <div class="bb-tabs">
            <button class="btn ${mode==='SPREAD'?'primary':''}" id="bb_mode_spread">Spread</button>
            <button class="btn ${mode==='FOLHEAR'?'primary':''}" id="bb_mode_folhear">Folhear</button>
          </div>
          <div class="bb-mini">Página <b id="bb_pos"></b></div>
        </div>

        <div id="bb_view"></div>

        <div class="bb-toolbar" style="margin-top:10px;">
          <div class="left">
            <button class="btn" id="bb_download_plan">Baixar plano (JSON)</button>
            <button class="btn" id="bb_reset">Recriar Minas (PADRÃO)</button>
          </div>
          <div class="right">
            <button class="btn" id="bb_go_agent">Abrir Agent</button>
          </div>
        </div>
      `;

      const view = area.querySelector('#bb_view');

      const paint = () => {
        area.querySelector('#bb_pos').textContent = `${pageIndex+1}/${pages.length}`;

        if (mode === 'FOLHEAR') {
          const p = pages[pageIndex];
          view.innerHTML = renderPageCard(p, plan, true);

          const card = view.querySelector('.page-card');
          bindSwipe(card, goPrev, goNext);

          const btn = view.querySelector('[data-send="ws"]');
          if (btn) btn.onclick = () => sendPageToWordSearch(p, plan);
          return;
        }

        const left = pages[pageIndex];
        const right = pages[pageIndex+1] || null;

        view.innerHTML = `
          <div class="spread">
            <div>${renderPageCard(left, plan, true)}</div>
            <div>${right ? renderPageCard(right, plan, true) : ''}</div>
          </div>
        `;

        bindSwipe(
          view,
          ()=>{ pageIndex = Math.max(0, pageIndex - 2); save(); paint(); },
          ()=>{ pageIndex = Math.min(pages.length - 1, pageIndex + 2); save(); paint(); }
        );

        const cards = view.querySelectorAll('.page-card');
        cards.forEach((cardEl, idxCard)=>{
          const page = idxCard===0 ? left : right;
          const btn = cardEl.querySelector('[data-send="ws"]');
          if (btn && page) btn.onclick = () => sendPageToWordSearch(page, plan);
        });
      };

      area.querySelector('#bb_prev').onclick = goPrev;
      area.querySelector('#bb_next').onclick = goNext;

      area.querySelector('#bb_mode_spread').onclick = () => { mode='SPREAD'; save(); renderMain(); };
      area.querySelector('#bb_mode_folhear').onclick = () => { mode='FOLHEAR'; save(); renderMain(); };

      area.querySelector('#bb_reset').onclick = () => {
        plan = buildDefaultPlanMG(15, 20);
        Storage.set('cultural:book_plan', plan);
        Storage.set('cultural:builder_seed', { mode:'FOLHEAR', pageIndex: 0 });
        this.app.toast?.('Livro recriado ✅');
        renderMain();
      };

      area.querySelector('#bb_go_agent').onclick = () => {
        const btn = document.querySelector('.navitem[data-view="cultural"]');
        btn?.click?.();
      };

      area.querySelector('#bb_download_plan').onclick = () => {
        if (!plan) return;
        try{
          const blob = new Blob([JSON.stringify(plan, null, 2)], { type:'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `book-plan-${(plan?.meta?.id||'cultural')}-${Date.now()}.json`;
          a.click();
          setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
          this.app.toast?.('Plano baixado ✅');
        } catch {
          this.app.toast?.('Falha ao baixar', 'err');
        }
      };

      paint();
    };

    if (!plan) renderEmpty();
    else renderMain();
  }
}
