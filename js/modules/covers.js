export class CoversModule {
  constructor(app){ this.app=app; this.id='covers'; this.title='Book Covers'; }
  async init(){}
  render(root){
    root.innerHTML = `
      <div class="card">
        <h2>Capas (Coloridas)</h2>
        <p class="muted">MVP: este módulo gera prompts de capa e prepara o workflow. A geração pode ser feita no ComfyUI via API quando configurado.</p>
        <div class="row">
          <label>Título do livro</label>
          <input id="cov_title" class="input" placeholder="Ex: Jungle Animals Coloring Book" />
        </div>
        <div class="row">
          <label>Subtítulo</label>
          <input id="cov_subtitle" class="input" placeholder="Ages 2-5" />
        </div>
        <div class="row">
          <label>Estilo</label>
          <select id="cov_style" class="input">
            <option value="cute_cartoon">Cute Cartoon</option>
            <option value="watercolor">Watercolor</option>
            <option value="flat_vector">Flat Vector</option>
            <option value="storybook">Storybook</option>
          </select>
        </div>
        <div class="row">
          <button id="cov_build" class="btn">Gerar Prompt (capa)</button>
        </div>
        <div class="grid two">
          <div>
            <div class="label">Prompt (positive)</div>
            <textarea id="cov_pos" class="ta" rows="8" placeholder="..."></textarea>
          </div>
          <div>
            <div class="label">Negative</div>
            <textarea id="cov_neg" class="ta" rows="8" placeholder="..."></textarea>
          </div>
        </div>
        <div class="hint">Dica: use um canvas no workflow com proporção de capa (ex: 6x9) e upscale depois.</div>
      </div>
    `;

    const $ = (s)=>root.querySelector(s);
    $('#cov_build').onclick = () => {
      const title = ($('#cov_title').value||'').trim();
      const subtitle = ($('#cov_subtitle').value||'').trim();
      const style = $('#cov_style').value;

      const pos = [
        `children's book cover illustration, ${style.replace('_',' ')}`,
        title ? `big readable title: "${title}"` : `big readable title`,
        subtitle ? `subtitle: "${subtitle}"` : `subtitle`,
        `cute friendly animal characters, clean composition, high contrast, professional layout`,
        `no nudity, family friendly`
      ].join(', ');

      const neg = [
        `nsfw, nude, explicit, blood, gore, violence`,
        `low quality, blurry, bad anatomy, deformed, extra limbs, misspelled text, watermark, logo`,
        `messy background, clutter`
      ].join(', ');

      $('#cov_pos').value = pos;
      $('#cov_neg').value = neg;
    };
  }
}
