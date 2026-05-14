import type { MetadataRoute } from 'next';
import { getAllHubSlugs } from '@/lib/content/hubs';
import { getAllSpokeSlugs } from '@/lib/content/spokes';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://enhanceai.online';
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${siteUrl}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${siteUrl}/tool/image-quality-inspector`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
  ];

  const hubPages: MetadataRoute.Sitemap = getAllHubSlugs().map((slug) => ({
    url: `${siteUrl}/guide/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.9,
  }));

  const spokes = getAllSpokeSlugs();
  const upscalePages: MetadataRoute.Sitemap = spokes.upscale.map((slug) => ({
    url: `${siteUrl}/upscale/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));
  const restorePages: MetadataRoute.Sitemap = spokes.restore.map((slug) => ({
    url: `${siteUrl}/restore/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));
  const vsPages: MetadataRoute.Sitemap = spokes.vs.map((slug) => ({
    url: `${siteUrl}/vs/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  return [...staticPages, ...hubPages, ...upscalePages, ...restorePages, ...vsPages];
}
