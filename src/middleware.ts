import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED_PATHS = ['/dashboard', '/analytics', '/calls', '/settings', '/kiosk']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )
  const token = await getToken({ req: request })

  // Not authenticated → redirect protected routes to login
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

  // Authenticated with 0 tenants → redirect protected routes to signup
  if (token && isProtected) {
    const tenants = (token.tenants as unknown[]) ?? []
    if (tenants.length === 0) {
      const url = request.nextUrl.clone()
      url.pathname = '/signup'
      url.searchParams.set('step', 'restaurant')
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/analytics/:path*', '/calls/:path*', '/settings/:path*', '/kiosk/:path*', '/signup/:path*'],
}
