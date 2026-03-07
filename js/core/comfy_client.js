/* FILE: /js/core/comfy_client.js */
// Bright Cup Creator — ComfyUI Client v0.3 SAFE
// Objetivo:
// - compatibilidade com app antigo/novo
// - centralizar Base URL com fallback em Storage
// - expor métodos esperados pelos módulos: ping/getQueue/enqueuePrompt/patchWorkflowText
// - nunca quebrar UI se a configuração estiver ausente

import { Storage } from './storage.js';

const KEY = 'comfy:base_url';

function cleanUrl(u){
  u = String(u || '').trim();
  if (!u) return '';
  return u.replace(/\/+$/,'');
}

function deepClone(value){
  try {
    return JSON.parse(JSON.stringify(value || {}));
  } catch (e) {
    return {};
  }
}

function isObject(value){
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function findNodeIdsByClass(workflow, needle){
  const out = [];
  const keys = Object.keys(workflow || {});
  const want = String(needle || '').toLowerCase();

  for (let i = 0; i < keys.length; i += 1){
    const id = keys[i];
    const node = workflow[id] || {};
    const type = String(node.class_type || '').toLowerCase();
    if (type.indexOf(want) >= 0) out.push(id);
  }

  return out;
}

function patchTextNodes(workflow, values, map){
  const posId = map && map.positiveTextNode ? String(map.positiveTextNode) : null;
  const negId = map && map.negativeTextNode ? String(map.negativeTextNode) : null;

  if (posId && workflow[posId] && workflow[posId].inputs) {
    workflow[posId].inputs.text = String(values.positive || '');
  }

  if (negId && workflow[negId] && workflow[negId].inputs) {
    workflow[negId].inputs.text = String(values.negative || '');
  }

  if (!posId || !negId) {
    const textNodeIds = findNodeIdsByClass(workflow, 'cliptextencode');

    if (!posId && textNodeIds[0] && workflow[textNodeIds[0]] && workflow[textNodeIds[0]].inputs) {
      workflow[textNodeIds[0]].inputs.text = String(values.positive || '');
    }

    if (!negId && textNodeIds[1] && workflow[textNodeIds[1]] && workflow[textNodeIds[1]].inputs) {
      workflow[textNodeIds[1]].inputs.text = String(values.negative || '');
    }
  }
}

function patchSampler(workflow, values, map){
  const samplerId = map && map.samplerNode ? String(map.samplerNode) : null;
  const ids = samplerId ? [samplerId] : findNodeIdsByClass(workflow, 'ksampler');

  for (let i = 0; i < ids.length; i += 1){
    const node = workflow[ids[i]];
    if (!node || !node.inputs) continue;

    if (values.seed != null && values.seed !== '') {
      node.inputs.seed = Number(values.seed);
    }

    if (values.steps != null && values.steps !== '') {
      node.inputs.steps = Number(values.steps);
    }
  }
}

function patchSize(workflow, values){
  if (values.size == null || values.size === '') return;

  const size = Number(values.size);
  if (!isFinite(size) || size <= 0) return;

  const keys = Object.keys(workflow || {});
  for (let i = 0; i < keys.length; i += 1){
    const id = keys[i];
    const node = workflow[id] || {};
    const type = String(node.class_type || '').toLowerCase();

    if (!node.inputs) continue;

    if (
      type.indexOf('emptylatentimage') >= 0 ||
      type.indexOf('latent') >= 0 ||
      type.indexOf('image') >= 0
    ) {
      if (Object.prototype.hasOwnProperty.call(node.inputs, 'width')) {
        node.inputs.width = size;
      }
      if (Object.prototype.hasOwnProperty.call(node.inputs, 'height')) {
        node.inputs.height = size;
      }
    }
  }
}

function extractImageUrls(base, payload){
  const out = [];

  function visit(value){
    if (!value) return;

    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i += 1) visit(value[i]);
      return;
    }

    if (!isObject(value)) return;

    if (value.filename) {
      const params = new URLSearchParams();
      params.set('filename', String(value.filename));
      if (value.subfolder) params.set('subfolder', String(value.subfolder));
      if (value.type) params.set('type', String(value.type));
      out.push(base + '/view?' + params.toString());
    }

    const keys = Object.keys(value);
    for (let i = 0; i < keys.length; i += 1){
      visit(value[keys[i]]);
    }
  }

  visit(payload);

  const unique = [];
  const seen = Object.create(null);

  for (let i = 0; i < out.length; i += 1){
    const url = out[i];
    if (seen[url]) continue;
    seen[url] = true;
    unique.push(url);
  }

  return unique;
}

export class ComfyClient {
  constructor(ctx){
    this.ctx = ctx || null;
  }

  getBaseUrl(){
    let base = '';

    if (typeof this.ctx === 'function') {
      try {
        base = this.ctx() || '';
      } catch (e) {
        base = '';
      }
    } else if (this.ctx && typeof this.ctx.getBaseUrl === 'function') {
      try {
        base = this.ctx.getBaseUrl() || '';
      } catch (e) {
        base = '';
      }
    }

    if (!base) {
      base = Storage.get(KEY, '') || '';
    }

    return cleanUrl(base);
  }

  setBaseUrl(url){
    const u = cleanUrl(url);

    if (this.ctx && typeof this.ctx.setBaseUrl === 'function') {
      try {
        this.ctx.setBaseUrl(u);
      } catch (e) {}
    }

    Storage.set(KEY, u);
    return u;
  }

  hasBaseUrl(){
    return !!this.getBaseUrl();
  }

  async ping(){
    const base = this.getBaseUrl();
    if (!base) throw new Error('Falta Base URL do ComfyUI.');

    const candidates = [
      base + '/system_stats',
      base + '/queue',
      base + '/history'
    ];

    let lastError = null;

    for (let i = 0; i < candidates.length; i += 1) {
      try {
        const r = await fetch(candidates[i], { method:'GET' });
        if (r.ok) return true;
        lastError = new Error('HTTP ' + r.status);
      } catch (e) {
        lastError = e;
      }
    }

    throw lastError || new Error('ComfyUI não respondeu.');
  }

  async getQueue(){
    const base = this.getBaseUrl();
    if (!base) throw new Error('Falta Base URL do ComfyUI.');

    const r = await fetch(base + '/queue', { method:'GET' });

    if (!r.ok) {
      const txt = await r.text().catch(function(){ return ''; });
      throw new Error(('ComfyUI queue HTTP ' + r.status + ' ' + txt).trim());
    }

    return await r.json().catch(function(){ return {}; });
  }

  patchWorkflowText(workflow, values, map){
    const out = deepClone(workflow);
    const v = values || {};

    patchTextNodes(out, v, map || null);
    patchSampler(out, v, map || null);
    patchSize(out, v);

    return out;
  }

  async enqueuePrompt(workflow){
    return await this.sendPrompt({ prompt: workflow || {} });
  }

  async tryGetLatestImages(){
    const base = this.getBaseUrl();
    if (!base) return [];

    const candidates = [
      base + '/history',
      base + '/queue'
    ];

    for (let i = 0; i < candidates.length; i += 1){
      const url = candidates[i];

      try {
        const r = await fetch(url, { method:'GET' });
        if (!r.ok) continue;

        const json = await r.json();
        const imgs = extractImageUrls(base, json);
        if (imgs.length) return imgs;
      } catch (e) {}
    }

    return [];
  }

  async sendPrompt(payload){
    const base = this.getBaseUrl();

    if (!base){
      const msg = 'Falta Base URL. Vá em Config e salve o ComfyUI Base URL.';
      try {
        if (this.ctx && typeof this.ctx.toast === 'function') {
          this.ctx.toast(msg, 'warn');
        }
      } catch (e) {}
      throw new Error(msg);
    }

    const r = await fetch(base + '/prompt', {
      method:'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(payload || {})
    });

    if (!r.ok){
      const txt = await r.text().catch(function(){ return ''; });
      throw new Error(('ComfyUI HTTP ' + r.status + ' ' + txt).trim());
    }

    return await r.json().catch(function(){ return {}; });
  }
}
