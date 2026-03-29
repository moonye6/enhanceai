export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'

import type { KVStore } from '@/lib/proStatus'

// ---------------------------------------------------------------------------
// 辅助：动态推导 redirect_uri（解决 redirect_uri_mismatch）
// 始终从当前请求 URL 推导 origin，自动适配多域名部署：
//   - 测试：https://enchanceai.pages.dev/api/auth/callback
//   - 正式：https://www.enhanceai.online/api/auth/callback
//   - 本地：http://localhost:3000/api/auth/callback
// ⚠️ 所有域名的回调地址都必须在 Google Cloud Console 中注册
// ---------------------------------------------------------------------------
function getRedirectUri(request: NextRequest): string {
  const url = new URL(request.url)
  return `${url.origin}/api/auth/callback`
}

export async function GET(request: NextRequest) {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      { error: 'Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' },
      { status: 500 },
    )
  }

  const redirectUri = getRedirectUri(request)
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const returnedState = searchParams.get('state')

  // -----------------------------------------------------------------------
  // 步骤 1：无 code — 开始 OAuth 授权流程
  // -----------------------------------------------------------------------
  if (!code) {
    const stateParam = crypto.randomUUID()
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', 'openid email profile')
    authUrl.searchParams.set('state', stateParam)
    authUrl.searchParams.set('access_type', 'online')
    authUrl.searchParams.set('prompt', 'select_account')

    const res = NextResponse.redirect(authUrl.toString())
    res.cookies.set('oauth_state', stateParam, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    })
    return res
  }

  // -----------------------------------------------------------------------
  // 步骤 2：有 code — CSRF state 验证 + 换 token
  // -----------------------------------------------------------------------

  // CSRF 验证：对比 cookie 中的 state 和 Google 返回的 state
  const savedState = request.cookies.get('oauth_state')?.value
  if (!savedState || savedState !== returnedState) {
    console.warn('[auth] CSRF state mismatch:', { savedState, returnedState })
    return NextResponse.redirect(new URL('/?error=csrf_mismatch', request.url))
  }

  try {
    // 用授权码换取 access_token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json() as { access_token?: string }

    if (!tokenData.access_token) {
      console.error('[auth] Token exchange failed:', tokenData)
      return NextResponse.redirect(new URL('/?error=auth_failed', request.url))
    }

    // 获取用户信息
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const userData = await userRes.json() as {
      id: string
      email: string
      name: string
      picture?: string
    }

    // 创建 session
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
      const kv = (env as Record<string, KVStore>)['ENHANCEAI_KV']
      if (kv) {
        await kv.put(`session:${sessionId}`, JSON.stringify(session), { expirationTtl: 30 * 24 * 3600 })
      }
    } catch {
      console.warn('[auth] KV not available — session stored in cookie only')
    }

    const res = NextResponse.redirect(new URL('/', request.url))
    // 设置 session cookie
    res.cookies.set('session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 3600,
      path: '/',
    })
    // 清除 oauth_state cookie
    res.cookies.delete('oauth_state')
    return res
  } catch (error) {
    console.error('[auth] OAuth callback error:', error)
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url))
  }
}
