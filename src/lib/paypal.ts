/**
 * PayPal 工具库
 * Edge Runtime 兼容（使用 fetch，不使用 Node.js http 模块）
 * PAYPAL_ENV=sandbox|live 自动切换端点
 */

export const runtime = 'edge';

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

export interface PayPalLink {
  href: string;
  rel: string;
  method?: string;
}

export interface PayPalOrder {
  id: string;
  status: 'CREATED' | 'SAVED' | 'APPROVED' | 'VOIDED' | 'COMPLETED' | 'PAYER_ACTION_REQUIRED';
  links: PayPalLink[];
}

export interface PayPalCaptureResult {
  id: string;
  status: 'COMPLETED' | 'DECLINED' | 'PARTIALLY_REFUNDED' | 'PENDING' | 'REFUNDED';
  purchase_units: Array<{
    reference_id: string;
    payments: {
      captures: Array<{
        id: string;
        status: string;
        amount: { currency_code: string; value: string };
      }>;
    };
  }>;
}

export interface CreateOrderParams {
  amount: string;   // e.g. "4.90"
  customId: string; // internal reference
  packageId: 'monthly' | 'lifetime';
}

// ---------------------------------------------------------------------------
// 配置
// ---------------------------------------------------------------------------

function getApiBase(): string {
  const env = process.env.PAYPAL_ENV ?? 'sandbox';
  return env === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  if (!url) {
    throw new Error(
      'Missing NEXT_PUBLIC_SITE_URL environment variable. ' +
      'PayPal requires absolute URLs for return_url / cancel_url.',
    );
  }
  return url.replace(/\/+$/, ''); // 去除末尾斜杠
}

// ---------------------------------------------------------------------------
// getAccessToken
// ---------------------------------------------------------------------------

export async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET');
  }

  const credentials = btoa(`${clientId}:${clientSecret}`);
  const apiBase = getApiBase();

  const res = await fetch(`${apiBase}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal token error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

// ---------------------------------------------------------------------------
// createOrder
// ---------------------------------------------------------------------------

export async function createOrder(params: CreateOrderParams): Promise<PayPalOrder> {
  const accessToken = await getAccessToken();
  const apiBase = getApiBase();
  const siteUrl = getSiteUrl();

  const body = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: params.packageId,
        custom_id: params.customId,
        amount: {
          currency_code: 'USD',
          value: params.amount,
        },
      },
    ],
    // application_context 兼容 live 环境（payment_source 在部分商户配置下返回 PAYER_ACTION_REQUIRED）
    application_context: {
      brand_name: 'EnhanceAI',
      landing_page: 'LOGIN',
      user_action: 'PAY_NOW',
      return_url: `${siteUrl}/payment/callback`,
      cancel_url: `${siteUrl}/payment/callback?cancelled=true`,
    },
  };

  const res = await fetch(`${apiBase}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal createOrder error ${res.status}: ${text}`);
  }

  return (await res.json()) as PayPalOrder;
}

// ---------------------------------------------------------------------------
// captureOrder
// ---------------------------------------------------------------------------

export async function captureOrder(paypalOrderId: string): Promise<PayPalCaptureResult> {
  const accessToken = await getAccessToken();
  const apiBase = getApiBase();

  const res = await fetch(`${apiBase}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal captureOrder error ${res.status}: ${text}`);
  }

  return (await res.json()) as PayPalCaptureResult;
}

// ---------------------------------------------------------------------------
// verifyWebhook
// ---------------------------------------------------------------------------

export interface WebhookVerifyParams {
  authAlgo: string;
  certUrl: string;
  transmissionId: string;
  transmissionSig: string;
  transmissionTime: string;
  webhookId: string;
  webhookEvent: unknown;
}

export async function verifyWebhook(params: WebhookVerifyParams): Promise<boolean> {
  const accessToken = await getAccessToken();
  const apiBase = getApiBase();

  const body = {
    auth_algo: params.authAlgo,
    cert_url: params.certUrl,
    transmission_id: params.transmissionId,
    transmission_sig: params.transmissionSig,
    transmission_time: params.transmissionTime,
    webhook_id: params.webhookId,
    webhook_event: params.webhookEvent,
  };

  const res = await fetch(`${apiBase}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return false;
  }

  const data = (await res.json()) as { verification_status: string };
  return data.verification_status === 'SUCCESS';
}
