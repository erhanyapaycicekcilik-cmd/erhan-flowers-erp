import { NextRequest, NextResponse } from 'next/server'
import { auth3DS } from '@/lib/iyzico'

const SITE_URL = process.env.SITE_URL || 'https://www.erhanflowers.com'

// iyzico, 3DS sonrası bu endpoint'e POST yapar
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const token = formData.get('token') as string
    const mdStatus = formData.get('mdStatus') as string

    if (!token || mdStatus !== '1') {
      return NextResponse.redirect(`${SITE_URL}/odeme-basarisiz?kod=3ds_hata`, { status: 302 })
    }

    const result = await auth3DS(token)

    if (result.status === 'success') {
      const orderNumber = result.conversationId || ''
      return NextResponse.redirect(
        `${SITE_URL}/odeme-basarili?siparis=${encodeURIComponent(orderNumber)}&odeme=${result.paymentId || ''}`,
        { status: 302 },
      )
    } else {
      return NextResponse.redirect(
        `${SITE_URL}/odeme-basarisiz?kod=${encodeURIComponent(result.errorMessage || 'hata')}`,
        { status: 302 },
      )
    }
  } catch (err) {
    console.error('iyzico callback error:', err)
    return NextResponse.redirect(`${SITE_URL}/odeme-basarisiz?kod=sunucu_hata`, { status: 302 })
  }
}
