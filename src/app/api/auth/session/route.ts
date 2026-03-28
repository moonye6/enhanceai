export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value

  if (!sessionId) {
    return NextResponse.json({ user: null })
  }

  try {
    const { getRequestContext } = await import('@cloudflare/next-on-pages')
    const { env } = getRequestContext()
    const kv = (env as any).ENHANCEAI_KV

    if (!kv) {
      return NextResponse.json({ user: null })
    }

    const sessionStr = await kv.get(`session:${sessionId}`)
    if (!sessionStr) {
      return NextResponse.json({ user: null })
    }

    const session = JSON.parse(sessionStr)
    return NextResponse.json({ user: session.user })
  } catch {
    return NextResponse.json({ user: null })
  }
}
