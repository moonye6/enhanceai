export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

import type { KVStore } from '@/lib/proStatus';
import { FREE_TIER_LIMIT, PRO_TIER_LIMIT } from '@/lib/fal-config';

interface ProRecord {
  plan: 'monthly' | 'lifetime';
  expiresAt: string | null;
}

/**
 * Get current month in YYYY-MM format for Pro users
 */
function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/**
 * GET /api/usage?userId=xxx
 * Returns the user's real remaining usage from KV.
 */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  try {
    const { getRequestContext } = await import('@cloudflare/next-on-pages');
    const { env } = getRequestContext();
    const kv = (env as Record<string, KVStore>)['ENHANCEAI_KV'];

    if (!kv) {
      return NextResponse.json({
        error: 'Storage unavailable',
        code: 'KV_UNAVAILABLE',
      }, { status: 503 });
    }

    // Check Pro status
    let isPro = false;
    const proRecord = await kv.get(`pro:${userId}`);
    if (proRecord) {
      try {
        const proData: ProRecord = JSON.parse(proRecord);
        if (proData.plan === 'lifetime' || (proData.expiresAt && new Date(proData.expiresAt) > new Date())) {
          isPro = true;
        }
      } catch { /* invalid JSON, treat as free */ }
    }

    // Check usage — matches enhance/route.ts key format:
    // Free users: total usage (never resets) — key: usage:${userId}
    // Pro users: monthly usage (resets each month) — key: usage:${userId}:YYYY-MM
    const usageKey = isPro
      ? `usage:${userId}:${getCurrentMonth()}`
      : `usage:${userId}`;
    const usageStr = await kv.get(usageKey);
    const usage = usageStr ? parseInt(usageStr, 10) : 0;
    const limit = isPro ? PRO_TIER_LIMIT : FREE_TIER_LIMIT;
    const remaining = Math.max(0, limit - usage);

    return NextResponse.json({
      remaining,
      total: limit,
      used: usage,
      isPro,
    });
  } catch {
    // In non-Cloudflare environment, return defaults
    return NextResponse.json({
      remaining: FREE_TIER_LIMIT,
      total: FREE_TIER_LIMIT,
      used: 0,
      isPro: false,
      fallback: true,
    });
  }
}
