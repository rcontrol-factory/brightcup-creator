/*
  ComfyClient
  - Works with ComfyUI HTTP API
  - Designed for Runpod proxied domains (https://xxxx.proxy.runpod.net)

  Notes:
  - Some deployments require enabling CORS. If the browser blocks requests,
    use FileBrowser to edit your ComfyUI config / add CORS middleware.
*/

export class ComfyClient {
  constructor(getBaseUrl){
    this.getBaseUrl = getBaseUrl;
  }

  async ping(){
    const base = this.getBaseUrl();
    const r = await fetch(`${base}/system_stats`, { method:'GET' });
    if(!r.ok) throw new Error(`Ping failed (${r.status})`);
    return await r.json();
  }

  async queuePrompt(promptGraph){
    const base = this.getBaseUrl();
    const r = await fetch(`${base}/prompt`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ prompt: promptGraph })
    });
    if(!r.ok){
      const t = await r.text().catch(()=> '');
      throw new Error(`Queue failed (${r.status}) ${t}`);
    }
    return await r.json();
  }

  async getHistory(promptId){
    const base = this.getBaseUrl();
    const r = await fetch(`${base}/history/${encodeURIComponent(promptId)}`);
    if(!r.ok) throw new Error(`History failed (${r.status})`);
    return await r.json();
  }

  async getView(filename, subfolder='', type='output'){
    const base = this.getBaseUrl();
    const url = new URL(`${base}/view`);
    url.searchParams.set('filename', filename);
    if(subfolder) url.searchParams.set('subfolder', subfolder);
    if(type) url.searchParams.set('type', type);
    const r = await fetch(url.toString());
    if(!r.ok) throw new Error(`View failed (${r.status})`);
    return await r.blob();
  }
}
