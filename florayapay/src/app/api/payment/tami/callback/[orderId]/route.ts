import { NextRequest, NextResponse } from 'next/server'
import { complete3DS, notifyErpPaid } from '@/lib/tami'

const SITE_URL = process.env.SITE_URL || 'https://www.erhanflowers.com'

async function handleCallback(orderId: string, params: Record<string, string>): Promise<NextResponse> {
  console.log('[tami callback path] orderId:', orderId, 'params:', JSON.stringify(params))

  const success = params['success'] || ''
  const mdStatus = params['mdStatus'] || ''

  // Explicit failure
  if (success === 'false' || (mdStatus && mdStatus !== '1')) {
    return NextResponse.redirect(
      `${SITE_URL}/odeme-basarisiz?kod=3ds_hata&mdStatus=${mdStatus}`,
      { status: 302 },
    )
  }

  console.log('[tami callback path] calling complete3DS for orderId:', orderId)
  const result = await complete3DS(orderId)
  console.log('[tami callback path] complete3DS result:', JSON.stringify(result))

  if (result.success) {
    await notifyErpPaid(orderId, result)
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

export async function GET(req: NextRequest, { params }: { params: { orderId: string } }) {
  const orderId = decodeURIComponent(params.orderId)
  console.log('[tami callback path GET] url:', req.url, 'orderId:', orderId)
  const qp: Record<string, string> = {}
  req.nextUrl.searchParams.forEach((v, k) => { qp[k] = v })
  return handleCallback(orderId, qp)
}

export async function POST(req: NextRequest, { params }: { params: { orderId: string } }) {
  const orderId = decodeURIComponent(params.orderId)
  console.log('[tami callback path POST] url:', req.url, 'orderId:', orderId)
  const qp: Record<string, string> = {}
  req.nextUrl.searchParams.forEach((v, k) => { qp[k] = v })
  try {
    const rawBody = await req.text()
    const sp = new URLSearchParams(rawBody)
    sp.forEach((v, k) => { qp[k] = v })
  } catch { /* ignore */ }
  return handleCallback(orderId, qp)
}
