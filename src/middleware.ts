export { default } from 'next-auth/middleware'

export const config = {
  matcher: ['/dashboard/:path*', '/analytics/:path*', '/calls/:path*', '/settings/:path*', '/kiosk/:path*'],
}
