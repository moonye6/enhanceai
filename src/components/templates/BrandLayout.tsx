import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Wraps all brand-themed SEO pages. Applies .brand-theme (dark default,
 * Fraunces+Geist fonts via CSS variables). Adds nav + footer.
 *
 * Per DESIGN.md page-type specs:
 *   /guide/[slug]     → use HubPageLayout inside this
 *   /upscale/[slug]   → use SpokePageLayout
 *   /restore/[slug]   → use SpokePageLayout
 *   /vs/[slug]        → use ComparePageLayout
 *   /tool/*           → use this directly (custom inner)
 */

export function BrandLayout({ children }: { children: ReactNode }) {
  return (
    <div className="brand-theme min-h-screen flex flex-col">
      <BrandNav />
      <main className="flex-1">{children}</main>
      <BrandFooter />
    </div>
  );
}

function BrandNav() {
  return (
    <nav
      className="border-b sticky top-0 z-40 backdrop-blur-md"
      style={{
        background: 'color-mix(in srgb, var(--bg) 80%, transparent)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="max-w-[1140px] mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="text-lg tracking-tight font-medium"
          style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}
        >
          enhance<span style={{ color: 'var(--brand)' }}>ai</span>
        </Link>

        <div className="flex items-center gap-8 text-sm">
          <Link
            href="/guide/best-ai-image-upscaler-2026"
            className="hover:opacity-70 transition-opacity"
            style={{ color: 'var(--text-muted)' }}
          >
            Guides
          </Link>
          <Link
            href="/vs/gigapixel-ai"
            className="hover:opacity-70 transition-opacity"
            style={{ color: 'var(--text-muted)' }}
          >
            Comparisons
          </Link>
          <Link
            href="/tool/image-quality-inspector"
            className="hover:opacity-70 transition-opacity"
            style={{ color: 'var(--text-muted)' }}
          >
            Tools
          </Link>
          <Link href="/" className="btn-brand">
            Try free
          </Link>
        </div>
      </div>
    </nav>
  );
}

function BrandFooter() {
  return (
    <footer
      className="border-t mt-24"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="max-w-[1140px] mx-auto px-6 lg:px-12 py-12 grid md:grid-cols-3 gap-8 text-sm">
        <div>
          <div
            className="text-base mb-3 font-medium"
            style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}
          >
            enhance<span style={{ color: 'var(--brand)' }}>ai</span>
          </div>
          <p style={{ color: 'var(--text-muted)' }} className="leading-relaxed">
            Modern AI image upscaling. Built for creators. No $99 lock-in.
          </p>
        </div>

        <div>
          <div
            className="uppercase tracking-wider text-xs mb-3"
            style={{ color: 'var(--text-faint)' }}
          >
            Product
          </div>
          <ul className="space-y-2" style={{ color: 'var(--text-muted)' }}>
            <li>
              <Link href="/" className="hover:opacity-70 transition-opacity">
                Upscale a photo
              </Link>
            </li>
            <li>
              <Link
                href="/tool/image-quality-inspector"
                className="hover:opacity-70 transition-opacity"
              >
                Image Quality Inspector
              </Link>
            </li>
            <li>
              <Link
                href="/pricing"
                className="hover:opacity-70 transition-opacity"
              >
                Pricing
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <div
            className="uppercase tracking-wider text-xs mb-3"
            style={{ color: 'var(--text-faint)' }}
          >
            Learn
          </div>
          <ul className="space-y-2" style={{ color: 'var(--text-muted)' }}>
            <li>
              <Link
                href="/guide/best-ai-image-upscaler-2026"
                className="hover:opacity-70 transition-opacity"
              >
                Best AI image upscaler (2026)
              </Link>
            </li>
            <li>
              <Link
                href="/vs/gigapixel-ai"
                className="hover:opacity-70 transition-opacity"
              >
                vs Gigapixel AI
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
