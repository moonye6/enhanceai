'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { checkRateLimit, incrementUsage, syncFromServer, RateLimitResult } from '@/lib/rateLimit';

// Tips shown during enhancement — rotated every few seconds
const ENHANCE_TIPS = [
  '💡 Tip: AuraSR AI generates new pixels with realistic detail recovery',
  '📸 Tip: For best results, use sharp original photos without heavy compression',
  '⚡ Tip: Smaller images process faster — 512×512 takes ~5 seconds',
  '🎨 Tip: AI super resolution works best on faces, textures, and natural scenes',
  '🔍 Tip: After enhancement, use "Download HD Original" for the full 4× resolution',
  '☁️ Tip: Processing runs on edge servers worldwide for low latency',
  '🖼️ Tip: Supported formats: JPEG, PNG, WebP — up to 5MB',
  '🚀 Tip: Pro users get 100 enhancements per day and up to 8× upscaling',
  '🔒 Tip: Your images are processed in real-time and never stored permanently',
  '✨ Tip: AI enhancement can recover details lost in low-resolution images',
];

interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
}

/**
 * Client-side image compression: resize & compress to stay under maxBytes (default 3MB).
 * Returns a File ready for upload.
 */
async function compressImageForUpload(file: File, maxBytes = 3 * 1024 * 1024): Promise<File> {
  // If already small enough, return as-is
  if (file.size <= maxBytes) return file;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // Scale down to max 2048px longest side to limit fal.ai output size
      const MAX_DIM = 2048;
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      // Try progressively lower quality JPEG
      const qualities = [0.9, 0.8, 0.7, 0.6, 0.5];
      const tryCompress = (qi: number) => {
        const quality = qualities[qi] ?? 0.4;
        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(file); return; }
            if (blob.size <= maxBytes || qi >= qualities.length - 1) {
              resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
            } else {
              tryCompress(qi + 1);
            }
          },
          'image/jpeg',
          quality,
        );
      };
      tryCompress(0);
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [enhancing, setEnhancing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState('');
  const [currentTip, setCurrentTip] = useState('');
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
  const tipTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Keep ref in sync with state
  const updateProgress = (val: number) => {
    progressValRef.current = val
    setProgress(val)
  }

  /**
   * Linear smooth progress: moves at constant speed from current → target over durationMs.
   * Uses small increments every 200ms for a truly smooth, gradual feel.
   */
  const startProgress = (target: number, durationMs: number, stage: string) => {
    if (progressRef.current) clearInterval(progressRef.current)
    setProgressStage(stage)
    const startTime = Date.now()
    const startVal = progressValRef.current
    const range = target - startVal
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const ratio = Math.min(elapsed / durationMs, 1)
      // Linear interpolation — no sudden jumps
      const current = Math.round(startVal + range * ratio)
      updateProgress(current)
      if (ratio >= 1) {
        if (progressRef.current) clearInterval(progressRef.current)
        progressRef.current = null
      }
    }, 200)
  }

  const stopProgress = () => {
    if (progressRef.current) {
      clearInterval(progressRef.current)
      progressRef.current = null
    }
  }

  // Tips rotation during enhancement
  const startTips = () => {
    // Pick a random initial tip
    setCurrentTip(ENHANCE_TIPS[Math.floor(Math.random() * ENHANCE_TIPS.length)])
    tipTimerRef.current = setInterval(() => {
      setCurrentTip(ENHANCE_TIPS[Math.floor(Math.random() * ENHANCE_TIPS.length)])
    }, 4000)
  }

  const stopTips = () => {
    if (tipTimerRef.current) {
      clearInterval(tipTimerRef.current)
      tipTimerRef.current = null
    }
  }

  const [hdUrl, setHdUrl] = useState<string>('')
  const pollCountRef = useRef<number>(0)
  const MAX_POLL_COUNT = 60 // 2 minutes with 2-second interval

  // Poll for task status
  const pollStatus = async (requestId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/enhance/status/${requestId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Status check failed')
      }

      if (data.status === 'completed') {
        // Phase 5: Done (→100%)
        startProgress(100, 500, 'Complete!')
        setTimeout(() => {
          stopProgress()
          stopTips()
        }, 600)
        setResult(data.previewUrl || data.enhancedUrl)
        setHdUrl(data.hdUrl || '')
        if (typeof data.remaining === 'number') {
          setRateLimit(syncFromServer(data.remaining, data.isPro ?? isPro))
        }
        if (data.isPro) setIsPro(true)
        setEnhancing(false)
        return
      }

      if (data.status === 'failed') {
        stopProgress()
        stopTips()
        updateProgress(0)
        setError(data.error || 'Enhancement failed')
        setEnhancing(false)
        return
      }

      // Still processing - increment poll count and continue
      pollCountRef.current++
      const elapsedSeconds = pollCountRef.current * 2
      
      // Update progress smoothly (20→85% during polling)
      const targetProgress = Math.min(85, 20 + (pollCountRef.current / MAX_POLL_COUNT) * 65)
      updateProgress(Math.round(targetProgress))
      setProgressStage(`AI is enhancing your image... (${elapsedSeconds}s)`)

      if (pollCountRef.current >= MAX_POLL_COUNT) {
        stopProgress()
        stopTips()
        updateProgress(0)
        setError('Enhancement timed out — your image may be too large. Try a smaller image or click "Enhance" again.')
        setEnhancing(false)
        return
      }

      // Continue polling after 2 seconds
      setTimeout(() => pollStatus(requestId), 2000)

    } catch (err) {
      stopProgress()
      stopTips()
      updateProgress(0)
      setError(err instanceof Error ? err.message : 'Status check failed')
      setEnhancing(false)
    }
  }

  const handleEnhance = async () => {
    if (!file) return

    setEnhancing(true)
    updateProgress(0)
    setError('')
    setHdUrl('')
    setResult('')
    startTips()
    pollCountRef.current = 0

    try {
      // Phase 1: Client-side compression (0→15%, ~2s)
      startProgress(15, 2000, 'Preparing image...')
      const compressedFile = await compressImageForUpload(file)

      const formData = new FormData()
      formData.append('image', compressedFile)
      formData.append('userId', user?.id || 'anonymous')

      // Phase 2: Submit task to queue (15→20%, ~3s)
      startProgress(20, 3000, 'Submitting to AI queue...')

      const response = await fetch('/api/enhance', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      stopProgress()

      if (!response.ok) {
        updateProgress(0)
        stopTips()
        setError(data.error || 'Enhancement failed')
        if (data.code === 'RATE_LIMIT_EXCEEDED') {
          setShowUpgradeModal(true)
          if (typeof data.remaining === 'number') {
            setRateLimit(syncFromServer(data.remaining, data.isPro ?? isPro))
          }
        }
        setEnhancing(false)
        return
      }

      // Update rate limit from initial response
      if (typeof data.remaining === 'number') {
        setRateLimit(syncFromServer(data.remaining, data.isPro ?? isPro))
      }
      if (data.isPro) setIsPro(true)

      // Handle demo mode - immediate response
      if (data.status === 'completed' || data.demo) {
        startProgress(100, 500, 'Complete!')
        setTimeout(() => {
          stopProgress()
          stopTips()
        }, 600)
        setResult(data.previewUrl || data.enhancedUrl)
        setHdUrl(data.hdUrl || '')
        if (data.demo) {
          setError('⚠️ Demo mode: AI enhancement is not active. The image shown is the original. Please configure FAL_AI_API_KEY for real AI processing.')
        }
        setEnhancing(false)
        return
      }

      // Start polling for status
      if (data.requestId && data.status === 'processing') {
        updateProgress(20)
        setProgressStage('AI is enhancing your image...')
        await pollStatus(data.requestId)
      } else {
        stopProgress()
        stopTips()
        updateProgress(0)
        setError('No request ID returned from server')
        setEnhancing(false)
      }

    } catch (err) {
      stopProgress()
      stopTips()
      updateProgress(0)
      setError(err instanceof Error ? err.message : 'Network error, please try again')
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
    stopTips()
    setCurrentTip('')
    setProgressStage('')
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
                  <div className="flex-1 max-w-xs">
                    <div className="text-center mb-3">
                      <div className="inline-flex items-center gap-2 mb-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                        </span>
                        <span className="text-white font-medium">{progressStage || 'Processing...'}</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-400">{progress}%</p>
                    </div>
                    <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300 ease-linear"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tips during enhancement */}
          {enhancing && currentTip && (
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-5 py-3 mb-6 transition-all">
              <p className="text-slate-300 text-sm text-center">{currentTip}</p>
            </div>
          )}

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
                <a href={result} download="enhanced-preview.jpg" className="px-8 py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition">
                  ⬇️ Download Preview
                </a>
                <button onClick={handleReset} className="px-8 py-4 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition">
                  Enhance Another
                </button>
              </div>
              {hdUrl && (
                <a href={hdUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600/20 border border-blue-500/40 text-blue-400 hover:text-blue-300 hover:bg-blue-600/30 rounded-lg text-sm font-medium transition">
                  <span>📥</span> Download HD Original (4× full resolution)
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

      {/* How It Works */}
      <section className="px-4 pb-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">How It Works</h2>
          <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">Enhance your images in three simple steps — no design skills needed</p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-800/50 rounded-2xl p-6 text-center border border-slate-700/50 hover:border-blue-500/30 transition">
              <div className="w-14 h-14 bg-blue-600/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📤</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">1. Upload</h3>
              <p className="text-slate-400 text-sm">Drag & drop or click to upload your image. Supports JPG, PNG, and WebP up to 5MB.</p>
            </div>
            <div className="bg-slate-800/50 rounded-2xl p-6 text-center border border-slate-700/50 hover:border-blue-500/30 transition">
              <div className="w-14 h-14 bg-purple-600/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">2. AI Enhance</h3>
              <p className="text-slate-400 text-sm">Our AuraSR AI model upscales your image to 4× resolution with incredible detail recovery.</p>
            </div>
            <div className="bg-slate-800/50 rounded-2xl p-6 text-center border border-slate-700/50 hover:border-blue-500/30 transition">
              <div className="w-14 h-14 bg-green-600/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⬇️</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">3. Download</h3>
              <p className="text-slate-400 text-sm">Get your enhanced image instantly. Download the compressed preview or full-resolution 4× version.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 pb-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">Why EnhanceAI?</h2>
          <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">Powered by cutting-edge AI, designed for everyone</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: '⚡', title: '4× Super Resolution', desc: 'Upscale images to 4 times the original resolution with AI-powered detail reconstruction' },
              { icon: '🎨', title: 'Detail Recovery', desc: 'Recover lost textures, edges and fine details that traditional upscalers miss' },
              { icon: '🔒', title: 'Privacy First', desc: 'Images are processed and never stored permanently. Your data stays yours' },
              { icon: '☁️', title: 'Cloud Powered', desc: 'Runs on edge servers worldwide for fast processing — no software to install' },
            ].map((f, i) => (
              <div key={i} className="bg-slate-800/30 rounded-xl p-5 border border-slate-700/30">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="text-white font-semibold mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="px-4 pb-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">Perfect For</h2>
          <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">Whatever your use case, EnhanceAI delivers stunning results</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '📸', title: 'Photography', desc: 'Upscale old or low-res photos to print-quality resolution. Bring new life to treasured memories.' },
              { icon: '🛍️', title: 'E-Commerce', desc: 'Make product images crystal clear for your online store. Higher quality images drive more sales.' },
              { icon: '🎮', title: 'Digital Art & Gaming', desc: 'Enhance textures, concept art, and screenshots. Perfect for artists and content creators.' },
            ].map((u, i) => (
              <div key={i} className="bg-gradient-to-b from-slate-800/60 to-slate-800/30 rounded-2xl p-6 border border-slate-700/40">
                <div className="text-4xl mb-4">{u.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{u.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 pb-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q: 'What is AI image enhancement?', a: 'AI image enhancement uses deep learning models to intelligently upscale images, recovering fine details, removing noise, and sharpening edges that traditional methods can\'t achieve.' },
              { q: 'How much does it cost?', a: 'EnhanceAI offers 3 free enhancements per day. For heavy users, our Pro plan starts at $4.9/month with 100 enhancements per day and up to 8× upscaling.' },
              { q: 'What image formats are supported?', a: 'We support JPEG, PNG, and WebP formats. Maximum file size is 5MB. The enhanced image is available in both compressed preview and full-resolution download.' },
              { q: 'Is my data safe?', a: 'Absolutely. Images are processed in real-time on secure edge servers. We don\'t permanently store your original or enhanced images on our servers.' },
              { q: 'How does the 4× upscaling work?', a: 'We use AuraSR v2, a state-of-the-art super-resolution AI model. It analyzes your image and generates new pixels with realistic details, effectively quadrupling the resolution (2× width and 2× height).' },
            ].map((item, i) => (
              <details key={i} className="group bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
                <summary className="flex items-center justify-between p-5 cursor-pointer text-white font-medium hover:bg-slate-800/80 transition">
                  {item.q}
                  <span className="text-slate-400 group-open:rotate-45 transition-transform text-xl ml-4">+</span>
                </summary>
                <div className="px-5 pb-5 text-slate-400 text-sm leading-relaxed">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-4 py-12">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <p className="text-white font-bold text-lg">EnhanceAI</p>
            <p className="text-slate-500 text-sm mt-1">AI-powered image enhancement & super resolution</p>
          </div>
          <div className="flex gap-6 text-sm">
            <Link href="/pricing" className="text-slate-400 hover:text-white transition">Pricing</Link>
            <a href="mailto:support@enhanceai.online" className="text-slate-400 hover:text-white transition">Contact</a>
          </div>
          <p className="text-slate-600 text-xs">© {new Date().getFullYear()} EnhanceAI. All rights reserved.</p>
        </div>
      </footer>

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
