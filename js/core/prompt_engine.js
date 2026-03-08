/* FILE: /js/core/prompt_engine.js
   Bright Cup Creator — Prompt Engine SAFE
   Objetivo:
   - construir prompts consistentes para coloring pages e covers
   - foco em line art limpa, anatomia correta e fundo branco
   - JS puro
   - sem DOM
   - sem dependências externas
   - compatível com Safari/iOS
*/

export class PromptEngine {
  constructor(themes){
    this.themes = themes || { packs: [] };
  }

  getPack(id){
    return (this.themes.packs || []).find(function(p){
      return p.id === id;
    }) || null;
  }

  buildColoringPrompt(input){
    var data = input || {};
    var packId = data.packId;
    var subjectId = data.subjectId;
    var age = data.age;
    var style = data.style;
    var complexity = data.complexity;

    var pack = this.getPack(packId) || { title: packId, subjects: [] };
    var subject = (pack.subjects || []).find(function(s){
      return s.id === subjectId;
    }) || { title: subjectId };

    var agePreset = (this.themes.age_presets || []).find(function(a){
      return a.id === age;
    }) || (this.themes.age_presets || [])[0];

    var stylePreset = (this.themes.style_presets || []).find(function(s){
      return s.id === style;
    }) || (this.themes.style_presets || [])[0];

    var subjectLine = subject.prompt || subject.title || 'cute animal';

    var detail = 'simple background';
    if (complexity === 'low') detail = 'minimal background';
    else if (complexity === 'high') detail = 'detailed but clean background';

    var positive = [
      'black and white coloring page line art',
      'clean bold outlines',
      'smooth curves',
      'closed shapes',
      'white paper background',
      'kid-friendly proportions and correct anatomy',
      'clear readable silhouette',
      'centered composition',
      agePreset && agePreset.positive ? agePreset.positive : '',
      stylePreset && stylePreset.positive ? stylePreset.positive : '',
      'subject: ' + subjectLine,
      detail
    ]
    .concat(pack.positive_add || [])
    .filter(Boolean)
    .join(', ');

    var negative = [
      'color, colored, grayscale shading, gradients, watercolor',
      'blur, low resolution, noisy background, dirty paper, texture',
      'text, letters, watermark, logo, signature, border text',
      'extra limbs, missing limbs, merged limbs, extra legs, extra trunk, double nose, deformed anatomy, bad hands, bad feet',
      'cropped, out of frame, duplicate body parts',
      'busy background, too many leaves, clutter',
      '3d render, glossy, shiny, reflective, metallic, plastic',
      'photorealistic, realistic shading, dramatic lighting, shadows',
      'scary, horror, creepy, uncanny, disturbing',
      'insects, spiders, bugs, worms',
      agePreset && agePreset.negative ? agePreset.negative : '',
      stylePreset && stylePreset.negative ? stylePreset.negative : ''
    ]
    .concat(pack.negative_add || [])
    .filter(Boolean)
    .join(', ');

    return {
      positive: positive,
      negative: negative,
      meta: {
        packId: packId,
        subjectId: subjectId,
        age: age,
        style: style,
        complexity: complexity
      }
    };
  }

  buildCoverPrompt(input){
    var data = input || {};
    var packId = data.packId;
    var age = data.age;
    var title = data.title;
    var subtitle = data.subtitle;
    var style = data.style;

    var pack = this.getPack(packId) || { title: packId };

    var agePreset = (this.themes.age_presets || []).find(function(a){
      return a.id === age;
    }) || (this.themes.age_presets || [])[0];

    var stylePreset = (this.themes.style_presets || []).find(function(s){
      return s.id === style;
    }) || (this.themes.style_presets || [])[0];

    var positive = [
      'children book cover illustration',
      'bright colors',
      'high contrast',
      'clean composition with empty space for title',
      'theme: ' + (pack.title || ''),
      agePreset && (agePreset.cover_positive || agePreset.positive) ? (agePreset.cover_positive || agePreset.positive) : '',
      stylePreset && (stylePreset.cover_positive || stylePreset.positive) ? (stylePreset.cover_positive || stylePreset.positive) : ''
    ]
    .concat(pack.cover_positive_add || [])
    .filter(Boolean)
    .join(', ');

    var negative = [
      'watermark, logo, signature',
      'blur, low quality, jpeg artifacts',
      'gore, horror, violence',
      'tiny illegible text',
      'messy composition'
    ]
    .concat(pack.cover_negative_add || [])
    .filter(Boolean)
    .join(', ');

    return {
      positive: positive,
      negative: negative,
      meta: {
        packId: packId,
        age: age,
        title: title,
        subtitle: subtitle
      }
    };
  }
}
