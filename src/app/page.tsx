'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { checkRateLimit, incrementUsage, syncFromServer, RateLimitResult } from '@/lib/rateLimit';

interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [enhancing, setEnhancing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [rateLimit, setRateLimit] = useState<RateLimitResult | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState<'monthly' | 'lifetime' | null>(null);
  const [paymentError, setPaymentError] = useState('');
  const [isPro, setIsPro] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check auth status on mount
  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        setUser(data.user || null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Handle ?upgrade= param from Pricing page
  const searchParams = useSearchParams()
  useEffect(() => {
    if (loading) return
    const upgradeParam = searchParams.get('upgrade')
    if (upgradeParam === 'monthly' || upgradeParam === 'lifetime') {
      if (user) {
        setShowUpgradeModal(true)
      } else {
        // Redirect to login, after login user comes back to home and can upgrade
        window.location.href = '/api/auth/callback/google'
      }
    }
  }, [loading, user, searchParams])

  // Check rate limit
  useEffect(() => {
    const limit = checkRateLimit(isPro)
    setRateLimit(limit)
  }, [isPro])

  // PayPal callback
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== 'PAYPAL_SUCCESS') return

      const { paypalOrderId } = event.data as { paypalOrderId: string }

      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }

      try {
        const captureRes = await fetch('/api/payment/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paypalOrderId,
            packageId: paymentLoadingRef.current ?? 'monthly',
            userId: user?.id || 'anonymous',
          }),
        })

        if (captureRes.ok) {
          setIsPro(true)
          setShowUpgradeModal(false)
          setPaymentLoading(null)
          setPaymentSuccess(true)
          setTimeout(() => setPaymentSuccess(false), 3000)
        } else {
          const data = await captureRes.json()
          setPaymentError(data.error ?? 'Payment confirmation failed')
          setPaymentLoading(null)
        }
      } catch {
        setPaymentError('Network error, please try again')
        setPaymentLoading(null)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [user])

  const paymentLoadingRef = useRef<'monthly' | 'lifetime' | null>(null)
  useEffect(() => {
    paymentLoadingRef.current = paymentLoading
  }, [paymentLoading])

  const handleLogin = () => {
    window.location.href = '/api/auth/callback/google'
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
    } catch {
      // 即使请求失败也清除本地状态
    }
    setUser(null)
    window.location.href = '/'
  }

  const handleUpgrade = async (packageId: 'monthly' | 'lifetime') => {
    setPaymentError('')
    setPaymentLoading(packageId)

    try {
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      })

      if (!res.ok) {
        const data = await res.json()
        setPaymentError(data.error ?? 'Failed to create order')
        setPaymentLoading(null)
        return
      }

      const { checkoutUrl } = await res.json()

      const popup = window.open(
        checkoutUrl,
        'PayPalCheckout',
        'width=520,height=700,scrollbars=yes,resizable=yes',
      )
      popupRef.current = popup

      if (!popup) {
        setPaymentError('Popup blocked, please allow popups')
        setPaymentLoading(null)
        return
      }

      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
      pollTimerRef.current = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimerRef.current!)
          pollTimerRef.current = null
          setPaymentLoading(null)
        }
      }, 500)
    } catch {
      setPaymentError('Network error, please try again')
      setPaymentLoading(null)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile)
      setPreview(URL.createObjectURL(droppedFile))
      setResult('')
      setError('')
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      setFile(selectedFile)
      setPreview(URL.createObjectURL(selectedFile))
      setResult('')
      setError('')
    }
  }, [])

  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const progressValRef = useRef(0)

  // Keep ref in sync with state
  const updateProgress = (val: number) => {
    progressValRef.current = val
    setProgress(val)
  }

  // Smooth simulated progress: starts fast, slows down approaching target, never reaches 100 until done
  const startProgress = (target: number, durationMs: number) => {
    if (progressRef.current) clearInterval(progressRef.current)
    const startTime = Date.now()
    const startVal = progressValRef.current
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const ratio = Math.min(elapsed / durationMs, 1)
      // ease-out curve for natural feel
      const eased = 1 - Math.pow(1 - ratio, 3)
      const current = Math.round(startVal + (target - startVal) * eased)
      updateProgress(current)
      if (ratio >= 1) {
        if (progressRef.current) clearInterval(progressRef.current)
        progressRef.current = null
      }
    }, 60)
  }

  const stopProgress = () => {
    if (progressRef.current) {
      clearInterval(progressRef.current)
      progressRef.current = null
    }
  }

  const [hdUrl, setHdUrl] = useState<string>('')

  const handleEnhance = async () => {
    if (!file) return

    setEnhancing(true)
    updateProgress(5)
    setError('')
    setHdUrl('')

    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('userId', user?.id || 'anonymous')

      // Phase 1: uploading + AI processing (5→85, smooth over ~20s)
      startProgress(85, 20000)

      const response = await fetch('/api/enhance', {
        method: 'POST',
        body: formData,
      })

      // Response headers received — parsing body
      startProgress(95, 3000)

      const data = await response.json()
      stopProgress()

      if (!response.ok) {
        updateProgress(0)
        setError(data.error || 'Enhancement failed')
        if (data.code === 'RATE_LIMIT_EXCEEDED') {
          setShowUpgradeModal(true)
          if (typeof data.remaining === 'number') {
            setRateLimit(syncFromServer(data.remaining, data.isPro ?? isPro))
          }
        }
      } else {
        // Phase 3: done (→100, instant)
        updateProgress(100)
        setResult(data.previewUrl || data.enhancedUrl)
        setHdUrl(data.hdUrl || '')
        if (data.demo) {
          setError('⚠️ Demo mode: AI enhancement is not active. The image shown is the original. Please configure FAL_AI_API_KEY for real AI processing.')
        }
        if (typeof data.remaining === 'number') {
          setRateLimit(syncFromServer(data.remaining, data.isPro ?? isPro))
        } else {
          const newLimit = incrementUsage(isPro)
          setRateLimit(newLimit)
        }
        if (data.isPro) setIsPro(true)
      }
    } catch {
      stopProgress()
      updateProgress(0)
      setError('Network error, please try again')
    } finally {
      setEnhancing(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setPreview('')
    setResult('')
    setHdUrl('')
    setError('')
    updateProgress(0)
    stopProgress()
  }

  // Require login before performing an action
  const requireLogin = (action?: () => void) => {
    if (!user) {
      handleLogin()
      return false
    }
    action?.()
    return true
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-slate-900/80 backdrop-blur-md z-50 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-white">EnhanceAI</Link>
          <div className="flex gap-6 items-center">
            <Link href="/pricing" className="text-slate-300 hover:text-white transition">Pricing</Link>
            {user ? (
              <>
                <Link href="/history" className="text-slate-300 hover:text-white transition">History</Link>
                <span className="text-slate-300">{user.name}</span>
                <button onClick={handleLogout} className="text-red-400 hover:text-red-300 transition">Sign out</button>
              </>
            ) : (
              <button onClick={handleLogin} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition text-sm">
                Sign in with Google
              </button>
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
                <div className="text-center">
                  <p className="text-sm text-slate-400 mb-2">Original</p>
                  <img src={preview} alt="Original" className="w-48 h-48 rounded-lg object-cover" />
                </div>

                {result && (
                  <>
                    <div className="text-4xl text-slate-500">→</div>
                    <div className="text-center">
                      <p className="text-sm text-slate-400 mb-2">Enhanced</p>
                      <img src={result} alt="Enhanced" className="w-48 h-48 rounded-lg object-cover" />
                    </div>
                  </>
                )}

                {enhancing && (
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
              {error.includes('limit') && (
                <button onClick={() => requireLogin(() => setShowUpgradeModal(true))} className="mt-2 text-blue-400 hover:underline">
                  Upgrade to Pro for more →
                </button>
              )}
            </div>
          )}

          {/* Actions */}
          {file && !result && !enhancing && (
            <div className="flex justify-center gap-4">
              <button
                onClick={() => requireLogin(handleEnhance)}
                disabled={user ? !rateLimit?.allowed : false}
                className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
              >
                {user ? `✨ Enhance Image ${rateLimit ? `(${rateLimit.remaining} left)` : ''}` : '✨ Sign in to Enhance'}
              </button>
              <button onClick={handleReset} className="px-8 py-4 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition">
                Reset
              </button>
            </div>
          )}

          {result && (
            <div className="flex flex-col items-center gap-3">
              <div className="flex justify-center gap-4">
                <a href={result} download="enhanced-image.jpg" className="px-8 py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition">
                  ⬇️ Download Enhanced
                </a>
                <button onClick={handleReset} className="px-8 py-4 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition">
                  Enhance Another
                </button>
              </div>
              {hdUrl && (
                <a href={hdUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-sm transition">
                  🔍 View / Download Full Resolution (4x)
                </a>
              )}
            </div>
          )}

          {/* Upgrade Banner */}
          {rateLimit && !isPro && rateLimit.remaining === 0 && (
            <div className="mt-8 bg-gradient-to-r from-blue-900 to-purple-900 rounded-2xl p-8 text-center">
              <h3 className="text-2xl font-bold text-white mb-2">Daily limit reached</h3>
              <p className="text-slate-300 mb-4">Upgrade to Pro for 100 enhancements/day</p>
              <button onClick={() => requireLogin(() => setShowUpgradeModal(true))} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">
                Upgrade to Pro →
              </button>
            </div>
          )}

          {/* CTA for non-logged-in users */}
          {!user && (
            <div className="mt-12 text-center">
              <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-2xl p-8 max-w-2xl mx-auto border border-slate-700">
                <h3 className="text-2xl font-bold text-white mb-3">Ready to enhance your images?</h3>
                <p className="text-slate-400 mb-6">Sign in with Google to get 3 free enhancements per day</p>
                <button
                  onClick={handleLogin}
                  className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition text-lg"
                >
                  Sign in with Google — It&apos;s Free
                </button>
                <p className="text-slate-500 text-sm mt-4">Free: 3 enhancements/day • Pro: 100/day</p>
              </div>
            </div>
          )}
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
  )
}
