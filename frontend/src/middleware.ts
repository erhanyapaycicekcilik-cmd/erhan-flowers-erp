import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.florayapaycicek.com'

const SKIP_PREFIXES = ['/_next/', '/favicon', '/api/', '/auth/']

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
    body: JSON.stringify({ site: 'erp', path: pathname, ipAddress: ip, userAgent }),
  }).catch(() => {})
}

export function middleware(request: NextRequest) {
  trackVisit(request)
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
