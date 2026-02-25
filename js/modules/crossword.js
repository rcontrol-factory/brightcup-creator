import { Storage } from '../core/storage.js';

/*
  Crossword MVP
  - Stores word/clue list and exports a JSON package
  - Full auto-layout can be added later without changing the storage schema
*/

export class CrosswordModule {
  constructor(app){ this.app=app; this.id='crossword'; this.title='Crossword'; }
  async init(){}
  render(root){
    const seed = Storage.get('crossword:seed', {
      title:'Crossword Kids',
      size:15,
      entries:[
        {answer:'ELEFANTE', clue:'Animal grande com tromba'},
        {answer:'LEAO', clue:'O rei da selva'}
      ]
    });

    root.innerHTML = `
      <div class="card">
        <h2>Palavras Cruzadas (MVP)</h2>
        <p class="muted">Aqui a gente já padroniza o formato (dados + export). O layout automático pode vir depois, sem quebrar nada.</p>
        <div class="row">
          <label>Título
            <input id="cw_title" value="${escapeHtml(seed.title)}" />
          </label>
          <label>Tamanho do grid
            <select id="cw_size">
              ${[11,13,15,17].map(n=>`<option ${seed.size===n?'selected':''} value="${n}">${n}x${n}</option>`).join('')}
            </select>
          </label>
        </div>
        <label>Entradas (1 por linha) — FORMATO: RESPOSTA | DICA
          <textarea id="cw_entries" rows="10">${seed.entries.map(e=>`${e.answer} | ${e.clue}`).join('\n')}</textarea>
        </label>
        <div class="row">
          <button class="btn" id="cw_save">Salvar</button>
          <button class="btn" id="cw_export">Exportar JSON</button>
        </div>
        <pre class="log" id="cw_out"></pre>
      </div>
    `;

    root.querySelector('#cw_save').onclick = ()=>{
      const title = root.querySelector('#cw_title').value.trim()||'Crossword';
      const size = parseInt(root.querySelector('#cw_size').value,10);
      const lines = root.querySelector('#cw_entries').value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
      const entries = lines.map(l=>{
        const [a,...rest] = l.split('|');
        return {answer:(a||'').trim().toUpperCase(), clue:(rest.join('|')||'').trim()};
      }).filter(e=>e.answer);
      const data = {title,size,entries};
      Storage.set('crossword:seed', data);
      root.querySelector('#cw_out').textContent = 'Salvo ✅ ('+entries.length+' entradas)';
    };

    root.querySelector('#cw_export').onclick = ()=>{
      const data = Storage.get('crossword:seed', seed);
      downloadFile('crossword.json', JSON.stringify(data,null,2));
      root.querySelector('#cw_out').textContent = 'Exportado ✅ crossword.json';
    };
  }
}

function downloadFile(name, content){
  const blob = new Blob([content], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'
  }[c]));
}
