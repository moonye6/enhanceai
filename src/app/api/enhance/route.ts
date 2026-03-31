export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

import type { KVStore } from '@/lib/proStatus';
import { arrayBufferToBase64, compressToJpeg, MAX_PREVIEW_DIM } from '@/lib/image-utils';
import {
  FAL_QUEUE_SUBMIT_URL,
  FREE_TIER_LIMIT,
  PRO_TIER_LIMIT,
  UPSCALE_FACTOR,
  OVERLAPPING_TILES,
  MAX_INPUT_DIMENSION,
} from '@/lib/fal-config';

interface ProRecord {
  plan: 'monthly' | 'lifetime';
  expiresAt: string | null;
}

interface FalQueueSubmitResponse {
  request_id: string;
  status: string;
}

/**
 * Get current month in YYYY-MM format for Pro users
 */
function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
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

        // Check usage based on user type
        // Free users: total usage (never resets)
        // Pro users: monthly usage (resets each month)
        const usageKey = isPro 
          ? `usage:${userId}:${getCurrentMonth()}`  // Pro: monthly
          : `usage:${userId}`;  // Free: total forever
        
        const usageStr = await kv.get(usageKey);
        const usage = usageStr ? parseInt(usageStr, 10) : 0;
        const limit = isPro ? PRO_TIER_LIMIT : FREE_TIER_LIMIT;
        remaining = Math.max(0, limit - usage);

        if (usage >= limit) {
          return NextResponse.json({
            error: isPro ? 'Monthly limit exceeded' : 'Free trial limit exceeded. Upgrade to Pro for more.',
            code: 'RATE_LIMIT_EXCEEDED',
            remaining: 0,
            isPro,
            limit,
          }, { status: 429 });
        }
      }
    } catch {
      console.warn('[enhance] getRequestContext not available');
    }

    // Read image and compress if too large
    const arrayBuffer = await image.arrayBuffer();
    
    // Pre-compress input image if too large (speed optimization)
    let dataUrl: string;
    let contentType = image.type;
    
    try {
      const sourceBlob = new Blob([arrayBuffer], { type: image.type });
      const bitmap = await createImageBitmap(sourceBlob);
      
      // If image is larger than MAX_INPUT_DIMENSION, pre-compress it
      if (bitmap.width > MAX_INPUT_DIMENSION || bitmap.height > MAX_INPUT_DIMENSION) {
        console.log(`[enhance] Pre-compressing large input: ${bitmap.width}x${bitmap.height}`);
        const { blob, width, height } = await compressToJpeg(arrayBuffer, image.type, 500 * 1024);
        const compressedBuffer = await blob.arrayBuffer();
        const base64 = arrayBufferToBase64(compressedBuffer);
        dataUrl = `data:image/jpeg;base64,${base64}`;
        contentType = 'image/jpeg';
        console.log(`[enhance] Compressed to ${width}x${height}, ${blob.size} bytes`);
      } else {
        const base64 = arrayBufferToBase64(arrayBuffer);
        dataUrl = `data:${image.type};base64,${base64}`;
      }
      bitmap.close();
    } catch (compressErr) {
      // Fallback to original if compression fails
      console.warn('[enhance] Pre-compression failed, using original:', compressErr);
      const base64 = arrayBufferToBase64(arrayBuffer);
      dataUrl = `data:${image.type};base64,${base64}`;
    }

    // Demo mode - return immediately with demo result
    if (isDemoMode) {
      return NextResponse.json({
        requestId: 'demo-' + Date.now(),
        status: 'completed',
        previewUrl: dataUrl,
        hdUrl: undefined,
        enhancedUrl: dataUrl,
        demo: true,
        message: 'Demo mode — set FAL_AI_API_KEY for real enhancement',
        remaining,
        isPro,
      });
    }

    // Submit to fal.ai queue (async mode) with Optimized Parameters
    const response = await fetch(FAL_QUEUE_SUBMIT_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: dataUrl,
        upscale_factor: UPSCALE_FACTOR,
        overlapping_tiles: OVERLAPPING_TILES,
        checkpoint: 'v2',  // Use latest checkpoint
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown');
      console.error('[enhance] fal.ai queue submit error:', response.status, errText);
      let userMessage = 'Failed to submit enhancement task';
      try {
        const errData = JSON.parse(errText);
        if (errData.detail) {
          userMessage = errData.detail;
        }
      } catch { /* use default message */ }
      return NextResponse.json({
        error: userMessage,
        code: 'SUBMIT_FAILED',
      }, { status: 500 });
    }

    const result: FalQueueSubmitResponse = await response.json();

    if (!result.request_id) {
      return NextResponse.json({
        error: 'No request_id returned from fal.ai',
        code: 'SUBMIT_FAILED',
      }, { status: 500 });
    }

    // Store task metadata in KV for later retrieval
    if (kv && userId) {
      const taskKey = `task:${result.request_id}`;
      await kv.put(taskKey, JSON.stringify({
        userId,
        isPro,
        imageDataUrl: dataUrl,
        createdAt: new Date().toISOString(),
      }), { expirationTtl: 3600 }); // 1 hour TTL
    }

    // Increment usage immediately (to prevent abuse)
    if (kv && userId) {
      const usageKey = isPro 
        ? `usage:${userId}:${getCurrentMonth()}` 
        : `usage:${userId}`;
      
      const usageStr = await kv.get(usageKey);
      const usage = usageStr ? parseInt(usageStr, 10) : 0;
      
      // Set TTL: Pro users = 35 days, Free users = no expiry (permanent)
      const ttl = isPro ? 35 * 24 * 3600 : undefined;
      await kv.put(usageKey, String(usage + 1), ttl ? { expirationTtl: ttl } : undefined);
      
      const limit = isPro ? PRO_TIER_LIMIT : FREE_TIER_LIMIT;
      remaining = Math.max(0, limit - usage - 1);
    }

    // Return request_id for client polling
    return NextResponse.json({
      requestId: result.request_id,
      status: 'processing',
      remaining,
      isPro,
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
    version: '6.0.0-async-total-limit',
    limits: {
      free: FREE_TIER_LIMIT,
      pro: PRO_TIER_LIMIT,
    },
    config: {
      upscaleFactor: UPSCALE_FACTOR,
      overlappingTiles: OVERLAPPING_TILES,
      maxInputDimension: MAX_INPUT_DIMENSION,
    },
  });
}
