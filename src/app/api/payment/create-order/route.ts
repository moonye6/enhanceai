/**
 * POST /api/payment/create-order
 * Body: { packageId: 'monthly' | 'lifetime' }
 * Response: { checkoutUrl: string, paypalOrderId: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createOrder } from '@/lib/paypal';
import { getUserId } from '@/lib/userId';

export const runtime = 'edge';

const PACKAGES = {
  monthly: { amount: '4.90', label: 'Pro Monthly' },
  lifetime: { amount: '49.00', label: 'Pro Lifetime' },
} as const;

type PackageId = keyof typeof PACKAGES;

function isValidPackageId(id: string): id is PackageId {
  return id === 'monthly' || id === 'lifetime';
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as { packageId?: string };
    const { packageId } = body;

    if (!packageId || !isValidPackageId(packageId)) {
      return NextResponse.json(
        { error: 'Invalid packageId. Must be "monthly" or "lifetime".' },
        { status: 400 },
      );
    }

    const { userId, setCookieHeader } = getUserId(request);
    const pkg = PACKAGES[packageId];

    // 创建 PayPal 订单
    const paypalOrder = await createOrder({
      amount: pkg.amount,
      customId: userId,
      packageId,
    });

    // 从 API 响应取 approve 链接（不自己拼 URL）
    const approveLink = paypalOrder.links.find(l => l.rel === 'approve');
    if (!approveLink) {
      throw new Error('No approve link in PayPal response');
    }

    const responseBody = {
      checkoutUrl: approveLink.href,
      paypalOrderId: paypalOrder.id,
    };

    const res = NextResponse.json(responseBody, { status: 200 });

    // 新用户写入 userId cookie
    if (setCookieHeader) {
      res.headers.set('Set-Cookie', setCookieHeader);
    }

    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[create-order]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
