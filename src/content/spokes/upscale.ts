import type { UpscaleSpoke } from '@/lib/content/types';

/**
 * Upscale spokes — /upscale/[slug]
 *
 * 70 total per CEO plan. This file ships the scaffold + a few seeds.
 * Each spoke must have ≥1 example pair, ≥3 FAQ items (enforced by tests).
 */

export const UPSCALE_SPOKES: UpscaleSpoke[] = [
  {
    slug: 'anime-art',
    h1: 'Upscale Anime Art with AI — 4× Resolution, No Watercolor Blur',
    subtitle: 'Modern transformer-based super resolution that preserves linework, flat colors, and cel shading.',
    metaDescription:
      'Upscale anime art 4× without losing linework or color flats. AI super resolution built for illustrators, not photos. Free to try.',
    useCaseStory: `If you've ever upscaled a piece of anime art in Photoshop's "Preserve Details 2.0" and watched the lines turn to mush, you already know the problem. Photo upscalers blur line art because they're trained on photos. Anime-specific tools like waifu2x are better but were last meaningfully updated years ago.

Aura-SR is a modern transformer super-resolution model that handles flat color regions and crisp linework gracefully. The same upscaler that works on photos works on anime — you don't have to switch tools when you switch subjects. Drag your 512×768 character portrait, get back a 2048×3072 PNG with the lines still sharp.

Common use: prepping commission deliveries for print, salvaging older art at low DPI, or rescaling references for digital painting study.`,
    examples: [
      {
        beforeUrl: '/demo-before.jpg',
        afterUrl: '/demo-after.jpg',
        alt: 'Anime character portrait before and after 4× upscale',
        caption: '512×768 → 2048×3072. Lines stay crisp; flat colors stay flat.',
      },
    ],
    faq: [
      {
        q: 'Does AI upscaling work better for anime than waifu2x?',
        a: 'For modern art with mixed shading styles (cel + soft shading), aura-sr handles both better than waifu2x, which was designed for pure cel-shaded work. For strict cel-only sources, waifu2x is still competitive — try both on a sample.',
      },
      {
        q: 'Will the upscaler change my line weights or recolor anything?',
        a: 'No. The model preserves source colors and edge geometry. You may see slight smoothing on sub-pixel edges, but no hue shift or stylistic reinterpretation.',
      },
      {
        q: 'What input resolution should I start with?',
        a: 'Anywhere from 512×512 up to 2048×2048 works. Smaller inputs (256-ish) start to lose information the AI has to invent. Larger inputs (>2K) are already big enough that you may not need upscaling.',
      },
      {
        q: 'Can I use the output commercially?',
        a: 'Yes — you retain all rights to your original work and the upscaled output. EnhanceAI takes no claim.',
      },
    ],
    relatedHubs: ['upscale-anime-art-complete-guide', 'ai-upscaling-explained'],
    tips: [
      'Export your source as PNG, not JPG — JPEG artifacts confuse the upscaler.',
      'Avoid pre-sharpening — the model adds sharpness; double-sharpening looks fried.',
      'For print, 4× a 1024px source gets you ~300 DPI at A5 size.',
    ],
  },
  // TODO: 69 more spokes per CEO plan. See TODOS.md for tracking.
];
