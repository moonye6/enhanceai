export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'

import type { KVStore } from '@/lib/proStatus'

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value

  // 清除 KV 中的 session
  if (sessionId) {
    try {
      const { getRequestContext } = await import('@cloudflare/next-on-pages')
      const { env } = getRequestContext()
      const kv = (env as Record<string, KVStore>)['ENHANCEAI_KV']
      if (kv) {
        await kv.delete(`session:${sessionId}`)
      }
    } catch {
      // KV 不可用时静默失败
    }
  }

  const res = NextResponse.json({ success: true })
  // 清除 session cookie
  res.cookies.delete('session_id')
  return res
}
