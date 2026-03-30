import type { Metadata } from 'next'

// Static page — no runtime needed, pre-rendered at build time

export const metadata: Metadata = {
  title: 'Pricing — Free & Pro Plans',
  description:
    'Choose the right EnhanceAI plan. Start free with 3 AI image enhancements per day, or upgrade to Pro for 100/day with 8× upscaling and batch processing.',
  alternates: {
    canonical: '/pricing',
  },
  openGraph: {
    title: 'EnhanceAI Pricing — Free & Pro Plans',
    description:
      'Start free with 3 AI image enhancements per day, or upgrade to Pro for 100/day.',
  },
}

import Link from 'next/link'

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-slate-900/80 backdrop-blur-md z-50 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-white">EnhanceAI</Link>
          <div className="flex gap-6 items-center">
            <Link href="/pricing" className="text-white font-semibold">Pricing</Link>
          </div>
        </div>
      </nav>

      <div className="pt-28 pb-20 px-4">
        <h1 className="text-4xl font-bold text-white text-center mb-4">Choose Your Plan</h1>
        <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">Start free, upgrade when you need more. All plans include AI-powered 4× super resolution.</p>

        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
        {/* Free */}
        <div className="bg-slate-800 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-2">Free</h2>
          <p className="text-4xl font-bold text-white mb-6">$0<span className="text-lg text-slate-400">/mo</span></p>
          <ul className="text-slate-300 space-y-3 mb-8">
            <li>✓ 3 enhancements/day</li>
            <li>✓ 2x upscaling</li>
            <li>✗ No batch processing</li>
          </ul>
          <button disabled className="w-full py-3 rounded-lg bg-slate-700 text-slate-400 cursor-not-allowed">Current Plan</button>
        </div>

        {/* Pro Monthly */}
        <div className="bg-gradient-to-b from-blue-900 to-slate-800 rounded-2xl p-8 border-2 border-blue-500 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-sm px-3 py-1 rounded-full">Popular</div>
          <h2 className="text-2xl font-bold text-white mb-2">Pro Monthly</h2>
          <p className="text-4xl font-bold text-white mb-6">$4.9<span className="text-lg text-slate-400">/mo</span></p>
          <ul className="text-slate-300 space-y-3 mb-8">
            <li>✓ 100 enhancements/day</li>
            <li>✓ 8x upscaling</li>
            <li>✓ Batch processing</li>
            <li>✓ Priority support</li>
          </ul>
          <a href="/?upgrade=monthly" className="block w-full py-3 rounded-lg bg-blue-600 text-white text-center font-semibold hover:bg-blue-700 transition">Get Pro Monthly →</a>
        </div>

        {/* Pro Lifetime */}
        <div className="bg-slate-800 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-2">Pro Lifetime</h2>
          <p className="text-4xl font-bold text-white mb-6">$49<span className="text-lg text-slate-400"> once</span></p>
          <ul className="text-slate-300 space-y-3 mb-8">
            <li>✓ 100 enhancements/day</li>
            <li>✓ 8x upscaling</li>
            <li>✓ Batch processing</li>
            <li>✓ Priority support</li>
            <li>✓ Lifetime access</li>
          </ul>
          <a href="/?upgrade=lifetime" className="block w-full py-3 rounded-lg bg-green-600 text-white text-center font-semibold hover:bg-green-700 transition">Get Lifetime →</a>
        </div>
      </div>

      <p className="text-center text-slate-400 mt-12">
        All plans include secure payment via PayPal. Cancel anytime.
      </p>

      <div className="text-center mt-8">
        <Link href="/" className="text-blue-400 hover:text-blue-300">← Back to enhancer</Link>
      </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-4 py-12">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <p className="text-white font-bold text-lg">EnhanceAI</p>
            <p className="text-slate-500 text-sm mt-1">AI-powered image enhancement & super resolution</p>
          </div>
          <div className="flex gap-6 text-sm">
            <Link href="/" className="text-slate-400 hover:text-white transition">Home</Link>
            <Link href="/pricing" className="text-slate-400 hover:text-white transition">Pricing</Link>
            <a href="mailto:support@enhanceai.online" className="text-slate-400 hover:text-white transition">Contact</a>
          </div>
          <p className="text-slate-600 text-xs">© {new Date().getFullYear()} EnhanceAI. All rights reserved.</p>
        </div>
      </footer>
    </main>
  )
}
