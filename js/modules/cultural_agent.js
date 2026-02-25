/* FILE: /js/modules/cultural_agent.js */
// Bright Cup Creator — Cultural Agent (Manual Mode) v0.1 SAFE
// Objetivo: gerar estrutura cultural + lista de palavras (sem API) para revistinha.
// - Input: lugar (ex: "Governador Valadares - MG") + modo (cidade/estado/brasil)
// - Output: texto curto (curiosidades/estrutura) + word list pronta pro Caça-Palavras
// - Botão "Aplicar no Caça-Palavras": salva em Storage no formato do wordsearch e pronto.
// NOTE: sem depender de navegação automática (pra não quebrar). Você abre Caça-Palavras e gera.

import { Storage } from '../core/storage.js';

const $esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));

function normalizeWord(s){
  return String(s || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g,'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'') // remove acentos
    .replace(/[^A-Z0-9]/g,''); // A-Z 0-9
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

function pickWordsForGrid(words, gridSize){
  // Regra prática: para 13x13, melhor 16-24 palavras, max len <= 13
  const maxLen = gridSize;
  const filtered = uniq(words).filter(w => w.length >= 3 && w.length <= maxLen);
  // prioriza 4-11 letras
  filtered.sort((a,b) => (Math.abs(a.length-7) - Math.abs(b.length-7)));
  return filtered.slice(0, gridSize <= 13 ? 22 : 28);
}

// Pacotes internos (MVP) — expandimos depois via /data/wordbanks_br.json
const PACKS = {
  // Piloto: Governador Valadares / Rio Doce / Ibituruna
  VALADARES_MG: {
    label: 'Governador Valadares (MG) — Piloto',
    words: [
      'VALADARES','IBITURUNA','PICO','RIODOCE','MINAS','MINEIRO','CULTURA','HISTORIA',
      'FERROVIA','TREM','TRILHO','MINERIO','VALE','ACOVALE','RIO','SERRA','PONTE',
      'VIAGEM','ESTACAO','PORTO','VITORIA','LINHARES'
    ],
    facts: [
      { t:'Pico do Ibituruna', p:'Símbolo da cidade e referência nacional para voo livre. Vista marcante do Vale do Rio Doce.' },
      { t:'Vale do Rio Doce', p:'Região histórica ligada a rotas, economia e paisagens do leste de Minas Gerais.' },
      { t:'Conexões e viagem', p:'Rodoviária, rotas regionais e deslocamentos fazem parte do cotidiano e do turismo local.' }
    ]
  },

  MINAS_GERAIS: {
    label: 'Minas Gerais (geral)',
    words: [
      'MINAS','MINEIRO','QUEIJO','CAFE','SERRAS','HISTORIA','CULTURA','ARTE','IGREJA',
      'OURO','MINERIO','FERRO','TREM','ESTACAO','ESTRADA','PATRIMONIO','TRADICAO'
    ],
    facts: [
      { t:'Cultura mineira', p:'Culinária, tradição e hospitalidade são marcas fortes. Queijo e café aparecem em muitas histórias do estado.' },
      { t:'Patrimônio histórico', p:'Minas tem cidades históricas, igrejas e tradições que ajudam a contar a formação do Brasil.' }
    ]
  },

  TRANSPORTE_BR: {
    label: 'Brasil — Rodoviária & Viagem',
    words: [
      'ONIBUS','RODOVIARIA','VIAGEM','DESTINO','MAPA','BAGAGEM','PASSAGEM','PLATAFORMA',
      'ESTACAO','TREM','TRILHO','ESTRADA','PONTE','TUNEL','RETORNO','ROTA'
    ],
    facts: [
      { t:'Viagens no Brasil', p:'Rodoviárias e rotas regionais conectam cidades e estados — cenário perfeito para revistinhas de passatempo.' }
    ]
  }
};

function buildManualCultural({ place, scope, tone }) {
  const placeClean = String(place || '').trim();
  const title =
    scope === 'cidade' ? `Revistinha Cultural — ${placeClean}` :
    scope === 'estado' ? `Curiosidades do Estado — ${placeClean}` :
    `Curiosidades do Brasil — edição ${placeClean || 'geral'}`;

  const intro =
    tone === 'nostalgico'
      ? `Uma revistinha de curiosidades e passatempo para resgatar a cultura: fatos curtos, palavras e diversão.`
      : `Edição cultural com curiosidades e passatempo. Conteúdo curto, objetivo e vendável em viagem, rodoviária e trem.`;

  // Estrutura base (sem pesquisa)
  const sections = [
    { title:'Curiosidade 1', text:`Fato curto sobre ${placeClean || 'o tema'}. (MVP manual — depois entra modo IA/opcional)` },
    { title:'Curiosidade 2', text:`Ponto histórico/turístico relacionado a ${placeClean || 'o tema'}.` },
    { title:'Curiosidade 3', text:`Elemento cultural: comida típica, tradição, ou detalhe interessante de ${placeClean || 'o tema'}.` }
  ];

  return { title, intro, sections };
}

function renderCulturalText(doc){
  const lines = [];
  lines.push(doc.title.toUpperCase());
  lines.push('-'.repeat(Math.max(18, doc.title.length)));
  lines.push('');
  lines.push(doc.intro);
  lines.push('');
  for (const s of doc.sections){
    lines.push(`• ${s.title}`);
    lines.push(`  ${s.text}`);
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}

export class CulturalAgentModule {
  constructor(app){
    this.app = app;
    this.id = 'cultural';
    this.title = 'Cultural Agent';
  }

  async init(){}

  render(root){
    const seed = Storage.get('cultural:seed', {
      place: 'Governador Valadares - MG',
      scope: 'cidade',   // cidade | estado | brasil
      tone: 'premium',   // premium | nostalgico
      pack: 'VALADARES_MG',
      grid: 13,
      docText: '',
      wordsText: ''
    });

    root.innerHTML = `
      <div class="grid">
        <div class="card">
          <h2>Cultural Agent</h2>
          <p class="muted">
            Gere conteúdo + palavras para revistinha (sem API). Use como base para Caça-Palavras e depois (futuro) páginas explicativas.
          </p>

          <div class="row">
            <label>Local / tema
              <input id="ca_place" value="${$esc(seed.place)}" placeholder="ex: Governador Valadares - MG" />
            </label>

            <label>Escopo
              <select id="ca_scope">
                <option value="cidade" ${seed.scope==='cidade'?'selected':''}>Cidade / Município</option>
                <option value="estado" ${seed.scope==='estado'?'selected':''}>Estado</option>
                <option value="brasil" ${seed.scope==='brasil'?'selected':''}>Brasil (mix)</option>
              </select>
            </label>
          </div>

          <div class="row">
            <label>Estilo do texto
              <select id="ca_tone">
                <option value="premium" ${seed.tone==='premium'?'selected':''}>Premium (objetivo)</option>
                <option value="nostalgico" ${seed.tone==='nostalgico'?'selected':''}>Nostálgico (revistinha raiz)</option>
              </select>
            </label>

            <label>Pacote (MVP)
              <select id="ca_pack">
                ${Object.keys(PACKS).map(k => `<option value="${k}" ${seed.pack===k?'selected':''}>${$esc(PACKS[k].label)}</option>`).join('')}
              </select>
            </label>
          </div>

          <div class="row">
            <label>Grade do caça-palavras
              <select id="ca_grid">
                ${[11,13,15,17].map(n=>`<option value="${n}" ${Number(seed.grid)===n?'selected':''}>${n}x${n}</option>`).join('')}
              </select>
              <div class="muted" style="margin-top:6px">Obs: grade é quantidade de letras (não é cm/inch). PDF entra na FASE 4.</div>
            </label>
          </div>

          <div class="row">
            <button class="btn primary" id="ca_generate">Gerar Conteúdo + Palavras</button>
            <button class="btn" id="ca_apply_ws">Aplicar no Caça-Palavras</button>
          </div>

          <div class="row">
            <button class="btn" id="ca_save">Salvar Projeto</button>
            <button class="btn" id="ca_copy">Copiar Tudo</button>
          </div>

        </div>

        <div class="card">
          <h2>Texto cultural (base)</h2>
          <pre id="ca_doc" class="pre"></pre>
        </div>

        <div class="card">
          <h2>Palavras (prontas)</h2>
          <p class="muted">Uma por linha (normalizadas, sem acento). Ideal para revistinha.</p>
          <textarea id="ca_words" rows="12" style="width:100%"></textarea>
        </div>
      </div>
    `;

    const $ = (s)=>root.querySelector(s);
    const docEl = $('#ca_doc');
    const wordsEl = $('#ca_words');

    if (seed.docText) docEl.textContent = seed.docText;
    if (seed.wordsText) wordsEl.value = seed.wordsText;

    const saveSeed = () => {
      const updated = {
        place: $('#ca_place').value,
        scope: $('#ca_scope').value,
        tone: $('#ca_tone').value,
        pack: $('#ca_pack').value,
        grid: parseInt($('#ca_grid').value,10),
        docText: docEl.textContent || '',
        wordsText: wordsEl.value || ''
      };
      Storage.set('cultural:seed', updated);
      return updated;
    };

    $('#ca_generate').onclick = () => {
      const place = $('#ca_place').value.trim();
      const scope = $('#ca_scope').value;
      const tone  = $('#ca_tone').value;
      const packKey = $('#ca_pack').value;
      const grid = parseInt($('#ca_grid').value,10);

      const base = buildManualCultural({ place, scope, tone });

      // Injeta fatos do pack (se existir) em vez de placeholders
      const pack = PACKS[packKey];
      if (pack?.facts?.length) {
        base.sections = pack.facts.map(f => ({
          title: f.t,
          text: f.p
        }));
      }

      const docText = renderCulturalText(base);

      // Palavras: mistura pack + tokens do local
      const tokens = place.split(/[\s,;:\-_/]+/g).filter(Boolean);
      const words = []
        .concat(pack?.words || [])
        .concat(tokens)
        .concat(['CULTURA','HISTORIA','CURIOSIDADE','BRASIL']);

      const picked = pickWordsForGrid(words, grid);
      const wordsText = picked.join('\n');

      docEl.textContent = docText;
      wordsEl.value = wordsText;

      saveSeed();
      this.app.toast?.('Gerado ✅');
      this.app.log?.(`[CULT] generated pack=${packKey} grid=${grid} words=${picked.length}`);
    };

    $('#ca_apply_ws').onclick = () => {
      const place = $('#ca_place').value.trim();
      const grid = parseInt($('#ca_grid').value,10);

      const words = (wordsEl.value || '').split(/\r?\n+/).map(s=>s.trim()).filter(Boolean);
      const picked = pickWordsForGrid(words, grid);

      // salva no formato que o wordsearch usa
      const ws = {
        title: place ? `Caça-Palavras — ${place}` : 'Caça-Palavras',
        preset: 'BR_POCKET',
        size: grid,
        includeKey: true,
        words: picked.join('\n'),
        output: '',
        ts: Date.now()
      };
      Storage.set('wordsearch:seed', ws);

      saveSeed();
      this.app.toast?.('Aplicado no Caça-Palavras ✅ (abra o módulo Caça-palavras e clique Gerar)');
      this.app.log?.(`[CULT] applied to wordsearch size=${grid} words=${picked.length}`);
    };

    $('#ca_save').onclick = () => {
      const s = saveSeed();
      const proj = {
        type: 'cultural',
        ts: Date.now(),
        ...s
      };
      Storage.set('cultural:seed', s);
      this.app.saveProject?.(proj);
      this.app.toast?.('Projeto salvo ✅');
    };

    $('#ca_copy').onclick = async () => {
      const txt =
        (docEl.textContent || '').trim() +
        '\n\n' +
        'PALAVRAS\n' +
        '-------\n' +
        (wordsEl.value || '').trim() +
        '\n';
      try {
        await navigator.clipboard.writeText(txt);
        this.app.toast?.('Copiado ✅');
      } catch {
        this.app.toast?.('Falha ao copiar', 'err');
      }
    };
  }
}
