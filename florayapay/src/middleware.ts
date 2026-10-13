import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'erhan2024'
const COOKIE_NAME = 'admin_auth'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.erhanflowers.com'

const SKIP_PREFIXES = ['/_next/', '/favicon', '/images/', '/icons/', '/api/']

function trackVisit(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) return
  if (pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|css|js|woff2?)$/i)) return

  const ip =
    request.headers.get('x-forwarded-for') ??
    request.headers.get('x-real-ip') ??
    ''
  const userAgent = request.headers.get('user-agent') ?? ''

  fetch(`${API_URL}/visitor-logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ site: 'shop', path: pathname, ipAddress: ip, userAgent }),
  }).catch(() => {})
}

export function middleware(request: NextRequest) {
  trackVisit(request)

  const { pathname } = request.nextUrl
  if (!pathname.startsWith('/admin')) return NextResponse.next()
  if (pathname === '/admin/login') return NextResponse.next()

  const auth = request.cookies.get(COOKIE_NAME)?.value
  if (auth === ADMIN_PASSWORD) return NextResponse.next()

  const loginUrl = new URL('/admin/login', request.url)
  loginUrl.searchParams.set('from', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
