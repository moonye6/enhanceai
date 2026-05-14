/**
 * Content schema for SEO pages.
 * Hub articles use MDX (see content/guides/*.mdx).
 * Spoke pages use TS data arrays — see types below.
 */

export interface FaqItem {
  q: string;
  a: string;
}

export interface ExamplePair {
  beforeUrl: string;
  afterUrl: string;
  alt: string;
  caption?: string;
}

/** Upscale spoke — /upscale/[slug] */
export interface UpscaleSpoke {
  slug: string;
  h1: string;
  subtitle: string;
  /** 1-line, used for <meta description> (≤155 chars) */
  metaDescription: string;
  /** 200-300 word use-case story (markdown allowed) */
  useCaseStory: string;
  examples: ExamplePair[];
  faq: FaqItem[];
  /** Hub slugs to link UP to (PageRank flow) */
  relatedHubs: string[];
  /** Optional: subject-specific tips (3-5 bullets) */
  tips?: string[];
}

/** Restore spoke — /restore/[slug] */
export interface RestoreSpoke {
  slug: string;
  h1: string;
  subtitle: string;
  metaDescription: string;
  useCaseStory: string;
  examples: ExamplePair[];
  faq: FaqItem[];
  relatedHubs: string[];
  tips?: string[];
}

/** Compare spoke — /vs/[competitor]. Deep page per CEO D8 ADD. */
export interface CompareSpoke {
  slug: string;
  competitorName: string;
  competitorPrice: string;
  competitorPriceUnit: 'one-time' | 'monthly' | 'yearly' | 'free';
  h1: string;
  subtitle: string;
  metaDescription: string;
  /** 500-1000 word intro: why this comparison matters */
  intro: string;
  /** Side-by-side comparison rows */
  comparisonTable: Array<{
    dimension: string;
    enhanceai: string;
    competitor: string;
  }>;
  /** Real test image comparison: same input, both upscalers */
  testImages: Array<{
    label: string;
    inputUrl: string;
    enhanceaiOutputUrl: string;
    competitorOutputUrl: string;
  }>;
  /** Price calculator params (per upscale cost) */
  pricing: {
    enhanceaiPerUpscale: number; // $0.049 for $4.90/100
    competitorPerUpscale: number;
  };
  /** 500+ word verdict: when to pick enhanceai, when to pick competitor (honest) */
  verdict: string;
  faq: FaqItem[];
}

export type SpokeType = 'upscale' | 'restore' | 'vs';
