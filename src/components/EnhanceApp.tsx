'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { checkRateLimit, incrementUsage, syncFromServer, RateLimitResult } from '@/lib/rateLimit';

/**
 * Open the image in a new browser tab for downloading.
 */
function downloadImage(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}

// Tips shown during enhancement
const ENHANCE_TIPS = [
  'AuraSR AI generates new pixels with realistic detail recovery',
  'For best results, use sharp original photos without heavy compression',
  'Smaller images process faster — 512×512 takes ~5 seconds',
  'AI super resolution works best on faces, textures, and natural scenes',
  'Processing runs on edge servers worldwide for low latency',
  'Your images are processed in real-time and never stored permanently',
  'AI enhancement can recover details lost in low-resolution images',
];

interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
}

/**
 * Client-side image compression: aggressively resize & compress to stay under maxBytes.
 */
async function compressImageForUpload(file: File, maxBytes = 500 * 1024): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      const MAX_DIM = 1024;
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

      const qualities = [0.85, 0.75, 0.65, 0.55, 0.45, 0.35, 0.25];

      const tryCompress = (qi: number) => {
        const quality = qualities[qi] ?? 0.2;
        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(file); return; }
            if (blob.size <= maxBytes || qi >= qualities.length - 1) {
              const compressed = new File(
                [blob],
                file.name.replace(/\.\w+$/, '.jpg'),
                { type: 'image/jpeg' },
              );
              console.log(
                `[compress] ${file.name}: ${(file.size / 1024).toFixed(0)}KB → ${(blob.size / 1024).toFixed(0)}KB, ` +
                `${img.naturalWidth}×${img.naturalHeight} → ${width}×${height}, q=${quality}`,
              );
              resolve(compressed);
            } else {
              tryCompress(qi + 1);
            }
          },
          'image/jpeg',
          quality,
        );
      };

      if (file.size <= maxBytes && img.naturalWidth <= MAX_DIM && img.naturalHeight <= MAX_DIM) {
        console.log(`[compress] ${file.name}: already small enough (${(file.size / 1024).toFixed(0)}KB, ${img.naturalWidth}×${img.naturalHeight}), skipping`);
        resolve(file);
        return;
      }

      tryCompress(0);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
    img.src = objectUrl;
  });
}

export default function EnhanceApp() {
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
  const [dragActive, setDragActive] = useState(false);

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
        window.location.href = '/api/auth/callback/google'
      }
    }
  }, [loading, user, searchParams])

  // Sync real usage from server
  useEffect(() => {
    const localLimit = checkRateLimit(isPro)
    setRateLimit(localLimit)

    const uid = user?.id
    if (!uid) return

    fetch(`/api/usage?userId=${encodeURIComponent(uid)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && typeof data.remaining === 'number') {
          const synced = syncFromServer(data.remaining, data.isPro ?? isPro)
          setRateLimit(synced)
          if (data.isPro) setIsPro(true)
        }
      })
      .catch(() => { /* keep local cache */ })
  }, [user, isPro])

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
      // Clear local state even if request fails
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
    setDragActive(false)
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
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragActive(false)
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

  const updateProgress = (val: number) => {
    progressValRef.current = val
    setProgress(val)
  }

  const startProgress = (target: number, durationMs: number, stage: string) => {
    if (progressRef.current) clearInterval(progressRef.current)
    setProgressStage(stage)
    const startTime = Date.now()
    const startVal = progressValRef.current
    const range = target - startVal
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const ratio = Math.min(elapsed / durationMs, 1)
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

  const startTips = () => {
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
  const [downloading, setDownloading] = useState<'preview' | 'hd' | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [showFullPreview, setShowFullPreview] = useState(false)

  const handleDownload = (url: string, type: 'preview' | 'hd') => {
    setDownloading(type)
    downloadImage(url)
    setTimeout(() => setDownloading(null), 800)
  }

  const handleEnhance = async () => {
    if (!file) return

    setEnhancing(true)
    updateProgress(0)
    setError('')
    setHdUrl('')
    setResult('')
    setImageLoaded(false)
    setImageError(false)
    setShowFullPreview(false)
    startTips()

    try {
      startProgress(20, 1500, 'Compressing image...')
      const compressedFile = await compressImageForUpload(file)

      const formData = new FormData()
      formData.append('image', compressedFile)
      formData.append('userId', user?.id || 'anonymous')

      startProgress(85, 12000, 'AI is enhancing your image...')

      const response = await fetch('/api/enhance', {
        method: 'POST',
        body: formData,
      })

      startProgress(95, 1000, 'Loading result...')

      const data = await response.json()
      stopProgress()

      if (!response.ok) {
        updateProgress(0)
        stopTips()
        const errorMsg = data.error || 'Enhancement failed'
        if (data.code === 'RATE_LIMIT_EXCEEDED') {
          setError('Daily limit exceeded.')
          setShowUpgradeModal(true)
          if (typeof data.remaining === 'number') {
            setRateLimit(syncFromServer(data.remaining, data.isPro ?? isPro))
          }
        } else if (data.code === 'KV_UNAVAILABLE') {
          setError('Service temporarily unavailable. Please try again in a moment.')
        } else if (data.code === 'ENHANCEMENT_TIMEOUT') {
          setError('Enhancement timed out — your image may be too large. Try a smaller image.')
        } else if (data.code === 'ENHANCEMENT_FAILED') {
          setError(`Enhancement failed: ${errorMsg}. Please try again.`)
        } else {
          setError(errorMsg)
        }
      } else {
        startProgress(100, 500, 'Complete!')
        setTimeout(() => {
          stopProgress()
          stopTips()
        }, 600)
        setResult(data.previewUrl || data.enhancedUrl)
        setHdUrl(data.hdUrl || '')
        if (data.demo) {
          setError('Demo mode: AI enhancement is not active. The image shown is the original.')
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
      stopTips()
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
    setDownloading(null)
    setImageLoaded(false)
    setImageError(false)
    setShowFullPreview(false)
    updateProgress(0)
    stopProgress()
    stopTips()
    setCurrentTip('')
    setProgressStage('')
  }

  const requireLogin = (action?: () => void) => {
    if (!user) {
      handleLogin()
      return false
    }
    action?.()
    return true
  }

  // Scroll to the upload section
  const scrollToUpload = () => {
    document.getElementById('enhance-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      {/* ─── Navigation ─── */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-lg z-50 border-b border-dark-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex justify-between items-center">
          <a href="/" className="text-xl font-bold text-dark-900 tracking-tight">
            <span className="text-primary-500">Enhance</span>AI
          </a>
          <div className="flex gap-6 items-center">
            <a href="/pricing" className="text-dark-500 hover:text-dark-900 transition-colors text-sm font-medium">Pricing</a>
            {user ? (
              <>
                <a href="/history" className="text-dark-500 hover:text-dark-900 transition-colors text-sm font-medium">History</a>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-600 text-sm font-semibold">{user.name?.[0]?.toUpperCase()}</span>
                  </div>
                  <button onClick={handleLogout} className="text-dark-400 hover:text-red-500 transition-colors text-sm">Sign out</button>
                </div>
              </>
            ) : (
              <button
                onClick={handleLogin}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-all text-sm shadow-btn hover:shadow-btn-hover"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="pt-28 pb-16 px-6 bg-mesh">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Copy */}
            <div className="animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-50 border border-primary-100 rounded-full mb-6">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse-soft"></span>
                <span className="text-primary-600 text-xs font-semibold tracking-wide uppercase">AI-Powered Enhancement</span>
              </div>

              <h1 className="text-5xl lg:text-[56px] font-extrabold text-dark-900 leading-[1.1] tracking-tight mb-6">
                Enhance Any Image to{' '}
                <span className="text-primary-500">Stunning 4K</span>{' '}
                Quality
              </h1>

              <p className="text-lg text-dark-500 leading-relaxed mb-8 max-w-lg">
                Fix blur, restore details, upscale resolution — instantly with AI.
                No software to install, works right in your browser.
              </p>

              <div className="flex flex-wrap gap-4 mb-8">
                <button
                  onClick={scrollToUpload}
                  className="btn-primary px-8 py-4 text-base"
                >
                  Upload Image
                </button>
                <button
                  onClick={scrollToUpload}
                  className="btn-secondary px-8 py-4 text-base"
                >
                  Try Demo
                </button>
              </div>

              {/* Social proof mini */}
              <div className="flex items-center gap-4">
                <div className="flex -space-x-2">
                  {['bg-primary-200', 'bg-accent/20', 'bg-amber-200', 'bg-pink-200'].map((bg, i) => (
                    <div key={i} className={`w-8 h-8 rounded-full ${bg} border-2 border-white flex items-center justify-center`}>
                      <span className="text-xs">👤</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(i => (
                      <svg key={i} className="w-3.5 h-3.5 text-amber-400 fill-current" viewBox="0 0 20 20">
                        <path d="M10 1l2.39 6.17H19l-5.3 4.09L15.78 17.5 10 13.84 4.22 17.5l2.08-6.24L1 7.17h6.61z"/>
                      </svg>
                    ))}
                  </div>
                  <p className="text-dark-400 text-xs mt-0.5">Loved by 50,000+ users</p>
                </div>
              </div>
            </div>

            {/* Right: Before/After Preview Card */}
            <div className="animate-fade-in relative">
              <div className="bg-white rounded-2xl shadow-card-hover border border-dark-100 overflow-hidden">
                {/* Before/After comparison */}
                <div className="relative aspect-[4/3] bg-dark-50 overflow-hidden">
                  {/* Before image (placeholder pattern) */}
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-dark-100 to-dark-200">
                    <div className="text-center">
                      <div className="w-24 h-24 mx-auto mb-3 rounded-xl bg-dark-300/30 flex items-center justify-center">
                        <svg className="w-10 h-10 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                        </svg>
                      </div>
                      <p className="text-dark-400 text-sm font-medium">Upload an image to see the magic</p>
                    </div>
                  </div>

                  {/* Labels */}
                  <div className="absolute top-4 left-4 z-10">
                    <span className="px-2.5 py-1 bg-dark-900/70 backdrop-blur-sm text-white text-xs font-medium rounded-md">
                      Before
                    </span>
                  </div>
                  <div className="absolute top-4 right-4 z-10">
                    <span className="px-2.5 py-1 bg-accent/90 backdrop-blur-sm text-white text-xs font-medium rounded-md">
                      Enhanced
                    </span>
                  </div>

                  {/* Center divider */}
                  <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-white/80 z-10">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-dark-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-2 bg-white rounded-full shadow-card-hover border border-dark-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent"></span>
                <span className="text-dark-600 text-xs font-medium">4× AI Super Resolution</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Enhance Section ─── */}
      <section id="enhance-section" className="px-6 py-16">
        <div className="max-w-3xl mx-auto">
          {/* Rate limit badge */}
          {rateLimit && (
            <div className="flex justify-center mb-6 animate-fade-in">
              <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-white rounded-full shadow-card border border-dark-100">
                <div className={`w-2 h-2 rounded-full ${rateLimit.remaining > 0 ? 'bg-accent' : 'bg-red-400'}`}></div>
                <span className="text-dark-600 text-sm font-medium">
                  {rateLimit.remaining} enhancement{rateLimit.remaining !== 1 ? 's' : ''} remaining today
                </span>
                {isPro && (
                  <span className="px-2 py-0.5 bg-primary-50 text-primary-600 text-xs font-semibold rounded-full">PRO</span>
                )}
              </div>
            </div>
          )}

          {/* Upload Area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`relative bg-white rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer shadow-card overflow-hidden
              ${dragActive ? 'border-primary-400 bg-primary-50/50 scale-[1.01]' : 'border-dark-200 hover:border-primary-300 hover:shadow-card-hover'}
              ${file ? 'p-6' : 'p-10'}
            `}
          >
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />

            {!file ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-primary-50 flex items-center justify-center">
                  <svg className="w-8 h-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <p className="text-xl font-semibold text-dark-900 mb-2">Drag & drop your image here</p>
                <p className="text-dark-400 mb-4">or click to browse files</p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-dark-50 rounded-lg">
                  <span className="text-dark-400 text-xs font-medium">JPG, PNG, WebP</span>
                  <span className="w-1 h-1 rounded-full bg-dark-300"></span>
                  <span className="text-dark-400 text-xs font-medium">Max 5MB</span>
                </div>
              </div>
            ) : (
              <div className="relative z-0">
                {/* Original + Enhanced preview */}
                <div className="flex flex-col sm:flex-row gap-6 items-center justify-center">
                  {/* Original */}
                  <div className="text-center flex-1 max-w-[240px]">
                    <div className="relative group">
                      <img
                        src={preview}
                        alt="Original"
                        className="w-full aspect-square rounded-xl object-cover border border-dark-100"
                      />
                      <div className="absolute top-2 left-2">
                        <span className="px-2 py-0.5 bg-dark-900/60 backdrop-blur-sm text-white text-[10px] font-medium rounded-md">Original</span>
                      </div>
                    </div>
                  </div>

                  {/* Arrow / Processing */}
                  {result && !enhancing && (
                    <div className="flex-shrink-0">
                      <svg className="w-8 h-8 text-primary-400 rotate-90 sm:rotate-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </div>
                  )}

                  {/* Enhanced */}
                  {result && (
                    <div className="text-center flex-1 max-w-[240px] animate-scale-in">
                      <div className="relative group">
                        {/* Loading skeleton */}
                        {!imageLoaded && !imageError && (
                          <div className="w-full aspect-square rounded-xl bg-dark-100 animate-pulse flex items-center justify-center">
                            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-primary-400 border-t-transparent"></div>
                          </div>
                        )}
                        {/* Error state */}
                        {imageError && (
                          <div className="w-full aspect-square rounded-xl bg-dark-50 flex flex-col items-center justify-center gap-2 border border-dark-100">
                            <span className="text-2xl">⚠️</span>
                            <p className="text-red-500 text-xs font-medium">Load failed</p>
                            <button
                              onClick={() => { setImageError(false); setImageLoaded(false) }}
                              className="text-primary-500 text-xs font-medium hover:underline"
                            >
                              Retry
                            </button>
                          </div>
                        )}
                        {/* Actual image */}
                        <img
                          src={result}
                          alt="Enhanced"
                          className={`w-full aspect-square rounded-xl object-cover border border-dark-100 cursor-pointer
                            hover:ring-2 hover:ring-primary-300 transition-all
                            ${(!imageLoaded || imageError) ? 'hidden' : ''}`}
                          onLoad={() => setImageLoaded(true)}
                          onError={() => { setImageError(true); setImageLoaded(false) }}
                          onClick={() => setShowFullPreview(true)}
                        />
                        <div className="absolute top-2 left-2">
                          <span className="px-2 py-0.5 bg-accent/80 backdrop-blur-sm text-white text-[10px] font-medium rounded-md">Enhanced</span>
                        </div>
                        {imageLoaded && (
                          <p className="text-dark-400 text-[11px] mt-2 font-medium">Click to enlarge</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Processing state */}
                  {enhancing && (
                    <div className="flex-1 max-w-xs">
                      <div className="bg-dark-50 rounded-xl p-6 text-center">
                        <div className="inline-flex items-center gap-2 mb-3">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-500"></span>
                          </span>
                          <span className="text-dark-700 text-sm font-medium">{progressStage || 'Processing...'}</span>
                        </div>
                        <p className="text-3xl font-bold text-primary-500 mb-3">{progress}%</p>
                        <div className="w-full h-2 bg-dark-200 rounded-full overflow-hidden">
                          <div
                            className="h-full progress-bar rounded-full transition-all duration-300 ease-linear"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tips during enhancement */}
          {enhancing && currentTip && (
            <div className="mt-4 px-5 py-3 bg-primary-50/60 border border-primary-100 rounded-xl animate-fade-in">
              <p className="text-primary-700 text-sm text-center font-medium">💡 {currentTip}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 animate-fade-in-down">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-red-100 flex-shrink-0 flex items-center justify-center mt-0.5">
                  <span className="text-red-500 text-xs">!</span>
                </div>
                <div>
                  <p className="text-red-700 text-sm font-medium">{error}</p>
                  <div className="mt-2">
                    {error.includes('limit') || error.includes('exceeded') ? (
                      <button
                        onClick={() => requireLogin(() => setShowUpgradeModal(true))}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        Upgrade to Pro →
                      </button>
                    ) : (
                      file && !enhancing && !result && (
                        <button
                          onClick={() => { setError(''); handleEnhance(); }}
                          className="px-4 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                        >
                          Retry
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {file && !result && !enhancing && (
            <div className="flex justify-center gap-3 mt-6 animate-fade-in-up">
              <button
                onClick={() => requireLogin(handleEnhance)}
                disabled={user ? !rateLimit?.allowed : false}
                className="btn-primary px-8 py-3.5 text-base flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
                {user
                  ? `Enhance Image${rateLimit ? ` (${rateLimit.remaining} left)` : ''}`
                  : 'Sign in to Enhance'
                }
              </button>
              <button onClick={handleReset} className="btn-secondary px-6 py-3.5 text-base">
                Reset
              </button>
            </div>
          )}

          {/* Result actions */}
          {result && (
            <div className="flex flex-col items-center gap-3 mt-6 animate-fade-in-up">
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => handleDownload(result, 'preview')}
                  disabled={downloading === 'preview'}
                  className="px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-green-600 transition-all shadow-glow-accent hover:shadow-lg disabled:opacity-60 flex items-center gap-2"
                >
                  {downloading === 'preview' ? (
                    <>
                      <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                      Opening...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Download Preview
                    </>
                  )}
                </button>
                <button onClick={handleReset} className="btn-secondary px-6 py-3">
                  Enhance Another
                </button>
              </div>
              {hdUrl && (
                <button
                  onClick={() => handleDownload(hdUrl, 'hd')}
                  disabled={downloading === 'hd'}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-50 border border-primary-200 text-primary-600 hover:text-primary-700 hover:bg-primary-100 rounded-xl text-sm font-medium transition-all disabled:opacity-60"
                >
                  {downloading === 'hd' ? (
                    <>
                      <span className="inline-block animate-spin rounded-full h-3 w-3 border-2 border-primary-400 border-t-transparent"></span>
                      Opening HD...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Download HD Original (4× full resolution)
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Upgrade Banner */}
          {rateLimit && !isPro && rateLimit.remaining === 0 && (
            <div className="mt-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-8 text-center text-white shadow-glow">
              <h3 className="text-2xl font-bold mb-2">Daily limit reached</h3>
              <p className="text-primary-100 mb-5">Upgrade to Pro for 100 enhancements per day</p>
              <button
                onClick={() => requireLogin(() => setShowUpgradeModal(true))}
                className="px-6 py-3 bg-white text-primary-600 rounded-xl font-semibold hover:bg-primary-50 transition-all hover:scale-[1.02]"
              >
                Upgrade to Pro →
              </button>
            </div>
          )}

          {/* CTA for non-logged-in users */}
          {!user && !loading && (
            <div className="mt-10 text-center animate-fade-in-up">
              <div className="bg-white rounded-2xl p-8 shadow-card border border-dark-100 max-w-xl mx-auto">
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-primary-50 flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-dark-900 mb-2">Ready to enhance your images?</h3>
                <p className="text-dark-400 mb-6 text-sm">Sign in with Google to get 3 free enhancements per day</p>
                <button
                  onClick={handleLogin}
                  className="btn-primary px-8 py-3.5 text-base w-full sm:w-auto"
                >
                  Sign in with Google — It&apos;s Free
                </button>
                <p className="text-dark-400 text-xs mt-4">Free: 3/day • Pro: 100/day</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── Upgrade Modal ─── */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-dark-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full relative shadow-xl animate-scale-in">
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-dark-50 hover:bg-dark-100 flex items-center justify-center text-dark-400 hover:text-dark-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {paymentSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-dark-900 mb-2">Upgrade Successful!</h3>
                <p className="text-dark-500">You&apos;re now a Pro user with 100 enhancements/day.</p>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary-50 flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-dark-900">Upgrade to Pro</h3>
                  <p className="text-dark-400 text-sm mt-1">Unlock the full power of AI enhancement</p>
                </div>

                <div className="space-y-2.5 mb-6">
                  {['100 enhancements/day', 'Up to 8x upscaling', 'Batch processing', 'Priority support'].map((f, i) => (
                    <div key={i} className="flex items-center gap-3 text-dark-600">
                      <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium">{f}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="text-center p-4 bg-dark-50 rounded-xl border border-dark-100">
                    <p className="text-2xl font-bold text-dark-900">$4.9</p>
                    <p className="text-xs text-dark-400 font-medium">/month</p>
                  </div>
                  <div className="text-center p-4 bg-primary-50 rounded-xl border border-primary-100 relative">
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-primary-500 text-white text-[10px] font-bold rounded-full">BEST VALUE</div>
                    <p className="text-2xl font-bold text-dark-900">$49</p>
                    <p className="text-xs text-dark-400 font-medium">lifetime</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleUpgrade('monthly')}
                    disabled={!!paymentLoading}
                    className="flex-1 py-3 btn-secondary text-sm"
                  >
                    {paymentLoading === 'monthly' ? 'Processing...' : 'Monthly $4.9'}
                  </button>
                  <button
                    onClick={() => handleUpgrade('lifetime')}
                    disabled={!!paymentLoading}
                    className="flex-1 py-3 btn-primary text-sm"
                  >
                    {paymentLoading === 'lifetime' ? 'Processing...' : 'Lifetime $49'}
                  </button>
                </div>

                {paymentError && (
                  <p className="text-red-500 text-center text-sm mt-4 font-medium">{paymentError}</p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── Full-size Image Preview Modal ─── */}
      {showFullPreview && result && (
        <div
          className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer animate-fade-in"
          onClick={() => setShowFullPreview(false)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh] animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowFullPreview(false)}
              className="absolute -top-3 -right-3 w-9 h-9 bg-white shadow-lg text-dark-500 hover:text-dark-700 rounded-full flex items-center justify-center z-10 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={hdUrl || result}
              alt="Enhanced — Full Size"
              className="max-w-[90vw] max-h-[85vh] rounded-xl object-contain shadow-2xl"
            />
            <div className="flex justify-center gap-3 mt-4">
              <button
                onClick={() => handleDownload(result, 'preview')}
                disabled={downloading === 'preview'}
                className="px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-green-600 transition-all disabled:opacity-60 flex items-center gap-2"
              >
                {downloading === 'preview' ? (
                  <>
                    <span className="inline-block animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></span>
                    Opening...
                  </>
                ) : (
                  'Download Preview'
                )}
              </button>
              {hdUrl && (
                <button
                  onClick={() => handleDownload(hdUrl, 'hd')}
                  disabled={downloading === 'hd'}
                  className="px-5 py-2.5 bg-white text-primary-600 rounded-xl text-sm font-semibold hover:bg-primary-50 transition-all disabled:opacity-60 flex items-center gap-2 shadow-card"
                >
                  {downloading === 'hd' ? (
                    <>
                      <span className="inline-block animate-spin rounded-full h-3 w-3 border-2 border-primary-400 border-t-transparent"></span>
                      Opening HD...
                    </>
                  ) : (
                    'Download HD 4×'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
