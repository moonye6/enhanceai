export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

import type { KVStore } from '@/lib/proStatus';
import { arrayBufferToBase64, compressToJpeg, MAX_PREVIEW_BYTES } from '@/lib/image-utils';

// fal.ai Queue API endpoints for AuraSR
const FAL_AI_QUEUE_BASE = 'https://queue.fal.run/fal-ai/aura-sr/requests';
const FREE_TIER_LIMIT = 3;
const PRO_TIER_LIMIT = 100;

interface ProRecord {
  plan: 'monthly' | 'lifetime';
  expiresAt: string | null;
}

interface FalQueueStatusResponse {
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  result?: {
    image?: { url: string };
    images?: Array<{ url: string }>;
  };
  error?: string;
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const requestId = id;

    if (!requestId) {
      return NextResponse.json({
        error: 'Missing request_id',
        code: 'MISSING_REQUEST_ID',
      }, { status: 400 });
    }

    // Demo mode check
    if (requestId.startsWith('demo-')) {
      return NextResponse.json({
        status: 'completed',
        message: 'Demo mode completed',
      });
    }

    // Get task metadata from KV
    let kv: KVStore | null = null;
    let userId: string | null = null;
    let isPro = false;
    let imageDataUrl: string | null = null;

    try {
      const { getRequestContext } = await import('@cloudflare/next-on-pages');
      const { env } = getRequestContext();
      kv = (env as Record<string, KVStore>)['ENHANCEAI_KV'] ?? null;

      if (kv) {
        const taskKey = `task:${requestId}`;
        const taskData = await kv.get(taskKey);
        if (taskData) {
          const task = JSON.parse(taskData);
          userId = task.userId;
          isPro = task.isPro;
          imageDataUrl = task.imageDataUrl;
        }
      }
    } catch {
      console.warn('[status] getRequestContext not available');
    }

    // Query fal.ai queue status
    const FAL_AI_API_KEY = process.env.FAL_AI_API_KEY;
    if (!FAL_AI_API_KEY) {
      return NextResponse.json({
        error: 'API key not configured',
        code: 'NO_API_KEY',
      }, { status: 500 });
    }

    const statusUrl = `${FAL_AI_QUEUE_BASE}/${requestId}/status`;
    const response = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${FAL_AI_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown');
      console.error('[status] fal.ai status error:', response.status, errText);
      return NextResponse.json({
        error: 'Failed to check status',
        code: 'STATUS_CHECK_FAILED',
      }, { status: 500 });
    }

    const statusResult: FalQueueStatusResponse = await response.json();

    // Handle different statuses
    if (statusResult.status === 'IN_QUEUE' || statusResult.status === 'IN_PROGRESS') {
      return NextResponse.json({
        status: 'processing',
        falStatus: statusResult.status,
      });
    }

    if (statusResult.status === 'FAILED') {
      return NextResponse.json({
        status: 'failed',
        error: statusResult.error || 'Enhancement failed',
        code: 'ENHANCEMENT_FAILED',
      });
    }

    if (statusResult.status === 'COMPLETED') {
      // Fetch the actual result
      const resultUrl = `${FAL_AI_QUEUE_BASE}/${requestId}`;
      const resultResponse = await fetch(resultUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Key ${FAL_AI_API_KEY}`,
        },
      });

      if (!resultResponse.ok) {
        const errText = await resultResponse.text().catch(() => 'Unknown');
        console.error('[status] fal.ai result error:', resultResponse.status, errText);
        return NextResponse.json({
          error: 'Failed to fetch result',
          code: 'RESULT_FETCH_FAILED',
        }, { status: 500 });
      }

      const resultData: EnhanceApiResult = await resultResponse.json();
      const falImage = resultData.image || resultData.images?.[0];
      const hdUrl = falImage?.url;

      if (!hdUrl) {
        return NextResponse.json({
          error: 'No enhanced image URL in response',
          code: 'ENHANCEMENT_FAILED',
        });
      }

      // Download the enhanced image from fal.ai and compress for preview
      let previewDataUrl = hdUrl;
      try {
        const imgResp = await fetch(hdUrl);
        if (imgResp.ok) {
          const imgBuffer = await imgResp.arrayBuffer();
          const imgContentType = imgResp.headers.get('content-type') || 'image/png';

          // If already small enough, use as-is
          if (imgBuffer.byteLength <= MAX_PREVIEW_BYTES) {
            const b64 = arrayBufferToBase64(imgBuffer);
            previewDataUrl = `data:${imgContentType};base64,${b64}`;
          } else {
            // Compress to JPEG preview (<500KB)
            const { blob } = await compressToJpeg(imgBuffer, imgContentType, MAX_PREVIEW_BYTES);
            const compressedBuffer = await blob.arrayBuffer();
            const b64 = arrayBufferToBase64(compressedBuffer);
            previewDataUrl = `data:image/jpeg;base64,${b64}`;
          }
        }
      } catch (downloadErr) {
        console.warn('[status] Failed to proxy image, falling back to direct URL:', downloadErr);
        // Keep hdUrl as previewDataUrl fallback
      }

      // Save to history
      if (kv && userId) {
        const historyKey = `history:${userId}:${Date.now()}`;
        await kv.put(historyKey, JSON.stringify({
          originalUrl: imageDataUrl ? imageDataUrl.substring(0, 100) + '...' : '(unknown)',
          enhancedUrl: hdUrl,
          scale: 4,
          createdAt: new Date().toISOString(),
        }), { expirationTtl: 30 * 86400 });

        // Clean up task metadata
        const taskKey = `task:${requestId}`;
        await kv.delete(taskKey);
      }

      // Calculate remaining
      let remaining = FREE_TIER_LIMIT;
      if (kv && userId) {
        const today = new Date().toISOString().split('T')[0];
        const rateLimitKey = `ratelimit:${userId}:${today}`;
        const usageStr = await kv.get(rateLimitKey);
        const usage = usageStr ? parseInt(usageStr, 10) : 0;
        remaining = Math.max(0, (isPro ? PRO_TIER_LIMIT : FREE_TIER_LIMIT) - usage);
      }

      return NextResponse.json({
        status: 'completed',
        previewUrl: previewDataUrl,
        hdUrl: hdUrl,
        enhancedUrl: previewDataUrl,
        remaining,
        isPro,
      });
    }

    // Unknown status
    return NextResponse.json({
      status: 'unknown',
      falStatus: statusResult.status,
    });

  } catch (error) {
    console.error('[status] Internal error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}
