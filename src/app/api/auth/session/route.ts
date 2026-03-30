export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'

import type { KVStore } from '@/lib/proStatus'
import type { AuthSession } from '@/lib/auth'

interface ProRecord {
  plan: 'monthly' | 'lifetime';
  expiresAt: string | null;
}

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value

  if (!sessionId) {
    return NextResponse.json({ user: null, isPro: false })
  }

  try {
    const { getRequestContext } = await import('@cloudflare/next-on-pages')
    const { env } = getRequestContext()
    const kv = (env as Record<string, KVStore>)['ENHANCEAI_KV']

    if (!kv) {
      return NextResponse.json({ user: null, isPro: false })
    }

    const sessionStr = await kv.get(`session:${sessionId}`)
    if (!sessionStr) {
      return NextResponse.json({ user: null, isPro: false })
    }

    const session = JSON.parse(sessionStr) as AuthSession
    const userId = session.user?.id

    // Check Pro status
    let isPro = false
    if (userId) {
      const proRecord = await kv.get(`pro:${userId}`)
      if (proRecord) {
        const proData: ProRecord = JSON.parse(proRecord)
        if (proData.plan === 'lifetime' || (proData.expiresAt && new Date(proData.expiresAt) > new Date())) {
          isPro = true
        }
      }
    }

    return NextResponse.json({ 
      user: session.user,
      isPro,
    })
  } catch {
    return NextResponse.json({ user: null, isPro: false })
  }
}
