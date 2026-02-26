/* FILE: /js/modules/cultural_book_builder.js */
// Bright Cup Creator — Cultural Book Builder v0.4a PADRÃO (1 ano)
// V0.4a:
// - Builder = só folhear/aprovar (layout vem do Agent via plan.meta.layout)
// - Folha fixa (6x9) sem expandir por conteúdo
// - Caça-Palavras sem “bolhas” internas (grid e palavras sem cards/bubbles)
// - Palavras em 3 colunas, compactas (mais espaço pra grade)
// - Header do puzzle mais enxuto (sem “Prévia visual...”, sem “Puzzle”)
// - Mantém: pipeline de export/IA e slots de ilustração
//
// Observação: este módulo é de “preview editorial”. O PDF final continua vindo do Export.
//
// (c) RControl / Bright Cup Creator

import { Storage } from '../core/storage.js';

const $esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function normalizeWord(s){
  return String(s || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g,'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^A-Z0-9]/g,'');
}

function uniqNorm(list){
  const seen = new Set();
  const out = [];
  for (const it of (list || [])){
    const w = normalizeWord(it);
    if (!w) continue;
    if (seen.has(w)) continue;
    seen.add(w);
    out.push(w);
  }
  return out;
}

function pickWordsForGrid(words, gridSize, maxCount){
  const maxLen = gridSize;
  const filtered = uniqNorm(words).filter(w => w.length >= 3 && w.length <= maxLen);
  filtered.sort((a,b) => (Math.abs(a.length-7) - Math.abs(b.length-7)));
  const take = Math.max(6, Number(maxCount || 0) || 0);
  return filtered.slice(0, take);
}

function wrapLines(text, max=72){
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

function renderSectionText(s){
  const lines = [];
  lines.push(String(s.title || '').toUpperCase());
  lines.push('-'.repeat(Math.max(18, String(s.title||'').length)));
  lines.push('');
  lines.push(wrapLines(s.text, 72));
  lines.push('');
  return lines.join('\n').trimEnd();
}

function presetFromGrid(grid){
  const g = Number(grid||0);
  if (g <= 13) return 'BR_POCKET';
  return 'BR_PLUS';
}

function buildPagesFromPlan(plan){
  const pages = [];
  const meta = plan?.meta || {};
  const gridDefault = Number(meta.grid_default || 15);
  const wppDefault  = Number(meta.words_per_puzzle || 16);
  const includeKey  = !!meta.include_key;

  // capa
  pages.push({
    kind:'cover',
    title: meta.title || 'LIVRO',
    subtitle: meta.subtitle || '',
    pageNo: 1
  });

  // seções: texto + puzzle
  let pageNo = 2;
  const secs = plan?.sections || [];
  for (const s of secs){
    // texto
    pages.push({
      kind:'text',
      icon: s.icon,
      title: s.title,
      sectionId: s.id,
      sectionTitle: s.title,
      doc: renderSectionText(s),
      imageSlotLabel: (s?.imageSlotLabel || 'Ilustração P&B') + `: ${s.title}`,
      pageNo: pageNo++
    });

    // palavras
    const wordsRaw = []
      .concat(s.wordHints || [])
      .concat([s.title, 'Minas', 'Cultura', 'História', 'Uai']);

    const wordsNorm = pickWordsForGrid(wordsRaw, gridDefault, wppDefault);

    // puzzle page
    pages.push({
      kind:'puzzle',
      icon: s.icon,
      title: `Caça-Palavras — ${s.title}`,
      meta: `grade ${gridDefault}x${gridDefault} · palavras ${wordsNorm.length}`,
      sectionId: s.id,
      sectionTitle: s.title,
      grid: gridDefault,
      maxWords: wppDefault,
      includeKey,
      wordsNorm,
      imageSlotLabel: (s?.imageSlotLabelPuzzle || 'Ilustração P&B') + `: ${s.title}`,
      pageNo: pageNo++
    });
  }

  return pages;
}

function tableGridHTML(grid){
  const rows = [];
  for (let r=0; r<grid.length; r++){
    const tds = [];
    for (let c=0; c<grid[r].length; c++){
      const ch = grid[r][c] || ' ';
      tds.push(`<td class="ws-cell"><span>${$esc(ch)}</span></td>`);
    }
    rows.push(`<tr>${tds.join('')}</tr>`);
  }
  return `<table class="ws-grid" aria-label="Caça-palavras">${rows.join('')}</table>`;
}

function splitWordsToCols(words, cols=3){
  const arr = (words || []).slice();
  const out = Array.from({length:cols}, ()=>[]);
  const per = Math.ceil(arr.length / cols);
  for (let i=0; i<cols; i++){
    out[i] = arr.slice(i*per, (i+1)*per);
  }
  return out;
}

function wordsHTML(words){
  const cols = splitWordsToCols(words, 3);
  const colHtml = cols.map(col => {
    const items = col.map(w => `<div class="word-item">${$esc(w)}</div>`).join('');
    return `<div class="word-col">${items}</div>`;
  }).join('');
  return `<div class="words-grid">${colHtml}</div>`;
}

export class CulturalBookBuilderModule {
  constructor(app){
    this.app = app;
    this.id = 'book';
    this.title = 'Builder';
  }

  async init(){}

  render(root){
    const seed = Storage.get('cultural:seed', null);
    const plan = Storage.get('cultural:book_plan', null);

    const pages = plan ? buildPagesFromPlan(plan) : [];

    root.innerHTML = `
      <div class="builder">
        <div class="builder-top">
          <div class="builder-title">
            <h2>Builder</h2>
            <p class="muted">Prévia visual do livro (papel branco). Folheie e valide como produto final.</p>
          </div>

          <div class="builder-controls">
            <button class="btn" id="bb_spread">Spread</button>
            <button class="btn primary" id="bb_flip">Folhear</button>
            <div class="pill" id="bb_pageinfo">Página 1/1</div>
            <button class="btn" id="bb_prev">◀</button>
            <button class="btn" id="bb_next">▶</button>
          </div>
        </div>

        <div class="builder-main">
          <div class="page-wrap">
            <div class="page" id="bb_page">
              <div class="page-inner" id="bb_pageinner">
                <div class="empty">Nenhum plano ainda. Abra o Cultural Agent e gere o plano.</div>
              </div>
            </div>
          </div>
        </div>

        <div class="builder-actions">
          <button class="btn" id="bb_download_plan">Baixar plano (JSON)</button>
          <button class="btn" id="bb_recreate">Recriar Minas (PADRÃO)</button>
          <button class="btn" id="bb_open_agent">Abrir Agent</button>
        </div>
      </div>

      <style>
        .builder{display:flex;flex-direction:column;gap:14px;}
        .builder-top{display:flex;align-items:center;justify-content:space-between;gap:12px;}
        .builder-title h2{margin:0 0 4px 0;}
        .builder-title .muted{margin:0;color:rgba(255,255,255,.72);font-size:13px;}
        .builder-controls{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
        .pill{padding:8px 12px;border:1px solid rgba(255,255,255,.15);border-radius:999px;background:rgba(0,0,0,.18);}
        .builder-main{display:flex;justify-content:center;}
        .page-wrap{width:min(92vw, 520px);}
        .page{background:#fff;border-radius:22px;box-shadow:0 18px 50px rgba(0,0,0,.22);overflow:hidden;}
        .page-inner{padding:18px 18px 14px 18px; height: 720px; display:flex; flex-direction:column;}
        .empty{color:#64748b;font-size:14px;}

        /* header base */
        .page-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}
        .page-title{font-size:34px;line-height:1.04;font-weight:900;letter-spacing:-.02em;margin:0;}
        .page-kind{color:#64748b;font-size:14px;margin-top:6px;}
        .page-no{font-size:14px;opacity:.7;font-weight:900;min-width:52px;text-align:right;padding-top:6px;}
        .page-meta{color:#64748b;font-size:14px;margin-top:8px;}
        .page-hr{height:1px;background:#e5e7eb;margin:10px 0 14px 0;}

        /* text page */
        .page-body{flex:1;min-height:0;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc;padding:18px;}
        .page-body .doc{font-family:Georgia, 'Times New Roman', Times, serif; font-size:20px;line-height:1.35;color:#111827;white-space:pre-line;}
        .img-slot{margin-top:12px;border:2px dashed #cbd5e1;border-radius:16px;padding:14px;color:#64748b;background:rgba(148,163,184,.08);display:flex;align-items:center;justify-content:space-between;gap:12px;}
        .img-slot b{color:#0f172a;}
        .img-chip{border:1px solid #cbd5e1;border-radius:12px;padding:6px 10px;background:#fff;color:#334155;font-weight:800;font-size:12px;}

        /* caça-palavras: header mais enxuto + sem linha extra */
        .ws-head .page-title{font-size:clamp(20px,5.6vw,28px);line-height:1.06;}
        .ws-meta{font-size:14px;opacity:.72;margin-top:6px;}
        .ws-head .page-kind{display:none;}

        /* caça-palavras: sem bolhas/cards internos */
        .ws-box{border:none;background:transparent;border-radius:0;padding:0;margin:0;}
        .ws-grid{border-collapse:collapse;width:100%;table-layout:fixed;}
        .ws-cell{padding:0;}
        .ws-cell span{
          display:flex;align-items:center;justify-content:center;
          width:100%;height:100%;
          font-size:clamp(10px, 2.8vw, 16px);
          font-weight:900;
          color:#0f172a;
        }
        .ws-grid td{border:1px solid #111827; height: clamp(18px, 5vw, 28px);}

        /* palavras: 3 colunas, sem “bolha” */
        .words-box{margin-top:12px;border:none;background:transparent;border-radius:0;padding:0;}
        .words-title{font-weight:900;font-size:26px;margin:0 0 8px 0;color:#0f172a;}
        .words-grid{display:grid;grid-template-columns:repeat(3, 1fr);gap:10px 18px;}
        .word-col{display:flex;flex-direction:column;gap:8px;}
        .word-item{font-weight:900;letter-spacing:.02em;font-size:18px;color:#0f172a;border-bottom:2px dotted rgba(15,23,42,.25);padding-bottom:2px;}

        .footer-note{margin-top:auto;padding-top:10px;color:#64748b;font-size:14px;}
        .footer-note b{color:#0f172a;}
      </style>
    `;

    const $ = (s)=>root.querySelector(s);
    const pageInner = $('#bb_pageinner');
    const pageInfo = $('#bb_pageinfo');

    let mode = 'flip';
    let idx = 0;

    const renderCover = (p) => {
      return `
        <div class="page-head">
          <div>
            <h1 class="page-title">${$esc(p.title || '')}</h1>
            <div class="page-meta">${$esc(p.subtitle || '')}</div>
          </div>
          <div class="page-no">p.${$esc(String(p.pageNo||1))}</div>
        </div>
        <div class="page-hr"></div>
        <div class="page-body">
          <div class="doc">${$esc((plan?.meta?.subtitle || '').replace(/\s*\u2022\s*/g, ' • '))}</div>
        </div>
      `;
    };

    const renderTextPage = (p) => {
      return `
        <div class="page-head">
          <div>
            <h1 class="page-title">${$esc(p.title || '')}</h1>
            <div class="page-kind">Texto cultural</div>
          </div>
          <div class="page-no">p.${$esc(String(p.pageNo||''))}</div>
        </div>
        <div class="page-hr"></div>
        <div class="page-body">
          <div class="doc">${$esc(p.doc || '')}</div>
          <div class="img-slot">
            <div>
              <b>${$esc(p.imageSlotLabel || 'Ilustração P&B')}</b>
              <div>Slot reservado (entra no Export/IA) — nesta página de texto.</div>
            </div>
            <div class="img-chip">Imagem</div>
          </div>
        </div>
      `;
    };

    const renderPuzzlePage = (p) => {
      const gridSize = Number(p.grid || 15);
      const words = (p.wordsNorm || []).slice();
      const wsSeed = Storage.get('wordsearch:seed', null);

      // se existir saída gerada do módulo de caça-palavras, tenta usar (preview),
      // senão mostra “grade vazia” como placeholder.
      const outGrid = (wsSeed && wsSeed.output && wsSeed.puzzleId === p.sectionId)
        ? wsSeed.output
        : '';

      let grid = [];
      if (outGrid && typeof outGrid === 'string'){
        // parse simples: linhas com letras separadas por espaços ou coladas
        const lines = outGrid.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const rows = lines.slice(0, gridSize).map(l => l.replace(/\s+/g,''));
        grid = rows.map(r => r.split('').slice(0, gridSize));
      }

      // fallback: se não tem grid válido, cria grid aleatória só pra preencher (visual)
      if (!grid.length || grid.length !== gridSize){
        const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        grid = Array.from({length:gridSize}, () => Array.from({length:gridSize}, () => A[Math.floor(Math.random()*A.length)]));
      }

      return `
        <div class="page-head ws-head">
          <div>
            <h1 class="page-title">${$esc(p.title || '')}</h1>
            <div class="ws-meta">${$esc(p.meta || '')}</div>
          </div>
          <div class="page-no">p.${$esc(String(p.pageNo||''))}</div>
        </div>
        <div class="page-hr"></div>

        <div class="ws-box">
          ${tableGridHTML(grid)}
        </div>

        <div class="words-box">
          <div class="words-title">Palavras</div>
          ${wordsHTML(words)}
        </div>

        <div class="footer-note">Ilustração P&B: <b>${$esc(p.sectionTitle || '')}</b></div>
      `;
    };

    const paint = () => {
      if (!pages.length){
        pageInfo.textContent = 'Página 1/1';
        pageInner.innerHTML = `<div class="empty">Nenhum plano ainda. Abra o Cultural Agent e gere o plano.</div>`;
        return;
      }

      idx = clamp(idx, 0, pages.length-1);
      const p = pages[idx];
      pageInfo.textContent = `Página ${idx+1}/${pages.length}`;

      if (p.kind === 'cover') pageInner.innerHTML = renderCover(p);
      else if (p.kind === 'text') pageInner.innerHTML = renderTextPage(p);
      else pageInner.innerHTML = renderPuzzlePage(p);
    };

    const next = () => { idx++; paint(); };
    const prev = () => { idx--; paint(); };

    $('#bb_next').onclick = next;
    $('#bb_prev').onclick = prev;

    $('#bb_flip').onclick = () => {
      mode = 'flip';
      $('#bb_flip').classList.add('primary');
      $('#bb_spread').classList.remove('primary');
    };

    $('#bb_spread').onclick = () => {
      mode = 'spread';
      $('#bb_spread').classList.add('primary');
      $('#bb_flip').classList.remove('primary');
    };

    // swipe: folhear (um por gesto)
    let startX = 0;
    let tracking = false;
    pageInner.addEventListener('touchstart', (e) => {
      if (!e.touches?.length) return;
      tracking = true;
      startX = e.touches[0].clientX;
    }, { passive:true });

    pageInner.addEventListener('touchend', (e) => {
      if (!tracking) return;
      tracking = false;
      const endX = e.changedTouches?.[0]?.clientX ?? startX;
      const dx = endX - startX;
      if (Math.abs(dx) < 42) return;
      if (dx < 0) next(); else prev();
    }, { passive:true });

    $('#bb_open_agent').onclick = () => {
      const btn = document.querySelector('.navitem[data-view="cultural"]');
      btn?.click?.();
    };

    $('#bb_recreate').onclick = () => {
      // botão “PADRÃO”: chama o agent se existir
      try{
        const btn = document.querySelector('#ca_build');
        if (btn) btn.click();
        else this.app.toast?.('Abra o Cultural Agent e clique “Gerar Plano do Livro (MG)”', 'warn');
      } catch {
        this.app.toast?.('Falha ao recriar', 'err');
      }
    };

    $('#bb_download_plan').onclick = () => {
      if (!plan){ this.app.toast?.('Nenhum plano salvo', 'warn'); return; }
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
  }
}
