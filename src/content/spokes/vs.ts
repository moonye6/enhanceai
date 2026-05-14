import type { CompareSpoke } from '@/lib/content/types';

/**
 * Deep comparison pages per CEO D8 ADD: 5 /vs/ pages at 2500+ words,
 * with price calculator + real test image comparisons.
 *
 * IMPORTANT: testImages URLs reference R2 bucket forenhance/vs-test-images/*
 * You must run the test images upload step before these pages display
 * correctly in production. See docs/vs-test-images.md (TBD).
 */

export const COMPARE_SPOKES: CompareSpoke[] = [
  {
    slug: 'gigapixel-ai',
    competitorName: 'Topaz Gigapixel AI',
    competitorPrice: '$99',
    competitorPriceUnit: 'one-time',
    h1: 'EnhanceAI vs Topaz Gigapixel AI — Honest Comparison (2026)',
    subtitle:
      'Both upscale to 4× with modern AI. Different price models, different install footprint, different feature sets. Here\'s the honest call.',
    metaDescription:
      'EnhanceAI vs Gigapixel AI compared: price ($4.90/mo vs $99 one-time), quality on real test images, install requirements, model differences.',
    intro: `Topaz Gigapixel AI is the incumbent in AI image upscaling. It costs $99 one-time, runs as a native desktop app on macOS/Windows, uses local GPU, and ships multiple models (Standard, High Fidelity, Low Resolution, Very Compressed). It's the safe choice for working photographers.

EnhanceAI is a web app powered by aura-sr — a transformer-based super-resolution model released in 2024. No install, runs in the browser via fal.ai inference, $4.90/month for 100 upscales, free for the first 3. Designed for prosumer creators who don't want a $99 commitment for occasional work.

The honest version: Gigapixel wins on local GPU performance and feature breadth. EnhanceAI wins on accessibility, modern model architecture, and zero-install latency-to-first-result.`,
    comparisonTable: [
      { dimension: 'Price', enhanceai: '$4.90/mo (100 upscales) or 3 free lifetime', competitor: '$99 one-time' },
      { dimension: 'Install', enhanceai: 'None (browser)', competitor: 'Desktop app (macOS/Windows)' },
      { dimension: 'Max upscale', enhanceai: '4×', competitor: '4× / 6× (high-res tier)' },
      { dimension: 'Model architecture', enhanceai: 'aura-sr (transformer, 2024)', competitor: 'Multi-model ensemble (CNN-based)' },
      { dimension: 'Inference location', enhanceai: 'Cloud (fal.ai GPU)', competitor: 'Local GPU' },
      { dimension: 'Batch processing', enhanceai: 'No (planned)', competitor: 'Yes' },
      { dimension: 'Format support', enhanceai: 'JPG, PNG, WebP (≤5MB)', competitor: 'JPG, PNG, TIFF, RAW' },
      { dimension: 'Cancellable', enhanceai: 'Cancel anytime, no contract', competitor: 'Refund within 30 days' },
    ],
    testImages: [
      {
        label: 'Anime portrait (512×768)',
        inputUrl: '/demo-before.jpg',
        enhanceaiOutputUrl: '/demo-after.jpg',
        // TODO: upload to R2 forenhance/vs-test-images/anime-portrait-gigapixel.png
        competitorOutputUrl: '/demo-after.jpg',
      },
    ],
    pricing: {
      enhanceaiPerUpscale: 0.049, // $4.90 / 100
      competitorPerUpscale: 0, // amortized over lifetime — depends on use
    },
    verdict: `**Pick EnhanceAI if:** you upscale occasionally (1-10 images/month), want zero install, prefer subscription you can cancel, work primarily on a laptop without a discrete GPU, or want to try modern transformer-based super resolution.

**Pick Gigapixel if:** you upscale professionally (50+ images/month consistently), need TIFF or RAW input, want batch processing, are on a workstation with a strong NVIDIA GPU, or prefer one-time purchase over recurring spend.

**The break-even math:** If you upscale 20+ images/month and plan to use it for 2+ years, Gigapixel's $99 is cheaper. If you're occasional or one-time projects (restoring a family album, prepping a portfolio), EnhanceAI's $4.90 first month covers most use cases without the $99 commitment.

We don't think you "should" pick us. Pick the right tool for your workflow.`,
    faq: [
      {
        q: 'Is EnhanceAI\'s aura-sr actually better than Gigapixel\'s ensemble?',
        a: 'On modern photo sources, aura-sr produces sharper detail recovery in flat regions and skin textures. Gigapixel\'s "Very Compressed" model is still superior for low-bitrate JPEG sources. Test both on your specific image — quality differences depend heavily on input characteristics.',
      },
      {
        q: 'Can I migrate from Gigapixel to EnhanceAI mid-project?',
        a: 'Yes. Your source files are unchanged. The output PNG from either tool is just a high-res image. There\'s no project format lock-in.',
      },
      {
        q: 'Why does Gigapixel take so long to process?',
        a: 'Gigapixel runs locally — speed depends on your GPU. EnhanceAI runs on cloud GPUs (typically faster than a consumer machine) but adds network latency. Net, EnhanceAI is faster for small images, comparable for large.',
      },
    ],
  },
  // TODO: 4 more /vs/ pages (waifu2x, upscale-media, lets-enhance, topaz-photo-ai)
];
