/* FILE: /js/modules/cultural_agent.js */
// Bright Cup Creator — Cultural Agent (Book Planner) v0.2 SAFE
// Objetivo: planejar um livro cultural (6x9, 60p, PT-BR) com seções + palavras para puzzles 15x15.
// - Sem API (por enquanto)
// - Sem mexer no Coloring pipeline
// - Salva plano em Storage: cultural:book_plan
// - Pode aplicar uma seção no Caça-Palavras (wordsearch) para testar rápido

import { Storage } from '../core/storage.js';

const $esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));

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

function pickWordsForGrid(words, gridSize, maxCount){
  const maxLen = gridSize;
  const filtered = uniq(words).filter(w => w.length >= 3 && w.length <= maxLen);
  filtered.sort((a,b) => (Math.abs(a.length-7) - Math.abs(b.length-7)));
  return filtered.slice(0, maxCount);
}

function wrapLines(text, max=78){
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

function bookDefaultPlanMG(){
  // Livro 01 — Minas Gerais Cultural (PT-BR) — 6x9 — 60 páginas
  // 10 puzzles 15x15, com gabarito no final (fase PDF depois)
  return {
    meta: {
      id: 'MG_CULTURAL_BOOK_01',
      title: 'MINAS GERAIS CULTURAL',
      subtitle: 'História • Sabores • Tradições • Curiosidades • Caça-Palavras',
      format: '6x9',
      pages_target: 60,
      language: 'pt-BR',
      grid_default: 15,
      words_per_puzzle: 20,
      include_key: true,
      createdAt: new Date().toISOString()
    },
    // Ícones (line art) — por enquanto só referência de “tipo”
    // Depois podemos mapear isso para SVGs locais.
    sections: [
      {
        id:'intro_minas',
        icon:'mountain',
        title:'O que é Minas?',
        text:
          'Minas é serra no horizonte e café passado na hora. É conversa na porta, ' +
          'é tradição que atravessa gerações. Aqui, a cultura não é enfeite: é jeito de viver.',
        wordHints:[
          'MINAS','MINEIRO','SERRA','MONTANHA','CULTURA','HISTORIA','TRADICAO','ACOLHIMENTO','CAFE','FOGAO','INTERIOR'
        ]
      },
      {
        id:'origem_minas',
        icon:'history',
        title:'Como começou Minas',
        text:
          'A história de Minas se mistura com caminhos antigos, trabalho duro e cidades que cresceram ' +
          'ao redor de rios, serras e rotas. O tempo aqui deixa marca: na pedra, na fé e nas histórias contadas.',
        wordHints:[
          'HISTORIA','CAMINHO','SERRA','RIO','CIDADE','PATRIMONIO','MEMORIA','ORIGEM','TRADICAO'
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
          'QUEIJO','CANASTRA','CURADO','MEIACURA','LEITE','FAZENDA','TRADICAO','SABOR','COALHO','CURA'
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
          'PAODEQUEIJO','POLVILHO','FORNO','MASSA','QUEIJO','LEITE','OVO','SAL','RECEITA','COZINHA'
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
          'CAFE','COADOR','CHEIRO','MANHA','FAZENDA','INTERIOR','TRADICAO','TORRA','XICARA'
        ]
      },
      {
        id:'ferrovia',
        icon:'train',
        title:'Ferrovia e o “trem” mineiro',
        text:
          'O “trem” em Minas é mais que vagão: é expressão, é memória e é caminho. ' +
          'A ferrovia Vitória-Minas, por exemplo, marca a ligação entre regiões e histórias.',
        wordHints:[
          'FERROVIA','TREM','TRILHO','ESTACAO','VIAGEM','VITORIAMINAS','ROTA','PLATAFORMA','VAGAO'
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
          'PEDRA','GEMA','GARIMPO','CRISTAL','BRILHO','MINERIO','OURO','PRATA','JOIA'
        ]
      },
      {
        id:'fe_religiosidade',
        icon:'church',
        title:'Fé e religiosidade',
        text:
          'Em muitas cidades, a fé aparece nas festas, nas procissões e nas igrejas. ' +
          'É uma cultura viva, que une famílias e mantém a história de pé.',
        wordHints:[
          'FE','IGREJA','SANTUARIO','PROCISSAO','TRADICAO','FESTA','DEVOTO','ROMARIA'
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
          'VALADARES','IBITURUNA','VOOLIVRE','PARAPENTE','ASADELTA','PICO','VENTO','AVENTURA','MIRANTE'
        ]
      }
    ]
  };
}

function renderPlanText(plan){
  const m = plan.meta || {};
  const lines = [];
  lines.push((m.title || 'LIVRO').toUpperCase());
  if (m.subtitle) lines.push(m.subtitle);
  lines.push('-'.repeat(46));
  lines.push(`Formato: ${m.format} | Páginas: ${m.pages_target} | Idioma: ${m.language}`);
  lines.push(`Puzzles: ${plan.sections.length} (1 por seção) | Grade: ${m.grid_default}x${m.grid_default} | Palavras/puzzle: ${m.words_per_puzzle}`);
  lines.push('');
  lines.push('SEÇÕES');
  lines.push('-----');
  plan.sections.forEach((s, i) => {
    lines.push(`${String(i+1).padStart(2,'0')}. ${s.title}  [icon:${s.icon}]`);
  });
  return lines.join('\n');
}

function renderSectionText(s){
  const lines = [];
  lines.push(s.title.toUpperCase());
  lines.push('-'.repeat(Math.max(18, s.title.length)));
  lines.push('');
  lines.push(wrapLines(s.text, 78));
  lines.push('');
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
      mode: 'BOOK', // BOOK | QUICK
      grid: 15,
      wordsPerPuzzle: 20,
      docText: '',
      wordsText: '',
      planText: '',
      selectedSection: 0
    });

    const existingPlan = Storage.get('cultural:book_plan', null);

    root.innerHTML = `
      <div class="grid">
        <div class="card">
          <h2>Cultural Agent</h2>
          <p class="muted">
            Linha Cultural Brasil (PT-BR). Planeje livro 6x9 (60 páginas) com emoção + estrutura editorial.
            Coloring/Comfy permanece separado.
          </p>

          <div class="row">
            <label>Modo
              <select id="ca_mode">
                <option value="BOOK" ${seed.mode==='BOOK'?'selected':''}>Livro (Minas Gerais Cultural)</option>
                <option value="QUICK" ${seed.mode==='QUICK'?'selected':''}>Rápido (teste de seção/palavras)</option>
              </select>
            </label>

            <label>Grade (padrão)
              <select id="ca_grid">
                ${[13,15,17].map(n=>`<option value="${n}" ${Number(seed.grid)===n?'selected':''}>${n}x${n}</option>`).join('')}
              </select>
            </label>

            <label>Palavras por puzzle
              <select id="ca_wpp">
                ${[18,20,22].map(n=>`<option value="${n}" ${Number(seed.wordsPerPuzzle)===n?'selected':''}>${n}</option>`).join('')}
              </select>
            </label>
          </div>

          <div class="row">
            <button class="btn primary" id="ca_build">Gerar Plano do Livro (MG)</button>
            <button class="btn" id="ca_export_plan">Exportar Plano (JSON)</button>
          </div>

          <div class="row">
            <label>Seção (para testar no Caça-Palavras)
              <select id="ca_section"></select>
            </label>
            <button class="btn" id="ca_apply_ws">Aplicar Seção no Caça-Palavras</button>
          </div>

          <div class="row">
            <button class="btn" id="ca_copy">Copiar Seção (texto + palavras)</button>
            <button class="btn" id="ca_save">Salvar</button>
          </div>

        </div>

        <div class="card">
          <h2>Plano do livro</h2>
          <pre id="ca_plan" class="pre"></pre>
          <p class="muted">Isso vira o “roteiro” das 60 páginas. O PDF vem na fase do exportador.</p>
        </div>

        <div class="card">
          <h2>Texto da seção</h2>
          <pre id="ca_doc" class="pre"></pre>
        </div>

        <div class="card">
          <h2>Palavras da seção</h2>
          <p class="muted">Uma por linha, normalizadas (sem acento). Compatíveis com a grade escolhida.</p>
          <textarea id="ca_words" rows="12" style="width:100%"></textarea>
        </div>
      </div>
    `;

    const $ = (s)=>root.querySelector(s);
    const planEl = $('#ca_plan');
    const docEl = $('#ca_doc');
    const wordsEl = $('#ca_words');
    const sectionSel = $('#ca_section');

    let plan = existingPlan;

    const fillSections = () => {
      sectionSel.innerHTML = '';
      const secs = plan?.sections || [];
      secs.forEach((s, idx) => {
        const opt = document.createElement('option');
        opt.value = String(idx);
        opt.textContent = `${idx+1}. ${s.title} (icon:${s.icon})`;
        sectionSel.appendChild(opt);
      });
      sectionSel.value = String(Math.min(seed.selectedSection || 0, Math.max(0, secs.length-1)));
    };

    const renderSelected = () => {
      if (!plan?.sections?.length) return;
      const idx = parseInt(sectionSel.value || '0', 10);
      const s = plan.sections[idx];
      docEl.textContent = renderSectionText(s);

      const grid = parseInt($('#ca_grid').value, 10);
      const wpp  = parseInt($('#ca_wpp').value, 10);
      const picked = pickWordsForGrid(
        []
          .concat(s.wordHints || [])
          .concat([s.title, 'MINAS', 'CULTURA', 'HISTORIA']),
        grid,
        wpp
      );
      wordsEl.value = picked.join('\n');
      saveSeed();
    };

    const saveSeed = () => {
      const updated = {
        mode: $('#ca_mode').value,
        grid: parseInt($('#ca_grid').value,10),
        wordsPerPuzzle: parseInt($('#ca_wpp').value,10),
        docText: docEl.textContent || '',
        wordsText: wordsEl.value || '',
        planText: planEl.textContent || '',
        selectedSection: parseInt(sectionSel.value || '0', 10)
      };
      Storage.set('cultural:seed', updated);
      return updated;
    };

    // hydrate from seed
    if (existingPlan) {
      planEl.textContent = renderPlanText(existingPlan);
      fillSections();
      renderSelected();
    } else {
      planEl.textContent = seed.planText || 'Nenhum plano ainda. Clique “Gerar Plano do Livro (MG)”.';
      docEl.textContent = seed.docText || '';
      wordsEl.value = seed.wordsText || '';
    }

    sectionSel.addEventListener('change', () => renderSelected());

    $('#ca_build').onclick = () => {
      const grid = parseInt($('#ca_grid').value,10);
      const wpp  = parseInt($('#ca_wpp').value,10);

      plan = bookDefaultPlanMG();
      plan.meta.grid_default = grid;
      plan.meta.words_per_puzzle = wpp;

      Storage.set('cultural:book_plan', plan);

      planEl.textContent = renderPlanText(plan);
      fillSections();
      renderSelected();

      this.app.toast?.('Plano do livro gerado ✅');
      this.app.log?.(`[CULT] book_plan created grid=${grid} wpp=${wpp} sections=${plan.sections.length}`);
      saveSeed();
    };

    $('#ca_export_plan').onclick = () => {
      if (!plan) {
        this.app.toast?.('Gere o plano primeiro', 'err');
        return;
      }
      const blob = new Blob([JSON.stringify(plan, null, 2)], { type:'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `book-plan-minas-gerais-${Date.now()}.json`;
      a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
      this.app.toast?.('Plano exportado ✅');
    };

    $('#ca_apply_ws').onclick = () => {
      if (!plan?.sections?.length) {
        this.app.toast?.('Gere o plano primeiro', 'err');
        return;
      }
      const idx = parseInt(sectionSel.value || '0', 10);
      const s = plan.sections[idx];

      const grid = parseInt($('#ca_grid').value,10);
      const wpp  = parseInt($('#ca_wpp').value,10);

      const words = (wordsEl.value || '')
        .split(/\r?\n+/).map(x=>x.trim()).filter(Boolean);
      const picked = pickWordsForGrid(words, grid, wpp);

      const ws = {
        title: `Caça-Palavras — ${s.title}`,
        preset: 'BR_POCKET', // mantemos compatível; o “editorial 6x9” vem no export PDF
        size: grid,
        includeKey: true,
        words: picked.join('\n'),
        output: '',
        ts: Date.now()
      };
      Storage.set('wordsearch:seed', ws);

      this.app.toast?.('Aplicado ✅ (abra Caça-palavras e clique Gerar)');
      this.app.log?.(`[CULT] applied section=${idx+1} grid=${grid} words=${picked.length}`);
      saveSeed();
    };

    $('#ca_copy').onclick = async () => {
      const txt =
        (docEl.textContent || '').trim() +
        '\n\nPALAVRAS\n-------\n' +
        (wordsEl.value || '').trim() + '\n';
      try {
        await navigator.clipboard.writeText(txt);
        this.app.toast?.('Copiado ✅');
      } catch {
        this.app.toast?.('Falha ao copiar', 'err');
      }
    };

    $('#ca_save').onclick = () => {
      saveSeed();
      const proj = {
        type:'cultural_book_planner',
        ts: Date.now(),
        plan: plan || null,
        seed: Storage.get('cultural:seed', {})
      };
      this.app.saveProject?.(proj);
      this.app.toast?.('Salvo ✅');
    };
  }
}
