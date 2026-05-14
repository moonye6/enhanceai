import type { RestoreSpoke } from '@/lib/content/types';

export const RESTORE_SPOKES: RestoreSpoke[] = [
  {
    slug: 'old-family-photo',
    h1: 'Restore Old Family Photos with AI — Sharpen, Denoise, Upscale',
    subtitle: 'Faded, scratched, low-resolution? Modern AI super resolution recovers detail traditional restoration takes hours to match.',
    metaDescription:
      'Restore old family photos with AI. Upscale 4×, recover faces, reduce grain. Free to try, no software install.',
    useCaseStory: `Old family photos are usually small. A 4×6 print scanned at 300 DPI gives you 1200×1800 pixels — fine for viewing on a phone, terrible for a 13×19 reprint. Scans from photo prints lose detail in dark areas and noise piles up in shadows.

AI super resolution doesn't just enlarge — it adds plausible detail back. Faces recover edges, fabric textures come back, eye highlights re-form. It's not magic (you can't recover what isn't there), but for photos from the 1940s-90s that you want to reprint, frame, or share with relatives, it's the single biggest jump in quality available without a darkroom.

Common use: estate photos, wedding album scans, school portraits, grandparents' baby pictures.`,
    examples: [
      {
        beforeUrl: '/demo-before.jpg',
        afterUrl: '/demo-after.jpg',
        alt: 'Faded family portrait before and after AI restoration',
        caption: 'Scanned at 300 DPI → restored to print-ready 4×.',
      },
    ],
    faq: [
      {
        q: 'Will the AI invent details that weren\'t in the original?',
        a: 'Yes, in the sense that super resolution always generates pixels the source didn\'t have. The model is trained to generate *plausible* detail (skin texture, fabric weave). Faces stay recognizable. We do not add features that weren\'t there.',
      },
      {
        q: 'Does this work on photos with severe damage (tears, mold)?',
        a: 'Tears and large missing areas need photo-restoration tools like Photoshop\'s Content-Aware Fill first. AI super resolution upscales and sharpens; it does not inpaint missing regions.',
      },
      {
        q: 'What\'s the best scan resolution to start with?',
        a: 'Scan at 600 DPI or higher if you can — more input data means better output. 300 DPI works but leaves less room.',
      },
      {
        q: 'Will it convert black-and-white photos to color?',
        a: 'No. The upscaler preserves the source color (or lack of it). Colorization is a separate AI task we don\'t do.',
      },
    ],
    relatedHubs: ['restore-old-photos-ai', 'ai-upscaling-explained'],
    tips: [
      'Always scan, never photograph the print — phone cameras add their own degradation.',
      'Output PNG, not JPG. JPG re-compresses your restoration.',
      'For print, plan for ~300 DPI at final size. 4× a 1200×1800 scan = 4800×7200 ≈ 16×24 inches at 300 DPI.',
    ],
  },
  // TODO: ~20 more restore spokes per CEO plan.
];
