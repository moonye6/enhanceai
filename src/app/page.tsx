'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { checkRateLimit, incrementUsage, RateLimitResult } from '@/lib/rateLimit';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [rateLimit, setRateLimit] = useState<RateLimitResult | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [user, setUser] = useState<{ email: string; name: string } | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
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
        if (data?.user) {
          setUser(data.user);
        }
      })
      .finally(() => setLoadingAuth(false));
  }, []);

  // Check rate limit on mount
  useEffect(() => {
    const limit = checkRateLimit(isPro);
    setRateLimit(limit);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPro]);

  // Listen for PayPal popup postMessage
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'PAYPAL_SUCCESS') return;

      const { paypalOrderId } = event.data as { paypalOrderId: string };

      // 清理轮询定时器
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }

      // 读取当前选择的 packageId（存在 closure 中）
      // 通过 capture route 完成支付
      try {
        const captureRes = await fetch('/api/payment/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paypalOrderId,
            // packageId 通过 userId cookie 匹配，这里传 monthly 作为默认
            // webhook 会以 reference_id 为准；capture 以 UI 传参为准
            packageId: paymentLoadingRef.current ?? 'monthly',
            userId: userIdRef.current,
          }),
        });

        if (captureRes.ok) {
          setIsPro(true);
          setPaymentSuccess(true);
          setPaymentLoading(null);
          // 1.5 秒后自动关闭弹窗
          setTimeout(() => {
            setPaymentSuccess(false);
            setShowUpgradeModal(false);
          }, 1500);
        } else {
          const data = (await captureRes.json()) as { error?: string };
          setPaymentError(data.error ?? '支付确认失败，请联系支持');
          setPaymentLoading(null);
        }
      } catch {
        setPaymentError('网络错误，请稍后重试');
        setPaymentLoading(null);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refs to track latest values inside event listeners
  const paymentLoadingRef = useRef<'monthly' | 'lifetime' | null>(null);
  const userIdRef = useRef<string>('');

  useEffect(() => {
    paymentLoadingRef.current = paymentLoading;
  }, [paymentLoading]);

  const handleLogin = () => {
    window.location.href = '/api/auth/signin/google';
  };

  const handleLogout = async () => {
    await fetch('/api/auth/signout', { method: 'POST' });
    setUser(null);
  };

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
        setPaymentError(data.error ?? '创建订单失败');
        setPaymentLoading(null);
        return;
      }

      const { checkoutUrl, userId: newUserId } = (await res.json()) as { checkoutUrl: string; paypalOrderId: string; userId: string };

      // 保存 userId 供 capture 请求使用
      userIdRef.current = newUserId;

      // 弹框打开 PayPal 支付页（不跳转当前页面）
      const popup = window.open(
        checkoutUrl,
        'PayPalCheckout',
        'width=520,height=700,scrollbars=yes,resizable=yes',
      );
      popupRef.current = popup;

      if (!popup) {
        setPaymentError('弹框被阻止，请允许弹窗后重试');
        setPaymentLoading(null);
        return;
      }

      // 轮询弹框关闭（兜底：用户直接关闭弹框未完成支付）
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimerRef.current!);
          pollTimerRef.current = null;
          setPaymentLoading(null);
        }
      }, 500);
    } catch {
      setPaymentError('网络错误，请稍后重试');
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setResult('');
      setError('');
      setErrorCode('');
    }
  };

  const handleEnhance = async () => {
    if (!file) return;

    const currentLimit = checkRateLimit(isPro);
    if (!currentLimit.allowed) {
      setRateLimit(currentLimit);
      setShowUpgradeModal(true);
      return;
    }

    setLoading(true);
    setProgress(0);
    setError('');
    setErrorCode('');
    setResult('');

    try {
      const formData = new FormData();
      formData.append('image', file);

      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch('/api/enhance', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || 'Enhancement failed');
        setErrorCode(data.code || 'UNKNOWN_ERROR');
        
        if (data.code === 'RATE_LIMIT_EXCEEDED') {
          setRateLimit({ ...rateLimit!, allowed: false, remaining: 0, resetAt: data.resetAt });
          setShowUpgradeModal(true);
        }
      } else {
        setResult(data.enhancedUrl);
        const newLimit = incrementUsage(isPro);
        setRateLimit(newLimit);
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
      setErrorCode('NETWORK_ERROR');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview('');
    setResult('');
    setError('');
    setErrorCode('');
    setProgress(0);
    const limit = checkRateLimit(isPro);
    setRateLimit(limit);
  };

  const formatResetTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const getErrorIcon = (code: string) => {
    switch (code) {
      case 'RATE_LIMIT_EXCEEDED': return '🚫';
      case 'FILE_TOO_LARGE': return '📦';
      case 'INVALID_FILE_TYPE': return '🖼️';
      default: return '❌';
    }
  };

  if (loadingAuth) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">加载中...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">
              <span className="text-blue-400">Enhance</span>AI
            </h1>
            <p className="text-slate-400 text-sm">一键 AI 图片增强</p>
          </div>
          
          <div className="flex items-center gap-4">
            {rateLimit && (
              <div className="text-right">
                <p className="text-sm text-slate-400">
                  今日剩余: <span className={`font-semibold ${rateLimit.remaining > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {rateLimit.remaining}/{rateLimit.total}
                  </span>
                </p>
              </div>
            )}
            
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-slate-300 text-sm">{user.name}</span>
                <button
                  onClick={handleLogout}
                  className="text-slate-400 hover:text-white text-sm"
                >
                  登出
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium"
              >
                Google 登录
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
          一键 AI 增强
        </h2>
        <p className="text-xl text-slate-300 mb-8">
          让每张照片都高清，仅需 $4.9/月
        </p>

        {/* Upload Area */}
        {!file ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-slate-600 rounded-2xl p-16 hover:border-blue-400 transition-colors cursor-pointer bg-slate-800/50"
          >
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="text-6xl mb-4">📷</div>
              <p className="text-xl text-white mb-2">拖拽图片到这里</p>
              <p className="text-slate-400">或点击上传</p>
              <p className="text-sm text-slate-500 mt-4">支持 JPG, PNG, WebP • 最大 5MB</p>
            </label>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Preview */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-slate-800 rounded-xl p-4">
                <p className="text-sm text-slate-400 mb-2">原图</p>
                <div className="aspect-square relative rounded-lg overflow-hidden bg-slate-700">
                  <Image src={preview} alt="Original" fill className="object-contain" />
                </div>
              </div>
              
              <div className="bg-slate-800 rounded-xl p-4">
                <p className="text-sm text-slate-400 mb-2">增强后</p>
                <div className="aspect-square relative rounded-lg overflow-hidden bg-slate-700 flex items-center justify-center">
                  {loading ? (
                    <div className="text-center">
                      <div className="text-4xl mb-4">⏳</div>
                      <p className="text-white">AI 增强中...</p>
                      <div className="w-48 h-2 bg-slate-600 rounded-full mt-4 mx-auto">
                        <div 
                          className="h-full bg-blue-400 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  ) : result ? (
                    <Image src={result} alt="Enhanced" fill className="object-contain" />
                  ) : (
                    <p className="text-slate-500">等待增强</p>
                  )}
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-900/30 border border-red-500 rounded-lg p-4 text-red-300 text-left">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{getErrorIcon(errorCode)}</span>
                  <div>
                    <p className="font-medium">{error}</p>
                    {errorCode === 'RATE_LIMIT_EXCEEDED' && (
                      <button 
                        onClick={() => setShowUpgradeModal(true)}
                        className="text-blue-400 hover:text-blue-300 text-sm mt-2 underline"
                      >
                        升级到 Pro 解锁无限次数 →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-center gap-4">
              {!result && !loading && (
                <button
                  onClick={handleEnhance}
                  disabled={rateLimit?.remaining === 0}
                  className={`px-8 py-3 text-white font-semibold rounded-xl transition-colors ${
                    rateLimit?.remaining === 0
                      ? 'bg-slate-600 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  ✨ 一键增强 {rateLimit && `(${rateLimit.remaining} 次)`}
                </button>
              )}
              
              {result && (
                <>
                  <a
                    href={result}
                    download="enhanced-image.png"
                    className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors"
                  >
                    ⬇️ 下载高清图
                  </a>
                  <button
                    onClick={handleReset}
                    className="px-8 py-3 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-xl transition-colors"
                  >
                    🔄 再来一张
                  </button>
                </>
              )}
              
              {!result && !loading && (
                <button
                  onClick={handleReset}
                  className="px-8 py-3 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-xl transition-colors"
                >
                  取消
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h3 className="text-2xl font-bold text-white text-center mb-12">三步完成</h3>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: '📤', title: '上传图片', desc: '拖拽或点击上传' },
            { icon: '✨', title: 'AI 增强', desc: '自动放大 2x + 去噪 + 锐化' },
            { icon: '⬇️', title: '下载高清', desc: '秒出结果，免费 3 次/天' },
          ].map((step, i) => (
            <div key={i} className="text-center bg-slate-800/50 rounded-xl p-6">
              <div className="text-4xl mb-4">{step.icon}</div>
              <h4 className="text-lg font-semibold text-white mb-2">{step.title}</h4>
              <p className="text-slate-400">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full">
            {paymentSuccess ? (
              /* 支付成功界面 */
              <div className="text-center py-4">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-2xl font-bold text-green-400 mb-2">升级成功！</h3>
                <p className="text-slate-300">您现在是 Pro 用户，享受 100 次/天增强。</p>
                <div className="mt-4 bg-green-900/30 border border-green-500 rounded-lg p-3 text-green-300 text-sm">
                  ✅ Pro 权益已激活，窗口即将关闭...
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-2xl font-bold text-white mb-4">🚀 升级到 Pro</h3>
                <p className="text-slate-300 mb-6">今日免费次数已用完。升级 Pro 解锁：</p>
                <ul className="space-y-3 mb-6">
                  {['100 次/天增强', '最高 8x 放大', '批量处理', '老照片修复'].map((f, i) => (
                    <li key={i} className="text-slate-300 flex items-center gap-2">
                      <span className="text-green-400">✓</span> {f}
                    </li>
                  ))}
                </ul>

                {/* 定价方案 */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-slate-700 rounded-xl p-4 text-center border border-slate-600">
                    <p className="text-sm text-slate-400 mb-1">Monthly</p>
                    <p className="text-2xl font-bold text-white">$4.9</p>
                    <p className="text-xs text-slate-400">/月</p>
                  </div>
                  <div className="bg-blue-900/40 rounded-xl p-4 text-center border border-blue-500">
                    <p className="text-sm text-blue-300 mb-1">Lifetime ⭐</p>
                    <p className="text-2xl font-bold text-white">$49</p>
                    <p className="text-xs text-slate-400">永久有效</p>
                  </div>
                </div>

                {/* 错误提示 */}
                {paymentError && (
                  <div className="bg-red-900/30 border border-red-500 rounded-lg p-3 mb-4 text-red-300 text-sm">
                    {paymentError}
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="space-y-2 mb-3">
                  <button
                    onClick={() => handleUpgrade('monthly')}
                    disabled={paymentLoading !== null}
                    className="w-full py-3 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {paymentLoading === 'monthly' ? '⏳ 跳转中...' : '💳 Monthly - $4.9/月'}
                  </button>
                  <button
                    onClick={() => handleUpgrade('lifetime')}
                    disabled={paymentLoading !== null}
                    className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {paymentLoading === 'lifetime' ? '⏳ 跳转中...' : '⭐ Lifetime - $49 永久'}
                  </button>
                </div>

                <button
                  onClick={() => {
                    setShowUpgradeModal(false);
                    setPaymentError('');
                  }}
                  disabled={paymentLoading !== null}
                  className="w-full py-2 text-slate-400 hover:text-slate-300 text-sm transition-colors disabled:opacity-50"
                >
                  稍后再说
                </button>

                {isPro && (
                  <p className="text-center text-green-400 mt-3 text-sm font-semibold">
                    ✅ 您已是 Pro 用户
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-700 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-slate-400 text-sm">
          <p>© 2026 EnhanceAI. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
