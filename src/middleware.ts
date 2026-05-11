import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED_PATHS = ['/dashboard', '/analytics', '/calls', '/settings', '/kiosk']

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )

  // T-228 View as Tenant: iframe requests carry ?impersonation=1. The
  // actual JWT lives in the URL hash (client-only), so the middleware
  // cannot validate it server-side. Skip the next-auth checks and let
  // the page render; ImpersonationProvider on the client picks up the
  // token from the hash, and the backend 403s any write attempts via
  // _require_writable. This bypass only applies to protected routes;
  // it does not weaken any other route's protection.
  if (isProtected && searchParams.get('impersonation') === '1') {
    return NextResponse.next()
  }

  const token = await getToken({ req: request })

  // Not authenticated. Redirect protected routes to login.
  if (!token && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    // Preserve original URL as redirect param (for kiosk deep-links)
    const originalPath = request.nextUrl.pathname + request.nextUrl.search
    if (originalPath !== '/') {
      url.searchParams.set('redirect', originalPath)
    }
    return NextResponse.redirect(url)
  }

  // Authenticated with 0 tenants. Redirect protected routes to landing
  // page signup.
  if (token && isProtected) {
    const tenants = (token.tenants as unknown[]) ?? []
    if (tenants.length === 0) {
      return NextResponse.redirect(new URL('https://fono.services'))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/analytics/:path*', '/calls/:path*', '/settings/:path*', '/kiosk/:path*', '/signup/:path*'],
}
