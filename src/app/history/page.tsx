import type { Metadata } from 'next'
import HistoryLoader from '@/components/HistoryLoader'

export const metadata: Metadata = {
  title: 'Enhancement History',
  description: 'View your image enhancement history on EnhanceAI.',
}

export default function HistoryPage() {
  return (
    <main className="min-h-screen bg-slate-900 pt-20 px-4 pb-20">
      <HistoryLoader />
    </main>
  )
}
