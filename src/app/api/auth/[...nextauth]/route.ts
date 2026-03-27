export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

// Stub auth handler for Cloudflare Pages edge compatibility
// TODO: Migrate to next-auth v5 or edge-compatible auth solution
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const action = url.pathname.split('/api/auth/')[1];

  // Return empty session
  if (action === 'session') {
    return NextResponse.json({ user: null, expires: '' });
  }

  // Redirect signin/signout to home
  return NextResponse.redirect(new URL('/', request.url));
}

export async function POST(_request: NextRequest) {
  return NextResponse.json({ user: null, expires: '' });
}
