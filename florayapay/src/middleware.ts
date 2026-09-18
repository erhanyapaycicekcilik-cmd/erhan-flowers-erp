import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'erhan2024'
const COOKIE_NAME = 'admin_auth'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith('/admin')) return NextResponse.next()

  // Login sayfasına izin ver
  if (pathname === '/admin/login') return NextResponse.next()

  // Cookie kontrolü
  const auth = request.cookies.get(COOKIE_NAME)?.value
  if (auth === ADMIN_PASSWORD) return NextResponse.next()

  // Yetkisizse login'e yönlendir
  const loginUrl = new URL('/admin/login', request.url)
  loginUrl.searchParams.set('from', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/admin/:path*'],
}
