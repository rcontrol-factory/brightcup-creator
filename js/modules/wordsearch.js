//* FILE: /js/modules/wordsearch.js */
// Bright Cup Creator — Caça-Palavras (Produção PADRÃO 1 ano)
// - Gera grade REAL + gabarito (key)
// - Dois presets Brasil: Pocket (13x13/16) e Plus (15x15/20)
// - Recebe seed do Builder (wordsearch:seed)
// - Salva puzzle completo em cultural:puzzles
// - Se veio do Builder, vincula no plano cultural (cultural:book_plan) para Exporter usar depois

import { Storage } from '../core/storage.js';
import { generateWordSearch, normalizeWord, uniqWords } from '../core/wordsearch_gen.js';

function nowISO(){ return new Date().toISOString(); }

function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
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
function setPuzzlesMap(map){
  Storage.set('cultural:puzzles', map || {});
}

function getPlan(){
  return Storage.get('cultural:book_plan', null);
}
function setPlan(plan){
  Storage.set('cultural:book_plan', plan);
}

const PRESETS = {
  BR_POCKET: { label:'Brasil — Pocket (13x13 / 16 palavras)', size:13, maxWords:16 },
  BR_PLUS:   { label:'Brasil — Plus (15x15 / 20 palavras)',   size:15, maxWords:20 }
};

function cleanWordsForSize(rawLines, N){
  const raw = Array.isArray(rawLines) ? rawLines : String(rawLines||'').split(/\n+/);
  // uniqWords já normaliza + remove duplicadas
  const uniq = uniqWords(raw);
  // filtra por tamanho compatível
  const ok = uniq.filter(w => w.length >= 3 && w.length <= N);
  // prioriza palavras maiores primeiro (melhor distribuição)
  ok.sort((a,b)=> b.length - a.length);
  return ok;
}

function summarizeInput(wordsRaw, N){
  const raw = Array.isArray(wordsRaw) ? wordsRaw : String(wordsRaw||'').split(/\n+/);
  const normalized = raw.map(s => normalizeWord(s)).filter(Boolean);
  const unique = Array.from(new Set(normalized));
  const tooLong = unique.filter(w => w.length > N);
  const tooShort = unique.filter(w => w.length < 3);
  const ok = unique.filter(w => w.length >= 3 && w.length <= N);
  return { total: raw.filter(Boolean).length, unique: unique.length, ok: ok.length, tooLong: tooLong.length, tooShort: tooShort.length };
}

export class WordSearchModule {
  constructor(app){ this.app=app; this.id='wordsearch'; this.title='Caça-Palavras'; }
  async init(){}

  render(root){
    root.innerHTML = `
      <style>
        .ws-grid{ display:grid; gap:14px; }
        .ws-top pre.pre{
          white-space:pre;
          overflow:auto;
          -webkit-overflow-scrolling:touch;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: 13px;
          line-height: 1.25;
        }
        .ws-note{ font-size:12px; opacity:.78; }
        .ws-badge{
          display:inline-flex; align-items:center; gap:8px;
          border:1px solid rgba(255,255,255,.10);
          background:rgba(0,0,0,.18);
          border-radius:999px;
          padding:8px 12px;
          font-size:12px;
        }
        .ws-badge b{ opacity:1; }
      </style>

      <div class="ws-grid">
        <div class="card">
          <h2>Caça-Palavras (Produção)</h2>
          <p class="muted">
            Aqui é a <b>máquina oficial</b>: gera grade + gabarito e salva puzzle pronto pro livro.
            <br/>Presets Brasil: <b>13x13 Pocket</b> (revistinha) e <b>15x15 Plus</b> (premium).
          </p>

          <div class="row">
            <label>Preset</label>
            <select id="ws_preset">
              <option value="BR_POCKET">${esc(PRESETS.BR_POCKET.label)}</option>
              <option value="BR_PLUS" selected>${esc(PRESETS.BR_PLUS.label)}</option>
              <option value="CUSTOM">Custom</option>
            </select>

            <label>Tamanho</label>
            <select id="ws_size">
              <option value="10">10x10</option>
              <option value="12">12x12</option>
              <option value="13">13x13</option>
              <option value="15" selected>15x15</option>
              <option value="18">18x18</option>
            </select>

            <label>Máx. palavras</label>
            <select id="ws_max">
              <option value="12">12</option>
              <option value="16">16</option>
              <option value="18">18</option>
              <option value="20" selected>20</option>
            </select>

            <label>ID do puzzle (Livro)</label>
            <input id="ws_pid" placeholder="ex: fe_religiosidade" />

            <label>Título (opcional)</label>
            <input id="ws_title" placeholder="ex: Caça-Palavras — Fé e religiosidade" />
          </div>

          <div class="row">
            <label>Palavras (uma por linha)</label>
            <textarea id="ws_words" rows="10" placeholder="MINAS&#10;HISTORIA&#10;CULTURA&#10;..."></textarea>
          </div>

          <div class="row">
            <button class="btn primary" id="ws_make">Gerar (grade + gabarito)</button>
            <button class="btn" id="ws_save_puzzle">Salvar Puzzle do Livro</button>
            <button class="btn" id="ws_make_save">Gerar + Salvar (1 clique)</button>
            <button class="btn" id="ws_save_proj">Salvar Projeto</button>
          </div>

          <div class="row" style="justify-content:space-between; align-items:center;">
            <span class="ws-badge" id="ws_stats">Pronto.</span>
            <span class="ws-note muted" id="ws_hint"></span>
          </div>
        </div>

        <div class="card ws-top">
          <h2>Resultado (Grade)</h2>
          <pre id="ws_out" class="pre"></pre>
        </div>

        <div class="card ws-top">
          <h2>Gabarito (Key)</h2>
          <pre id="ws_key" class="pre"></pre>
        </div>
      </div>
    `;

    const $ = (sel)=>root.querySelector(sel);
    const out = $('#ws_out');
    const key = $('#ws_key');
    const hint = $('#ws_hint');
    const stats = $('#ws_stats');

    let last = null;
    let lastMeta = { seed: null, planLink: null };

    const setStats = (txt) => { stats.innerHTML = txt; };

    const applyPreset = () => {
      const p = $('#ws_preset').value;
      if (p === 'BR_POCKET'){
        $('#ws_size').value = String(PRESETS.BR_POCKET.size);
        $('#ws_max').value  = String(PRESETS.BR_POCKET.maxWords);
      } else if (p === 'BR_PLUS'){
        $('#ws_size').value = String(PRESETS.BR_PLUS.size);
        $('#ws_max').value  = String(PRESETS.BR_PLUS.maxWords);
      }
    };

    const refreshStats = () => {
      const N = parseInt($('#ws_size').value, 10);
      const summary = summarizeInput($('#ws_words').value, N);
      setStats(
        `Entrada: <b>${summary.total}</b> • Únicas: <b>${summary.unique}</b> • OK p/ ${N}x${N}: <b>${summary.ok}</b>` +
        (summary.tooLong ? ` • >${N}: <b>${summary.tooLong}</b>` : '') +
        (summary.tooShort ? ` • <3: <b>${summary.tooShort}</b>` : '')
      );
    };

    $('#ws_preset').onchange = () => { applyPreset(); hint.textContent=''; refreshStats(); };
    $('#ws_size').onchange = () => { if ($('#ws_preset').value !== 'CUSTOM') { /* mantém */ } hint.textContent=''; refreshStats(); };
    $('#ws_words').oninput = () => refreshStats();

    // Seed (vem do Builder)
    const seed = Storage.get('wordsearch:seed', null);
    if (seed && typeof seed === 'object'){
      lastMeta.seed = seed;

      const preset = seed.preset || 'BR_PLUS';
      $('#ws_preset').value = (preset === 'BR_POCKET' || preset === 'BR_PLUS') ? preset : 'CUSTOM';
      applyPreset();

      if (seed.size) $('#ws_size').value = String(seed.size);
      if (seed.maxWords) $('#ws_max').value = String(seed.maxWords);
      if (seed.words) $('#ws_words').value = String(seed.words).trim();

      const t = seed.title || '';
      const pid = seed.puzzleId || seed.sectionId || seed.sectionTitle || '';
      $('#ws_title').value = t;
      $('#ws_pid').value = pid ? normId(pid) : '';

      hint.textContent = `Recebido do Builder ✅ Agora clique "Gerar".`;
    } else {
      applyPreset();
      hint.textContent = '';
    }

    refreshStats();

    const generate = () => {
      const N = parseInt($('#ws_size').value, 10);
      let maxWords = parseInt($('#ws_max').value, 10);

      // trava de segurança
      if (!Number.isFinite(maxWords) || maxWords < 6) maxWords = 6;
      if (maxWords > 30) maxWords = 30;

      // limpa/normaliza (sem dor de cabeça)
      const wordsClean = cleanWordsForSize($('#ws_words').value, N);
      const used = wordsClean.slice(0, Math.min(wordsClean.length, maxWords));

      if (!used.length){
        this.app.toast?.('Nenhuma palavra válida (>=3 e <= tamanho) ❌');
        out.textContent = '';
        key.textContent = '';
        last = null;
        return null;
      }

      const gen = generateWordSearch({
        size: N,
        words: used,
        maxWords,
        allowDiagonal: true,
        allowBackwards: true
      });

      last = gen;

      out.textContent =
        gen.gridText +
        (gen.skipped?.length ? `\n\n[Não coube]: ${gen.skipped.join(', ')}` : '');

      key.textContent = gen.keyText;

      const placedCount = (gen.placed||[]).length;
      hint.textContent =
        `OK ✅ size=${gen.size} • palavras usadas=${gen.words.length} • colocadas=${placedCount}` +
        (gen.skipped.length ? ` • não couberam=${gen.skipped.length}` : '');

      try { this.app.log?.(`[WS] gen size=${gen.size} words=${gen.words.length} placed=${placedCount} skipped=${gen.skipped.length}`); } catch {}

      return gen;
    };

    const linkToPlanIfPossible = (puzzleId) => {
      try{
        const plan = getPlan();
        if (!plan || typeof plan !== 'object') return;

        const s = lastMeta.seed || {};
        const sectionKey = (s.sectionId || s.puzzleId || s.sectionTitle || '').trim();
        if (!sectionKey) return;

        // guarda refs num lugar “interno” (não quebra nada do plano)
        plan._puzzleRefs = plan._puzzleRefs || {};
        plan._puzzleRefs[normId(sectionKey)] = puzzleId;

        setPlan(plan);
        lastMeta.planLink = normId(sectionKey);

        try { this.app.log?.(`[WS] linked planRef ${lastMeta.planLink} -> puzzleId=${puzzleId}`); } catch {}
      } catch {}
    };

    const savePuzzle = () => {
      if(!last){ this.app.toast?.('Gere primeiro ✅'); return; }

      const title = ($('#ws_title').value || '').trim();
      const pidIn = ($('#ws_pid').value || '').trim();
      const puzzleId = pidIn ? normId(pidIn) : normId(title || ('puzzle_' + Date.now()));

      const map = getPuzzlesMap();

      map[puzzleId] = {
        id: puzzleId,
        title: title || `Caça-Palavras ${last.size}x${last.size}`,
        size: last.size,
        words: last.words,
        placed: last.placed,
        skipped: last.skipped,
        gridText: last.gridText,
        keyText: last.keyText,
        createdAt: nowISO()
      };

      setPuzzlesMap(map);

      // se veio do Builder, já liga no plano (pra export futuro)
      linkToPlanIfPossible(puzzleId);

      this.app.toast?.('Puzzle salvo no Livro ✅');
      try { this.app.log?.(`[WS] saved puzzle id=${puzzleId} size=${last.size} words=${last.words.length}`); } catch {}

      // limpa o seed pra não confundir depois (opcional, mas seguro)
      try { Storage.set('wordsearch:seed', null); } catch {}
    };

    $('#ws_make').onclick = () => { generate(); };
    $('#ws_save_puzzle').onclick = () => { savePuzzle(); };
    $('#ws_make_save').onclick = () => {
      const gen = generate();
      if (gen) savePuzzle();
    };

    $('#ws_save_proj').onclick = () => {
      const proj = {
        type:'wordsearch',
        ts:Date.now(),
        preset: $('#ws_preset').value,
        size: $('#ws_size').value,
        maxWords: $('#ws_max').value,
        puzzleId: ($('#ws_pid').value||'').trim(),
        title: ($('#ws_title').value||'').trim(),
        words: $('#ws_words').value,
        output: out.textContent,
        key: key.textContent
      };
      this.app.saveProject?.(proj);
      this.app.toast?.('Projeto salvo ✅');
    };
  }
}
