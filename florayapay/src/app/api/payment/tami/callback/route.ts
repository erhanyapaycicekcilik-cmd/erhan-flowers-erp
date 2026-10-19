import { NextRequest, NextResponse } from 'next/server'
import { complete3DS, verifyCallbackHashedData } from '@/lib/tami'

const SITE_URL = process.env.SITE_URL || 'https://www.erhanflowers.com'

async function handleCallback(params: Record<string, string>): Promise<NextResponse> {
  const success = params['success'] || ''
  const orderId = params['orderId'] || ''
  const mdStatus = params['mdStatus'] || ''
  const hashedData = params['hashedData'] || ''
  const cardOrganization = params['cardOrganization'] || ''
  const cardBrand = params['cardBrand'] || ''
  const cardType = params['cardType'] || ''
  const maskedNumber = params['maskedNumber'] || ''
  const installmentCount = params['installmentCount'] || '1'
  const currency = params['currency'] || 'TRY'
  const txnAmount = params['txnAmount'] || ''
  const systemTime = params['systemTime'] || ''

  console.log('[tami callback]', { success, orderId, mdStatus, hashedData: !!hashedData })

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
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    console.log('[tami callback POST] url:', req.url)
    console.log('[tami callback POST] content-type:', req.headers.get('content-type'))
    console.log('[tami callback POST] body:', rawBody.substring(0, 500))

    const params: Record<string, string> = {}
    // try form data parse
    try {
      const sp = new URLSearchParams(rawBody)
      sp.forEach((v, k) => { params[k] = v })
    } catch { /* ignore */ }
    // also try query string
    req.nextUrl.searchParams.forEach((v, k) => { params[k] = v })

    return await handleCallback(params)
  } catch (err) {
    console.error('tami callback POST error:', err)
    return NextResponse.redirect(`${SITE_URL}/odeme-basarisiz?kod=sunucu_hata`, { status: 302 })
  }
}

export async function GET(req: NextRequest) {
  try {
    console.log('[tami callback GET] url:', req.url)
    const params: Record<string, string> = {}
    req.nextUrl.searchParams.forEach((v, k) => { params[k] = v })
    console.log('[tami callback GET] params:', params)
    return await handleCallback(params)
  } catch (err) {
    console.error('tami callback GET error:', err)
    return NextResponse.redirect(`${SITE_URL}/odeme-basarisiz?kod=sunucu_hata`, { status: 302 })
  }
}
