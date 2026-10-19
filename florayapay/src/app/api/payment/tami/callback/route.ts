import { NextRequest, NextResponse } from 'next/server'
import { complete3DS, verifyCallbackHashedData } from '@/lib/tami'

const SITE_URL = process.env.SITE_URL || 'https://www.erhanflowers.com'

async function handleCallback(params: Record<string, string>): Promise<NextResponse> {
  // Log all received params for debugging
  console.log('[tami callback] ALL PARAMS:', JSON.stringify(params))

  // Tami format fields
  const success = params['success'] || ''
  // Garanti BBVA uses 'oid' as orderId; Tami uses 'orderId'
  const orderId = params['orderId'] || params['oid'] || ''
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

  // Garanti BBVA direct callback: 'response'='Approved', 'procreturncode'='00'
  const garantiResponse = params['response'] || ''
  const garantiProcCode = params['procreturncode'] || ''

  console.log('[tami callback]', { success, orderId, mdStatus, hashedData: !!hashedData, garantiResponse, garantiProcCode })

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

  // Accept success if: Tami says success=true, OR mdStatus=1 (with no explicit failure), OR Garanti direct approval
  const isGarantiApproval = garantiResponse.toLowerCase() === 'approved' && garantiProcCode === '00'
  const isTamiSuccess = success === 'true'
  const isMdStatusOk = mdStatus === '1'

  if (!orderId) {
    console.error('[tami callback] orderId missing, params:', JSON.stringify(params))
    return NextResponse.redirect(`${SITE_URL}/odeme-basarisiz?kod=eksik_siparis_id`, { status: 302 })
  }

  if (success === 'false' || (mdStatus && mdStatus !== '1' && !isGarantiApproval)) {
    return NextResponse.redirect(
      `${SITE_URL}/odeme-basarisiz?kod=3ds_hata&mdStatus=${mdStatus}`,
      { status: 302 },
    )
  }

  if (!isTamiSuccess && !isMdStatusOk && !isGarantiApproval) {
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
    const contentType = req.headers.get('content-type') || ''
    console.log('[tami callback POST] url:', req.url)
    console.log('[tami callback POST] content-type:', contentType)
    console.log('[tami callback POST] raw body:', rawBody.substring(0, 1000))

    const params: Record<string, string> = {}
    // Parse form-encoded body
    try {
      const sp = new URLSearchParams(rawBody)
      sp.forEach((v, k) => { params[k] = v })
    } catch { /* ignore */ }
    // Also try JSON body
    if (contentType.includes('application/json') && rawBody) {
      try {
        const json = JSON.parse(rawBody)
        if (typeof json === 'object' && json !== null) {
          Object.entries(json).forEach(([k, v]) => { params[k] = String(v) })
        }
      } catch { /* ignore */ }
    }
    // URL query params (override body if duplicate)
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
