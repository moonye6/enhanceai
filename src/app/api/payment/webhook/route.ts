/**
 * POST /api/payment/webhook
 * PayPal Webhook 处理
 * - 验证签名
 * - 处理 PAYMENT.CAPTURE.COMPLETED
 * - 幂等（通过 KV 记录已处理的事件 ID）
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhook } from '@/lib/paypal';
import { setProStatus, type KVStore } from '@/lib/proStatus';

export const runtime = 'edge';

interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  resource: {
    id: string;
    status: string;
    custom_id?: string;
    purchase_units?: Array<{
      reference_id?: string;
      custom_id?: string;
      amount?: { currency_code: string; value: string };
    }>;
  };
}

function idempotencyKey(eventId: string): string {
  return `webhook:processed:${eventId}`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 尝试获取 Cloudflare KV
  let kv: KVStore | undefined;
  try {
    const { getRequestContext } = await import('@cloudflare/next-on-pages');
    const { env } = getRequestContext();
    kv = (env as Record<string, KVStore>)['ENHANCEAI_KV'];
  } catch {
    console.warn('[webhook] getRequestContext not available (non-edge env)');
  }

  try {
    const rawBody = await request.text();
    const event = JSON.parse(rawBody) as PayPalWebhookEvent;

    // 验证签名
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) {
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    const isValid = await verifyWebhook({
      authAlgo: request.headers.get('paypal-auth-algo') ?? '',
      certUrl: request.headers.get('paypal-cert-url') ?? '',
      transmissionId: request.headers.get('paypal-transmission-id') ?? '',
      transmissionSig: request.headers.get('paypal-transmission-sig') ?? '',
      transmissionTime: request.headers.get('paypal-transmission-time') ?? '',
      webhookId,
      webhookEvent: JSON.parse(rawBody) as unknown,
    });

    if (!isValid) {
      console.warn('[webhook] Invalid signature, event:', event.id);
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    // 幂等检查
    if (kv) {
      const alreadyProcessed = await kv.get(idempotencyKey(event.id));
      if (alreadyProcessed) {
        return NextResponse.json({ status: 'already_processed' });
      }
    }

    // 处理事件
    if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const userId = event.resource.custom_id;

      if (userId && kv) {
        const refId = event.resource.purchase_units?.[0]?.reference_id;
        const packageId: 'monthly' | 'lifetime' =
          refId === 'monthly' || refId === 'lifetime' ? refId : 'monthly';

        let expiresAt: Date | undefined;
        if (packageId === 'monthly') {
          expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        }

        await setProStatus(userId, packageId, kv, expiresAt);

        // 标记已处理（保留 7 天防重放）
        await kv.put(idempotencyKey(event.id), '1', { expirationTtl: 7 * 86400 });
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[webhook]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
