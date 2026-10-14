import { NextRequest, NextResponse } from 'next/server'

// Token'a göre iyzico checkout formunu döner
// Token'ı initialize route'tan session/cache'de saklayabiliriz,
// ancak iyzico doğrudan /payment/3dsecure/retrieve ile token'dan form alır.
import { iyzicoEnabled } from '@/lib/iyzico'
import { createHmac, randomBytes } from 'crypto'

const IYZICO_API_KEY = process.env.IYZICO_API_KEY || ''
const IYZICO_SECRET_KEY = process.env.IYZICO_SECRET_KEY || ''
const IYZICO_BASE_URL = process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com'

function authHeader(body: string) {
  const rk = randomBytes(12).toString('base64')
  const hmac = createHmac('sha256', IYZICO_SECRET_KEY).update(IYZICO_API_KEY + rk + body).digest('hex')
  return `IYZWSv2 ${Buffer.from(`${IYZICO_API_KEY}:${rk}:${hmac}`).toString('base64')}`
}

export async function GET(req: NextRequest) {
  if (!iyzicoEnabled()) {
    return NextResponse.json({ error: 'Online ödeme aktif değil.' }, { status: 503 })
  }
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token gerekli.' }, { status: 400 })

  const bodyObj = { locale: 'tr', token }
  const bodyStr = JSON.stringify(bodyObj)
  const res = await fetch(`${IYZICO_BASE_URL}/payment/3dsecure/retrieve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeader(bodyStr) },
    body: bodyStr,
  })
  const data = await res.json()

  if (data.status !== 'success') {
    return NextResponse.json({ error: data.errorMessage || 'Form alınamadı.' }, { status: 400 })
  }

  return NextResponse.json({ htmlContent: data.checkoutFormContent })
}
