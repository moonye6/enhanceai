'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { checkRateLimit, incrementUsage, syncFromServer, RateLimitResult } from '@/lib/rateLimit';

/**
 * Convert a data URL (base64) or any URL to a Blob, then trigger browser download.
 * This works reliably across all modern browsers — unlike <a download> on data: URLs
 * which Chrome and Safari silently ignore.
 *
 * For external URLs (e.g., fal.ai), we try fetch first. If CORS blocks the fetch,
 * we fall back to opening in a new tab (user can right-click → Save As).
 */
async function downloadImage(url: string, filename: string): Promise<void> {
  try {
    let blob: Blob;

    if (url.startsWith('data:')) {
      // Parse data URL → Blob directly (no network request)
      const [header, b64Data] = url.split(',');
      const mimeMatch = header.match(/data:([^;]+)/);
      const mime = mimeMatch?.[1] || 'image/jpeg';
      const binary = atob(b64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      blob = new Blob([bytes], { type: mime });
    } else {
      // External URL → try fetch as blob (may be blocked by CORS)
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      blob = await resp.blob();
    }

    // Create temporary blob URL and trigger download via hidden <a>
    triggerBlobDownload(blob, filename);
  } catch (err) {
    console.warn('Download via fetch failed, trying direct link:', err);
    // Fallback for CORS-blocked external URLs: try <a> with href directly
    // This works for some CDN URLs that allow cross-origin <a> clicks
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => document.body.removeChild(a), 1000);
    } catch {
      // Final fallback: open in new tab so user can right-click save
      window.open(url, '_blank');
    }
  }
}

/** Helper: trigger download from a Blob */
function triggerBlobDownload(blob: Blob, filename: string) {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
    document.body.removeChild(a);
  }, 1000);
}

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
 * Client-side image compression: aggressively resize & compress to stay under maxBytes.
 *
 * Target: ≤500KB, longest side ≤1024px.
 * This is critical because:
 *   1. fal.ai AuraSR does 4× upscale → 1024px input → 4096px output (perfect quality)
 *   2. Smaller input = fal.ai processes MUCH faster (seconds vs minutes)
 *   3. Smaller base64 payload = faster upload to our Edge API
 *   4. 4× of 1024px = 4096px, which is already excellent for download/print
 *
 * The function always compresses (even if file is under maxBytes) to ensure
 * dimensions are within MAX_DIM, which controls fal.ai output size & speed.
 */
async function compressImageForUpload(file: File, maxBytes = 500 * 1024): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Scale down to max 1024px longest side.
      // After 4× upscale this gives 4096px output — excellent quality.
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

      // If already small enough after resize, check raw size first
      // (skip quality reduction if resize alone was enough)
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

      // If the file is already under maxBytes AND dimensions are within MAX_DIM,
      // skip compression entirely
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

  // Sync real usage from server on mount & when user/isPro changes
  useEffect(() => {
    // Start with local cache for instant display
    const localLimit = checkRateLimit(isPro)
    setRateLimit(localLimit)

    // Then sync from server for accuracy
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
  const [downloading, setDownloading] = useState<'preview' | 'hd' | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [showFullPreview, setShowFullPreview] = useState(false)

  const handleDownload = async (url: string, filename: string, type: 'preview' | 'hd') => {
    setDownloading(type)
    try {
      await downloadImage(url, filename)
    } finally {
      // Small delay so user sees the "downloading" state
      setTimeout(() => setDownloading(null), 800)
    }
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
      // Phase 1: Client-side compression (0→20%, ~1s)
      startProgress(20, 1500, 'Compressing image...')
      const compressedFile = await compressImageForUpload(file)

      const formData = new FormData()
      formData.append('image', compressedFile)
      formData.append('userId', user?.id || 'anonymous')

      // Phase 2: Uploading + AI processing (20→85%, ~10s — much faster with smaller input)
      startProgress(85, 12000, 'AI is enhancing your image...')

      const response = await fetch('/api/enhance', {
        method: 'POST',
        body: formData,
      })

      // Response headers received — parsing result
      startProgress(95, 1000, 'Loading result...')

      const data = await response.json()
      stopProgress()

      if (!response.ok) {
        updateProgress(0)
        stopTips()
        const errorMsg = data.error || 'Enhancement failed'
        if (data.code === 'RATE_LIMIT_EXCEEDED') {
          setError('⚠️ Daily limit exceeded.')
          setShowUpgradeModal(true)
          if (typeof data.remaining === 'number') {
            setRateLimit(syncFromServer(data.remaining, data.isPro ?? isPro))
          }
        } else if (data.code === 'KV_UNAVAILABLE') {
          setError('⚠️ Service temporarily unavailable. Please try again in a moment.')
        } else if (data.code === 'ENHANCEMENT_TIMEOUT') {
          setError('⚠️ Enhancement timed out — your image may be too large. Try a smaller image or click "Enhance" again.')
        } else if (data.code === 'ENHANCEMENT_FAILED') {
          setError(`⚠️ Enhancement failed: ${errorMsg}. Please try again.`)
        } else {
          setError(`⚠️ ${errorMsg}`)
        }
      } else {
        // Phase 5: Done (→100%)
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

  // Require login before performing an action
  const requireLogin = (action?: () => void) => {
    if (!user) {
      handleLogin()
      return false
    }
    action?.()
    return true
  }

  return (
    <>
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-slate-900/80 backdrop-blur-md z-50 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <a href="/" className="text-xl font-bold text-white">EnhanceAI</a>
          <div className="flex gap-6 items-center">
            <a href="/pricing" className="text-slate-300 hover:text-white transition">Pricing</a>
            {user ? (
              <>
                <a href="/history" className="text-slate-300 hover:text-white transition">History</a>
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
                    <div className="text-center relative">
                      <p className="text-sm text-slate-400 mb-2">Enhanced</p>
                      {/* Loading skeleton */}
                      {!imageLoaded && !imageError && (
                        <div className="w-48 h-48 rounded-lg bg-slate-700 animate-pulse flex items-center justify-center">
                          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-400 border-t-transparent"></div>
                        </div>
                      )}
                      {/* Error state */}
                      {imageError && (
                        <div className="w-48 h-48 rounded-lg bg-slate-700 flex flex-col items-center justify-center gap-2">
                          <span className="text-3xl">⚠️</span>
                          <p className="text-red-400 text-xs">Load failed</p>
                          <button
                            onClick={() => { setImageError(false); setImageLoaded(false) }}
                            className="text-blue-400 text-xs hover:underline"
                          >
                            Retry
                          </button>
                        </div>
                      )}
                      {/* Actual image — clickable to expand */}
                      <img
                        src={result}
                        alt="Enhanced"
                        className={`w-48 h-48 rounded-lg object-cover cursor-pointer hover:ring-2 hover:ring-blue-400 transition ${(!imageLoaded || imageError) ? 'hidden' : ''}`}
                        onLoad={() => setImageLoaded(true)}
                        onError={() => { setImageError(true); setImageLoaded(false) }}
                        onClick={() => setShowFullPreview(true)}
                      />
                      {imageLoaded && (
                        <p className="text-slate-500 text-xs mt-1">Click to enlarge</p>
                      )}
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
              <div className="flex gap-3 mt-3">
                {error.includes('limit') || error.includes('exceeded') ? (
                  <button onClick={() => requireLogin(() => setShowUpgradeModal(true))} className="text-blue-400 hover:underline text-sm">
                    Upgrade to Pro for more →
                  </button>
                ) : (
                  /* Show retry button for non-rate-limit errors if file is still selected */
                  file && !enhancing && !result && (
                    <button
                      onClick={() => { setError(''); handleEnhance(); }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                    >
                      🔄 Retry Enhancement
                    </button>
                  )
                )}
              </div>
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
                <button
                  onClick={() => handleDownload(result, 'enhanced-preview.jpg', 'preview')}
                  disabled={downloading === 'preview'}
                  className="px-8 py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-60 flex items-center gap-2"
                >
                  {downloading === 'preview' ? (
                    <>
                      <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                      Saving...
                    </>
                  ) : (
                    '⬇️ Download Preview'
                  )}
                </button>
                <button onClick={handleReset} className="px-8 py-4 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition">
                  Enhance Another
                </button>
              </div>
              {hdUrl && (
                <button
                  onClick={() => handleDownload(hdUrl, 'enhanced-hd-4x.jpg', 'hd')}
                  disabled={downloading === 'hd'}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600/20 border border-blue-500/40 text-blue-400 hover:text-blue-300 hover:bg-blue-600/30 rounded-lg text-sm font-medium transition disabled:opacity-60"
                >
                  {downloading === 'hd' ? (
                    <>
                      <span className="inline-block animate-spin rounded-full h-3 w-3 border-2 border-blue-400 border-t-transparent"></span>
                      Saving HD...
                    </>
                  ) : (
                    <>
                      <span>📥</span> Download HD Original (4× full resolution)
                    </>
                  )}
                </button>
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
          {!user && !loading && (
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
                <p className="text-slate-300">You&apos;re now a Pro user with 100 enhancements/day.</p>
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

      {/* Full-size Image Preview Modal */}
      {showFullPreview && result && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setShowFullPreview(false)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <button
              onClick={() => setShowFullPreview(false)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-slate-700 hover:bg-slate-600 text-white rounded-full flex items-center justify-center text-lg z-10 transition"
            >
              ×
            </button>
            {/* Image */}
            <img
              src={hdUrl || result}
              alt="Enhanced — Full Size"
              className="max-w-[90vw] max-h-[85vh] rounded-lg object-contain"
            />
            {/* Bottom bar with download buttons */}
            <div className="flex justify-center gap-3 mt-3">
              <button
                onClick={() => handleDownload(result, 'enhanced-preview.jpg', 'preview')}
                disabled={downloading === 'preview'}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-60 flex items-center gap-1.5"
              >
                {downloading === 'preview' ? (
                  <>
                    <span className="inline-block animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></span>
                    Saving...
                  </>
                ) : (
                  '⬇️ Preview'
                )}
              </button>
              {hdUrl && (
                <button
                  onClick={() => handleDownload(hdUrl, 'enhanced-hd-4x.jpg', 'hd')}
                  disabled={downloading === 'hd'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-60 flex items-center gap-1.5"
                >
                  {downloading === 'hd' ? (
                    <>
                      <span className="inline-block animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></span>
                      Saving HD...
                    </>
                  ) : (
                    '📥 HD 4×'
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
