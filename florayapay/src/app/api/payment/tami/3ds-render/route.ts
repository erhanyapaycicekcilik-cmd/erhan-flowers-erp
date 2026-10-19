import { NextRequest, NextResponse } from 'next/server'
import { get3dsHtml } from '@/lib/3ds-store'

const SITE_URL = process.env.SITE_URL || 'https://www.erhanflowers.com'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.redirect(`${SITE_URL}/odeme-basarisiz?kod=gecersiz_token`)
  }

  const html = get3dsHtml(token)
  if (!html) {
    return NextResponse.redirect(`${SITE_URL}/odeme-basarisiz?kod=oturum_suresi_doldu`)
  }

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; form-action *; frame-ancestors 'self'",
    },
  })
}
