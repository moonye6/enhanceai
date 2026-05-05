export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

import type { KVStore } from '@/lib/proStatus';

interface HistoryRecord {
  enhancedUrl: string;
  scale: number;
  createdAt: string;
}

interface KVListResult {
  keys: Array<{ name: string }>;
}

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  try {
    const { getRequestContext } = await import('@cloudflare/next-on-pages');
    const { env } = getRequestContext();
    const kv = (env as Record<string, KVStore>)['ENHANCEAI_KV'];

    if (!kv) {
      return NextResponse.json({ history: [] });
    }

    const list = await (kv as unknown as { list(opts: { prefix: string }): Promise<KVListResult> })
      .list({ prefix: `history:${userId}:` });
    const history: HistoryRecord[] = [];

    for (const key of list.keys) {
      const data = await kv.get(key.name);
      if (data) {
        history.push(JSON.parse(data) as HistoryRecord);
      }
    }

    // Sort by createdAt descending
    history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ history: history.slice(0, 50) });
  } catch {
    console.warn('[history] KV not available');
    return NextResponse.json({ history: [] });
  }
}
