export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

import type { KVStore } from '@/lib/proStatus';
import { arrayBufferToBase64, compressToJpeg, MAX_PREVIEW_BYTES } from '@/lib/image-utils';
import { uploadHdImage, type R2Bucket } from '@/lib/r2';
import {
  FAL_MODEL_ID,
  FAL_QUEUE_BASE,
  FREE_TIER_LIMIT,
  PRO_TIER_LIMIT,
} from '@/lib/fal-config';

interface ProRecord {
  plan: 'monthly' | 'lifetime';
  expiresAt: string | null;
}

// fal.ai status response includes result when COMPLETED
interface FalQueueStatusResponse {
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  result?: {
    image?: {
      url: string;
      width?: number;
      height?: number;
      file_size?: number;
      content_type?: string;
    };
    images?: Array<{
      url: string;
      width?: number;
      height?: number;
    }>;
    timings?: Record<string, number>;
  };
  error?: string;
  logs?: Array<{ message: string }>;
}

interface FalImage {
  url: string;
  width?: number;
  height?: number;
  file_size?: number;
  content_type?: string;
}

// Result endpoint returns top-level image data (not nested under "result")
interface FalResultResponse {
  image?: FalImage;
  images?: FalImage[];
  detail?: unknown;
  [key: string]: unknown;
}

/**
 * Get current month in YYYY-MM format for Pro users
 */
function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
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
        remaining: FREE_TIER_LIMIT,
      });
    }

    // Get task metadata from KV + R2 binding for HD persistence
    let kv: KVStore | null = null;
    let r2: R2Bucket | null = null;
    let r2PublicUrl: string | null = null;
    let userId: string | null = null;
    let isPro = false;

    try {
      const { getRequestContext } = await import('@cloudflare/next-on-pages');
      const { env } = getRequestContext();
      const envRecord = env as Record<string, unknown>;
      kv = (envRecord['ENHANCEAI_KV'] as KVStore | undefined) ?? null;
      r2 = (envRecord['ENHANCEAI_R2'] as R2Bucket | undefined) ?? null;
      r2PublicUrl = (envRecord['R2_PUBLIC_URL'] as string | undefined) ?? null;

      if (kv) {
        const taskKey = `task:${requestId}`;
        const taskData = await kv.get(taskKey);
        if (taskData) {
          const task = JSON.parse(taskData);
          userId = task.userId;
          isPro = task.isPro;
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

    // Query status endpoint (includes result when COMPLETED)
    const statusUrl = `${FAL_QUEUE_BASE}/${FAL_MODEL_ID}/requests/${requestId}/status`;
    console.log('[status] Checking status:', statusUrl);
    
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
        details: {
          status: response.status,
          body: errText.substring(0, 500),
        },
      }, { status: 500 });
    }

    const statusResult: FalQueueStatusResponse = await response.json();
    console.log('[status] fal.ai status:', statusResult.status);

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
      // The /status endpoint does not include the result — fetch from the response_url (result endpoint)
      let resultData: FalResultResponse | null = statusResult.result
        ? { image: statusResult.result.image, images: statusResult.result.images }
        : null;

      if (!resultData?.image && !resultData?.images) {
        console.log('[status] No result in status response, fetching from result endpoint');
        const resultUrl = `${FAL_QUEUE_BASE}/${FAL_MODEL_ID}/requests/${requestId}`;
        const resultResp = await fetch(resultUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Key ${FAL_AI_API_KEY}`,
          },
        });

        if (resultResp.ok) {
          // Result endpoint returns top-level { image: {...}, timings: {...} }
          resultData = await resultResp.json();
          console.log('[status] Result endpoint response keys:', Object.keys(resultData ?? {}));
        } else {
          const errText = await resultResp.text().catch(() => 'Unknown');
          console.error('[status] Failed to fetch result:', resultResp.status, errText);
          // Check if fal.ai returned a validation error in the result
          try {
            const errData = JSON.parse(errText);
            if (errData.detail) {
              return NextResponse.json({
                error: 'Enhancement failed: invalid parameters',
                code: 'ENHANCEMENT_FAILED',
                details: errData.detail,
              });
            }
          } catch { /* not JSON */ }
        }
      }

      const falImage = resultData?.image || resultData?.images?.[0];
      const hdUrl = falImage?.url;

      if (!hdUrl) {
        console.error('[status] No image URL in result:', JSON.stringify(resultData ?? null).substring(0, 500));
        return NextResponse.json({
          error: 'No enhanced image URL in response',
          code: 'ENHANCEMENT_FAILED',
          details: resultData ?? null,
        });
      }

      // Download the enhanced image once — used for both preview compression and R2 persistence
      let previewDataUrl = hdUrl;
      let persistedHdUrl: string | null = null;
      try {
        const imgResp = await fetch(hdUrl);
        if (imgResp.ok) {
          const imgBuffer = await imgResp.arrayBuffer();
          const imgContentType = imgResp.headers.get('content-type') || 'image/png';

          // Persist HD bytes to R2 (returns null if R2 not configured or upload fails)
          if (userId) {
            persistedHdUrl = await uploadHdImage(r2, r2PublicUrl, imgBuffer, imgContentType, userId);
          }

          if (imgBuffer.byteLength <= MAX_PREVIEW_BYTES) {
            const b64 = arrayBufferToBase64(imgBuffer);
            previewDataUrl = `data:${imgContentType};base64,${b64}`;
          } else {
            const { blob } = await compressToJpeg(imgBuffer, imgContentType, MAX_PREVIEW_BYTES);
            const compressedBuffer = await blob.arrayBuffer();
            const b64 = arrayBufferToBase64(compressedBuffer);
            previewDataUrl = `data:image/jpeg;base64,${b64}`;
          }
        }
      } catch (downloadErr) {
        console.warn('[status] Failed to proxy image, falling back to direct URL:', downloadErr);
      }

      // The persistent URL the client should use (R2 if available, else fal.ai signed URL)
      const finalHdUrl = persistedHdUrl ?? hdUrl;

      // Save to history (only when we have a permanent URL — fal.ai URLs expire and would be useless)
      if (kv && userId && persistedHdUrl) {
        const historyKey = `history:${userId}:${Date.now()}`;
        await kv.put(historyKey, JSON.stringify({
          enhancedUrl: persistedHdUrl,
          scale: 4,
          createdAt: new Date().toISOString(),
        }), { expirationTtl: 30 * 86400 });
      }

      // Always clean up task metadata
      if (kv) {
        const taskKey = `task:${requestId}`;
        await kv.delete(taskKey);
      }

      // Calculate remaining
      let remaining = FREE_TIER_LIMIT;
      if (kv && userId) {
        const usageKey = isPro 
          ? `usage:${userId}:${getCurrentMonth()}` 
          : `usage:${userId}`;
        
        const usageStr = await kv.get(usageKey);
        const usage = usageStr ? parseInt(usageStr, 10) : 0;
        const limit = isPro ? PRO_TIER_LIMIT : FREE_TIER_LIMIT;
        remaining = Math.max(0, limit - usage);
        
        console.log('[status] Usage calculation:', { usageKey, usage, limit, remaining, isPro });
      }

      return NextResponse.json({
        status: 'completed',
        previewUrl: previewDataUrl,
        hdUrl: finalHdUrl,
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
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
