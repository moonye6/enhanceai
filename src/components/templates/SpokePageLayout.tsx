import Link from 'next/link';
import Image from 'next/image';
import type { UpscaleSpoke, RestoreSpoke } from '@/lib/content/types';
import { JsonLd } from '@/components/schema/JsonLd';
import {
  buildFaqSchema,
  buildBreadcrumbSchema,
} from '@/components/schema/builders';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://enhanceai.online';

type AnySpoke = UpscaleSpoke | RestoreSpoke;

interface Props {
  spoke: AnySpoke;
  /** URL prefix: "upscale" or "restore" */
  category: 'upscale' | 'restore';
}

export function SpokePageLayout({ spoke, category }: Props) {
  const pageUrl = `${SITE_URL}/${category}/${spoke.slug}`;

  return (
    <div className="max-w-[1080px] mx-auto px-6 py-16">
      <JsonLd data={buildFaqSchema(spoke.faq)} />
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: 'EnhanceAI', url: SITE_URL },
          {
            name: category === 'upscale' ? 'Upscale' : 'Restore',
            url: `${SITE_URL}/${category}`,
          },
          { name: spoke.h1, url: pageUrl },
        ])}
      />

      {/* Hero */}
      <header className="mb-16">
        <h1
          className="text-3xl md:text-4xl lg:text-5xl leading-tight mb-4"
          style={{ color: 'var(--text)' }}
        >
          {spoke.h1}
        </h1>
        <p
          className="text-lg md:text-xl leading-relaxed max-w-[640px]"
          style={{ color: 'var(--text-muted)' }}
        >
          {spoke.subtitle}
        </p>
        <div className="mt-6">
          <Link href="/" className="btn-brand">
            Try it free → 3 upscales, no signup
          </Link>
        </div>
      </header>

      {/* Use case story */}
      <section className="mb-16 max-w-[680px]">
        <h2
          className="text-2xl md:text-3xl mb-4"
          style={{ color: 'var(--text)' }}
        >
          When to use this
        </h2>
        <div
          className="text-base leading-relaxed whitespace-pre-line"
          style={{ color: 'var(--text-muted)' }}
        >
          {spoke.useCaseStory}
        </div>
      </section>

      {/* Examples */}
      <section className="mb-16">
        <h2
          className="text-2xl md:text-3xl mb-6"
          style={{ color: 'var(--text)' }}
        >
          Real examples
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {spoke.examples.map((ex, i) => (
            <figure key={i} className="surface overflow-hidden">
              <div className="grid grid-cols-2 gap-px" style={{ background: 'var(--border)' }}>
                <div
                  className="relative aspect-[3/4]"
                  style={{ background: 'var(--bg-subtle)' }}
                >
                  <Image
                    src={ex.beforeUrl}
                    alt={`${ex.alt} (before)`}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                  <div
                    className="absolute top-2 left-2 text-xs px-2 py-1"
                    data-mono
                    style={{
                      background: 'var(--bg)',
                      color: 'var(--text-muted)',
                      borderRadius: '4px',
                    }}
                  >
                    BEFORE
                  </div>
                </div>
                <div
                  className="relative aspect-[3/4]"
                  style={{ background: 'var(--bg-subtle)' }}
                >
                  <Image
                    src={ex.afterUrl}
                    alt={`${ex.alt} (after)`}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                  <div
                    className="absolute top-2 right-2 text-xs px-2 py-1"
                    data-mono
                    style={{
                      background: 'var(--brand)',
                      color: '#0E0E10',
                      borderRadius: '4px',
                    }}
                  >
                    AFTER 4×
                  </div>
                </div>
              </div>
              {ex.caption && (
                <figcaption
                  className="text-sm p-4"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {ex.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      </section>

      {/* Tips */}
      {spoke.tips && spoke.tips.length > 0 && (
        <section className="mb-16 max-w-[680px]">
          <h2
            className="text-2xl md:text-3xl mb-4"
            style={{ color: 'var(--text)' }}
          >
            Tips
          </h2>
          <ul className="space-y-3">
            {spoke.tips.map((tip, i) => (
              <li
                key={i}
                className="flex gap-3 text-base leading-relaxed"
                style={{ color: 'var(--text-muted)' }}
              >
                <span style={{ color: 'var(--brand)' }} data-mono>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* FAQ */}
      <section className="mb-16 max-w-[680px]">
        <h2
          className="text-2xl md:text-3xl mb-6"
          style={{ color: 'var(--text)' }}
        >
          Frequently asked
        </h2>
        <dl className="space-y-6">
          {spoke.faq.map((item, i) => (
            <div
              key={i}
              className="pb-6 border-b last:border-b-0"
              style={{ borderColor: 'var(--border)' }}
            >
              <dt
                className="text-lg mb-2 font-medium"
                style={{ color: 'var(--text)' }}
              >
                {item.q}
              </dt>
              <dd
                className="text-base leading-relaxed"
                style={{ color: 'var(--text-muted)' }}
              >
                {item.a}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Related hubs */}
      {spoke.relatedHubs.length > 0 && (
        <section className="mb-16 max-w-[680px]">
          <div
            className="text-xs uppercase tracking-wider mb-3"
            style={{ color: 'var(--text-faint)' }}
            data-mono
          >
            Read next
          </div>
          <ul className="space-y-2">
            {spoke.relatedHubs.map((slug) => (
              <li key={slug}>
                <Link
                  href={`/guide/${slug}`}
                  className="text-base hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--brand)' }}
                >
                  → /guide/{slug}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Sticky bottom CTA */}
      <div
        className="surface p-8 text-center"
        style={{ borderColor: 'var(--brand)' }}
      >
        <p
          className="text-lg mb-4"
          style={{ color: 'var(--text)' }}
          data-mono
        >
          {spoke.metaDescription}
        </p>
        <Link href="/" className="btn-brand">
          Try EnhanceAI free
        </Link>
      </div>
    </div>
  );
}
