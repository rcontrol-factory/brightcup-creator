/* FILE: /js/core/comfy_client.js */
// Bright Cup Creator — ComfyUI Client v0.2 SAFE
// Objetivo:
// - Centralizar Base URL (Storage)
// - Nunca quebrar: tryGetLatestImages sempre existe (retorna [] se não configurado)
// - sendPrompt pronto (quando Base URL existir)

import { Storage } from './storage.js';

const KEY = 'comfy:base_url';

function cleanUrl(u){
  u = String(u || '').trim();
  if (!u) return '';
  u = u.replace(/\/+$/,''); // remove trailing slash
  return u;
}

export class ComfyClient {
  constructor(app){
    this.app = app;
  }

  getBaseUrl(){
    return cleanUrl(Storage.get(KEY, '') || '');
  }

  setBaseUrl(url){
    const u = cleanUrl(url);
    Storage.set(KEY, u);
    return u;
  }

  hasBaseUrl(){
    return !!this.getBaseUrl();
  }

  // SAFE: nunca quebra
  async tryGetLatestImages(){
    // se não tiver base url, só retorna vazio
    const base = this.getBaseUrl();
    if (!base) return [];

    // tenta endpoints comuns; se falhar, retorna []
    // (Comfy pode variar por setup)
    const candidates = [
      `${base}/history`,
      `${base}/queue`
    ];

    for (const url of candidates){
      try{
        const r = await fetch(url, { method:'GET' });
        if (!r.ok) continue;
        const json = await r.json();
        // aqui a gente não assume formato — só devolve bruto por enquanto
        return [{ source:url, data:json }];
      }catch{}
    }
    return [];
  }

  // Envio de prompt padrão do Comfy: POST /prompt
  async sendPrompt(payload){
    const base = this.getBaseUrl();
    if (!base){
      const msg = 'Falta Base URL. Vá em Config e salve o ComfyUI Base URL.';
      try { this.app?.toast?.(msg, 'warn'); } catch {}
      throw new Error(msg);
    }

    const url = `${base}/prompt`;
    const r = await fetch(url, {
      method:'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(payload || {})
    });

    if (!r.ok){
      const txt = await r.text().catch(()=> '');
      throw new Error(`ComfyUI HTTP ${r.status} ${txt}`.trim());
    }

    const json = await r.json().catch(()=> ({}));
    return json;
  }
}
