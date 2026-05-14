import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { HubArticle } from '@/lib/content/hubs';
import { JsonLd } from '@/components/schema/JsonLd';
import {
  buildArticleSchema,
  buildBreadcrumbSchema,
} from '@/components/schema/builders';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://enhanceai.online';

interface Props {
  hub: HubArticle;
}

export function HubPageLayout({ hub }: Props) {
  const pageUrl = `${SITE_URL}/guide/${hub.slug}`;

  const articleSchema = buildArticleSchema({
    headline: hub.frontmatter.title,
    description: hub.frontmatter.description,
    datePublished: hub.frontmatter.date,
    author: hub.frontmatter.author,
    url: pageUrl,
  });

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'EnhanceAI', url: SITE_URL },
    { name: 'Guides', url: `${SITE_URL}/guide` },
    { name: hub.frontmatter.title, url: pageUrl },
  ]);

  return (
    <article className="max-w-[680px] mx-auto px-6 py-16">
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumbSchema} />

      <header className="mb-12">
        <div
          className="text-xs uppercase tracking-wider mb-3"
          style={{ color: 'var(--text-faint)' }}
          data-mono
        >
          {new Date(hub.frontmatter.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}{' '}
          · {(hub.frontmatter.author || 'EnhanceAI').toUpperCase()}
        </div>

        <h1
          className="text-4xl md:text-5xl mb-4 leading-tight"
          style={{ color: 'var(--text)' }}
        >
          {hub.frontmatter.title}
        </h1>

        <p
          className="text-lg leading-relaxed"
          style={{ color: 'var(--text-muted)' }}
        >
          {hub.frontmatter.description}
        </p>
      </header>

      <div className="prose-brand">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h2: (props) => (
              <h2
                className="text-2xl md:text-3xl mt-12 mb-4"
                style={{ color: 'var(--text)' }}
                {...props}
              />
            ),
            h3: (props) => (
              <h3
                className="text-xl md:text-2xl mt-8 mb-3"
                style={{ color: 'var(--text)' }}
                {...props}
              />
            ),
            p: (props) => (
              <p
                className="text-base leading-relaxed mb-4"
                style={{ color: 'var(--text-muted)' }}
                {...props}
              />
            ),
            a: (props) => (
              <a
                style={{ color: 'var(--brand)' }}
                className="hover:opacity-70 transition-opacity underline underline-offset-4"
                {...props}
              />
            ),
            ul: (props) => (
              <ul
                className="list-disc list-outside ml-6 mb-4 space-y-2"
                style={{ color: 'var(--text-muted)' }}
                {...props}
              />
            ),
            ol: (props) => (
              <ol
                className="list-decimal list-outside ml-6 mb-4 space-y-2"
                style={{ color: 'var(--text-muted)' }}
                {...props}
              />
            ),
            li: (props) => (
              <li className="leading-relaxed" {...props} />
            ),
            strong: (props) => (
              <strong style={{ color: 'var(--text)' }} {...props} />
            ),
          }}
        >
          {hub.content}
        </ReactMarkdown>
      </div>

      <footer
        className="mt-16 pt-8 border-t flex items-center justify-between"
        style={{ borderColor: 'var(--border)' }}
      >
        <p style={{ color: 'var(--text-muted)' }} className="text-sm">
          Ready to try it on your own image?
        </p>
        <Link href="/" className="btn-brand">
          Upscale free
        </Link>
      </footer>
    </article>
  );
}
