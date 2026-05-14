import type { FaqItem, CompareSpoke } from '@/lib/content/types';

/**
 * Schema.org JSON-LD builders. Pure functions, no React.
 *
 * Validate output at https://search.google.com/test/rich-results after
 * each new template — manual smoke check post-deploy per Section 6 test plan.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://enhanceai.online';

/** FAQPage — for hub articles and spoke pages with FAQ blocks */
export function buildFaqSchema(items: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };
}

/** HowTo — for spoke "tips" sections and tutorial hubs */
export function buildHowToSchema(args: {
  name: string;
  description: string;
  steps: Array<{ name: string; text: string; url?: string }>;
  totalTime?: string; // ISO 8601 duration e.g. "PT5M"
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: args.name,
    description: args.description,
    ...(args.totalTime ? { totalTime: args.totalTime } : {}),
    step: args.steps.map((step, idx) => ({
      '@type': 'HowToStep',
      position: idx + 1,
      name: step.name,
      text: step.text,
      ...(step.url ? { url: step.url } : {}),
    })),
  };
}

/** Article — for hub guides */
export function buildArticleSchema(args: {
  headline: string;
  description: string;
  datePublished: string;
  dateModified?: string;
  author?: string;
  url: string;
  imageUrl?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: args.headline,
    description: args.description,
    datePublished: args.datePublished,
    dateModified: args.dateModified || args.datePublished,
    author: {
      '@type': 'Organization',
      name: args.author || 'EnhanceAI',
    },
    publisher: {
      '@type': 'Organization',
      name: 'EnhanceAI',
      url: SITE_URL,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': args.url,
    },
    ...(args.imageUrl ? { image: args.imageUrl } : {}),
  };
}

/** ItemList for comparison tables — Google reads as rich result on /vs/ */
export function buildComparisonSchema(spoke: CompareSpoke, pageUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${spoke.h1} — Feature Comparison`,
    description: spoke.metaDescription,
    url: pageUrl,
    itemListElement: [
      {
        '@type': 'SoftwareApplication',
        position: 1,
        name: 'EnhanceAI',
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Web',
        url: SITE_URL,
        offers: {
          '@type': 'Offer',
          price: '4.90',
          priceCurrency: 'USD',
        },
      },
      {
        '@type': 'SoftwareApplication',
        position: 2,
        name: spoke.competitorName,
        applicationCategory: 'MultimediaApplication',
        offers: {
          '@type': 'Offer',
          price: spoke.competitorPrice.replace(/[^0-9.]/g, ''),
          priceCurrency: 'USD',
        },
      },
    ],
  };
}

/** BreadcrumbList — for nested routes like /upscale/anime-art */
export function buildBreadcrumbSchema(
  items: Array<{ name: string; url: string }>,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
