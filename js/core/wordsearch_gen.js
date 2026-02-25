/* FILE: /js/core/wordsearch_gen.js
   Bright Cup Creator — WordSearch Generator (PADRÃO 1 ano)
   - Gera grade + posições + gabarito (key)
   - Mantém simples, rápido, mobile-safe
*/

function randInt(n){ return Math.floor(Math.random() * n); }
function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = randInt(i+1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function normalizeWord(s){
  return String(s || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g,'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')   // remove acentos
    .replace(/[^A-Z0-9]/g,'');                         // só A-Z0-9
}

export function uniqWords(list){
  const seen = new Set();
  const out = [];
  for(const it of list || []){
    const w = normalizeWord(it);
    if(!w) continue;
    if(seen.has(w)) continue;
    seen.add(w);
    out.push(w);
  }
  return out;
}

function makeEmptyGrid(N){
  return Array.from({length:N}, ()=>Array.from({length:N}, ()=>'')); // [y][x]
}

function placeWordWithTrace(grid, word, dirs, maxTries=240){
  const N = grid.length;
  const w = normalizeWord(word);
  if(!w) return null;

  const tryDirs = shuffle(dirs.slice());
  for(const [dx,dy] of tryDirs){
    for(let tries=0; tries<maxTries; tries++){
      const x0 = randInt(N), y0 = randInt(N);
      const x1 = x0 + dx*(w.length-1);
      const y1 = y0 + dy*(w.length-1);
      if(x1<0||x1>=N||y1<0||y1>=N) continue;

      let ok = true;
      for(let k=0;k<w.length;k++){
        const x = x0 + dx*k, y = y0 + dy*k;
        const ch = grid[y][x];
        if(ch !== '' && ch !== w[k]) { ok=false; break; }
      }
      if(!ok) continue;

      const cells = [];
      for(let k=0;k<w.length;k++){
        const x = x0 + dx*k, y = y0 + dy*k;
        grid[y][x] = w[k];
        cells.push([x,y]);
      }
      return { word:w, x0, y0, dx, dy, cells };
    }
  }
  return null;
}

function fillRandom(grid){
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for(let y=0;y<grid.length;y++){
    for(let x=0;x<grid.length;x++){
      if(!grid[y][x]) grid[y][x] = letters[randInt(letters.length)];
    }
  }
}

export function gridToText(grid){
  return grid.map(r => r.join(' ')).join('\n');
}

export function keyToText(key){
  return key.map(r => r.join(' ')).join('\n');
}

export function makeKeyGrid(N, placed){
  const key = Array.from({length:N}, ()=>Array.from({length:N}, ()=>'.'));
  for(const p of placed || []){
    for(const [x,y] of p.cells || []){
      key[y][x] = '#';
    }
  }
  return key;
}

export function generateWordSearch(opts={}){
  const N = Math.max(8, Math.min(30, Number(opts.size || 15)));
  const allowDiagonal = opts.allowDiagonal !== false;
  const allowBackwards = opts.allowBackwards !== false;

  const baseDirs = [[1,0],[0,1],[-1,0],[0,-1]];
  const diagDirs = [[1,1],[-1,-1],[1,-1],[-1,1]];

  let dirs = baseDirs.slice();
  if(allowDiagonal) dirs = dirs.concat(diagDirs);

  if(!allowBackwards){
    dirs = dirs.filter(([dx,dy]) => dx>=0 && dy>=0 && !(dx===0 && dy===0));
    if(!dirs.length) dirs = [[1,0],[0,1],[1,1]];
  }

  const raw = Array.isArray(opts.words) ? opts.words : String(opts.words||'').split(/\n+/);
  let words = uniqWords(raw).filter(w => w.length >= 3 && w.length <= N);

  words.sort((a,b)=> b.length - a.length);

  const maxWords = Math.max(6, Math.min(words.length, Number(opts.maxWords || words.length)));
  words = words.slice(0, maxWords);

  const grid = makeEmptyGrid(N);
  const placed = [];
  const skipped = [];

  for(const w of words){
    const res = placeWordWithTrace(grid, w, dirs, 260);
    if(res) placed.push(res);
    else skipped.push(w);
  }

  fillRandom(grid);

  const key = makeKeyGrid(N, placed);

  return {
    size: N,
    words,
    placed: placed.map(p => ({ word:p.word, x0:p.x0, y0:p.y0, dx:p.dx, dy:p.dy, cells:p.cells })),
    skipped,
    grid,
    gridText: gridToText(grid),
    key,
    keyText: keyToText(key)
  };
}
