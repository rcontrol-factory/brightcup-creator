import { Storage } from '../core/storage.js';

export class SettingsModule {
  constructor(app){ this.app = app; }

  async init(){}

  render(root){
    const cfg = this.app.getConfig();
    root.innerHTML = `
      <div class="grid">
        <div class="card">
          <h2>Conexão ComfyUI</h2>
          <p class="muted">Cole o domínio proxy do Runpod (ex: https://xxxxx.proxy.runpod.net). Depois clique em Testar.</p>
          <label class="lbl">ComfyUI Base URL</label>
          <input id="cfg_base" class="inp" placeholder="https://xxxxx.proxy.runpod.net" value="${escapeHtml(cfg.comfyBase||'')}" />
          <div class="row">
            <button id="cfg_test" class="btn">Testar conexão</button>
            <button id="cfg_save" class="btn secondary">Salvar</button>
          </div>
          <div id="cfg_status" class="hint"></div>
        </div>
        <div class="card">
          <h2>Workflow Mapper</h2>
          <p class="muted">Cole aqui o workflow JSON do ComfyUI (Export -> API format). O Creator identifica os nós de texto e salva os IDs. Isso evita o problema de “numeração mudando”.</p>
          <label class="lbl">Workflow JSON (API)</label>
          <textarea id="cfg_workflow" class="txt" rows="10" placeholder='{"1":{"class_type":"CheckpointLoaderSimple",...}}'>${escapeHtml(JSON.stringify(cfg.workflow||{},null,2))}</textarea>
          <div class="row">
            <button id="cfg_map" class="btn">Mapear nós</button>
            <button id="cfg_clear" class="btn danger">Limpar workflow</button>
          </div>
          <div id="cfg_map_status" class="hint"></div>
          <div class="sep"></div>
          <div class="mono" id="cfg_map_preview"></div>
        </div>
        <div class="card">
          <h2>Dados & Backup</h2>
          <p class="muted">Tudo fica no seu navegador (localStorage). Exporta/importa para não perder.</p>
          <div class="row">
            <button id="cfg_export" class="btn secondary">Exportar dados</button>
            <label class="btn secondary" for="cfg_import_file" style="cursor:pointer">Importar dados</label>
            <input id="cfg_import_file" type="file" accept="application/json" style="display:none" />
          </div>
          <div class="row">
            <button id="cfg_reset" class="btn danger">Reset total</button>
          </div>
        </div>
      </div>
    `;

    const $ = (s) => root.querySelector(s);

    $('#cfg_save').onclick = () => {
      const base = $('#cfg_base').value.trim();
      this.app.setConfig({ comfyBase: base });
      $('#cfg_status').textContent = '✅ Salvo.';
    };

    $('#cfg_test').onclick = async () => {
      $('#cfg_status').textContent = 'Testando...';
      try{
        const ok = await this.app.comfy.ping();
        $('#cfg_status').textContent = ok ? '✅ Conectou no ComfyUI.' : '⚠️ Não respondeu.';
      }catch(e){
        $('#cfg_status').textContent = `❌ Erro: ${String(e).slice(0,160)}`;
      }
    };

    $('#cfg_map').onclick = () => {
      $('#cfg_map_status').textContent = '';
      try{
        const raw = $('#cfg_workflow').value.trim();
        const wf = raw ? JSON.parse(raw) : {};
        const map = mapWorkflow(wf);
        this.app.setConfig({ workflow: wf, workflowMap: map });
        $('#cfg_map_status').textContent = '✅ Mapeado e salvo.';
        $('#cfg_map_preview').textContent = JSON.stringify(map, null, 2);
      }catch(e){
        $('#cfg_map_status').textContent = `❌ Não consegui mapear: ${String(e).slice(0,200)}`;
      }
    };

    $('#cfg_clear').onclick = () => {
      if(!confirm('Apagar workflow salvo?')) return;
      this.app.setConfig({ workflow: {}, workflowMap: {} });
      $('#cfg_workflow').value = '';
      $('#cfg_map_preview').textContent = '';
      $('#cfg_map_status').textContent = '✅ Limpo.';
    };

    $('#cfg_export').onclick = () => {
      const dump = this.app.exportAll();
      const blob = new Blob([JSON.stringify(dump,null,2)], {type:'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `brightcup_backup_${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    };

    $('#cfg_import_file').onchange = async (ev) => {
      const f = ev.target.files && ev.target.files[0];
      if(!f) return;
      try{
        const txt = await f.text();
        const data = JSON.parse(txt);
        this.app.importAll(data);
        alert('✅ Importado. Recarregando.');
        location.reload();
      }catch(e){
        alert('❌ Falhou: '+String(e));
      }
    };

    $('#cfg_reset').onclick = () => {
      if(!confirm('Reset total (apaga tudo)?')) return;
      this.app.resetAll();
      location.reload();
    };

    const cfg2 = this.app.getConfig();
    if(cfg2.workflowMap && Object.keys(cfg2.workflowMap).length){
      $('#cfg_map_preview').textContent = JSON.stringify(cfg2.workflowMap, null, 2);
    }
  }
}

function mapWorkflow(wf){
  // wf is ComfyUI API graph object: {"1": {class_type, inputs}, ...}
  const keys = Object.keys(wf||{});
  const out = {
    positiveTextNode: null,
    negativeTextNode: null,
    samplerNode: null,
    vaeDecodeNode: null,
    saveImageNode: null
  };

  for(const id of keys){
    const n = wf[id] || {};
    const t = (n.class_type || '').toLowerCase();
    if(!out.samplerNode && t.includes('ksampler')) out.samplerNode = id;
    if(!out.vaeDecodeNode && t.includes('vaedecode')) out.vaeDecodeNode = id;
    if(!out.saveImageNode && t.includes('saveimage')) out.saveImageNode = id;
  }

  // Try to detect text nodes
  const textNodes = keys.filter(id => {
    const t = (wf[id]?.class_type||'').toLowerCase();
    return t.includes('cliptextencode');
  });

  // Heuristic: first text node is positive, second is negative
  out.positiveTextNode = textNodes[0] || null;
  out.negativeTextNode = textNodes[1] || null;

  return out;
}

function escapeHtml(s){
  return String(s)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}
