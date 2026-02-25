/* FILE: /js/modules/cultural_book_builder.js */
// Bright Cup Creator — Cultural Book Builder v0.1 PADRÃO (6x9 • 2-page spread)
// Objetivo: preview editorial do Livro Cultural (texto à esquerda + puzzle à direita).
// - Lê: Storage key "cultural:book_plan"
// - Mostra: spreads (duas páginas por vez) com proporção 6x9
// - Não gera PDF ainda (isso vem no Exporter). Aqui é para validar layout/ordem/conteúdo.
// - Botão opcional: "Enviar seção para Caça-Palavras" (para testar grid real no módulo wordsearch)

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
    bread: 'Pão / Receita',
    coffee: 'Café',
    train: 'Ferrovia',
    gem: 'Pedras / Gemas',
    church: 'Fé / Igreja',
    landscape: 'Paisagem',
    paraglider: 'Voo livre'
  };
  return map[icon] || icon || 'ícone';
}

export class CulturalBookBuilderModule {
  constructor(app){
    this.app = app;
    this.id = 'book';
    this.title = 'Livro (Builder)';
  }

  async init(){}

  render(root){
    const plan = Storage.get('cultural:book_plan', null);

    // estado do builder
    const st = Storage.get('cultural:builder_seed', { spreadIndex: 0 });

    root.innerHTML = `
      <style>
        /* === PADRÃO 1 ANO: Book Builder preview === */
        .bb-wrap{ display:grid; gap:14px; }
        .bb-toolbar{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; justify-content:space-between; }
        .bb-toolbar .left, .bb-toolbar .right{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
        .bb-badge{ padding:8px 12px; border-radius:999px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); }
        .bb-spread{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap:14px;
        }
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
        /* Proporção 6x9 (2:3). Mantém preview fiel. */
        .bb-page::before{
          content:"";
          display:block;
          padding-top: 150%;
        }
        .bb-page > .bb-inner{
          position:absolute; inset:14px;
          display:flex; flex-direction:column; gap:10px;
        }
        .bb-head{
          display:flex; align-items:flex-start; justify-content:space-between; gap:10px;
        }
        .bb-title{ font-size:16px; font-weight:800; letter-spacing:.2px; }
        .bb-meta{ font-size:12px; opacity:.75; }
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
          font-family: ui-serif, Georgia, "Times New Roman", serif;
          font-size:14px;
          line-height:1.32;
        }
        .bb-words{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap:6px 14px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size:12px;
          opacity:.92;
        }
        .bb-footer{
          display:flex; justify-content:space-between; align-items:center; gap:10px;
          font-size:12px; opacity:.80;
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
        .bb-gridbox .hint{ font-size:12px; opacity:.8; }
        .bb-mobile-note{ font-size:12px; opacity:.78; }
        @media (max-width: 860px){
          .bb-spread{ grid-template-columns: 1fr; }
        }
      </style>

      <div class="bb-wrap">
        <div class="card">
          <h2>Livro Cultural — Builder (Preview Editorial)</h2>
          <p class="muted">
            Aqui a gente valida o livro <b>como livro</b>: duas páginas abertas (texto à esquerda, puzzle à direita) no padrão 6x9.
            Isso é PADRÃO por 1 ano. O PDF vem no Exporter depois.
          </p>

          ${!plan ? `
            <div class="sep"></div>
            <p class="muted"><b>Nenhum plano encontrado.</b> Vá em <b>Cultural Agent</b> e clique “Gerar Plano do Livro (MG)”.</p>
          ` : `
            <div class="sep"></div>
            <div class="bb-toolbar">
              <div class="left">
                <span class="bb-badge"><b>${esc(plan.meta?.title || 'LIVRO')}</b></span>
                <span class="bb-badge">Formato: <b>${esc(plan.meta?.format || '6x9')}</b></span>
                <span class="bb-badge">Grade: <b>${esc(String(plan.meta?.grid_default || 15))}x${esc(String(plan.meta?.grid_default || 15))}</b></span>
                <span class="bb-badge">Palavras/puzzle: <b>${esc(String(plan.meta?.words_per_puzzle || 20))}</b></span>
              </div>
              <div class="right">
                <button class="btn" id="bb_prev">◀ Anterior</button>
                <button class="btn" id="bb_next">Próximo ▶</button>
              </div>
            </div>

            <p class="bb-mobile-note muted">Dica: no celular, as duas páginas empilham (uma embaixo da outra). No desktop, aparece “livro aberto”.</p>

            <div class="bb-spread">
              <div class="bb-page" id="bb_left"><div class="bb-inner"></div></div>
              <div class="bb-page" id="bb_right"><div class="bb-inner"></div></div>
            </div>
          `}
        </div>
      </div>
    `;

    if (!plan) return;

    const leftInner = root.querySelector('#bb_left .bb-inner');
    const rightInner = root.querySelector('#bb_right .bb-inner');

    const spreads = buildSpreads(plan);

    let idx = Math.max(0, Math.min(st.spreadIndex || 0, spreads.length - 1));

    const saveIdx = () => Storage.set('cultural:builder_seed', { spreadIndex: idx });

    const renderSpread = () => {
      const sp = spreads[idx];

      // LEFT: texto
      leftInner.innerHTML = `
        <div class="bb-head">
          <div>
            <div class="bb-title">${esc(sp.left.title)}</div>
            <div class="bb-meta">${esc(sp.left.meta)}</div>
          </div>
          <div class="bb-meta">p.${esc(String(sp.left.pageNo))}</div>
        </div>
        <div class="bb-body">
          <pre>${esc(sp.left.body)}</pre>
        </div>
        <div class="bb-footer">
          <span>Ilustração: <b>${esc(iconLabel(sp.left.icon))}</b> (P&B)</span>
          <span>Livro 6x9</span>
        </div>
      `;

      // RIGHT: puzzle placeholder + palavras
      const wordsHtml = sp.right.words.map(w => `<div>${esc(w)}</div>`).join('');
      rightInner.innerHTML = `
        <div class="bb-head">
          <div>
            <div class="bb-title">${esc(sp.right.title)}</div>
            <div class="bb-meta">${esc(sp.right.meta)}</div>
          </div>
          <div class="bb-meta">p.${esc(String(sp.right.pageNo))}</div>
        </div>

        <div class="bb-gridbox">
          <div>
            <div><b>CAÇA-PALAVRAS ${esc(String(sp.right.grid))}x${esc(String(sp.right.grid))}</b></div>
            <div class="hint">Preview editorial. (A grade real será gerada no módulo “Caça-palavras” e no Export PDF.)</div>
          </div>
        </div>

        <div>
          <div class="bb-meta" style="margin:8px 0 6px 0">Palavras</div>
          <div class="bb-words">${wordsHtml}</div>
        </div>

        <div class="bb-footer">
          <button class="btn" id="bb_send_ws">Enviar esta seção para Caça-palavras</button>
          <span>Spread ${idx+1}/${spreads.length}</span>
        </div>
      `;

      // enviar para wordsearch
      const btn = rightInner.querySelector('#bb_send_ws');
      btn.onclick = () => {
        const ws = {
          title: `Caça-Palavras — ${sp.right.sectionTitle}`,
          preset: 'BR_POCKET',
          size: sp.right.grid,
          includeKey: true,
          words: sp.right.words.join('\n'),
          output: '',
          ts: Date.now()
        };
        Storage.set('wordsearch:seed', ws);
        this.app.toast?.('Seção enviada ✅ (abra Caça-palavras e clique Gerar)');
        this.app.log?.(`[BOOK] sent section="${sp.right.sectionTitle}" grid=${sp.right.grid} words=${sp.right.words.length}`);
      };

      saveIdx();
    };

    root.querySelector('#bb_prev').onclick = () => {
      idx = Math.max(0, idx - 1);
      renderSpread();
    };
    root.querySelector('#bb_next').onclick = () => {
      idx = Math.min(spreads.length - 1, idx + 1);
      renderSpread();
    };

    renderSpread();

    // --- helpers ---
    function buildSpreads(plan){
      const m = plan.meta || {};
      const grid = Number(m.grid_default || 15);
      const wpp  = Number(m.words_per_puzzle || 20);

      const pages = [];

      // Front matter (simplificado por enquanto)
      pages.push({
        kind:'text',
        icon:'history',
        title: m.title || 'MINAS GERAIS CULTURAL',
        meta: m.subtitle || 'História • Sabores • Tradições • Curiosidades',
        body: wrap(
          `Apresentação\n\nEste livro é uma viagem por Minas Gerais: sabores, histórias, fé, trilhos e montanhas. ` +
          `Cada seção traz um texto curto (com alma) e um caça-palavras temático.\n\n` +
          `No final, você encontra o gabarito completo. Boa leitura e bom passatempo.`,
          78
        )
      });

      // Conteúdo: para cada seção = (texto) + (puzzle)
      (plan.sections || []).forEach((s) => {
        pages.push({
          kind:'text',
          icon: s.icon,
          title: s.title,
          meta: `Cultura mineira • seção`,
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
          meta: `Tema: ${s.title}`,
          sectionTitle: s.title,
          grid,
          words
        });
      });

      // Gabarito (placeholder por enquanto — no Export PDF vira real)
      pages.push({
        kind:'text',
        icon:'history',
        title:'Gabarito (placeholder)',
        meta:'No Export PDF vira gabarito real',
        body: wrap(
          `Aqui no final do livro ficará o gabarito de todos os caça-palavras.\n\n` +
          `Nesta fase (Builder), a gente valida: ordem das páginas, textos, temas, palavras e padrão editorial.\n\n` +
          `O gabarito final 100% correto entra na fase do Export PDF (KDP).`,
          78
        )
      });

      // Numerar páginas (começa em 1)
      pages.forEach((p, i) => p.pageNo = i + 1);

      // Transformar em spreads (2 páginas por vez)
      const spreads = [];
      for (let i = 0; i < pages.length; i += 2){
        const left = pages[i];
        const right = pages[i+1] || {
          kind:'text', icon:'history', title:'(fim)', meta:'', body:''
        };

        spreads.push({
          left: {
            title: left.title || '',
            meta: left.meta || '',
            body: left.kind === 'puzzle'
              ? `Página reservada para puzzle.\n(Visualização completa no painel da direita)`
              : (left.body || ''),
            icon: left.icon,
            pageNo: left.pageNo
          },
          right: {
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
  }
}
