import { NextRequest, NextResponse } from 'next/server'
import { ERP_API_URL } from '@/lib/erp-internal'

// Toptan alım formu → ERP (Müşteri Soruları ekranı, SITE_TOPTAN)
export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 }) }
  try {
    const res = await fetch(`${ERP_API_URL}/public/wholesale-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': req.headers.get('x-forwarded-for') ?? '' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Şu an gönderilemedi' }, { status: 503 })
  }
}
