/*
  PromptEngine
  - Builds consistent Positive/Negative prompts for coloring pages and covers
  - Focus: clean line art, correct anatomy, white paper background
*/

export class PromptEngine {
  constructor(themes){
    this.themes = themes || { packs: [] };
  }

  getPack(id){
    return (this.themes.packs || []).find(p => p.id === id) || null;
  }

  buildColoringPrompt({ packId, subjectId, age, style, complexity }){
    const pack = this.getPack(packId) || { title: packId, subjects: [] };
    const subject = (pack.subjects||[]).find(s => s.id === subjectId) || { title: subjectId };

    const agePreset = (this.themes.age_presets||[]).find(a => a.id === age) || (this.themes.age_presets||[])[0];
    const stylePreset = (this.themes.style_presets||[]).find(s => s.id === style) || (this.themes.style_presets||[])[0];

    const subjectLine = subject.prompt || subject.title || 'cute animal';

    const detail = complexity === 'low' ? 'minimal background' : (complexity === 'high' ? 'detailed but clean background' : 'simple background');

    const positive = [
      'black and white coloring page line art',
      'clean bold outlines',
      'smooth curves',
      'closed shapes',
      'white paper background',
      'kid-friendly proportions and correct anatomy',
      'clear readable silhouette',
      'centered composition',
      agePreset?.positive || '',
      stylePreset?.positive || '',
      `subject: ${subjectLine}`,
      detail,
      ...(pack.positive_add||[])
    ].filter(Boolean).join(', ');

    const negative = [
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
      agePreset?.negative || '',
      stylePreset?.negative || '',
      ...(pack.negative_add||[])
    ].filter(Boolean).join(', ');

    return { positive, negative, meta: { packId, subjectId, age, style, complexity } };
  }

  buildCoverPrompt({ packId, age, title, subtitle, style }){
    const pack = this.getPack(packId) || { title: packId };
    const agePreset = (this.themes.age_presets||[]).find(a => a.id === age) || (this.themes.age_presets||[])[0];
    const stylePreset = (this.themes.style_presets||[]).find(s => s.id === style) || (this.themes.style_presets||[])[0];

    const positive = [
      'children book cover illustration',
      'bright colors',
      'high contrast',
      'clean composition with empty space for title',
      `theme: ${pack.title}`,
      agePreset?.cover_positive || agePreset?.positive || '',
      stylePreset?.cover_positive || stylePreset?.positive || '',
      ...(pack.cover_positive_add||[])
    ].filter(Boolean).join(', ');

    const negative = [
      'watermark, logo, signature',
      'blur, low quality, jpeg artifacts',
      'gore, horror, violence',
      'tiny illegible text',
      'messy composition',
      ...(pack.cover_negative_add||[])
    ].filter(Boolean).join(', ');

    return { positive, negative, meta: { packId, age, title, subtitle } };
  }
}
