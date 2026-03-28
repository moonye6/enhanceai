'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function CallbackContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const cancelled = searchParams.get('cancelled');

  useEffect(() => {
    if (cancelled === 'true') {
      const timer = setTimeout(() => {
        window.close();
      }, 1500);
      return () => clearTimeout(timer);
    }

    if (token) {
      if (window.opener) {
        window.opener.postMessage(
          { type: 'PAYPAL_SUCCESS', paypalOrderId: token },
          window.location.origin,
        );
      }
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
          <h1 className="text-2xl font-bold text-white mb-2">Payment Cancelled</h1>
          <p className="text-slate-400">Window will close shortly...</p>
        </div>
      </main>
    );
  }

  if (token) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-white mb-2">Payment Successful!</h1>
          <p className="text-slate-400">Processing your upgrade...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center p-8">
        <div className="text-4xl mb-4">⏳</div>
        <p className="text-slate-400">Processing...</p>
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
