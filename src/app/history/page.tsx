export const runtime = 'edge'
export const dynamic = 'force-dynamic'

import { auth } from "@/auth"
import Link from "next/link"

export default async function HistoryPage() {
  const session = await auth()

  if (!session?.user) {
    return (
      <main className="min-h-screen bg-slate-900 py-20 px-4 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Sign in required</h1>
          <p className="text-slate-400 mb-8">Please sign in to view your enhancement history.</p>
          <a href="/api/auth/signin" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
            Sign in with Google
          </a>
        </div>
      </main>
    )
  }

  // Fetch history from API
  let history: any[] = []
  try {
    const { getRequestContext } = await import('@cloudflare/next-on-pages')
    const { env } = getRequestContext()
    const kv = (env as any).ENHANCEAI_KV
    if (kv && session.user?.id) {
      const list = await kv.list({ prefix: `history:${session.user.id}:` })
      for (const key of list.keys) {
        const data = await kv.get(key.name)
        if (data) history.push(JSON.parse(data))
      }
      history.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      history = history.slice(0, 50)
    }
  } catch {
    // KV not available during build
  }

  return (
    <main className="min-h-screen bg-slate-900 pt-20 px-4 pb-20">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Enhancement History</h1>
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            ← Back to enhancer
          </Link>
        </div>

        {history.length === 0 ? (
          <div className="bg-slate-800 rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">📸</div>
            <h2 className="text-xl font-semibold text-white mb-2">No history yet</h2>
            <p className="text-slate-400 mb-6">Start by enhancing an image to see your history here.</p>
            <Link href="/" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
              Enhance an image
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((item: any, i: number) => (
              <div key={i} className="bg-slate-800 rounded-xl p-4 flex gap-4 items-center">
                {item.enhancedUrl && <img src={item.enhancedUrl} alt="Enhanced" className="w-20 h-20 rounded-lg object-cover" />}
                <div className="flex-1">
                  <p className="text-white font-medium">{item.scale}x upscale</p>
                  <p className="text-slate-400 text-sm">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
                {item.enhancedUrl && (
                  <a
                    href={item.enhancedUrl}
                    download={`enhanced-${Date.now()}.png`}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
                  >
                    Download
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
