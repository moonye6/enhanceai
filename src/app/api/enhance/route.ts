export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

const FAL_AI_ENDPOINT = 'https://fal.run/fal-ai/image-upscaling';
const FREE_TIER_LIMIT = 3;
const PRO_TIER_LIMIT = 100;

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
    let kv: any = null;
    let isPro = false;
    let remaining = FREE_TIER_LIMIT;

    try {
      const { getRequestContext } = await import('@cloudflare/next-on-pages');
      const { env } = getRequestContext();
      kv = (env as any).ENHANCEAI_KV;

      if (kv && userId) {
        // Check Pro status
        const proRecord = await kv.get(`pro:${userId}`);
        if (proRecord) {
          const proData = JSON.parse(proRecord);
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

    if (isDemoMode) {
      return NextResponse.json({
        enhancedUrl: dataUrl,
        demo: true,
        message: 'Demo mode - set FAL_AI_API_KEY for real enhancement',
        remaining,
        isPro,
      });
    }

    const response = await fetch(FAL_AI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: dataUrl,
        scale: 2,
        model: 'realesrgan-x4plus',
      }),
    });

    if (!response.ok) {
      return NextResponse.json({
        error: 'Enhancement failed',
        code: 'ENHANCEMENT_FAILED',
      }, { status: 500 });
    }

    const result = await response.json();
    const enhancedUrl = result.image?.url || result.images?.[0]?.url;

    // Increment usage and save history
    if (kv && userId) {
      const today = new Date().toISOString().split('T')[0];
      const rateLimitKey = `ratelimit:${userId}:${today}`;
      const usageStr = await kv.get(rateLimitKey);
      const usage = usageStr ? parseInt(usageStr, 10) : 0;
      await kv.put(rateLimitKey, String(usage + 1), { expirationTtl: 86400 });

      // Save history
      const historyKey = `history:${userId}:${Date.now()}`;
      await kv.put(historyKey, JSON.stringify({
        originalUrl: dataUrl.substring(0, 100) + '...',  // Truncate for storage
        enhancedUrl,
        scale: 2,
        createdAt: new Date().toISOString(),
      }), { expirationTtl: 30 * 86400 });

      remaining = Math.max(0, (isPro ? PRO_TIER_LIMIT : FREE_TIER_LIMIT) - usage - 1);
    }

    return NextResponse.json({
      enhancedUrl,
      remaining,
      isPro,
    });

  } catch (error) {
    return NextResponse.json({
      error: String(error),
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    hasApiKey: !!process.env.FAL_AI_API_KEY,
    demoMode: !process.env.FAL_AI_API_KEY,
    version: '2.0.0',
  });
}
