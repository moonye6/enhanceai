import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BrandLayout } from '@/components/templates/BrandLayout';
import { ComparePageLayout } from '@/components/templates/ComparePageLayout';
import { getAllCompareSpokes, getCompareSpoke } from '@/lib/content/spokes';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://enhanceai.online';

interface Params {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllCompareSpokes().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const spoke = getCompareSpoke(slug);
  if (!spoke) return {};

  const url = `${SITE_URL}/vs/${slug}`;
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

export default async function CompareSpokePage({ params }: Params) {
  const { slug } = await params;
  const spoke = getCompareSpoke(slug);
  if (!spoke) notFound();

  return (
    <BrandLayout>
      <ComparePageLayout spoke={spoke} />
    </BrandLayout>
  );
}
