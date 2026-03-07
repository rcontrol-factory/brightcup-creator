import { Storage } from '../core/storage.js';

export class ColoringModule {
  constructor(app){
    this.app = app;
    this.lastImages = [];
  }

  async init(){}

  render(root){
    const cfg = this._getConfig();
    const workflowText = cfg.workflowText || '';
    const hasWorkflow = !!workflowText || !!(cfg.workflow && Object.keys(cfg.workflow).length);

    root.innerHTML = `
      <div class="grid">
        <div class="card">
          <h2>Coloring Page Generator</h2>
          <p class="muted">Gera imagem via ComfyUI usando o workflow salvo em Config.</p>

          <label class="lbl">Prompt</label>
          <textarea id="col_prompt" class="txt" rows="5" placeholder="cute baby fox coloring page, clean outlines, white background, no shading"></textarea>

          <label class="lbl">Negative Prompt</label>
          <textarea id="col_negative" class="txt" rows="3" placeholder="gray, shading, blur, photorealistic, text, watermark"></textarea>

          <div class="row">
            <div style="flex:1">
              <label class="lbl">Size</label>
              <input id="col_size" class="inp" type="number" min="256" step="64" value="1024" />
            </div>
            <div style="flex:1">
              <label class="lbl">Steps</label>
              <input id="col_steps" class="inp" type="number" min="1" step="1" value="20" />
            </div>
            <div style="flex:1">
              <label class="lbl">Seed</label>
              <input id="col_seed" class="inp" type="number" step="1" value="-1" />
            </div>
          </div>

          <div class="row">
            <button id="col_ping" class="btn secondary">Ping</button>
            <button id="col_queue" class="btn secondary">Queue</button>
            <button id="col_generate" class="btn">Generate</button>
          </div>

          <div id="col_status" class="hint"></div>

          <div class="sep"></div>

          <div class="mono" id="col_cfg_preview"></div>
        </div>

        <div class="card">
          <h2>Preview</h2>
          <div id="col_preview" class="gallery"></div>
        </div>
      </div>
    `;

    const $ = function(sel){ return root.querySelector(sel); };
    const statusEl = $('#col_status');
    const previewEl = $('#col_preview');
    const cfgPreviewEl = $('#col_cfg_preview');

    cfgPreviewEl.textContent = [
      'baseUrl: ' + (cfg.baseUrl || '(empty)'),
      'workflow: ' + (hasWorkflow ? 'loaded' : 'missing'),
      'workflowMap: ' + JSON.stringify(cfg.workflowMap || {}, null, 2)
    ].join('\n');

    $('#col_ping').onclick = async () => {
      statusEl.textContent = 'Ping...';
      try {
        const comfy = this._getComfy();
        if (!comfy || typeof comfy.ping !== 'function') {
          throw new Error('Comfy bridge indisponível.');
        }

        const ok = await comfy.ping();
        statusEl.textContent = ok ? '✅ ComfyUI respondeu.' : '⚠️ Sem resposta.';
      } catch (e) {
        statusEl.textContent = '❌ ' + shortErr(e, 200);
      }
    };

    $('#col_queue').onclick = async () => {
      statusEl.textContent = 'Lendo queue...';
      try {
        const comfy = this._getComfy();
        if (!comfy || typeof comfy.getQueue !== 'function') {
          throw new Error('Comfy queue indisponível.');
        }

        const queue = await comfy.getQueue();
        statusEl.textContent = '✅ Queue carregada.';
        cfgPreviewEl.textContent = [
          'baseUrl: ' + (cfg.baseUrl || '(empty)'),
          'workflow: ' + (hasWorkflow ? 'loaded' : 'missing'),
          '',
          'queue:',
          JSON.stringify(queue, null, 2)
        ].join('\n');
      } catch (e) {
        statusEl.textContent = '❌ ' + shortErr(e, 220);
      }
    };

    $('#col_generate').onclick = async () => {
      statusEl.textContent = 'Preparando workflow...';

      try {
        const comfy = this._getComfy();
        if (!comfy) {
          throw new Error('Comfy bridge indisponível.');
        }

        if (typeof comfy.enqueuePrompt !== 'function') {
          throw new Error('enqueuePrompt() não disponível.');
        }

        const currentCfg = this._getConfig();
        const rawWorkflow = this._getWorkflowObject(currentCfg);

        if (!rawWorkflow || !Object.keys(rawWorkflow).length) {
          throw new Error('Workflow não encontrado. Vá em Config e salve o Workflow JSON.');
        }

        const values = {
          positive: ($('#col_prompt').value || '').trim(),
          negative: ($('#col_negative').value || '').trim(),
          steps: toSafeNumber($('#col_steps').value, 20),
          size: toSafeNumber($('#col_size').value, 1024),
          seed: normalizeSeed($('#col_seed').value)
        };

        let patchedWorkflow = rawWorkflow;

        if (typeof comfy.patchWorkflowText === 'function') {
          patchedWorkflow = comfy.patchWorkflowText(
            rawWorkflow,
            values,
            currentCfg.workflowMap || {}
          );
        }

        statusEl.textContent = 'Enviando para o ComfyUI...';
        const result = await comfy.enqueuePrompt(patchedWorkflow);

        statusEl.textContent = '✅ Prompt enviado.';
        cfgPreviewEl.textContent = [
          'baseUrl: ' + (currentCfg.baseUrl || '(empty)'),
          'workflow: loaded',
          '',
          'lastResult:',
          JSON.stringify(result, null, 2)
        ].join('\n');

        await this._refreshPreview(previewEl, statusEl);
      } catch (e) {
        statusEl.textContent = '❌ ' + shortErr(e, 240);
      }
    };

    if (this.lastImages && this.lastImages.length) {
      renderImages(previewEl, this.lastImages);
    } else {
      previewEl.innerHTML = '<p class="muted">Nenhuma imagem ainda.</p>';
    }
  }

  _getComfy(){
    if (this.app && this.app.comfy) return this.app.comfy;
    return null;
  }

  _getConfig(){
    const cfg = this.app && typeof this.app.getConfig === 'function'
      ? this.app.getConfig()
      : (Storage.get('config', {}) || {});

    return normalizeCfg(cfg);
  }

  _getWorkflowObject(cfg){
    const safe = cfg || {};

    if (safe.workflow && typeof safe.workflow === 'object' && Object.keys(safe.workflow).length) {
      return safe.workflow;
    }

    if (safe.workflowText) {
      try {
        return JSON.parse(safe.workflowText);
      } catch (e) {
        return {};
      }
    }

    return {};
  }

  async _refreshPreview(previewEl, statusEl){
    const comfy = this._getComfy();

    if (!comfy || typeof comfy.tryGetLatestImages !== 'function') {
      return;
    }

    statusEl.textContent = 'Buscando preview...';

    let tries = 0;
    let imgs = [];

    while (tries < 6) {
      try {
        imgs = await comfy.tryGetLatestImages();
      } catch (e) {
        imgs = [];
      }

      if (imgs && imgs.length) break;

      tries += 1;
      await delay(1500);
    }

    this.lastImages = Array.isArray(imgs) ? imgs.slice() : [];

    if (this.lastImages.length) {
      renderImages(previewEl, this.lastImages);
      statusEl.textContent = '✅ Preview atualizado.';
    } else {
      previewEl.innerHTML = '<p class="muted">Ainda sem imagens retornadas pelo ComfyUI.</p>';
      statusEl.textContent = '⚠️ Prompt enviado, mas sem preview ainda.';
    }
  }
}

function normalizeCfg(cfg){
  const safe = cfg && typeof cfg === 'object' ? cfg : {};
  const workflow = safe.workflow && typeof safe.workflow === 'object' ? safe.workflow : {};
  const workflowText = safe.workflowJson
    ? String(safe.workflowJson)
    : (Object.keys(workflow).length ? JSON.stringify(workflow, null, 2) : '');

  return {
    baseUrl: String(safe.baseUrl || safe.comfyBase || '').trim(),
    comfyBase: String(safe.comfyBase || safe.baseUrl || '').trim(),
    workflow: workflow,
    workflowText: workflowText,
    workflowMap: safe.workflowMap && typeof safe.workflowMap === 'object' ? safe.workflowMap : {}
  };
}

function renderImages(root, images){
  const imgs = Array.isArray(images) ? images : [];

  if (!imgs.length) {
    root.innerHTML = '<p class="muted">Nenhuma imagem ainda.</p>';
    return;
  }

  const html = imgs.map(function(url, i){
    return `
      <div class="card" style="margin-bottom:12px">
        <div class="row" style="justify-content:space-between;align-items:center">
          <strong>Imagem ${i + 1}</strong>
          <a class="btn secondary" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">Abrir</a>
        </div>
        <div class="sep"></div>
        <img src="${escapeAttr(url)}" alt="Generated image ${i + 1}" style="width:100%;height:auto;display:block;border-radius:12px" />
      </div>
    `;
  }).join('');

  root.innerHTML = html;
}

function delay(ms){
  return new Promise(function(resolve){
    setTimeout(resolve, ms);
  });
}

function toSafeNumber(value, fallback){
  var n = Number(value);
  if (!isFinite(n)) return fallback;
  return n;
}

function normalizeSeed(value){
  var raw = String(value == null ? '' : value).trim();
  if (!raw || raw === '-1') {
    return Math.floor(Math.random() * 2147483647);
  }

  var n = Number(raw);
  if (!isFinite(n)) {
    return Math.floor(Math.random() * 2147483647);
  }

  return Math.floor(n);
}

function shortErr(e, max){
  var s = String((e && e.message) || e || '');
  return s.slice(0, max || 160);
}

function escapeAttr(s){
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
