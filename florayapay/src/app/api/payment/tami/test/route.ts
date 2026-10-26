import { NextResponse } from 'next/server'
import { tamiEnabled } from '@/lib/tami'
import { createHash } from 'crypto'

const MERCHANT_ID = process.env.TAMI_MERCHANT_ID || ''
const TERMINAL_ID = process.env.TAMI_TERMINAL_ID || ''
const SECRET_KEY = process.env.TAMI_SECRET_KEY || ''
const JWK_KID = process.env.TAMI_JWK_KID || ''
const JWK_K = process.env.TAMI_JWK_K || ''
const API_URL = process.env.TAMI_API_URL || 'https://paymentapi.tami.com.tr'

export async function GET() {
  const enabled = tamiEnabled()
  const missingVars: string[] = []
  if (!MERCHANT_ID) missingVars.push('TAMI_MERCHANT_ID')
  if (!TERMINAL_ID) missingVars.push('TAMI_TERMINAL_ID')
  if (!SECRET_KEY) missingVars.push('TAMI_SECRET_KEY')
  if (!JWK_KID) missingVars.push('TAMI_JWK_KID')
  if (!JWK_K) missingVars.push('TAMI_JWK_K')

  if (!enabled) {
    return NextResponse.json({
      ok: false,
      error: `Eksik .env değişkenleri: ${missingVars.join(', ')}`,
      apiUrl: API_URL,
    })
  }

  // Test auth token generation
  const hash = createHash('sha256')
    .update(MERCHANT_ID + TERMINAL_ID + SECRET_KEY)
    .digest('base64')
  const pgAuthToken = `${MERCHANT_ID}:${TERMINAL_ID}:${hash}`

  // Try a simple request to check connectivity
  try {
    const res = await fetch(`${API_URL}/payment/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PG-Api-Version': 'v3',
        'PG-Auth-Token': pgAuthToken,
        'correlationId': 'test-connection',
        'X-Correlation-ID': 'test-connection',
      },
      body: JSON.stringify({ test: true }),
      signal: AbortSignal.timeout(8000),
    })
    const text = await res.text()
    let parsed: unknown = null
    try { parsed = JSON.parse(text) } catch { /* ignore */ }
    return NextResponse.json({
      ok: true,
      envVarsSet: true,
      merchantId: MERCHANT_ID.slice(0, 4) + '****',
      terminalId: TERMINAL_ID.slice(0, 4) + '****',
      apiUrl: API_URL,
      httpStatus: res.status,
      tamiResponse: parsed ?? text.slice(0, 500),
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({
      ok: false,
      envVarsSet: true,
      apiUrl: API_URL,
      error: `Bağlantı hatası: ${msg}`,
    })
  }
}
