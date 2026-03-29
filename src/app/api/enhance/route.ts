export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

import type { KVStore } from '@/lib/proStatus';

// AuraSR: fast, high-quality 4x image upscaler ($0.001/compute-second)
const FAL_AI_ENDPOINT = 'https://fal.run/fal-ai/aura-sr';
const FREE_TIER_LIMIT = 3;
const PRO_TIER_LIMIT = 100;
// Max preview size ~900KB to stay under 1MB with overhead
const MAX_PREVIEW_BYTES = 900 * 1024;

interface ProRecord {
  plan: 'monthly' | 'lifetime';
  expiresAt: string | null;
}

interface FalImage {
  url: string;
  width?: number;
  height?: number;
  file_size?: number;
  content_type?: string;
}

interface EnhanceApiResult {
  image?: FalImage;
  images?: FalImage[];
}

/**
 * Compress image to JPEG via canvas (OffscreenCanvas available in Edge runtime / Workers).
 * Progressively lowers quality to hit the byte budget.
 */
async function compressToJpeg(
  inputBytes: ArrayBuffer,
  contentType: string,
  maxBytes: number,
): Promise<{ blob: Blob; width: number; height: number }> {
  // Decode the image
  const sourceBlob = new Blob([inputBytes], { type: contentType });
  const bitmap = await createImageBitmap(sourceBlob);

  let targetWidth = bitmap.width;
  let targetHeight = bitmap.height;

  // If the image is very large, scale it down first (max 2048 on longest side for preview)
  const MAX_DIM = 2048;
  if (targetWidth > MAX_DIM || targetHeight > MAX_DIM) {
    const ratio = Math.min(MAX_DIM / targetWidth, MAX_DIM / targetHeight);
    targetWidth = Math.round(targetWidth * ratio);
    targetHeight = Math.round(targetHeight * ratio);
  }

  const canvas = new OffscreenCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close();

  // Try progressively lower quality
  for (const quality of [0.85, 0.75, 0.65, 0.5, 0.35]) {
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
    if (blob.size <= maxBytes) {
      return { blob, width: targetWidth, height: targetHeight };
    }
  }

  // Still too large? Scale down more aggressively
  const scale = 0.5;
  const sw = Math.round(targetWidth * scale);
  const sh = Math.round(targetHeight * scale);
  const smallCanvas = new OffscreenCanvas(sw, sh);
  const sctx = smallCanvas.getContext('2d')!;
  // Re-decode since we closed bitmap
  const reBlob = await canvas.convertToBlob({ type: 'image/png' });
  const reBitmap = await createImageBitmap(reBlob);
  sctx.drawImage(reBitmap, 0, 0, sw, sh);
  reBitmap.close();

  const finalBlob = await smallCanvas.convertToBlob({ type: 'image/jpeg', quality: 0.7 });
  return { blob: finalBlob, width: sw, height: sh };
}

export async function POST(request: NextRequest) {
  try {
    const FAL_AI_API_KEY = process.env.FAL_AI_API_KEY;
    const isDemoMode = !FAL_AI_API_KEY;

    const formData = await request.formData();
    const image = formData.get('image') as File;
    const userId = formData.get('userId') as string | null;

    if (!image) {
      return NextResponse.json({
        error: 'No image provided',
        code: 'NO_IMAGE',
      }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(image.type)) {
      return NextResponse.json({
        error: 'Invalid file type. Only JPG, PNG, WebP allowed.',
        code: 'INVALID_FILE_TYPE',
      }, { status: 400 });
    }

    if (image.size > 5 * 1024 * 1024) {
      return NextResponse.json({
        error: 'Image too large. Max 5MB.',
        code: 'FILE_TOO_LARGE',
      }, { status: 400 });
    }

    // Get KV and check rate limit
    let kv: KVStore | null = null;
    let isPro = false;
    let remaining = FREE_TIER_LIMIT;

    try {
      const { getRequestContext } = await import('@cloudflare/next-on-pages');
      const { env } = getRequestContext();
      kv = (env as Record<string, KVStore>)['ENHANCEAI_KV'] ?? null;

      if (kv && userId) {
        // Check Pro status
        const proRecord = await kv.get(`pro:${userId}`);
        if (proRecord) {
          const proData: ProRecord = JSON.parse(proRecord);
          if (proData.plan === 'lifetime' || (proData.expiresAt && new Date(proData.expiresAt) > new Date())) {
            isPro = true;
          }
        }

        // Check daily usage
        const today = new Date().toISOString().split('T')[0];
        const rateLimitKey = `ratelimit:${userId}:${today}`;
        const usageStr = await kv.get(rateLimitKey);
        const usage = usageStr ? parseInt(usageStr, 10) : 0;
        const limit = isPro ? PRO_TIER_LIMIT : FREE_TIER_LIMIT;
        remaining = Math.max(0, limit - usage);

        if (usage >= limit) {
          return NextResponse.json({
            error: 'Daily limit exceeded',
            code: 'RATE_LIMIT_EXCEEDED',
            remaining: 0,
            isPro,
          }, { status: 429 });
        }
      }
    } catch {
      console.warn('[enhance] getRequestContext not available');
    }

    const arrayBuffer = await image.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ''
      )
    );
    const dataUrl = `data:${image.type};base64,${base64}`;

    let previewDataUrl: string;
    let hdUrl = '';
    let demo = false;

    if (isDemoMode) {
      // Demo mode: return original image as-is (no AI processing)
      previewDataUrl = dataUrl;
      demo = true;
    } else {
      // Real mode: call fal.ai AuraSR for 4x AI upscaling
      const response = await fetch(FAL_AI_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${FAL_AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: dataUrl,
          checkpoint_version: 'v2',
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => 'Unknown');
        console.error('[enhance] fal.ai error:', response.status, errText);
        let userMessage = 'Enhancement failed';
        try {
          const errData = JSON.parse(errText);
          if (errData.detail) {
            userMessage = errData.detail;
          }
        } catch { /* use default message */ }
        return NextResponse.json({
          error: userMessage,
          code: 'ENHANCEMENT_FAILED',
          falStatus: response.status,
        }, { status: 500 });
      }

      const result: EnhanceApiResult = await response.json();
      const falImage = result.image || result.images?.[0];
      const resultUrl = falImage?.url;

      if (!resultUrl) {
        return NextResponse.json({
          error: 'No enhanced image URL in response',
          code: 'ENHANCEMENT_FAILED',
        }, { status: 500 });
      }

      // Keep the HD URL for "download full resolution" link
      hdUrl = resultUrl;

      // Download the enhanced image from fal.ai and compress for preview
      try {
        const imgResp = await fetch(resultUrl);
        if (imgResp.ok) {
          const imgBuffer = await imgResp.arrayBuffer();
          const imgContentType = imgResp.headers.get('content-type') || 'image/png';

          // If already small enough, use as-is
          if (imgBuffer.byteLength <= MAX_PREVIEW_BYTES) {
            const b64 = btoa(
              new Uint8Array(imgBuffer).reduce(
                (data, byte) => data + String.fromCharCode(byte),
                ''
              )
            );
            previewDataUrl = `data:${imgContentType};base64,${b64}`;
          } else {
            // Compress to JPEG preview
            const { blob } = await compressToJpeg(imgBuffer, imgContentType, MAX_PREVIEW_BYTES);
            const compressedBuffer = await blob.arrayBuffer();
            const b64 = btoa(
              new Uint8Array(compressedBuffer).reduce(
                (data, byte) => data + String.fromCharCode(byte),
                ''
              )
            );
            previewDataUrl = `data:image/jpeg;base64,${b64}`;
          }
        } else {
          // Fallback: return fal.ai URL directly (user may experience slow loading)
          previewDataUrl = resultUrl;
        }
      } catch (downloadErr) {
        console.warn('[enhance] Failed to proxy image, falling back to direct URL:', downloadErr);
        previewDataUrl = resultUrl;
      }
    }

    // Increment usage and save history (both demo and real mode)
    if (kv && userId) {
      const today = new Date().toISOString().split('T')[0];
      const rateLimitKey = `ratelimit:${userId}:${today}`;
      const usageStr = await kv.get(rateLimitKey);
      const usage = usageStr ? parseInt(usageStr, 10) : 0;
      await kv.put(rateLimitKey, String(usage + 1), { expirationTtl: 86400 });

      // Save history
      const historyKey = `history:${userId}:${Date.now()}`;
      await kv.put(historyKey, JSON.stringify({
        originalUrl: dataUrl.substring(0, 100) + '...',
        enhancedUrl: demo ? '(demo mode)' : hdUrl,
        scale: 4,
        createdAt: new Date().toISOString(),
      }), { expirationTtl: 30 * 86400 });

      remaining = Math.max(0, (isPro ? PRO_TIER_LIMIT : FREE_TIER_LIMIT) - usage - 1);
    }

    return NextResponse.json({
      // previewUrl: compressed JPEG data URL (<1MB) for instant display
      previewUrl: previewDataUrl,
      // hdUrl: original full-resolution URL from fal.ai (for "download full res")
      hdUrl: hdUrl || undefined,
      // Legacy field (same as previewUrl for backward compat)
      enhancedUrl: previewDataUrl,
      remaining,
      isPro,
      ...(demo ? { demo: true, message: 'Demo mode — set FAL_AI_API_KEY for real enhancement' } : {}),
    });

  } catch (error) {
    console.error('[enhance] Internal error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    hasApiKey: !!process.env.FAL_AI_API_KEY,
    demoMode: !process.env.FAL_AI_API_KEY,
    version: '3.0.0',
  });
}
