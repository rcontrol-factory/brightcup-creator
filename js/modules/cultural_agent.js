/* FILE: /js/modules/cultural_agent.js */
// Bright Cup Creator — Cultural Agent (Book Planner) v0.4a PADRÃO (1 ano)
// V0.4a:
// - Agent gera: plan.meta.layout (style + pageSize + margins + typography)
// - Palavras: DISPLAY preserva acento/ç quando existir; GRADE normaliza (sem acento)
// - Exporta plano em Storage: cultural:book_plan
// - Builder vira só folhear/aprovar (layout vem do Agent)
// - Imagem/ilustração: prevista para páginas de TEXTO (não no puzzle)
// - Presets BR: Pocket (13x13/16) e Plus (15x15/20)

import { Storage } from '../core/storage.js';

const $esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));

// normaliza PARA GRADE (sem acento, sem espaço, só A-Z0-9)
function normalizeWord(s){
  return String(s || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g,'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^A-Z0-9]/g,'');
}

// mantém ortografia PARA DISPLAY (só limpa espaços)
function displayWord(s){
  return String(s || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

// cria um mapa "NORMALIZADO -> melhor DISPLAY"
function buildDisplayMap(words){
  const map = {};
  for (const raw of (words || [])){
    const disp = displayWord(raw);
    const norm = normalizeWord(raw);
    if (!norm) continue;

    // preferir a versão com acento/ç se existir (heurística simples)
    const hasAccent = /[ÁÀÂÃÉÊÍÓÔÕÚÜÇ]/i.test(disp);
    const prev = map[norm];
    if (!prev) { map[norm] = disp; continue; }
    const prevHasAccent = /[ÁÀÂÃÉÊÍÓÔÕÚÜÇ]/i.test(prev);
    if (!prevHasAccent && hasAccent) map[norm] = disp;
    // se ambos têm (ou não têm), mantém o primeiro
  }
  return map;
}

function uniqNorm(list){
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
  const filtered = uniqNorm(words).filter(w => w.length >= 3 && w.length <= maxLen);
  filtered.sort((a,b) => (Math.abs(a.length-7) - Math.abs(b.length-7)));
  return filtered.slice(0, Math.max(6, Number(maxCount || 0) || 0));
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

const PRESETS = {
  BR_POCKET: { label:'Brasil — Pocket (13x13 / 16 palavras)', grid:13, wpp:16 },
  BR_PLUS:   { label:'Brasil — Plus (15x15 / 20 palavras)',   grid:15, wpp:20 }
};

const STYLES = {
  RETRO: { label:'Retro (revistinha / clean)', value:'RETRO' },
  CLEAN: { label:'Clean (moderno minimal)', value:'CLEAN' }
};

const PAGE_SIZES = {
  '6x9':     { label:'6x9 (KDP / padrão)', value:'6x9' },
  '8.5x11':  { label:'8.5x11 (Letter)', value:'8.5x11' }
};

function presetFromGrid(grid){
  const g = Number(grid||0);
  if (g <= 13) return 'BR_POCKET';
  return 'BR_PLUS';
}

function enrichSectionText(id, base){
  const t = String(base || '').trim();

  if (id === 'ferrovia') {
    return [
      'Em Minas, “trem” não é só vagão: é quase um idioma.',
      'Você fala “pega aquele trem ali” e pronto — serve pra chave, sacola, panela, controle, documento… tudo vira “trem”.',
      '',
      'Tem gente que diz que é economia de palavras. Outros juram que é só pra sobrar tempo de passar um café e puxar uma prosa.',
      '',
      'E existe o trem de verdade: trilho, estação, viagem e história. A ferrovia Vitória–Minas marcou caminhos e memórias.',
      '',
      'Agora me diz: o “trem” é o objeto… ou é a desculpa perfeita pra prosear?'
    ].join('\n');
  }

  if (id === 'intro_minas') {
    return [
      t,
      '',
      'E tem um detalhe: mineiro fala pouco, mas entende muito.',
      'Se alguém te oferecer café e pão de queijo, você aceitou a amizade sem perceber.'
    ].join('\n');
  }

  if (id === 'origem_minas') {
    return [
      t,
      '',
      'Minas cresceu entre serras, caminhos e trabalho duro.',
      'E por aqui história não fica só em livro: fica na conversa — e na memória do povo.'
    ].join('\n');
  }

  if (id === 'pao_de_queijo') {
    return [
      t,
      '',
      'Causo real: cada família diz que a dela é “a receita certa”.',
      'O mais mineiro disso tudo é que… todo mundo está “certo” ao mesmo tempo.'
    ].join('\n');
  }

  if (id === 'cafe_minas') {
    return [
      t,
      '',
      'E o café em Minas não é só bebida: é convite.',
      'Se ouvir “passa aqui rapidinho”, pode saber… vai ter café e conversa.'
    ].join('\n');
  }

  if (id === 'fe_religiosidade') {
    return [
      t,
      '',
      'Festa, procissão, igreja antiga… é fé misturada com cultura e comunidade.',
      'Em cidade pequena, isso vira calendário do ano — e memória da vida inteira.'
    ].join('\n');
  }

  if (id === 'voo_livre_valadares') {
    return [
      t,
      '',
      'Lá do alto, Minas parece mapa vivo: serra, rio, cidade e horizonte.',
      'É aventura com cheiro de liberdade — e com aquele “uai” quando o vento muda.'
    ].join('\n');
  }

  if (id === 'serras_paisagens') {
    return [
      t,
      '',
      'E tem o “uai”… que dá discussão boa.',
      'Tem gente que fala “uai é de Minas”, tem gente que fala “uai é de Goiás”.',
      'A verdade? O uai é do Brasil — mas o mineiro usa com uma calma que é só dele.'
    ].join('\n');
  }

  return t;
}

// layout padrão (Agent manda, Builder só respeita)
function layoutDefaults(style, pageSize){
  const st = String(style || 'RETRO').toUpperCase();
  const ps = String(pageSize || '6x9');

  const base = {
    style: (st === 'CLEAN') ? 'CLEAN' : 'RETRO',
    pageSize: (ps === '8.5x11') ? '8.5x11' : '6x9',
    margins: { top: 0.55, right: 0.55, bottom: 0.60, left: 0.55 }, // polegadas (referência editorial)
    typography: {
      titleScale: 1.0,
      bodyScale: 1.0,
      gridScale: 1.0,
      wordsScale: 1.0
    },
    rules: {
      illustrationOnTextPages: true,
      illustrationOnPuzzlePages: false
    }
  };

  if (base.pageSize === '8.5x11'){
    base.margins = { top: 0.70, right: 0.70, bottom: 0.80, left: 0.70 };
    base.typography.titleScale = 1.05;
    base.typography.bodyScale = 1.05;
  }

  if (base.style === 'CLEAN'){
    base.typography.titleScale *= 1.02;
    base.typography.bodyScale *= 1.00;
    base.typography.wordsScale *= 0.98;
  }

  return base;
}

function bookDefaultPlanMG(grid=13, wpp=16, style='RETRO', pageSize='6x9'){
  const plan = {
    meta: {
      id: 'MG_CULTURAL_BOOK_01',
      title: 'MINAS GERAIS CULTURAL',
      subtitle: 'História • Sabores • Tradições • Curiosidades • Caça-Palavras',
      format: pageSize, // compat
      pages_target: 60,
      language: 'pt-BR',
      grid_default: grid,
      words_per_puzzle: wpp,
      include_key: true,
      createdAt: new Date().toISOString(),
      layout: layoutDefaults(style, pageSize)
    },
    sections: [
      {
        id:'intro_minas',
        icon:'mountain',
        title:'O que é Minas?',
        text:
          'Minas é serra no horizonte e café passado na hora. É conversa na porta, ' +
          'é tradição que atravessa gerações. Aqui, a cultura não é enfeite: é jeito de viver.',
        wordHints:[
          'Minas','Mineiro','Serra','Montanha','Cultura','História','Tradição','Acolhimento','Café','Fogão','Interior','Uai'
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
          'História','Caminho','Serra','Rio','Cidade','Patrimônio','Memória','Origem','Tradição','Cultura'
        ]
      },
      {
        id:'queijo_minas',
        icon:'cheese',
        title:'A cultura do queijo mineiro',
        text:
          'Em Minas, queijo é linguagem. Tem queijo fresco, meia-cura, curado — e tem a Canastra, famosa no Brasil inteiro. ' +
          'Cada pedaço carrega clima, técnica e paciência.',
        wordHints:[
          'Queijo','Canastra','Curado','Meia-cura','Leite','Fazenda','Tradição','Sabor','Coalho','Cura','Minas'
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
          'Pão de queijo','Polvilho','Forno','Massa','Queijo','Leite','Ovo','Sal','Receita','Cozinha','História','Minas','Uai'
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
          'Café','Coador','Cheiro','Manhã','Fazenda','Interior','Tradição','Torra','Xícara','Minas'
        ]
      },
      {
        id:'ferrovia',
        icon:'train',
        title:'Ferrovia e o “trem” mineiro',
        text:
          'O “trem” em Minas é mais que vagão: é expressão, é memória e é caminho. ' +
          'A ferrovia Vitória–Minas, por exemplo, marca a ligação entre regiões e histórias.',
        wordHints:[
          'Ferrovia','Trem','Trilho','Estação','Viagem','Vitória-Minas','Rota','Plataforma','Vagão','Prosa','Memória'
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
          'Pedra','Gema','Garimpo','Cristal','Brilho','Minério','Ouro','Prata','Joia','História'
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
          'Fé','Igreja','Santuário','Procissão','Tradição','Festa','Devoto','Romaria','Cultura','História'
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
          'Serra','Mirante','Estrada','Paisagem','Natureza','Trilha','Vale','Cachoeira','Caminho','Uai'
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
          'Valadares','Ibituruna','Voo livre','Parapente','Asa-delta','Pico','Vento','Aventura','Mirante','Minas'
        ]
      }
    ]
  };

  plan.sections = (plan.sections || []).map(s => ({
    ...s,
    text: enrichSectionText(s.id, s.text)
  }));

  return plan;
}

function renderPlanText(plan){
  const m = plan.meta || {};
  const l = m.layout || {};
  const lines = [];
  lines.push((m.title || 'LIVRO').toUpperCase());
  if (m.subtitle) lines.push(m.subtitle);
  lines.push('-'.repeat(46));
  lines.push(`Formato: ${l.pageSize || m.format} | Estilo: ${l.style || 'RETRO'} | Idioma: ${m.language}`);
  lines.push(`Seções: ${(plan.sections||[]).length} | Grade: ${m.grid_default}x${m.grid_default} | Palavras/puzzle: ${m.words_per_puzzle}`);
  lines.push(`Ilustração: texto=SIM | puzzle=NÃO`);
  lines.push('');
  lines.push('SEÇÕES');
  lines.push('-----');
  (plan.sections || []).forEach((s, i) => {
    lines.push(`${String(i+1).padStart(2,'0')}. ${s.title}  [id:${s.id}] [icon:${s.icon}]`);
  });
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

export class CulturalAgentModule {
  constructor(app){
    this.app = app;
    this.id = 'cultural';
    this.title = 'Cultural Agent';
  }

  async init(){}

  render(root){
    const seed = Storage.get('cultural:seed', {
      mode: 'BOOK',
      preset: 'BR_POCKET',
      grid: 13,
      wordsPerPuzzle: 16,
      pageSize: '6x9',
      style: 'RETRO',
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
            Linha Cultural Brasil (PT-BR). <b>O Agent cria o livro</b>. O Builder só folheia/aprova.
            <br/>Fluxo: <b>Gerar Plano → Abrir Builder → Enviar p/ Caça-Palavras → Gerar+Salvar</b>.
          </p>

          <div class="row">
            <label>Modo
              <select id="ca_mode">
                <option value="BOOK" ${seed.mode==='BOOK'?'selected':''}>Livro (Minas Cultural)</option>
                <option value="QUICK" ${seed.mode==='QUICK'?'selected':''}>Rápido (teste de seção/palavras)</option>
              </select>
            </label>

            <label>Preset Brasil
              <select id="ca_preset">
                <option value="BR_POCKET" ${seed.preset==='BR_POCKET'?'selected':''}>${$esc(PRESETS.BR_POCKET.label)}</option>
                <option value="BR_PLUS" ${seed.preset==='BR_PLUS'?'selected':''}>${$esc(PRESETS.BR_PLUS.label)}</option>
              </select>
            </label>

            <label>Formato (página)
              <select id="ca_pagesize">
                <option value="6x9" ${seed.pageSize==='6x9'?'selected':''}>${$esc(PAGE_SIZES['6x9'].label)}</option>
                <option value="8.5x11" ${seed.pageSize==='8.5x11'?'selected':''}>${$esc(PAGE_SIZES['8.5x11'].label)}</option>
              </select>
            </label>

            <label>Estilo (layout)
              <select id="ca_style">
                <option value="RETRO" ${seed.style==='RETRO'?'selected':''}>${$esc(STYLES.RETRO.label)}</option>
                <option value="CLEAN" ${seed.style==='CLEAN'?'selected':''}>${$esc(STYLES.CLEAN.label)}</option>
              </select>
            </label>
          </div>

          <div class="row">
            <label>Grade (padrão)
              <select id="ca_grid"></select>
            </label>

            <label>Palavras por puzzle
              <select id="ca_wpp"></select>
            </label>
          </div>

          <div class="row">
            <button class="btn primary" id="ca_build">Gerar Plano do Livro (MG)</button>
            <button class="btn" id="ca_export_plan">Exportar Plano (JSON)</button>
            <button class="btn" id="ca_open_builder">Abrir Builder</button>
          </div>

          <div class="row">
            <label>Seção (para testar no Caça-Palavras)
              <select id="ca_section"></select>
            </label>
            <button class="btn" id="ca_apply_ws">Aplicar Seção no Caça-Palavras</button>
            <button class="btn" id="ca_open_ws">Abrir Caça-Palavras</button>
          </div>

          <div class="row">
            <button class="btn" id="ca_copy">Copiar Seção (texto + palavras)</button>
            <button class="btn" id="ca_save">Salvar</button>
          </div>
        </div>

        <div class="card">
          <h2>Plano do livro</h2>
          <pre id="ca_plan" class="pre"></pre>
          <p class="muted">Isso vira o “roteiro + layout” do livro. O Builder só folheia.</p>
        </div>

        <div class="card">
          <h2>Texto da seção</h2>
          <pre id="ca_doc" class="pre"></pre>
        </div>

        <div class="card">
          <h2>Palavras da seção</h2>
          <p class="muted">
            ✅ Pode ter acento/ç aqui (DISPLAY).<br/>
            ⚙️ Na hora de aplicar no Caça-Palavras, a grade vai normalizar (sem acento).
          </p>
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

    const fillPresetDerived = () => {
      const p = $('#ca_preset').value;
      const cfg = PRESETS[p] || PRESETS.BR_POCKET;

      const gridEl = $('#ca_grid');
      const wppEl  = $('#ca_wpp');

      const gridOptions = [13,15,17];
      gridEl.innerHTML = gridOptions.map(n => `<option value="${n}" ${n===cfg.grid?'selected':''}>${n}x${n}</option>`).join('');

      const wppOptions = [16,18,20,22];
      wppEl.innerHTML = wppOptions.map(n => `<option value="${n}" ${n===cfg.wpp?'selected':''}>${n}</option>`).join('');
    };

    const saveSeed = () => {
      const updated = {
        mode: $('#ca_mode').value,
        preset: $('#ca_preset').value,
        grid: parseInt($('#ca_grid').value,10),
        wordsPerPuzzle: parseInt($('#ca_wpp').value,10),
        pageSize: $('#ca_pagesize').value,
        style: $('#ca_style').value,
        docText: docEl.textContent || '',
        wordsText: wordsEl.value || '',
        planText: planEl.textContent || '',
        selectedSection: parseInt(sectionSel.value || '0', 10)
      };
      Storage.set('cultural:seed', updated);
      return updated;
    };

    const fillSections = () => {
      sectionSel.innerHTML = '';
      const secs = plan?.sections || [];
      secs.forEach((s, idx) => {
        const opt = document.createElement('option');
        opt.value = String(idx);
        opt.textContent = `${idx+1}. ${s.title} (id:${s.id})`;
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

      const rawPool = []
        .concat(s.wordHints || [])
        .concat([s.title, 'Minas', 'Cultura', 'História', 'Uai']);

      const pickedNorm = pickWordsForGrid(rawPool, grid, wpp);

      // DISPLAY: tenta manter acento/ç se existir
      const dispMap = buildDisplayMap(rawPool);
      const pickedDisplay = pickedNorm.map(n => dispMap[n] || n);

      wordsEl.value = pickedDisplay.join('\n');
      saveSeed();
    };

    fillPresetDerived();

    $('#ca_preset').onchange = () => {
      fillPresetDerived();
      renderSelected();
      saveSeed();
    };

    $('#ca_pagesize').onchange = () => saveSeed();
    $('#ca_style').onchange = () => saveSeed();

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
    $('#ca_grid').addEventListener('change', () => renderSelected());
    $('#ca_wpp').addEventListener('change', () => renderSelected());

    $('#ca_build').onclick = () => {
      const grid = parseInt($('#ca_grid').value,10);
      const wpp  = parseInt($('#ca_wpp').value,10);
      const pageSize = $('#ca_pagesize').value;
      const style = $('#ca_style').value;

      plan = bookDefaultPlanMG(grid, wpp, style, pageSize);
      Storage.set('cultural:book_plan', plan);

      planEl.textContent = renderPlanText(plan);
      fillSections();
      renderSelected();

      this.app.toast?.('Plano do livro gerado ✅');
      try { this.app.log?.(`[CULT] book_plan created grid=${grid} wpp=${wpp} pageSize=${pageSize} style=${style} sections=${plan.sections.length}`); } catch {}
      saveSeed();
    };

    $('#ca_export_plan').onclick = () => {
      if (!plan) { this.app.toast?.('Gere o plano primeiro'); return; }
      try{
        const blob = new Blob([JSON.stringify(plan, null, 2)], { type:'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `book-plan-${(plan?.meta?.id||'cultural')}-${Date.now()}.json`;
        a.click();
        setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
        this.app.toast?.('Plano exportado ✅');
      } catch(e){
        this.app.toast?.('Falha ao exportar');
        try { this.app.log?.('[CULT] export failed: ' + (e?.message || e)); } catch {}
      }
    };

    $('#ca_open_builder').onclick = () => {
      const btn = document.querySelector('.navitem[data-view="book"]');
      btn?.click?.();
    };

    $('#ca_open_ws').onclick = () => {
      const btn = document.querySelector('.navitem[data-view="wordsearch"]');
      btn?.click?.();
    };

    $('#ca_apply_ws').onclick = () => {
      if (!plan?.sections?.length) { this.app.toast?.('Gere o plano primeiro'); return; }

      const idx = parseInt(sectionSel.value || '0', 10);
      const s = plan.sections[idx];

      const grid = parseInt($('#ca_grid').value,10);
      const wpp  = parseInt($('#ca_wpp').value,10);

      const wordsRaw = (wordsEl.value || '')
        .split(/\r?\n+/).map(x=>x.trim()).filter(Boolean);

      // aplica normalização aqui (grade não aceita acento)
      const pickedNorm = pickWordsForGrid(wordsRaw, grid, wpp);
      const preset = presetFromGrid(grid);

      const ws = {
        title: `Caça-Palavras — ${s.title}`,
        preset,
        size: grid,
        maxWords: wpp,
        includeKey: true,
        words: pickedNorm.join('\n'), // NORMALIZADO
        puzzleId: s.id,
        sectionId: s.id,
        sectionTitle: s.title,
        output: '',
        ts: Date.now()
      };

      Storage.set('wordsearch:seed', ws);

      this.app.toast?.('Aplicado ✅ (abra Caça-Palavras e clique Gerar+Salvar)');
      try { this.app.log?.(`[CULT] applied section=${idx+1} id=${s.id} grid=${grid} wpp=${wpp} words=${pickedNorm.length}`); } catch {}
      saveSeed();
    };

    $('#ca_copy').onclick = async () => {
      const idx = parseInt(sectionSel.value || '0', 10);
      const s = plan?.sections?.[idx];

      // copia DISPLAY (bonito) + também envia NORMALIZADO no final (p/ engine)
      const wordsDisp = (wordsEl.value || '').trim();
      const wordsNorm = wordsDisp
        .split(/\r?\n+/).map(x=>x.trim()).filter(Boolean)
        .map(normalizeWord).filter(Boolean)
        .join('\n');

      const txt =
        (docEl.textContent || '').trim() +
        '\n\nPALAVRAS (DISPLAY)\n------------------\n' +
        wordsDisp + '\n\n' +
        'PALAVRAS (NORMALIZADO p/ GRADE)\n-------------------------------\n' +
        wordsNorm + '\n' +
        (s?.id ? `\nID: ${s.id}\n` : '');

      try {
        await navigator.clipboard.writeText(txt);
        this.app.toast?.('Copiado ✅');
      } catch {
        this.app.toast?.('Falha ao copiar');
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

    if (plan?.sections?.length) renderSelected();
  }
}
