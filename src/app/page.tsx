'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const EnhanceApp = dynamic(() => import('@/components/EnhanceApp'), {
  ssr: false,
  loading: () => (
    <div className="pt-28 pb-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="w-32 h-6 bg-dark-100 rounded-full mb-6 animate-pulse"></div>
            <div className="w-full h-14 bg-dark-100 rounded-xl mb-3 animate-pulse"></div>
            <div className="w-3/4 h-14 bg-dark-100 rounded-xl mb-6 animate-pulse"></div>
            <div className="w-2/3 h-5 bg-dark-50 rounded-lg mb-8 animate-pulse"></div>
            <div className="flex gap-4">
              <div className="w-40 h-14 bg-primary-100 rounded-xl animate-pulse"></div>
              <div className="w-32 h-14 bg-dark-100 rounded-xl animate-pulse"></div>
            </div>
          </div>
          <div className="w-full aspect-[4/3] bg-dark-100 rounded-2xl animate-pulse"></div>
        </div>
      </div>
    </div>
  ),
});

export default function Home() {
  return (
    <main className="min-h-screen bg-dark-50">
      {/* Interactive App */}
      <Suspense fallback={
        <div className="pt-28 pb-16 px-6 text-center">
          <h1 className="text-5xl font-extrabold text-dark-900 mb-4">AI Image Enhancement</h1>
          <p className="text-dark-400 text-lg">Loading...</p>
        </div>
      }>
        <EnhanceApp />
      </Suspense>

      {/* ════════════════════════════════════════════════════════════════
          STATIC MARKETING SECTIONS — Server-rendered, zero JS cost
          ════════════════════════════════════════════════════════════════ */}

      {/* ─── Features (only 3) ─── */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-primary-500 text-sm font-semibold tracking-wide uppercase mb-3">Core Technology</p>
            <h2 className="text-3xl md:text-4xl font-bold text-dark-900 tracking-tight">
              Three pillars of AI enhancement
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="card group hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-dark-900 mb-2">AI Super Resolution</h3>
              <p className="text-dark-500 text-sm leading-relaxed">
                Upscale images to 4× the original resolution. Our AI generates new pixels with realistic textures and sharp edges that traditional upscalers can&apos;t match.
              </p>
              <div className="mt-4 pt-4 border-t border-dark-100">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent"></span>
                  <span className="text-dark-400 text-xs font-medium">512px → 2048px in seconds</span>
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="card group hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 13.5V3.75m0 9.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 3.75V16.5m12-3V3.75m0 9.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 3.75V16.5m-6-9V3.75m0 3.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 9.75V10.5" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-dark-900 mb-2">Noise Reduction</h3>
              <p className="text-dark-500 text-sm leading-relaxed">
                Intelligently remove grain, compression artifacts, and digital noise while preserving important details. Clean, professional results every time.
              </p>
              <div className="mt-4 pt-4 border-t border-dark-100">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent"></span>
                  <span className="text-dark-400 text-xs font-medium">JPEG artifact removal built-in</span>
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="card group hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-dark-900 mb-2">Detail Enhancement</h3>
              <p className="text-dark-500 text-sm leading-relaxed">
                Recover lost textures, sharpen edges, and bring out fine details that were hidden in the original. Faces, text, and natural textures look stunning.
              </p>
              <div className="mt-4 pt-4 border-t border-dark-100">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent"></span>
                  <span className="text-dark-400 text-xs font-medium">AuraSR v2 neural network</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="px-6 py-20 bg-dark-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-primary-500 text-sm font-semibold tracking-wide uppercase mb-3">Simple Process</p>
            <h2 className="text-3xl md:text-4xl font-bold text-dark-900 tracking-tight">
              Three steps to stunning images
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-primary-200 via-primary-300 to-primary-200"></div>

            {/* Step 1 */}
            <div className="text-center relative">
              <div className="w-14 h-14 rounded-full bg-primary-500 text-white flex items-center justify-center mx-auto mb-5 text-lg font-bold shadow-btn relative z-10">
                1
              </div>
              <h3 className="text-lg font-bold text-dark-900 mb-2">Upload Image</h3>
              <p className="text-dark-500 text-sm leading-relaxed max-w-xs mx-auto">
                Drag & drop or click to upload. Supports JPG, PNG, and WebP up to 5MB.
              </p>
              <div className="mt-4 w-16 h-16 mx-auto rounded-xl bg-white shadow-card flex items-center justify-center">
                <svg className="w-7 h-7 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
            </div>

            {/* Step 2 */}
            <div className="text-center relative">
              <div className="w-14 h-14 rounded-full bg-primary-500 text-white flex items-center justify-center mx-auto mb-5 text-lg font-bold shadow-btn relative z-10">
                2
              </div>
              <h3 className="text-lg font-bold text-dark-900 mb-2">AI Enhances</h3>
              <p className="text-dark-500 text-sm leading-relaxed max-w-xs mx-auto">
                AuraSR v2 AI analyzes your image and generates enhanced pixels in 5-10 seconds.
              </p>
              <div className="mt-4 w-16 h-16 mx-auto rounded-xl bg-white shadow-card flex items-center justify-center">
                <svg className="w-7 h-7 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
            </div>

            {/* Step 3 */}
            <div className="text-center relative">
              <div className="w-14 h-14 rounded-full bg-accent text-white flex items-center justify-center mx-auto mb-5 text-lg font-bold shadow-glow-accent relative z-10">
                3
              </div>
              <h3 className="text-lg font-bold text-dark-900 mb-2">Download Result</h3>
              <p className="text-dark-500 text-sm leading-relaxed max-w-xs mx-auto">
                Get your enhanced image instantly. Download in preview or full 4× HD resolution.
              </p>
              <div className="mt-4 w-16 h-16 mx-auto rounded-xl bg-white shadow-card flex items-center justify-center">
                <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Use Cases ─── */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-primary-500 text-sm font-semibold tracking-wide uppercase mb-3">Use Cases</p>
            <h2 className="text-3xl md:text-4xl font-bold text-dark-900 tracking-tight">
              Perfect for every scenario
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {[
              {
                icon: (
                  <svg className="w-6 h-6 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                ),
                title: 'Portrait & Selfies',
                desc: 'Enhance facial details, skin textures, and hair with AI that understands human features.',
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                ),
                title: 'E-Commerce',
                desc: 'Make product images crystal clear for your online store. Higher quality images drive more conversions.',
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                  </svg>
                ),
                title: 'Old Photos',
                desc: 'Breathe new life into vintage and low-resolution family photos. Preserve memories in stunning clarity.',
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                  </svg>
                ),
                title: 'AI Art & Digital',
                desc: 'Upscale AI-generated art, game textures, and digital illustrations to print-ready resolutions.',
              },
            ].map((item, i) => (
              <div key={i} className="card group hover:-translate-y-1 flex gap-5">
                <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-base font-bold text-dark-900 mb-1">{item.title}</h3>
                  <p className="text-dark-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Trust & Social Proof ─── */}
      <section className="px-6 py-20 bg-dark-50">
        <div className="max-w-5xl mx-auto">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            {[
              { value: '500K+', label: 'Images Enhanced' },
              { value: '50K+', label: 'Happy Users' },
              { value: '4×', label: 'Resolution Upscale' },
              { value: '<10s', label: 'Processing Time' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl md:text-4xl font-extrabold text-dark-900 tracking-tight">{stat.value}</p>
                <p className="text-dark-400 text-sm font-medium mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Testimonials */}
          <div className="text-center mb-10">
            <p className="text-primary-500 text-sm font-semibold tracking-wide uppercase mb-3">What Users Say</p>
            <h2 className="text-3xl md:text-4xl font-bold text-dark-900 tracking-tight">
              Trusted by creators worldwide
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: 'I use EnhanceAI daily for my e-commerce store. Product photos look 10x better after enhancement. My conversion rate went up noticeably.',
                name: 'Sarah M.',
                role: 'Shopify Store Owner',
              },
              {
                quote: 'As a photographer, I was skeptical. But the detail recovery on old film scans is genuinely impressive. It saved dozens of family photos.',
                name: 'David K.',
                role: 'Freelance Photographer',
              },
              {
                quote: 'Super fast and the results are amazing. I enhanced my AI-generated art to print quality in seconds. Best tool I\'ve found for this.',
                name: 'Alex T.',
                role: 'Digital Artist',
              },
            ].map((t, i) => (
              <div key={i} className="card">
                <div className="flex gap-0.5 mb-4">
                  {[1,2,3,4,5].map(s => (
                    <svg key={s} className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20">
                      <path d="M10 1l2.39 6.17H19l-5.3 4.09L15.78 17.5 10 13.84 4.22 17.5l2.08-6.24L1 7.17h6.61z"/>
                    </svg>
                  ))}
                </div>
                <p className="text-dark-600 text-sm leading-relaxed mb-4">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3 pt-4 border-t border-dark-100">
                  <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-600 text-sm font-semibold">{t.name[0]}</span>
                  </div>
                  <div>
                    <p className="text-dark-900 text-sm font-semibold">{t.name}</p>
                    <p className="text-dark-400 text-xs">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* AI explainer */}
          <div className="mt-12 bg-white rounded-2xl p-8 shadow-card border border-dark-100 flex flex-col md:flex-row items-center gap-6">
            <div className="w-14 h-14 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
              <svg className="w-7 h-7 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-dark-900 mb-1">Powered by AuraSR v2</h3>
              <p className="text-dark-500 text-sm leading-relaxed">
                Our enhancement engine uses AuraSR v2 — a state-of-the-art neural network trained on millions of image pairs.
                It doesn&apos;t just interpolate pixels; it <strong>generates</strong> realistic detail that wasn&apos;t in the original,
                producing results indistinguishable from natively high-resolution images.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-primary-500 text-sm font-semibold tracking-wide uppercase mb-3">FAQ</p>
            <h2 className="text-3xl md:text-4xl font-bold text-dark-900 tracking-tight">
              Frequently asked questions
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: 'What is AI image enhancement?',
                a: 'AI image enhancement uses deep learning models to intelligently upscale images, recovering fine details, removing noise, and sharpening edges that traditional methods can\'t achieve.',
              },
              {
                q: 'How much does it cost?',
                a: 'EnhanceAI offers 3 free enhancements total. For heavy users, our Pro plan starts at $4.9/month with 100 enhancements per month and up to 8× upscaling.',
              },
              {
                q: 'What image formats are supported?',
                a: 'We support JPEG, PNG, and WebP formats. Maximum file size is 5MB. The enhanced image is available in both compressed preview and full-resolution download.',
              },
              {
                q: 'Is my data safe?',
                a: 'Absolutely. Images are processed in real-time on secure edge servers. We don\'t permanently store your original or enhanced images on our servers.',
              },
              {
                q: 'How does the 4× upscaling work?',
                a: 'We use AuraSR v2, a state-of-the-art super-resolution AI model. It analyzes your image and generates new pixels with realistic details, effectively quadrupling the resolution (2× width and 2× height).',
              },
            ].map((faq, i) => (
              <details key={i} className="group">
                <summary className="flex items-center justify-between p-5 cursor-pointer bg-dark-50 rounded-xl hover:bg-dark-100/80 transition-colors font-medium text-dark-900">
                  <span className="text-sm">{faq.q}</span>
                  <svg className="w-5 h-5 text-dark-400 group-open:rotate-180 transition-transform flex-shrink-0 ml-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </summary>
                <div className="px-5 pb-5 pt-2 text-dark-500 text-sm leading-relaxed">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="px-6 py-20 bg-dark-900 relative overflow-hidden">
        {/* Subtle bg element */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500 rounded-full blur-[128px]"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary-600 rounded-full blur-[128px]"></div>
        </div>

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
            Ready to enhance your images?
          </h2>
          <p className="text-dark-300 text-lg mb-8 max-w-xl mx-auto">
            Join 50,000+ users who trust EnhanceAI for stunning image quality. Start free — no credit card required.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="#enhance-section"
              className="px-8 py-4 bg-white text-dark-900 rounded-xl font-semibold text-base hover:bg-dark-50 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
            >
              Get Started Free
            </a>
            <Link
              href="/pricing"
              className="px-8 py-4 bg-transparent text-white border border-dark-600 rounded-xl font-semibold text-base hover:border-dark-400 hover:bg-white/5 transition-all"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-dark-950 px-6 py-12">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <p className="font-bold text-lg text-white tracking-tight">
              <span className="text-primary-400">Enhance</span>AI
            </p>
            <p className="text-dark-400 text-sm mt-1">AI-powered image enhancement & super resolution</p>
          </div>
          <div className="flex gap-6 text-sm">
            <Link href="/pricing" className="text-dark-400 hover:text-white transition-colors font-medium">Pricing</Link>
            <a href="mailto:support@enhanceai.online" className="text-dark-400 hover:text-white transition-colors font-medium">Contact</a>
          </div>
          <p className="text-dark-600 text-xs">© 2025 EnhanceAI. All rights reserved.</p>
        </div>
      </footer>
    </main>
  )
}
