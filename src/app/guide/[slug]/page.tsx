import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BrandLayout } from '@/components/templates/BrandLayout';
import { HubPageLayout } from '@/components/templates/HubPageLayout';
import { getAllHubSlugs, getHub } from '@/lib/content/hubs';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://enhanceai.online';

interface Params {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllHubSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const hub = getHub(slug);
  if (!hub) return {};

  const url = `${SITE_URL}/guide/${slug}`;
  return {
    title: hub.frontmatter.title,
    description: hub.frontmatter.description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: hub.frontmatter.title,
      description: hub.frontmatter.description,
      publishedTime: hub.frontmatter.date,
      authors: [hub.frontmatter.author || 'EnhanceAI'],
    },
    twitter: {
      card: 'summary_large_image',
      title: hub.frontmatter.title,
      description: hub.frontmatter.description,
    },
  };
}

export default async function GuidePage({ params }: Params) {
  const { slug } = await params;
  const hub = getHub(slug);
  if (!hub) notFound();

  return (
    <BrandLayout>
      <HubPageLayout hub={hub} />
    </BrandLayout>
  );
}
