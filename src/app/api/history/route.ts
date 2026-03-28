export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  try {
    const { getRequestContext } = await import('@cloudflare/next-on-pages');
    const { env } = getRequestContext();
    const kv = (env as any).ENHANCEAI_KV;

    if (!kv) {
      return NextResponse.json({ history: [] });
    }

    // List all history keys for this user
    const list = await kv.list({ prefix: `history:${userId}:` });
    const history = [];

    for (const key of list.keys) {
      const data = await kv.get(key.name);
      if (data) {
        history.push(JSON.parse(data));
      }
    }

    // Sort by createdAt descending
    history.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ history: history.slice(0, 50) });
  } catch {
    console.warn('[history] KV not available');
    return NextResponse.json({ history: [] });
  }
}
