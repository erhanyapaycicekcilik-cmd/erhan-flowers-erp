import { NextRequest, NextResponse } from 'next/server'
import { complete3DS, verifyCallbackHashedData } from '@/lib/tami'

const SITE_URL = process.env.SITE_URL || 'https://www.erhanflowers.com'

// Banka 3D doğrulaması sonrası bu endpoint'e POST atar
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const success = formData.get('success') as string
    const orderId = formData.get('orderId') as string
    const mdStatus = formData.get('mdStatus') as string
    const hashedData = formData.get('hashedData') as string
    const cardOrganization = (formData.get('cardOrganization') as string) || ''
    const cardBrand = (formData.get('cardBrand') as string) || ''
    const cardType = (formData.get('cardType') as string) || ''
    const maskedNumber = (formData.get('maskedNumber') as string) || ''
    const installmentCount = (formData.get('installmentCount') as string) || '1'
    const currency = (formData.get('currency') as string) || 'TRY'
    const txnAmount = (formData.get('txnAmount') as string) || ''
    const systemTime = (formData.get('systemTime') as string) || ''

    // hashedData doğrula
    if (hashedData) {
      const valid = verifyCallbackHashedData({
        cardOrganization, cardBrand, cardType, maskedNumber,
        installmentCount, currency, txnAmount, orderId,
        systemTime, success, hashedData,
      })
      if (!valid) {
        console.error('Tami callback hashedData doğrulama hatası', { orderId })
        return NextResponse.redirect(`${SITE_URL}/odeme-basarisiz?kod=guvenlik_hatasi`, { status: 302 })
      }
    }

    if (success !== 'true' || mdStatus !== '1') {
      return NextResponse.redirect(
        `${SITE_URL}/odeme-basarisiz?kod=3ds_hata&mdStatus=${mdStatus}`,
        { status: 302 },
      )
    }

    // 3D doğrulama başarılı → ödemeyi tamamla
    const result = await complete3DS(orderId)

    if (result.success) {
      return NextResponse.redirect(
        `${SITE_URL}/odeme-basarili?siparis=${encodeURIComponent(orderId)}&banka=${encodeURIComponent(result.bankAuthCode || '')}`,
        { status: 302 },
      )
    } else {
      return NextResponse.redirect(
        `${SITE_URL}/odeme-basarisiz?kod=${encodeURIComponent(result.errorMessage || 'hata')}`,
        { status: 302 },
      )
    }
  } catch (err) {
    console.error('tami callback error:', err)
    return NextResponse.redirect(`${SITE_URL}/odeme-basarisiz?kod=sunucu_hata`, { status: 302 })
  }
}
