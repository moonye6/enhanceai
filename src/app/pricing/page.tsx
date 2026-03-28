export const runtime = 'edge'
export const dynamic = 'force-dynamic'

import { auth } from "@/auth"

export default async function PricingPage() {
  const session = await auth()

  return (
    <main className="min-h-screen bg-slate-900 py-20 px-4">
      <h1 className="text-4xl font-bold text-white text-center mb-12">Choose Your Plan</h1>

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
          {session ? (
            <a href="/?upgrade=monthly" className="block w-full py-3 rounded-lg bg-blue-600 text-white text-center font-semibold hover:bg-blue-700 transition">Get Pro Monthly →</a>
          ) : (
            <a href="/api/auth/signin" className="block w-full py-3 rounded-lg bg-blue-600 text-white text-center font-semibold hover:bg-blue-700 transition">Sign in to upgrade</a>
          )}
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
          {session ? (
            <a href="/?upgrade=lifetime" className="block w-full py-3 rounded-lg bg-green-600 text-white text-center font-semibold hover:bg-green-700 transition">Get Lifetime →</a>
          ) : (
            <a href="/api/auth/signin" className="block w-full py-3 rounded-lg bg-green-600 text-white text-center font-semibold hover:bg-green-700 transition">Sign in to upgrade</a>
          )}
        </div>
      </div>

      <p className="text-center text-slate-400 mt-12">
        All plans include secure payment via PayPal. Cancel anytime.
      </p>
    </main>
  )
}
