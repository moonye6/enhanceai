/**
 * Inline JSON-LD structured data for SEO + AI search engines
 * (Google AI Overviews, Perplexity, ChatGPT Search).
 *
 * Per CEO D7 ADD — all hub / spoke / compare pages embed schema.
 * See builders.ts for the typed builders.
 */

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
