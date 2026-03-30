import type { Metadata } from 'next'
import dynamic from 'next/dynamic'

export const metadata: Metadata = {
  title: 'Enhancement History',
  description: 'View your image enhancement history on EnhanceAI.',
}

// Lazy-load client component — the shell page is server-rendered instantly
const HistoryContent = dynamic(() => import('@/components/HistoryContent'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-blue-400 border-t-transparent"></div>
    </div>
  ),
})

export default function HistoryPage() {
  return (
    <main className="min-h-screen bg-slate-900 pt-20 px-4 pb-20">
      <HistoryContent />
    </main>
  )
}
