'use client';

import { useEffect } from 'react';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // Log error to console and potentially to error tracking service
    console.error('[EnhanceAI Error]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">😅</div>
        <h2 className="text-2xl font-bold text-white mb-4">出错了</h2>
        <p className="text-slate-300 mb-6">
          页面遇到了一些问题。请刷新页面重试。
        </p>
        <div className="bg-slate-700 rounded-lg p-3 mb-6">
          <p className="text-sm text-slate-400 font-mono break-all">
            {error.message || 'Unknown error'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => window.location.href = '/'}
            className="flex-1 py-3 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-xl transition-colors"
          >
            返回首页
          </button>
          <button
            onClick={reset}
            className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    </div>
  );
}
