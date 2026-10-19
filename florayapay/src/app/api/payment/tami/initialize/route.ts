import { NextRequest, NextResponse } from 'next/server'
import { initiate3DS, tamiEnabled } from '@/lib/tami'

const SITE_URL = process.env.SITE_URL || 'https://www.erhanflowers.com'

export async function POST(req: NextRequest) {
  if (!tamiEnabled()) {
    return NextResponse.json({ error: 'Online ödeme şu an aktif değil.' }, { status: 503 })
  }

  try {
    const body = await req.json()
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
    const callbackUrl = `${SITE_URL}/api/payment/tami/callback`

    const result = await initiate3DS({ ...body, musteri: { ...body.musteri, ip }, callbackUrl })

    if (!result.success || !result.threeDSHtmlContent) {
      return NextResponse.json(
        { error: result.errorMessage || 'Ödeme başlatılamadı.' },
        { status: 400 },
      )
    }

    // base64 decode → HTML
    const html = Buffer.from(result.threeDSHtmlContent, 'base64').toString('utf-8')
    return NextResponse.json({ html })
  } catch (err) {
    console.error('tami initialize error:', err)
    return NextResponse.json({ error: 'Sunucu hatası.' }, { status: 500 })
  }
}
