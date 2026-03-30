export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'

import type { KVStore } from '@/lib/proStatus'
import type { AuthSession } from '@/lib/auth'

interface ProRecord {
  plan: 'monthly' | 'lifetime';
  expiresAt: string | null;
}

function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value

  if (!sessionId) {
    return NextResponse.json({ user: null, isPro: false, remaining: 3 })
  }

  try {
    const { getRequestContext } = await import('@cloudflare/next-on-pages')
    const { env } = getRequestContext()
    const kv = (env as Record<string, KVStore>)['ENHANCEAI_KV']

    if (!kv) {
      return NextResponse.json({ user: null, isPro: false, remaining: 3 })
    }

    const sessionStr = await kv.get(`session:${sessionId}`)
    if (!sessionStr) {
      return NextResponse.json({ user: null, isPro: false, remaining: 3 })
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

    // Get real usage from server (authoritative)
    let remaining = isPro ? 100 : 3
    if (userId) {
      const usageKey = isPro 
        ? `usage:${userId}:${getCurrentMonth()}` 
        : `usage:${userId}`
      
      const usageStr = await kv.get(usageKey)
      const usage = usageStr ? parseInt(usageStr, 10) : 0
      const limit = isPro ? 100 : 3
      remaining = Math.max(0, limit - usage)
    }

    return NextResponse.json({ 
      user: session.user,
      isPro,
      remaining,
    })
  } catch {
    return NextResponse.json({ user: null, isPro: false, remaining: 3 })
  }
}
