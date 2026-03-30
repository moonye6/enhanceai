'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// Lazy-load the heavy interactive client component — not included in initial JS bundle
const EnhanceApp = dynamic(() => import('@/components/EnhanceApp'), {
  ssr: false,
  loading: () => (
    <div className="pt-28 pb-12 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">AI Image Enhancement</h1>
        <p className="text-slate-400 text-lg mb-8">Upscale, denoise &amp; sharpen your images with AI</p>
        <div className="bg-slate-800 rounded-2xl p-8 border-2 border-dashed border-slate-600 mb-8">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📷</div>
            <p className="text-xl text-white mb-2">Loading enhancer...</p>
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-400 border-t-transparent mt-4"></div>
          </div>
        </div>
      </div>
    </div>
  ),
});

/**
 * Home page — a mix of:
 * 1. Server-rendered static marketing content (HTML streamed immediately, zero JS)
 * 2. Client-side interactive enhancement app (lazy-loaded, code-split)
 *
 * This architecture ensures:
 * - Fast First Contentful Paint: static sections render instantly as HTML
 * - Smaller JS bundle: marketing content has zero JS cost
 * - Better SEO: all marketing text is in the initial HTML
 */
export default function Home() {
  return (
    <main className="min-h-screen bg-slate-900">
      {/* Interactive App — lazy loaded, code-split */}
      <Suspense fallback={
        <div className="pt-28 pb-12 px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">AI Image Enhancement</h1>
          <p className="text-slate-400 text-lg mb-8">Upscale, denoise &amp; sharpen your images with AI</p>
        </div>
      }>
        <EnhanceApp />
      </Suspense>

      {/* ================================================================
          STATIC MARKETING SECTIONS — Server-rendered, zero JS cost
          ================================================================ */}

      {/* How It Works */}
      <section className="px-4 pb-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">How It Works</h2>
          <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">Enhance your images in three simple steps — no design skills needed</p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-800/50 rounded-2xl p-6 text-center border border-slate-700/50 hover:border-blue-500/30 transition">
              <div className="w-14 h-14 bg-blue-600/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📤</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">1. Upload</h3>
              <p className="text-slate-400 text-sm">Drag &amp; drop or click to upload your image. Supports JPG, PNG, and WebP up to 5MB.</p>
            </div>
            <div className="bg-slate-800/50 rounded-2xl p-6 text-center border border-slate-700/50 hover:border-blue-500/30 transition">
              <div className="w-14 h-14 bg-purple-600/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">2. AI Enhance</h3>
              <p className="text-slate-400 text-sm">Our AuraSR AI model upscales your image to 4× resolution with incredible detail recovery.</p>
            </div>
            <div className="bg-slate-800/50 rounded-2xl p-6 text-center border border-slate-700/50 hover:border-blue-500/30 transition">
              <div className="w-14 h-14 bg-green-600/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⬇️</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">3. Download</h3>
              <p className="text-slate-400 text-sm">Get your enhanced image instantly. Download the compressed preview or full-resolution 4× version.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 pb-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">Why EnhanceAI?</h2>
          <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">Powered by cutting-edge AI, designed for everyone</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700/30">
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="text-white font-semibold mb-2">4× Super Resolution</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Upscale images to 4 times the original resolution with AI-powered detail reconstruction</p>
            </div>
            <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700/30">
              <div className="text-3xl mb-3">🎨</div>
              <h3 className="text-white font-semibold mb-2">Detail Recovery</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Recover lost textures, edges and fine details that traditional upscalers miss</p>
            </div>
            <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700/30">
              <div className="text-3xl mb-3">🔒</div>
              <h3 className="text-white font-semibold mb-2">Privacy First</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Images are processed and never stored permanently. Your data stays yours</p>
            </div>
            <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700/30">
              <div className="text-3xl mb-3">☁️</div>
              <h3 className="text-white font-semibold mb-2">Cloud Powered</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Runs on edge servers worldwide for fast processing — no software to install</p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="px-4 pb-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">Perfect For</h2>
          <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">Whatever your use case, EnhanceAI delivers stunning results</p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-b from-slate-800/60 to-slate-800/30 rounded-2xl p-6 border border-slate-700/40">
              <div className="text-4xl mb-4">📸</div>
              <h3 className="text-lg font-semibold text-white mb-2">Photography</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Upscale old or low-res photos to print-quality resolution. Bring new life to treasured memories.</p>
            </div>
            <div className="bg-gradient-to-b from-slate-800/60 to-slate-800/30 rounded-2xl p-6 border border-slate-700/40">
              <div className="text-4xl mb-4">🛍️</div>
              <h3 className="text-lg font-semibold text-white mb-2">E-Commerce</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Make product images crystal clear for your online store. Higher quality images drive more sales.</p>
            </div>
            <div className="bg-gradient-to-b from-slate-800/60 to-slate-800/30 rounded-2xl p-6 border border-slate-700/40">
              <div className="text-4xl mb-4">🎮</div>
              <h3 className="text-lg font-semibold text-white mb-2">Digital Art &amp; Gaming</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Enhance textures, concept art, and screenshots. Perfect for artists and content creators.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition - Free vs Pro Comparison */}
      <section className="px-4 pb-16 bg-gradient-to-b from-transparent via-blue-950/20 to-transparent">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">Choose Your Plan</h2>
          <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">Start free, upgrade when you need more power</p>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Free Plan */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 relative">
              <div className="text-center mb-6">
                <span className="text-4xl">🆓</span>
                <h3 className="text-xl font-bold text-white mt-2">Free</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-white">$0</span>
                  <span className="text-slate-500">/forever</span>
                </div>
              </div>
              
              <ul className="space-y-3 mb-6">
                {[
                  { text: '3 total enhancements', included: true },
                  { text: '2× upscaling', included: true },
                  { text: 'JPEG, PNG, WebP support', included: true },
                  { text: 'Standard processing speed', included: true },
                  { text: '100 enhancements/month', included: false },
                  { text: '8× upscaling', included: false },
                  { text: 'Priority processing', included: false },
                  { text: 'Batch processing', included: false },
                ].map((item, i) => (
                  <li key={i} className={`flex items-center gap-2 ${item.included ? 'text-slate-300' : 'text-slate-600'}`}>
                    <span>{item.included ? '✓' : '✗'}</span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
              
              <div className="text-center">
                <span className="text-slate-500 text-sm">No credit card required</span>
              </div>
            </div>
            
            {/* Pro Plan */}
            <div className="bg-gradient-to-b from-blue-900/40 to-purple-900/40 rounded-2xl p-6 border border-blue-500/50 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                RECOMMENDED
              </div>
              
              <div className="text-center mb-6">
                <span className="text-4xl">⭐</span>
                <h3 className="text-xl font-bold text-white mt-2">Pro</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-white">$4.9</span>
                  <span className="text-slate-400">/month</span>
                </div>
                <p className="text-slate-500 text-sm mt-1">or $49 lifetime (save 17%)</p>
              </div>
              
              <ul className="space-y-3 mb-6">
                {[
                  { text: '100 enhancements/month', included: true },
                  { text: '8× upscaling (HD quality)', included: true },
                  { text: 'JPEG, PNG, WebP support', included: true },
                  { text: 'Priority processing', included: true },
                  { text: 'Batch processing (coming soon)', included: true },
                  { text: 'Email support', included: true },
                  { text: 'API access (coming soon)', included: true },
                  { text: 'No watermarks', included: true },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-slate-200">
                    <span className="text-green-400">✓</span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
              
              <Link 
                href="/pricing"
                className="block w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold text-center hover:from-blue-600 hover:to-purple-600 transition"
              >
                Upgrade to Pro
              </Link>
            </div>
          </div>
          
          <p className="text-center text-slate-500 text-sm mt-6">
            💡 Free tier is perfect for trying out. Upgrade when you need more power.
          </p>
        </div>
      </section>

      {/* Before/After Comparison */}
      <section className="px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">See the Difference</h2>
          <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">Real results from our AI enhancement</p>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Example 1 */}
            <div className="bg-slate-800/50 rounded-2xl overflow-hidden border border-slate-700/50">
              <div className="grid grid-cols-2 gap-0">
                <div className="relative">
                  <div className="aspect-square bg-slate-900 flex items-center justify-center">
                    <div className="text-center p-4">
                      <div className="text-6xl mb-2">🖼️</div>
                      <div className="text-slate-500 text-sm">Original</div>
                      <div className="text-slate-600 text-xs">512×512</div>
                    </div>
                  </div>
                  <div className="absolute top-2 left-2 bg-red-500/80 text-white text-xs px-2 py-1 rounded">Before</div>
                </div>
                <div className="relative">
                  <div className="aspect-square bg-gradient-to-br from-blue-900/30 to-purple-900/30 flex items-center justify-center">
                    <div className="text-center p-4">
                      <div className="text-6xl mb-2">✨</div>
                      <div className="text-white text-sm">Enhanced</div>
                      <div className="text-blue-400 text-xs">2048×2048</div>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 bg-green-500/80 text-white text-xs px-2 py-1 rounded">After</div>
                </div>
              </div>
              <div className="p-4 text-center">
                <p className="text-slate-300 font-medium">Portrait Photo</p>
                <p className="text-slate-500 text-sm">4× upscaling with detail recovery</p>
              </div>
            </div>
            
            {/* Example 2 */}
            <div className="bg-slate-800/50 rounded-2xl overflow-hidden border border-slate-700/50">
              <div className="grid grid-cols-2 gap-0">
                <div className="relative">
                  <div className="aspect-square bg-slate-900 flex items-center justify-center">
                    <div className="text-center p-4">
                      <div className="text-6xl mb-2">🛍️</div>
                      <div className="text-slate-500 text-sm">Original</div>
                      <div className="text-slate-600 text-xs">800×600</div>
                    </div>
                  </div>
                  <div className="absolute top-2 left-2 bg-red-500/80 text-white text-xs px-2 py-1 rounded">Before</div>
                </div>
                <div className="relative">
                  <div className="aspect-square bg-gradient-to-br from-blue-900/30 to-purple-900/30 flex items-center justify-center">
                    <div className="text-center p-4">
                      <div className="text-6xl mb-2">💎</div>
                      <div className="text-white text-sm">Enhanced</div>
                      <div className="text-blue-400 text-xs">3200×2400</div>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 bg-green-500/80 text-white text-xs px-2 py-1 rounded">After</div>
                </div>
              </div>
              <div className="p-4 text-center">
                <p className="text-slate-300 font-medium">Product Image</p>
                <p className="text-slate-500 text-sm">Crystal clear for e-commerce</p>
              </div>
            </div>
          </div>
          
          <p className="text-center mt-8">
            <Link 
              href="/pricing" 
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition"
            >
              <span>Try it free now</span>
              <span>→</span>
            </Link>
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 pb-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <details className="group bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
              <summary className="flex items-center justify-between p-5 cursor-pointer text-white font-medium hover:bg-slate-800/80 transition">
                What is AI image enhancement?
                <span className="text-slate-400 group-open:rotate-45 transition-transform text-xl ml-4">+</span>
              </summary>
              <div className="px-5 pb-5 text-slate-400 text-sm leading-relaxed">
                AI image enhancement uses deep learning models to intelligently upscale images, recovering fine details, removing noise, and sharpening edges that traditional methods can&apos;t achieve.
              </div>
            </details>
            <details className="group bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
              <summary className="flex items-center justify-between p-5 cursor-pointer text-white font-medium hover:bg-slate-800/80 transition">
                How much does it cost?
                <span className="text-slate-400 group-open:rotate-45 transition-transform text-xl ml-4">+</span>
              </summary>
              <div className="px-5 pb-5 text-slate-400 text-sm leading-relaxed">
                EnhanceAI offers 3 free enhancements total. For heavy users, our Pro plan is $4.9/month with 100 enhancements per month and up to 8× upscaling.
              </div>
            </details>
            <details className="group bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
              <summary className="flex items-center justify-between p-5 cursor-pointer text-white font-medium hover:bg-slate-800/80 transition">
                What image formats are supported?
                <span className="text-slate-400 group-open:rotate-45 transition-transform text-xl ml-4">+</span>
              </summary>
              <div className="px-5 pb-5 text-slate-400 text-sm leading-relaxed">
                We support JPEG, PNG, and WebP formats. Maximum file size is 5MB. The enhanced image is available in both compressed preview and full-resolution download.
              </div>
            </details>
            <details className="group bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
              <summary className="flex items-center justify-between p-5 cursor-pointer text-white font-medium hover:bg-slate-800/80 transition">
                Is my data safe?
                <span className="text-slate-400 group-open:rotate-45 transition-transform text-xl ml-4">+</span>
              </summary>
              <div className="px-5 pb-5 text-slate-400 text-sm leading-relaxed">
                Absolutely. Images are processed in real-time on secure edge servers. We don&apos;t permanently store your original or enhanced images on our servers.
              </div>
            </details>
            <details className="group bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
              <summary className="flex items-center justify-between p-5 cursor-pointer text-white font-medium hover:bg-slate-800/80 transition">
                How does the 4× upscaling work?
                <span className="text-slate-400 group-open:rotate-45 transition-transform text-xl ml-4">+</span>
              </summary>
              <div className="px-5 pb-5 text-slate-400 text-sm leading-relaxed">
                We use AuraSR v2, a state-of-the-art super-resolution AI model. It analyzes your image and generates new pixels with realistic details, effectively quadrupling the resolution (2× width and 2× height).
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-4 py-12">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <p className="text-white font-bold text-lg">EnhanceAI</p>
            <p className="text-slate-500 text-sm mt-1">AI-powered image enhancement &amp; super resolution</p>
          </div>
          <div className="flex gap-6 text-sm">
            <Link href="/pricing" className="text-slate-400 hover:text-white transition">Pricing</Link>
            <a href="mailto:support@enhanceai.online" className="text-slate-400 hover:text-white transition">Contact</a>
          </div>
          <p className="text-slate-600 text-xs">© 2025 EnhanceAI. All rights reserved.</p>
        </div>
      </footer>
    </main>
  )
}
