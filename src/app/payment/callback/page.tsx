'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

/**
 * PayPal 回调页面
 * 运行在弹框窗口中，通知父窗口后自动关闭
 * - ?token=xxx → PayPal 授权成功
 * - ?cancelled=true → 用户取消
 */

function CallbackContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');       // PayPal Order ID
  const cancelled = searchParams.get('cancelled');

  useEffect(() => {
    if (cancelled === 'true') {
      // 稍作延迟让用户看到取消提示
      const timer = setTimeout(() => {
        window.close();
      }, 1500);
      return () => clearTimeout(timer);
    }

    if (token) {
      // 通知父窗口支付成功
      if (window.opener) {
        window.opener.postMessage(
          { type: 'PAYPAL_SUCCESS', paypalOrderId: token },
          window.location.origin,
        );
      }
      // 延迟关闭，让 postMessage 送达
      const timer = setTimeout(() => {
        window.close();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [token, cancelled]);

  if (cancelled === 'true') {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-white mb-2">支付已取消</h1>
          <p className="text-slate-400">窗口即将关闭...</p>
        </div>
      </main>
    );
  }

  if (token) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-white mb-2">支付成功！</h1>
          <p className="text-slate-400">正在处理中，请稍候...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center p-8">
        <div className="text-4xl mb-4">⏳</div>
        <p className="text-slate-400">处理中...</p>
      </div>
    </main>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="text-4xl">⏳</div>
        </main>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
