export class MandalaModule {
  constructor(app){ this.app=app; this.id='mandala'; this.title='Mandala'; }
  async init(){}
  render(root){
    root.innerHTML = `
      <div class="card">
        <h2>Mandalas (Line Art)</h2>
        <p class="muted">Gera prompts padronizados para mandalas de colorir (adulto/crianças). Use junto do seu workflow do ComfyUI.</p>
        <div class="row">
          <label class="field">
            <span>Complexidade</span>
            <select id="mandala_level">
              <option value="simple">Simples (4-8)</option>
              <option value="medium">Média (7-11)</option>
              <option value="detailed">Detalhada (adulto)</option>
            </select>
          </label>
          <label class="field">
            <span>Tema</span>
            <input id="mandala_theme" placeholder="floral, ocean, geometric..." />
          </label>
          <button class="btn" id="mandala_build">Gerar Prompt</button>
        </div>
        <div class="grid">
          <div class="card">
            <h3>Positive</h3>
            <textarea id="mandala_pos" class="mono" rows="6"></textarea>
          </div>
          <div class="card">
            <h3>Negative</h3>
            <textarea id="mandala_neg" class="mono" rows="6"></textarea>
          </div>
        </div>
      </div>
    `;

    const build = () => {
      const lvl = root.querySelector('#mandala_level').value;
      const theme = (root.querySelector('#mandala_theme').value || 'geometric').trim();
      const details = lvl==='simple' ? 'bold clean outlines, very simple shapes, big open areas' :
                      lvl==='medium' ? 'clean outlines, medium detail, balanced symmetry' :
                      'intricate symmetric pattern, high detail, clean line art';
      const pos = [
        `mandala coloring page, ${theme} theme, perfectly centered, radial symmetry`,
        details,
        `black ink line art only, crisp smooth lines, uniform stroke, no shading`,
        `white paper background, high contrast, printable, no text`
      ].join(', ');
      const neg = [
        'color fill, gray background, paper texture, gradients',
        'shading, hatching, watercolor, paint, blur',
        'text, letters, watermark, signature, logo',
        'cropped, off-center, asymmetry, messy lines, low contrast'
      ].join(', ');
      root.querySelector('#mandala_pos').value = pos;
      root.querySelector('#mandala_neg').value = neg;
    };
    root.querySelector('#mandala_build').addEventListener('click', build);
    build();
  }
}
