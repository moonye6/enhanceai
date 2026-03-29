'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[EnhanceAI Global Error]', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-slate-900">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full text-center">
            <div className="text-6xl mb-4">💥</div>
            <h2 className="text-2xl font-bold text-white mb-4">严重错误</h2>
            <p className="text-slate-300 mb-6">
              应用遇到了严重问题，请刷新页面。
            </p>
            <button
              onClick={reset}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors"
            >
              刷新页面
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
