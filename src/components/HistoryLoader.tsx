'use client';

import dynamic from 'next/dynamic';

const HistoryContent = dynamic(() => import('@/components/HistoryContent'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-blue-400 border-t-transparent"></div>
    </div>
  ),
});

export default function HistoryLoader() {
  return <HistoryContent />;
}
