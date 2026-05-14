import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BrandLayout } from '@/components/templates/BrandLayout';
import { SpokePageLayout } from '@/components/templates/SpokePageLayout';
import { getAllUpscaleSpokes, getUpscaleSpoke } from '@/lib/content/spokes';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://enhanceai.online';

interface Params {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllUpscaleSpokes().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const spoke = getUpscaleSpoke(slug);
  if (!spoke) return {};

  const url = `${SITE_URL}/upscale/${slug}`;
  return {
    title: spoke.h1,
    description: spoke.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title: spoke.h1,
      description: spoke.metaDescription,
    },
  };
}

export default async function UpscaleSpokePage({ params }: Params) {
  const { slug } = await params;
  const spoke = getUpscaleSpoke(slug);
  if (!spoke) notFound();

  return (
    <BrandLayout>
      <SpokePageLayout spoke={spoke} category="upscale" />
    </BrandLayout>
  );
}
