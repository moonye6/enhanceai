import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const pathname = req.nextUrl.pathname

  // Public paths that don't require authentication
  const publicPaths = ["/api/auth", "/pricing", "/payment/callback", "/favicon.ico", "/_next"]
  const isPublic = publicPaths.some((p) => pathname.startsWith(p))

  if (!isLoggedIn && !isPublic) {
    const signInUrl = new URL("/api/auth/signin", req.url)
    signInUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(signInUrl)
  }
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
}
