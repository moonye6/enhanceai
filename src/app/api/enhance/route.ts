export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

import type { KVStore } from '@/lib/proStatus';
import { arrayBufferToBase64, MAX_PREVIEW_BYTES } from '@/lib/image-utils';

// AuraSR Queue API endpoints (async mode to avoid timeout)
const FAL_AI_QUEUE_SUBMIT = 'https://queue.fal.run/fal-ai/aura-sr/requests';
const FREE_TIER_LIMIT = 3;
const PRO_TIER_LIMIT = 100;

interface ProRecord {
  plan: 'monthly' | 'lifetime';
  expiresAt: string | null;
}

interface FalQueueSubmitResponse {
  request_id: string;
  status: string;
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
    const base64 = arrayBufferToBase64(arrayBuffer);
    const dataUrl = `data:${image.type};base64,${base64}`;

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

    // Submit to fal.ai queue (async mode)
    const response = await fetch(FAL_AI_QUEUE_SUBMIT, {
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
      const today = new Date().toISOString().split('T')[0];
      const rateLimitKey = `ratelimit:${userId}:${today}`;
      const usageStr = await kv.get(rateLimitKey);
      const usage = usageStr ? parseInt(usageStr, 10) : 0;
      await kv.put(rateLimitKey, String(usage + 1), { expirationTtl: 86400 });
      remaining = Math.max(0, (isPro ? PRO_TIER_LIMIT : FREE_TIER_LIMIT) - usage - 1);
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
    version: '5.0.0-async',
  });
}
