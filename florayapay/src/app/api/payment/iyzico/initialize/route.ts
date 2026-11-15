import { NextRequest, NextResponse } from 'next/server'
import { initialize3DS, iyzicoEnabled } from '@/lib/iyzico'
import { fetchPayableOrder } from '@/lib/erp-internal'

const SITE_URL = process.env.SITE_URL || 'https://www.erhanflowers.com'

export async function POST(req: NextRequest) {
  if (!iyzicoEnabled()) {
    return NextResponse.json({ error: 'Online ödeme şu an aktif değil.' }, { status: 503 })
  }

  try {
    const body = await req.json()
    // Tahsil edilecek tutar ERP'deki siparişten alınır; tarayıcıdan gelen tutar kullanılmaz
    const order = await fetchPayableOrder(String(body?.orderNumber ?? ''))
    if (!order || order.paid || order.cancelled) {
      return NextResponse.json({ error: 'Sipariş bulunamadı veya ödemesi alınmış.' }, { status: 400 })
    }
    const tutar = Math.round(order.grandTotal * 100) / 100
    const callbackUrl = `${SITE_URL}/api/payment/iyzico/callback`
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'

    const result = await initialize3DS(
      {
        ...body,
        orderNumber: order.orderNumber,
        tutar,
        urunler: [{ id: order.orderNumber, ad: `Erhan Flowers sipariş ${order.orderNumber}`, kategori: 'YAPAY_CICEK', fiyat: tutar, adet: 1 }],
        musteri: { ...body.musteri, ip },
      },
      callbackUrl,
    )

    if (result.status !== 'success') {
      return NextResponse.json(
        { error: result.errorMessage || 'Ödeme başlatılamadı.' },
        { status: 400 },
      )
    }

    return NextResponse.json({
      token: result.token,
      htmlContent: result.checkoutFormContent || result.htmlContent,
    })
  } catch (err) {
    console.error('iyzico initialize error:', err)
    return NextResponse.json({ error: 'Sunucu hatası.' }, { status: 500 })
  }
}
