/**
 * POST /api/payment/capture
 * Body: { paypalOrderId: string, packageId: 'monthly' | 'lifetime', userId: string }
 * Response: { success: true, plan: string, expiresAt: string | null }
 */

import { NextRequest, NextResponse } from 'next/server';
import { captureOrder } from '@/lib/paypal';
import { setProStatus, type KVStore } from '@/lib/proStatus';

export const runtime = 'edge';

type PackageId = 'monthly' | 'lifetime';

function isValidPackageId(id: string): id is PackageId {
  return id === 'monthly' || id === 'lifetime';
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      paypalOrderId?: string;
      packageId?: string;
      userId?: string;
    };

    const { paypalOrderId, packageId, userId } = body;

    if (!paypalOrderId || !packageId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: paypalOrderId, packageId, userId' },
        { status: 400 },
      );
    }

    if (!isValidPackageId(packageId)) {
      return NextResponse.json(
        { error: 'Invalid packageId' },
        { status: 400 },
      );
    }

    // 捕获 PayPal 支付
    const result = await captureOrder(paypalOrderId);

    if (result.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: `Payment not completed. Status: ${result.status}` },
        { status: 402 },
      );
    }

    // 计算过期时间
    let expiresAt: Date | undefined;
    if (packageId === 'monthly') {
      expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // +30 天
    }

    // 写入 KV Pro 状态（通过 @cloudflare/next-on-pages 的 getRequestContext）
    try {
      const { getRequestContext } = await import('@cloudflare/next-on-pages');
      const { env } = getRequestContext();
      const kv = (env as Record<string, KVStore>)['ENHANCEAI_KV'];
      if (kv) {
        await setProStatus(userId, packageId, kv, expiresAt);
      }
    } catch {
      console.warn('[capture] getRequestContext not available (non-edge env)');
    }

    return NextResponse.json({
      success: true,
      plan: packageId,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[capture]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
