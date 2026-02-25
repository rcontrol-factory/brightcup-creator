/* FILE: /js/modules/wordsearch.js */
// Bright Cup Creator — Caça-Palavras (PADRÃO Produção)
// Gera grade REAL + gabarito (key) + salva puzzle completo para o Livro Cultural.

import { Storage } from '../core/storage.js';
import { generateWordSearch, normalizeWord } from '../core/wordsearch_gen.js';

function nowISO(){ return new Date().toISOString(); }

function normId(s){
  return String(s||'')
    .trim()
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'_')
    .replace(/^_+|_+$/g,'')
    .slice(0,80) || ('puzzle_' + Date.now());
}

function getPuzzlesMap(){
  return Storage.get('cultural:puzzles', {}); // {id: puzzleObj}
}
function setPuzzlesMap(map){
  Storage.set('cultural:puzzles', map || {});
}

export class WordSearchModule {
  constructor(app){ this.app=app; this.id='wordsearch'; this.title='Caça-Palavras'; }
  async init(){}

  render(root){
    root.innerHTML = `
      <div class="grid">
        <div class="card">
          <h2>Caça-Palavras (Produção)</h2>
          <p class="muted">
            Aqui é a <b>máquina</b> oficial: gera grade + gabarito e salva puzzle pronto para o livro.
            <br/>Dois presets Brasil: <b>13x13</b> (revistinha) e <b>15x15</b> (plus).
          </p>

          <div class="row">
            <label>Preset</label>
            <select id="ws_preset">
              <option value="BR_POCKET">Brasil — Pocket (13x13 / 16 palavras)</option>
              <option value="BR_PLUS" selected>Brasil — Plus (15x15 / 18 palavras)</option>
              <option value="CUSTOM">Custom (manual)</option>
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
              <option value="18" selected>18</option>
              <option value="20">20</option>
            </select>

            <label>ID do puzzle (para livro)</label>
            <input id="ws_pid" placeholder="ex: fe_religiosidade (ou deixa vazio)" />

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
            <button class="btn" id="ws_save_proj">Salvar Projeto</button>
          </div>

          <p class="muted" id="ws_hint"></p>
        </div>

        <div class="card">
          <h2>Resultado (Grade)</h2>
          <pre id="ws_out" class="pre"></pre>
        </div>

        <div class="card">
          <h2>Gabarito (Key)</h2>
          <pre id="ws_key" class="pre"></pre>
        </div>
      </div>
    `;

    const $ = (sel)=>root.querySelector(sel);
    const out = $('#ws_out');
    const key = $('#ws_key');
    const hint = $('#ws_hint');

    let last = null;

    const applyPreset = () => {
      const p = $('#ws_preset').value;
      if(p === 'BR_POCKET'){
        $('#ws_size').value = '13';
        $('#ws_max').value = '16';
      } else if(p === 'BR_PLUS'){
        $('#ws_size').value = '15';
        $('#ws_max').value = '18';
      }
    };

    $('#ws_preset').onchange = () => {
      applyPreset();
      hint.textContent = '';
    };

    // Seed vindo do Builder (ou de outro fluxo)
    const seed = Storage.get('wordsearch:seed', null);
    if(seed && typeof seed === 'object'){
      // preset
      const preset = seed.preset || 'BR_PLUS';
      $('#ws_preset').value = (preset === 'BR_POCKET' || preset === 'BR_PLUS') ? preset : 'CUSTOM';
      applyPreset();

      if(seed.size) $('#ws_size').value = String(seed.size);
      if(seed.maxWords) $('#ws_max').value = String(seed.maxWords);

      if(seed.words){
        $('#ws_words').value = String(seed.words).trim();
      }

      const t = seed.title || '';
      const sid = seed.puzzleId || seed.sectionId || seed.sectionTitle || '';
      $('#ws_title').value = t;
      $('#ws_pid').value = sid ? normId(sid) : '';

      hint.textContent = `Recebido do Builder ✅ (${seed.sectionTitle ? seed.sectionTitle : 'seed'}) — agora clique "Gerar".`;

      // não apaga seed automaticamente (pra não perder se travar)
    }

    const generate = () => {
      const N = parseInt($('#ws_size').value, 10);
      const maxWords = parseInt($('#ws_max').value, 10);

      const wordsRaw = $('#ws_words').value.split(/\n+/).map(s=>s.trim()).filter(Boolean);
      const gen = generateWordSearch({
        size: N,
        words: wordsRaw,
        maxWords: maxWords,
        allowDiagonal: true,
        allowBackwards: true
      });

      last = gen;

      out.textContent = gen.gridText + (gen.skipped && gen.skipped.length ? `\n\n[Não coube]: ${gen.skipped.join(', ')}` : '');
      key.textContent = gen.keyText;

      const placedCount = (gen.placed||[]).length;
      hint.textContent = `OK ✅ size=${gen.size} • palavras usadas=${gen.words.length} • colocadas=${placedCount}` +
        (gen.skipped.length ? ` • não couberam=${gen.skipped.length}` : '');

      try { this.app.log?.(`[WS] gen size=${gen.size} words=${gen.words.length} placed=${placedCount} skipped=${gen.skipped.length}`); } catch {}
    };

    const savePuzzle = () => {
      if(!last){
        this.app.toast?.('Gere primeiro ✅');
        return;
      }

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

      this.app.toast?.('Puzzle salvo no Livro ✅');
      try { this.app.log?.(`[WS] saved puzzle id=${puzzleId} size=${last.size} words=${last.words.length}`); } catch {}
    };

    $('#ws_make').onclick = () => generate();

    $('#ws_save_puzzle').onclick = () => savePuzzle();

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

    // default preset apply
    applyPreset();
  }
}
