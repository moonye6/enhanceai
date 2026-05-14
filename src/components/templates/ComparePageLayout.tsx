import Link from 'next/link';
import Image from 'next/image';
import type { CompareSpoke } from '@/lib/content/types';
import { JsonLd } from '@/components/schema/JsonLd';
import {
  buildFaqSchema,
  buildComparisonSchema,
  buildBreadcrumbSchema,
} from '@/components/schema/builders';
import { PriceCalculator } from '@/components/shared/PriceCalculator';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://enhanceai.online';

interface Props {
  spoke: CompareSpoke;
}

export function ComparePageLayout({ spoke }: Props) {
  const pageUrl = `${SITE_URL}/vs/${spoke.slug}`;

  return (
    <div className="max-w-[1080px] mx-auto px-6 py-16">
      <JsonLd data={buildFaqSchema(spoke.faq)} />
      <JsonLd data={buildComparisonSchema(spoke, pageUrl)} />
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: 'EnhanceAI', url: SITE_URL },
          { name: 'Compared', url: `${SITE_URL}/vs` },
          { name: `vs ${spoke.competitorName}`, url: pageUrl },
        ])}
      />

      {/* Hero */}
      <header className="mb-16 max-w-[800px]">
        <div
          className="text-xs uppercase tracking-wider mb-3"
          style={{ color: 'var(--brand)' }}
          data-mono
        >
          HONEST COMPARISON · UPDATED {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short' }).toUpperCase()}
        </div>
        <h1
          className="text-3xl md:text-5xl leading-tight mb-4"
          style={{ color: 'var(--text)' }}
        >
          {spoke.h1}
        </h1>
        <p
          className="text-lg md:text-xl leading-relaxed"
          style={{ color: 'var(--text-muted)' }}
        >
          {spoke.subtitle}
        </p>
      </header>

      {/* Intro */}
      <section className="mb-16 max-w-[680px]">
        <div
          className="text-base leading-relaxed whitespace-pre-line"
          style={{ color: 'var(--text)' }}
        >
          {spoke.intro}
        </div>
      </section>

      {/* Comparison Table */}
      <section className="mb-16">
        <h2
          className="text-2xl md:text-3xl mb-6"
          style={{ color: 'var(--text)' }}
        >
          Side-by-side
        </h2>
        <div className="surface overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th
                  className="p-4 text-xs uppercase tracking-wider"
                  style={{ color: 'var(--text-faint)' }}
                  data-mono
                >
                  Dimension
                </th>
                <th
                  className="p-4 text-xs uppercase tracking-wider"
                  style={{ color: 'var(--brand)' }}
                  data-mono
                >
                  EnhanceAI
                </th>
                <th
                  className="p-4 text-xs uppercase tracking-wider"
                  style={{ color: 'var(--text-faint)' }}
                  data-mono
                >
                  {spoke.competitorName}
                </th>
              </tr>
            </thead>
            <tbody>
              {spoke.comparisonTable.map((row, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom:
                      i < spoke.comparisonTable.length - 1
                        ? '1px solid var(--border)'
                        : 'none',
                  }}
                >
                  <td
                    className="p-4 text-sm font-medium"
                    style={{ color: 'var(--text)' }}
                  >
                    {row.dimension}
                  </td>
                  <td
                    className="p-4 text-sm"
                    style={{ color: 'var(--text)' }}
                    data-mono
                  >
                    {row.enhanceai}
                  </td>
                  <td
                    className="p-4 text-sm"
                    style={{ color: 'var(--text-muted)' }}
                    data-mono
                  >
                    {row.competitor}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Test Images */}
      {spoke.testImages.length > 0 && (
        <section className="mb-16">
          <h2
            className="text-2xl md:text-3xl mb-2"
            style={{ color: 'var(--text)' }}
          >
            Real test images
          </h2>
          <p
            className="text-sm mb-6"
            style={{ color: 'var(--text-muted)' }}
          >
            Same input, both upscalers. Inspect at 100%.
          </p>
          {spoke.testImages.map((tst, i) => (
            <div key={i} className="surface p-4 mb-4">
              <div
                className="text-sm mb-3"
                data-mono
                style={{ color: 'var(--text-muted)' }}
              >
                {tst.label}
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <figure>
                  <div
                    className="relative aspect-square"
                    style={{ background: 'var(--bg-subtle)' }}
                  >
                    <Image
                      src={tst.inputUrl}
                      alt="Input"
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  <figcaption
                    className="text-xs mt-2 text-center"
                    data-mono
                    style={{ color: 'var(--text-faint)' }}
                  >
                    INPUT
                  </figcaption>
                </figure>
                <figure>
                  <div
                    className="relative aspect-square"
                    style={{ background: 'var(--bg-subtle)' }}
                  >
                    <Image
                      src={tst.enhanceaiOutputUrl}
                      alt="EnhanceAI output"
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  <figcaption
                    className="text-xs mt-2 text-center"
                    data-mono
                    style={{ color: 'var(--brand)' }}
                  >
                    ENHANCEAI 4×
                  </figcaption>
                </figure>
                <figure>
                  <div
                    className="relative aspect-square"
                    style={{ background: 'var(--bg-subtle)' }}
                  >
                    <Image
                      src={tst.competitorOutputUrl}
                      alt={`${spoke.competitorName} output`}
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  <figcaption
                    className="text-xs mt-2 text-center"
                    data-mono
                    style={{ color: 'var(--text-faint)' }}
                  >
                    {spoke.competitorName.toUpperCase()}
                  </figcaption>
                </figure>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Price Calculator */}
      <section className="mb-16 max-w-[680px]">
        <h2
          className="text-2xl md:text-3xl mb-2"
          style={{ color: 'var(--text)' }}
        >
          Cost per upscale
        </h2>
        <p
          className="text-sm mb-6"
          style={{ color: 'var(--text-muted)' }}
        >
          Slide to your monthly volume. Calculator assumes amortizing
          one-time costs over 24 months.
        </p>
        <PriceCalculator
          enhanceaiPerUpscale={spoke.pricing.enhanceaiPerUpscale}
          competitorName={spoke.competitorName}
          competitorPrice={spoke.competitorPrice}
          competitorPriceUnit={spoke.competitorPriceUnit}
          competitorPerUpscale={spoke.pricing.competitorPerUpscale}
        />
      </section>

      {/* Verdict */}
      <section className="mb-16 max-w-[680px]">
        <h2
          className="text-2xl md:text-3xl mb-6"
          style={{ color: 'var(--text)' }}
        >
          The honest verdict
        </h2>
        <div
          className="text-base leading-relaxed whitespace-pre-line"
          style={{ color: 'var(--text)' }}
        >
          {spoke.verdict}
        </div>
      </section>

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

      {/* CTA */}
      <div
        className="surface p-8 text-center"
        style={{ borderColor: 'var(--brand)' }}
      >
        <h3
          className="text-xl mb-2"
          style={{ color: 'var(--text)' }}
        >
          Test it on your own image
        </h3>
        <p
          className="text-sm mb-6"
          style={{ color: 'var(--text-muted)' }}
        >
          3 free upscales, no signup. Compare side-by-side with your current tool.
        </p>
        <Link href="/" className="btn-brand">
          Try EnhanceAI free
        </Link>
      </div>
    </div>
  );
}
