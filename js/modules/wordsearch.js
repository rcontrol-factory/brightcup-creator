import { Storage } from '../core/storage.js';

function randInt(n){ return Math.floor(Math.random()*n); }
function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j=randInt(i+1); [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}

function placeWord(grid, word){
  const N = grid.length;
  const dirs = shuffle([
    [1,0],[0,1],[1,1],[-1,0],[0,-1],[-1,-1],[1,-1],[-1,1]
  ]);
  word = word.toUpperCase().replace(/[^A-Z]/g,'');
  if(!word) return false;
  for(const [dx,dy] of dirs){
    for(let tries=0;tries<200;tries++){
      const x0=randInt(N), y0=randInt(N);
      const x1=x0+dx*(word.length-1), y1=y0+dy*(word.length-1);
      if(x1<0||x1>=N||y1<0||y1>=N) continue;
      let ok=true;
      for(let k=0;k<word.length;k++){
        const x=x0+dx*k, y=y0+dy*k;
        const ch=grid[y][x];
        if(ch!=='' && ch!==word[k]){ ok=false; break; }
      }
      if(!ok) continue;
      for(let k=0;k<word.length;k++){
        const x=x0+dx*k, y=y0+dy*k;
        grid[y][x]=word[k];
      }
      return true;
    }
  }
  return false;
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

export class WordSearchModule {
  constructor(app){ this.app=app; this.id='wordsearch'; this.title='Caça-Palavras'; }
  async init(){}

  render(root){
    root.innerHTML = `
      <div class="grid">
        <div class="card">
          <h2>Caça-Palavras (Offline)</h2>
          <p class="muted">Gera uma grade em texto (pode exportar para PDF depois). Mantém simples e rápido no celular.</p>
          <div class="row">
            <label>Tamanho</label>
            <select id="ws_size">
              <option value="10">10x10</option>
              <option value="12">12x12</option>
              <option value="15" selected>15x15</option>
              <option value="18">18x18</option>
            </select>
            <label>Palavras (uma por linha)</label>
            <textarea id="ws_words" rows="8" placeholder="ELEFANTE\nJUNGLE\nFLORESTA\n..."></textarea>
          </div>
          <div class="row">
            <button class="btn primary" id="ws_make">Gerar</button>
            <button class="btn" id="ws_save">Salvar Projeto</button>
          </div>
        </div>
        <div class="card">
          <h2>Resultado</h2>
          <pre id="ws_out" class="pre"></pre>
        </div>
      </div>
    `;

    const $ = (id)=>root.querySelector(id);
    const out = $('#ws_out');

    $('#ws_make').onclick = () => {
      const N = parseInt($('#ws_size').value,10);
      const words = $('#ws_words').value.split(/\n+/).map(s=>s.trim()).filter(Boolean);
      const grid = Array.from({length:N},()=>Array.from({length:N},()=>''));
      const placed=[]; const skipped=[];
      for(const w of words){
        (placeWord(grid,w) ? placed : skipped).push(w);
      }
      fillRandom(grid);
      out.textContent = gridToText(grid) + (skipped.length?`\n\n[Não coube]: ${skipped.join(', ')}`:'');
    };

    $('#ws_save').onclick = () => {
      const proj = {
        type:'wordsearch',
        ts:Date.now(),
        size: $('#ws_size').value,
        words: $('#ws_words').value,
        output: out.textContent
      };
      this.app.saveProject(proj);
      this.app.toast('Projeto salvo ✅');
    };
  }
}
