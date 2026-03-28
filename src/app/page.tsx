'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { checkRateLimit, incrementUsage, RateLimitResult } from '@/lib/rateLimit';

export default function Home() {
  const { data: session, status } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [rateLimit, setRateLimit] = useState<RateLimitResult | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState<'monthly' | 'lifetime' | null>(null);
  const [paymentError, setPaymentError] = useState('');
  const [isPro, setIsPro] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check rate limit on mount
  useEffect(() => {
    const limit = checkRateLimit(isPro);
    setRateLimit(limit);
  }, [isPro]);

  // Listen for PayPal popup postMessage
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'PAYPAL_SUCCESS') return;

      const { paypalOrderId } = event.data as { paypalOrderId: string };

      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }

      try {
        const captureRes = await fetch('/api/payment/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paypalOrderId,
            packageId: paymentLoadingRef.current ?? 'monthly',
            userId: session?.user?.id ?? '',
          }),
        });

        if (captureRes.ok) {
          setIsPro(true);
          setShowUpgradeModal(false);
          setPaymentLoading(null);
          setPaymentSuccess(true);
          setTimeout(() => setPaymentSuccess(false), 3000);
        } else {
          const data = (await captureRes.json()) as { error?: string };
          setPaymentError(data.error ?? 'Payment confirmation failed');
          setPaymentLoading(null);
        }
      } catch {
        setPaymentError('Network error, please try again');
        setPaymentLoading(null);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [session]);

  const paymentLoadingRef = useRef<'monthly' | 'lifetime' | null>(null);
  useEffect(() => {
    paymentLoadingRef.current = paymentLoading;
  }, [paymentLoading]);

  const handleUpgrade = async (packageId: 'monthly' | 'lifetime') => {
    setPaymentError('');
    setPaymentLoading(packageId);

    try {
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setPaymentError(data.error ?? 'Failed to create order');
        setPaymentLoading(null);
        return;
      }

      const { checkoutUrl } = (await res.json()) as { checkoutUrl: string };

      const popup = window.open(
        checkoutUrl,
        'PayPalCheckout',
        'width=520,height=700,scrollbars=yes,resizable=yes',
      );
      popupRef.current = popup;

      if (!popup) {
        setPaymentError('Popup blocked, please allow popups');
        setPaymentLoading(null);
        return;
      }

      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimerRef.current!);
          pollTimerRef.current = null;
          setPaymentLoading(null);
        }
      }, 500);
    } catch {
      setPaymentError('Network error, please try again');
      setPaymentLoading(null);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile);
      setPreview(URL.createObjectURL(droppedFile));
      setResult('');
      setError('');
      setErrorCode('');
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setResult('');
      setError('');
      setErrorCode('');
    }
  }, []);

  const handleEnhance = async () => {
    if (!file) return;

    setLoading(true);
    setProgress(10);
    setError('');
    setErrorCode('');

    try {
      setProgress(30);
      const formData = new FormData();
      formData.append('image', file);

      setProgress(50);
      const response = await fetch('/api/enhance', {
        method: 'POST',
        body: formData,
      });

      setProgress(80);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Enhancement failed');
        setErrorCode(data.code || 'UNKNOWN_ERROR');
        if (data.code === 'RATE_LIMIT_EXCEEDED') {
          setShowUpgradeModal(true);
        }
      } else {
        setResult(data.enhancedUrl);
        const newLimit = incrementUsage(isPro);
        setRateLimit(newLimit);
      }
    } catch (err) {
      setError('Network error, please try again');
      setErrorCode('NETWORK_ERROR');
    } finally {
      setLoading(false);
      setProgress(100);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview('');
    setResult('');
    setError('');
    setErrorCode('');
  };

  // Show loading state while checking session
  if (status === 'loading') {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-slate-900/80 backdrop-blur-md z-50 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-white">EnhanceAI</Link>
          <div className="flex gap-6 items-center">
            <Link href="/pricing" className="text-slate-300 hover:text-white transition">Pricing</Link>
            {session ? (
              <>
                <Link href="/history" className="text-slate-300 hover:text-white transition">History</Link>
                <span className="text-slate-300">{session.user?.name}</span>
                <button onClick={() => signOut()} className="text-red-400 hover:text-red-300 transition">Sign out</button>
              </>
            ) : (
              <button onClick={() => signIn('google')} className="bg-blue-600 px-4 py-2 rounded-lg text-white hover:bg-blue-700 transition">Sign in</button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">AI Image Enhancement</h1>
          <p className="text-slate-400 text-lg mb-8">Upscale, denoise & sharpen your images with AI</p>
          {rateLimit && (
            <div className="inline-flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-full">
              <span className="text-slate-400 text-sm">
                Remaining today: <span className={`font-semibold ${rateLimit.remaining > 0 ? 'text-green-400' : 'text-red-400'}`}>{rateLimit.remaining}</span>
                {isPro && <span className="ml-2 text-blue-400">Pro</span>}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Main Content */}
      <section className="px-4 pb-20">
        <div className="max-w-4xl mx-auto">
          {/* Upload Area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="relative bg-slate-800 rounded-2xl p-8 border-2 border-dashed border-slate-600 hover:border-blue-500 transition-colors cursor-pointer mb-8"
          >
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            {!file ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📷</div>
                <p className="text-xl text-white mb-2">Drag & drop image here</p>
                <p className="text-slate-400">or click to upload</p>
                <p className="text-slate-500 text-sm mt-4">JPG, PNG, WebP • Max 5MB</p>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
                {/* Original */}
                <div className="text-center">
                  <p className="text-sm text-slate-400 mb-2">Original</p>
                  <Image src={preview} alt="Original" width={200} height={200} className="rounded-lg" />
                </div>

                {result && (
                  <>
                    <div className="text-4xl text-slate-500">→</div>
                    {/* Enhanced */}
                    <div className="text-center">
                      <p className="text-sm text-slate-400 mb-2">Enhanced</p>
                      <Image src={result} alt="Enhanced" width={200} height={200} className="rounded-lg" />
                    </div>
                  </>
                )}

                {loading && (
                  <div className="text-center">
                    <p className="text-white">Enhancing... {progress}%</p>
                    <div className="w-48 h-2 bg-slate-700 rounded-full mt-2">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6">
              <p className="text-red-200">{error}</p>
              {errorCode === 'RATE_LIMIT_EXCEEDED' && (
                <button onClick={() => setShowUpgradeModal(true)} className="mt-2 text-blue-400 hover:underline">
                  Upgrade to Pro for more →
                </button>
              )}
            </div>
          )}

          {/* Actions */}
          {file && !result && !loading && (
            <div className="flex justify-center gap-4">
              <button
                onClick={handleEnhance}
                disabled={!rateLimit?.allowed}
                className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ✨ Enhance Image {rateLimit && `(${rateLimit.remaining} left)`}
              </button>
              <button onClick={handleReset} className="px-8 py-4 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition">
                Reset
              </button>
            </div>
          )}

          {result && (
            <div className="flex justify-center gap-4">
              <a href={result} download="enhanced-image.png" className="px-8 py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition">
                ⬇️ Download Enhanced
              </a>
              <button onClick={handleReset} className="px-8 py-4 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition">
                Enhance Another
              </button>
            </div>
          )}

          {/* Upgrade Banner */}
          {rateLimit && !isPro && rateLimit.remaining === 0 && (
            <div className="mt-8 bg-gradient-to-r from-blue-900 to-purple-900 rounded-2xl p-8 text-center">
              <h3 className="text-2xl font-bold text-white mb-2">Daily limit reached</h3>
              <p className="text-slate-300 mb-4">Upgrade to Pro for 100 enhancements/day</p>
              <button onClick={() => setShowUpgradeModal(true)} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">
                Upgrade to Pro →
              </button>
            </div>
          )}

          {/* Features */}
          <div className="mt-16 grid md:grid-cols-3 gap-8">
            {[
              { icon: '📤', title: 'Upload', desc: 'Drag & drop or click' },
              { icon: '✨', title: 'AI Enhance', desc: '2x upscale, denoise, sharpen' },
              { icon: '⬇️', title: 'Download', desc: 'Get your enhanced image' },
            ].map((f, i) => (
              <div key={i} className="bg-slate-800 rounded-2xl p-6 text-center">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full relative">
            <button onClick={() => setShowUpgradeModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white text-2xl">×</button>

            {paymentSuccess ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-2xl font-bold text-green-400 mb-2">Upgrade successful!</h3>
                <p className="text-slate-300">You're now a Pro user with 100 enhancements/day.</p>
              </div>
            ) : (
              <>
                <h3 className="text-2xl font-bold text-white mb-4">🚀 Upgrade to Pro</h3>
                <p className="text-slate-300 mb-6">Daily free limit reached. Upgrade to unlock:</p>
                <ul className="text-slate-300 space-y-2 mb-6">
                  {['100 enhancements/day', 'Up to 8x upscaling', 'Batch processing', 'Priority support'].map((f, i) => (
                    <li key={i}>✓ {f}</li>
                  ))}
                </ul>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center p-4 bg-slate-700 rounded-lg">
                    <p className="text-2xl font-bold text-white">$4.9</p>
                    <p className="text-xs text-slate-400">/month</p>
                  </div>
                  <div className="text-center p-4 bg-slate-700 rounded-lg">
                    <p className="text-2xl font-bold text-white">$49</p>
                    <p className="text-xs text-slate-400">lifetime</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => handleUpgrade('monthly')}
                    disabled={!!paymentLoading}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {paymentLoading === 'monthly' ? '⏳ Processing...' : '💳 Monthly - $4.9/mo'}
                  </button>
                  <button
                    onClick={() => handleUpgrade('lifetime')}
                    disabled={!!paymentLoading}
                    className="flex-1 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
                  >
                    {paymentLoading === 'lifetime' ? '⏳ Processing...' : '⭐ Lifetime - $49'}
                  </button>
                </div>

                {paymentError && (
                  <p className="text-red-400 text-center mt-4">{paymentError}</p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
