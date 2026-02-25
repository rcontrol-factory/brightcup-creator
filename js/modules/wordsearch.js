/* FILE: /js/modules/wordsearch.js */
import { Storage } from '../core/storage.js';

function randInt(n){ return Math.floor(Math.random()*n); }
function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j=randInt(i+1); [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}

function normalizeWord(s){
  return String(s||'')
    .trim()
    .toUpperCase()
    .replace(/\s+/g,'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'') // remove acentos
    .replace(/[^A-Z0-9]/g,''); // keep A-Z 0-9
}

function placeWord(grid, word){
  const N = grid.length;
  const dirs = shuffle([
    [1,0],[0,1],[1,1],[-1,0],[0,-1],[-1,-1],[1,-1],[-1,1]
  ]);
  word = normalizeWord(word);
  if(!word) return null;

  for(let attempt=0; attempt<350; attempt++){
    const [dx,dy] = dirs[randInt(dirs.length)];
    const x0 = randInt(N);
    const y0 = randInt(N);

    const x1 = x0 + dx*(word.length-1);
    const y1 = y0 + dy*(word.length-1);
    if(x1<0||x1>=N||y1<0||y1>=N) continue;

    let ok=true;
    for(let i=0;i<word.length;i++){
      const x = x0 + dx*i;
      const y = y0 + dy*i;
      const c = grid[y][x];
      if(c && c !== word[i]){ ok=false; break; }
    }
    if(!ok) continue;

    for(let i=0;i<word.length;i++){
      const x = x0 + dx*i;
      const y = y0 + dy*i;
      grid[y][x] = word[i];
    }
    return { word, start:{x:x0,y:y0}, dir:{dx,dy} };
  }
  return null;
}

function fillRandom(grid){
  const letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for(let y=0;y<grid.length;y++){
    for(let x=0;x<grid.length;x++){
      if(!grid[y][x]) grid[y][x]=letters[randInt(letters.length)];
    }
  }
}

function gridToText(grid){
  return grid.map(r=>r.join(' ')).join('\n');
}

function formatWordList(words){
  const clean = words.map(normalizeWord).filter(Boolean);
  const mid = Math.ceil(clean.length/2);
  const left = clean.slice(0, mid);
  const right = clean.slice(mid);
  const rows = Math.max(left.length, right.length);
  const colW = Math.max(...clean.map(w=>w.length), 8) + 2;

  const pad = (s,n)=> (s||'').padEnd(n,' ');
  let out = '';
  for(let i=0;i<rows;i++){
    out += pad(left[i]||'', colW) + (right[i]||'') + '\n';
  }
  return out.trimEnd();
}

const PRESETS = [
  { id:'BR_POCKET', name:'Brasil • Revistinha pequena (padrão)', size:13, note:'13x13 • bom para livretos pequenos e rápidos' },
  { id:'BR_MED', name:'Brasil • Médio', size:15, note:'15x15 • mais palavras / mais espaço' },
  { id:'KDP_LETTER', name:'KDP • Letter 8.5×11 (futuro PDF)', size:17, note:'17x17 • pensado pra página grande' },
];

export class WordSearchModule {
  constructor(app){ this.app=app; this.id='wordsearch'; this.title='Caça-Palavras'; }
  async init(){}

  render(root){
    const seed = Storage.get('wordsearch:seed', {
      title: 'Caça-Palavras',
      preset: 'BR_POCKET',
      size: 13,
      includeKey: true,
      words: 'ELEFANTE\nLEAO\nJUNGLE\nFLORESTA\nTIGRE\nMACACO\nGIRAFA\nZEBRA\nPANTERA\nTUCANO\nCOBRA\nRINOCERONTE',
      output: ''
    });

    const presetObj = PRESETS.find(p=>p.id===seed.preset) || PRESETS[0];
    const defaultSize = parseInt(seed.size||presetObj.size,10);

    root.innerHTML = `
      <div class="grid">
        <div class="card">
          <h2>Caça-Palavras</h2>
          <p class="muted">
            Padrão pronto (Brasil) para você gerar e vender. Exportação PDF profissional entra na FASE 4.
          </p>

          <div class="row">
            <label>Preset (padrão)
              <select id="ws_preset">
                ${PRESETS.map(p=>`<option value="${p.id}" ${p.id===presetObj.id?'selected':''}>${p.name}</option>`).join('')}
              </select>
              <div class="muted" style="margin-top:6px" id="ws_preset_note">${presetObj.note}</div>
            </label>

            <label>Tamanho (grade)
              <select id="ws_size">
                ${[11,13,15,17,19].map(n=>`<option value="${n}" ${n===defaultSize?'selected':''}>${n}x${n}</option>`).join('')}
              </select>
            </label>
          </div>

          <div class="row">
            <label>Título do jogo
              <input id="ws_title" value="${escapeHtml(seed.title||'Caça-Palavras')}" />
            </label>

            <label style="display:flex; align-items:center; gap:10px; margin-top:22px;">
              <input type="checkbox" id="ws_key" ${seed.includeKey?'checked':''} />
              <span>Incluir “Gabarito” (posições)</span>
            </label>
          </div>

          <label>Palavras (uma por linha)
            <textarea id="ws_words" rows="9" placeholder="ELEFANTE&#10;LEAO&#10;...">${escapeHtml(seed.words||'')}</textarea>
          </label>

          <div class="row">
            <button class="btn primary" id="ws_make">Gerar</button>
            <button class="btn" id="ws_save">Salvar Projeto</button>
          </div>
        </div>

        <div class="card">
          <h2>Resultado (pronto pra copiar)</h2>
          <pre id="ws_out" class="pre"></pre>
        </div>
      </div>
    `;

    const $ = (sel)=>root.querySelector(sel);
    const out = $('#ws_out');
    if(seed.output) out.textContent = seed.output;

    function applyPreset(pid){
      const p = PRESETS.find(x=>x.id===pid) || PRESETS[0];
      $('#ws_preset_note').textContent = p.note;
      $('#ws_size').value = String(p.size);
    }

    $('#ws_preset').addEventListener('change', (e)=>applyPreset(e.target.value));

    $('#ws_make').onclick = () => {
      const preset = $('#ws_preset').value;
      const N = parseInt($('#ws_size').value,10);
      const title = ($('#ws_title').value||'Caça-Palavras').trim();
      const includeKey = !!$('#ws_key').checked;

      const rawWords = ($('#ws_words').value||'')
        .split(/\r?\n+/)
        .map(s=>s.trim())
        .filter(Boolean);

      const words = rawWords.map(normalizeWord).filter(Boolean);

      const grid = Array.from({length:N},()=>Array.from({length:N},()=>'')); 
      const placedInfo=[]; const skipped=[];
      for(const w of words){
        const info = placeWord(grid,w);
        if(info) placedInfo.push(info);
        else skipped.push(normalizeWord(w));
      }

      fillRandom(grid);

      const listText = formatWordList(words);
      let txt = '';
      txt += title.toUpperCase() + '\n';
      txt += '-'.repeat(Math.max(12, title.length)) + '\n\n';
      txt += gridToText(grid) + '\n\n';
      txt += 'PALAVRAS\n';
      txt += listText + '\n';

      if(skipped.filter(Boolean).length){
        txt += '\n[NAO COUBE]: ' + skipped.filter(Boolean).join(', ') + '\n';
      }

      if(includeKey){
        txt += '\nGABARITO (posicoes)\n';
        const dirName = (d)=>{
          const {dx,dy}=d;
          if(dx===1&&dy===0) return '→';
          if(dx===-1&&dy===0) return '←';
          if(dx===0&&dy===1) return '↓';
          if(dx===0&&dy===-1) return '↑';
          if(dx===1&&dy===1) return '↘';
          if(dx===-1&&dy===-1) return '↖';
          if(dx===1&&dy===-1) return '↗';
          if(dx===-1&&dy===1) return '↙';
          return `${dx},${dy}`;
        };
        const keyLines = placedInfo.map(p=>`${p.word} @ (${p.start.x+1},${p.start.y+1}) ${dirName(p.dir)}`);
        txt += keyLines.join('\n') + '\n';
      }

      out.textContent = txt;

      const save = {
        title, preset, size:N, includeKey,
        words: $('#ws_words').value,
        output: txt,
        ts: Date.now()
      };
      Storage.set('wordsearch:seed', save);
      this.app.toast('Gerado ✅');
      this.app.log?.(`[WS] generated preset=${preset} size=${N} words=${words.length}`);
    };

    $('#ws_save').onclick = () => {
      const proj = {
        type:'wordsearch',
        ts:Date.now(),
        preset: $('#ws_preset').value,
        size: parseInt($('#ws_size').value,10),
        title: ($('#ws_title').value||'Caça-Palavras').trim(),
        includeKey: !!$('#ws_key').checked,
        words: $('#ws_words').value,
        output: out.textContent
      };
      Storage.set('wordsearch:seed', proj);
      this.app.saveProject(proj);
      this.app.toast('Projeto salvo ✅');
    };
  }
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'
  }[c]));
}
