'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface User {
  id: string
  email: string
  name: string
  image?: string
}

interface HistoryItem {
  originalUrl: string
  enhancedUrl: string
  scale: number
  createdAt: string
}

export default function HistoryPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState<HistoryItem[]>([])

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user)
          // 获取历史记录
          return fetch(`/api/history?userId=${data.user.id}`)
        }
        setLoading(false)
        return null
      })
      .then(res => res?.json())
      .then(data => {
        if (data?.history) {
          setHistory(data.history)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-900 py-20 px-4 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-900 py-20 px-4 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Sign in required</h1>
          <p className="text-slate-400 mb-8">Please sign in to view your enhancement history.</p>
          <a href="/api/auth/callback/google" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
            Sign in with Google
          </a>
        </div>
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
            {history.map((item, i) => (
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
