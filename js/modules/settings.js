import { Storage } from '../core/storage.js';

export class SettingsModule {
  constructor(app){ this.app = app; }

  async init(){}

  render(root){
    const cfg = normalizeCfg(this.app && typeof this.app.getConfig === 'function' ? this.app.getConfig() : {});
    root.innerHTML = `
      <div class="grid">
        <div class="card">
          <h2>Conexão ComfyUI</h2>
          <p class="muted">Cole o domínio proxy do Runpod (ex: https://xxxxx.proxy.runpod.net). Depois clique em Testar.</p>
          <label class="lbl">ComfyUI Base URL</label>
          <input id="cfg_base" class="inp" placeholder="https://xxxxx.proxy.runpod.net" value="${escapeHtml(cfg.baseUrl || '')}" />
          <div class="row">
            <button id="cfg_test" class="btn">Testar conexão</button>
            <button id="cfg_save" class="btn secondary">Salvar</button>
          </div>
          <div id="cfg_status" class="hint"></div>
        </div>

        <div class="card">
          <h2>Workflow Mapper</h2>
          <p class="muted">Cole o workflow JSON exportado do ComfyUI.</p>
          <label class="lbl">Workflow JSON</label>
          <textarea id="cfg_workflow" class="txt" rows="10">${escapeHtml(cfg.workflowText)}</textarea>

          <div class="row">
            <button id="cfg_map" class="btn">Mapear nós</button>
            <button id="cfg_clear" class="btn danger">Limpar workflow</button>
          </div>

          <div id="cfg_map_status" class="hint"></div>
          <div class="mono" id="cfg_map_preview"></div>
        </div>

        <div class="card">
          <h2>Dados & Backup</h2>
          <div class="row">
            <button id="cfg_export" class="btn secondary">Exportar dados</button>
            <label class="btn secondary" for="cfg_import_file">Importar dados</label>
            <input id="cfg_import_file" type="file" accept="application/json" style="display:none"/>
          </div>

          <div class="row">
            <button id="cfg_reset" class="btn danger">Reset total</button>
          </div>
        </div>
      </div>
    `;

    const $ = (s)=>root.querySelector(s);

    $('#cfg_save').onclick = ()=>{
      try{
        const base = ($('#cfg_base').value||'').trim();

        safeSetConfig(this.app,{
          comfyBase:base,
          baseUrl:base
        });

        $('#cfg_status').textContent='✅ Configuração salva.';
      }catch(e){
        $('#cfg_status').textContent='❌ Falha ao salvar: '+shortErr(e);
      }
    };

    $('#cfg_test').onclick = async ()=>{
      $('#cfg_status').textContent='Testando...';

      try{
        if(!this.app || !this.app.comfy || !this.app.comfy.ping){
          throw new Error('Comfy bridge indisponível');
        }

        const ok = await this.app.comfy.ping();

        $('#cfg_status').textContent = ok
          ? '✅ Conectado'
          : '⚠️ Sem resposta';

      }catch(e){
        $('#cfg_status').textContent='❌ '+shortErr(e);
      }
    };

    $('#cfg_map').onclick=()=>{
      $('#cfg_map_status').textContent='';

      try{
        const raw = ($('#cfg_workflow').value||'').trim();
        const wf = raw ? JSON.parse(raw) : {};

        const map = mapWorkflow(wf);

        safeSetConfig(this.app,{
          workflow:wf,
          workflowJson:raw,
          workflowMap:map
        });

        $('#cfg_map_status').textContent='✅ Workflow salvo.';
        $('#cfg_map_preview').textContent=JSON.stringify(map,null,2);

      }catch(e){
        $('#cfg_map_status').textContent='❌ '+shortErr(e);
      }
    };

    $('#cfg_clear').onclick=()=>{
      if(!confirm('Apagar workflow salvo?'))return;

      safeSetConfig(this.app,{
        workflow:{},
        workflowJson:'',
        workflowMap:{}
      });

      $('#cfg_workflow').value='';
      $('#cfg_map_preview').textContent='';
      $('#cfg_map_status').textContent='Workflow removido.';
    };

    $('#cfg_export').onclick=()=>{
      try{
        let dump=null;

        if(this.app && typeof this.app.exportAll==='function'){
          dump=this.app.exportAll();
        }

        if(dump){
          const blob=new Blob([JSON.stringify(dump,null,2)],{type:'application/json'});
          const a=document.createElement('a');
          a.href=URL.createObjectURL(blob);
          a.download='brightcup_backup.json';
          a.click();
        }

      }catch(e){
        alert('Erro exportando: '+shortErr(e));
      }
    };

    $('#cfg_import_file').onchange=async(e)=>{
      const f=e.target.files[0];
      if(!f)return;

      try{
        const txt=await f.text();
        const data=JSON.parse(txt);

        if(this.app && typeof this.app.importAll==='function'){
          this.app.importAll(data);
          location.reload();
        }else{
          alert('Import não suportado nesta versão.');
        }

      }catch(err){
        alert('Erro importando.');
      }
    };

    $('#cfg_reset').onclick=()=>{
      if(!confirm('Reset total?'))return;

      try{
        if(this.app && this.app.resetAll){
          this.app.resetAll();
        }else{
          localStorage.clear();
        }

        location.reload();

      }catch(e){
        alert('Falha reset.');
      }
    };

    if(cfg.workflowMap && Object.keys(cfg.workflowMap).length){
      $('#cfg_map_preview').textContent=JSON.stringify(cfg.workflowMap,null,2);
    }
  }
}

function normalizeCfg(cfg){
  const c = cfg||{};
  const wf = c.workflow || {};

  return {
    baseUrl:c.baseUrl || c.comfyBase || '',
    workflow:wf,
    workflowText:c.workflowJson || JSON.stringify(wf,null,2),
    workflowMap:c.workflowMap||{}
  };
}

function safeSetConfig(app,patch){
  if(app && app.setConfig){
    app.setConfig(patch);
    return;
  }

  const cfg=Storage.get('config',{})||{};
  Storage.set('config',{...cfg,...patch});
}

function shortErr(e){
  return String((e&&e.message)||e||'').slice(0,160);
}

function mapWorkflow(wf){
  const keys=Object.keys(wf||{});

  const map={
    positiveTextNode:null,
    negativeTextNode:null,
    samplerNode:null,
    vaeDecodeNode:null,
    saveImageNode:null
  };

  keys.forEach(id=>{
    const n=wf[id]||{};
    const t=String(n.class_type||'').toLowerCase();

    if(!map.samplerNode && t.includes('ksampler')) map.samplerNode=id;
    if(!map.vaeDecodeNode && t.includes('vaedecode')) map.vaeDecodeNode=id;
    if(!map.saveImageNode && t.includes('saveimage')) map.saveImageNode=id;
  });

  const textNodes=keys.filter(id=>{
    const t=String((wf[id]||{}).class_type||'').toLowerCase();
    return t.includes('cliptextencode');
  });

  map.positiveTextNode=textNodes[0]||null;
  map.negativeTextNode=textNodes[1]||null;

  return map;
}

function escapeHtml(s){
  return String(s)
  .replaceAll('&','&amp;')
  .replaceAll('<','&lt;')
  .replaceAll('>','&gt;')
  .replaceAll('"','&quot;')
  .replaceAll("'","&#039;");
}
