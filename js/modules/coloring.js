/* FILE: /js/modules/coloring.js */
import { Storage } from '../core/storage.js';

export class ColoringModule {
  constructor(app){ this.app = app; this.id='coloring'; this.title='Coloring Pages'; }
  async init(){}

  render(root){
    const themes = this.app.themes;
    const cfg = this.app.getConfig();

    const packOptions = (themes.packs||[]).map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
    root.innerHTML = `
      <div class="grid">
        <div class="card">
          <h2>Gerar páginas para colorir</h2>

          <div class="row">
            <div>
              <label>Tema</label>
              <select id="packSel">${packOptions}</select>
            </div>
            <div>
              <label>Faixa etária</label>
              <select id="ageSel">
                <option value="2-5">2–5 anos</option>
                <option value="4-8">4–8 anos</option>
                <option value="7-11">7–11 anos</option>
              </select>
            </div>
          </div>

          <label>Assunto / personagem</label>
          <input id="subjectInput" placeholder="ex: baby elephant, lion cub, farm tractor, ocean turtle..." />

          <div class="row">
            <div>
              <label>Estilo</label>
              <select id="styleSel">
                <option value="coloring_clean">Line art limpo (papel branco)</option>
                <option value="coloring_simple">Bem simples (2–5)</option>
                <option value="coloring_detail">Mais detalhado (7–11)</option>
              </select>
            </div>
            <div>
              <label>Complexidade (fundo)</label>
              <select id="bgSel">
                <option value="low">Pouco fundo</option>
                <option value="medium">Médio</option>
                <option value="high">Mais cheio (sem poluir)</option>
              </select>
            </div>
          </div>

          <div class="row">
            <div>
              <label>Tamanho</label>
              <select id="sizeSel">
                <option value="1024">1024 (rápido)</option>
                <option value="1536">1536 (melhor)</option>
              </select>
            </div>
            <div>
              <label>Seed</label>
              <input id="seedInput" placeholder="vazio = aleatório" />
            </div>
          </div>

          <div class="row">
            <button class="btn" id="btnBuild">Gerar Prompt</button>
            <button class="btn primary" id="btnSend">Enviar para ComfyUI</button>
            <button class="btn ghost" id="btnSave">Salvar projeto</button>
          </div>

          <hr style="border:0;border-top:1px solid rgba(255,255,255,.08);margin:14px 0"/>

          <h3>Batch (acelerar produção)</h3>
          <p class="muted">Gera <b>N</b> variações do mesmo assunto (seeds automáticas). Seguro: bloqueia duplo clique.</p>
          <div class="row">
            <div>
              <label>Quantidade (N)</label>
              <select id="batchN">
                <option value="5">5</option>
                <option value="10" selected>10</option>
                <option value="20">20</option>
              </select>
            </div>
            <div>
              <label>Seed base (opcional)</label>
              <input id="batchSeed" placeholder="vazio = aleatório" />
            </div>
          </div>
          <div class="row">
            <button class="btn" id="btnBatchPlan">Gerar Batch (só plano)</button>
            <button class="btn primary" id="btnBatchSend">Enviar Batch (N)</button>
          </div>

          <p class="muted">Dica: primeiro clique <b>Gerar Prompt</b>, revise. Depois envie.</p>
        </div>

        <div class="card">
          <h2>Prompt</h2>
          <label>POSITIVE</label>
          <textarea id="posOut" spellcheck="false"></textarea>
          <label>NEGATIVE</label>
          <textarea id="negOut" spellcheck="false"></textarea>
        </div>

        <div class="card">
          <h2>Status / Saída</h2>
          <div class="row">
            <button class="btn" id="btnPing">Testar conexão</button>
            <button class="btn" id="btnQueue">Ver fila</button>
          </div>
          <pre class="log" id="logBox"></pre>
          <div id="imgOut" class="imgout"></div>
          <p class="muted">Se a imagem não aparecer aqui, pode baixar no próprio ComfyUI (CORS no Safari às vezes bloqueia preview).</p>
        </div>
      </div>
    `;

    const $ = (id)=>root.querySelector(id);
    const log = (m)=>{ const el=$('#logBox'); el.textContent += m + "\n"; el.scrollTop=el.scrollHeight; };

    let sending = false;

    const loadLast = ()=>{
      const last = Storage.get('last_coloring', null);
      if(!last) return;
      $('#packSel').value = last.packId || (themes.packs?.[0]?.id||'jungle');
      $('#ageSel').value = last.age || '2-5';
      $('#subjectInput').value = last.subject || '';
      $('#styleSel').value = last.style || 'coloring_clean';
      $('#bgSel').value = last.background || 'low';
      $('#sizeSel').value = String(last.size || 1024);
      $('#seedInput').value = last.seed || '';
      $('#posOut').value = last.pos || '';
      $('#negOut').value = last.neg || '';
    };

    const build = ()=>{
      const packId = $('#packSel').value;
      const age = $('#ageSel').value;
      const subject = ($('#subjectInput').value || '').trim();
      if(!subject){ log('⚠️ Digite um assunto.'); return null; }
      const style = $('#styleSel').value;
      const background = $('#bgSel').value;
      const size = parseInt($('#sizeSel').value, 10);
      const seed = ($('#seedInput').value||'').trim();

      const out = this.app.promptEngine.buildColoringPrompt({
        packId, subject, age, style, background, size
      });
      $('#posOut').value = out.positive;
      $('#negOut').value = out.negative;

      Storage.set('last_coloring', { packId, age, subject, style, background, size, seed, pos: out.positive, neg: out.negative });
      log('✅ Prompt gerado.');
      return { packId, age, subject, style, background, size, seed, pos: out.positive, neg: out.negative };
    };

    const ensureComfyReady = ()=>{
      const cfg = this.app.getConfig();
      if(!cfg.baseUrl){ log('⚠️ Falta Base URL. Vá em Config e salve o ComfyUI Base URL.'); return null; }
      if(!cfg.workflowJson){ log('⚠️ Falta Workflow JSON. Vá em Config e cole o Workflow (API).'); return null; }
      let workflow = null;
      try { workflow = JSON.parse(cfg.workflowJson); }
      catch(e){ log('❌ Workflow JSON inválido: ' + (e?.message||e)); return null; }
      return { cfg, workflow };
    };

    const sendOnce = async(st, seedOverride=null)=>{
      const ready = ensureComfyReady();
      if(!ready) return null;
      const { cfg, workflow } = ready;
      const map = cfg.workflowMap || null;

      const patched = this.app.comfy.patchWorkflowText(workflow, {
        positive: st.pos,
        negative: st.neg,
        seed: seedOverride != null ? String(seedOverride) : st.seed,
        size: st.size
      }, map);

      const res = await this.app.comfy.enqueuePrompt(patched);
      return res;
    };

    $('#btnBuild').addEventListener('click', ()=>build());

    $('#btnSave').addEventListener('click', ()=>{
      const st = build();
      if(!st) return;
      const projects = Storage.get('projects', []);
      const id = 'p_' + Date.now();
      projects.unshift({ id, type:'coloring', createdAt: new Date().toISOString(), ...st });
      Storage.set('projects', projects.slice(0,200));
      log('💾 Projeto salvo.');
    });

    $('#btnPing').addEventListener('click', async()=>{
      try{ await this.app.comfy.ping(); log('✅ ComfyUI OK'); }
      catch(e){ log('❌ Falha ping: ' + (e?.message||e)); }
    });

    $('#btnQueue').addEventListener('click', async()=>{
      try{ const q = await this.app.comfy.getQueue(); log('📦 Queue: ' + JSON.stringify(q)); }
      catch(e){ log('❌ Falha queue: ' + (e?.message||e)); }
    });

    $('#btnSend').addEventListener('click', async()=>{
      const st = build();
      if(!st) return;

      try{
        log('➡️ Enviando (1)...');
        const res = await sendOnce(st, null);
        log('✅ Enviado. prompt_id=' + (res?.prompt_id||'?'));

        const imgs = await this.app.comfy.tryGetLatestImages();
        if(imgs?.length){
          $('#imgOut').innerHTML = imgs.map(u=>`<img src="${u}" alt="output" />`).join('');
          log('🖼️ Preview carregado (se CORS permitir).');
        } else {
          log('ℹ️ Sem preview aqui. Veja no ComfyUI.');
        }
      }catch(e){
        log('❌ Erro ao enviar: ' + (e?.message||e));
      }
    });

    const makeBatchPlan = ()=>{
      const st = build();
      if(!st) return null;
      const N = parseInt($('#batchN').value,10);
      const base = ($('#batchSeed').value||'').trim();
      const baseSeed = base ? parseInt(base,10) : Math.floor(Math.random()*900000)+100000;

      const plan = [];
      for(let i=0;i<N;i++){
        plan.push({
          i,
          seed: baseSeed + i,
          subject: st.subject,
          packId: st.packId,
          size: st.size
        });
      }
      Storage.set('coloring:batch_plan', { createdAt: new Date().toISOString(), N, baseSeed, state: st, plan });
      log(`📦 Batch plan criado ✅ N=${N} baseSeed=${baseSeed}`);
      return { st, plan };
    };

    $('#btnBatchPlan').addEventListener('click', ()=>makeBatchPlan());

    $('#btnBatchSend').addEventListener('click', async()=>{
      if(sending){ log('⏳ Já tem um envio em andamento...'); return; }
      const built = makeBatchPlan();
      if(!built) return;
      const { st, plan } = built;

      sending = true;
      try{
        log(`➡️ Enviando batch (${plan.length})...`);
        for(const item of plan){
          log(`• ${item.i+1}/${plan.length} seed=${item.seed}`);
          const res = await sendOnce(st, item.seed);
          log(`  ✅ prompt_id=${res?.prompt_id||'?'}`);
          await new Promise(r=>setTimeout(r, 250)); // leve espaçamento (mobile-safe)
        }
        log('🎉 Batch enviado ✅');
      }catch(e){
        log('❌ Erro batch: ' + (e?.message||e));
      }finally{
        sending = false;
      }
    });

    loadLast();
  }
}
