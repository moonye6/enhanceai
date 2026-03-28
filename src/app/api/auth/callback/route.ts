export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
const REDIRECT_URI = 'https://enhanceai.pages.dev/api/auth/callback'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code) {
    // 开始 OAuth 流程
    const stateParam = Math.random().toString(36).substring(7)
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID)
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', 'openid email profile')
    authUrl.searchParams.set('state', stateParam)

    const res = NextResponse.redirect(authUrl.toString())
    // 存储 state 用于验证
    res.cookies.set('oauth_state', stateParam, { httpOnly: true, maxAge: 600, path: '/' })
    return res
  }

  // 回调：用 code 换 token
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      return NextResponse.redirect(new URL('/?error=auth_failed', request.url))
    }

    // 获取用户信息
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const userData = await userRes.json()

    // 创建 session（存储在 KV）
    const sessionId = crypto.randomUUID()
    const session = {
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        image: userData.picture,
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }

    // 存储 session 到 KV
    try {
      const { getRequestContext } = await import('@cloudflare/next-on-pages')
      const { env } = getRequestContext()
      const kv = (env as any).ENHANCEAI_KV
      if (kv) {
        await kv.put(`session:${sessionId}`, JSON.stringify(session), { expirationTtl: 30 * 24 * 3600 })
      }
    } catch {
      console.warn('KV not available')
    }

    const res = NextResponse.redirect(new URL('/', request.url))
    res.cookies.set('session_id', sessionId, { httpOnly: true, maxAge: 30 * 24 * 3600, path: '/' })
    return res
  } catch (error) {
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url))
  }
}
