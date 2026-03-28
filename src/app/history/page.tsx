'use client'

import { useSession, signIn } from 'next-auth/react'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface HistoryItem {
  originalUrl: string
  enhancedUrl: string
  scale: number
  createdAt: string
}

export default function HistoryPage() {
  const { data: session, status } = useSession()
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user?.id) {
      fetch(`/api/history?userId=${session.user.id}`)
        .then((res) => res.json())
        .then((data) => {
          setHistory(data.history || [])
          setLoading(false)
        })
        .catch(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [session])

  // Login wall
  if (status === 'unauthenticated' || (status === 'loading' && !session)) {
    return (
      <main className="min-h-screen bg-slate-900 py-20 px-4 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Sign in required</h1>
          <p className="text-slate-400 mb-8">Please sign in to view your enhancement history.</p>
          <button
            onClick={() => signIn('google')}
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Sign in with Google
          </button>
        </div>
      </main>
    )
  }

  if (status === 'loading') {
    return (
      <main className="min-h-screen bg-slate-900 py-20 px-4 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </main>
    )
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

        {loading ? (
          <div className="text-center text-slate-400 py-20">Loading history...</div>
        ) : history.length === 0 ? (
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
            {history.map((item: HistoryItem, i: number) => (
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
