import { NextRequest, NextResponse } from 'next/server'
import { ERP_API_URL, siteKey, validatePromo, incrementPromoUsage } from '@/lib/erp-internal'

// Sipariş ERP'ye bu sunucu üzerinden gider. Fiyat ve toplam ERP'de yeniden hesaplanır;
// promosyon kodu burada (sunucuda) doğrulanır ve ERP'ye imzalı (x-site-key) iletilir.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 })
  }
  const promo = validatePromo(body.promoCode)
  // Tarayıcıdan gelen tutar/indirim alanları ERP'ye gönderilmez
  const { promoDiscount: _d, totalAmount: _t, promo: _p, ...rest } = body
  void _d; void _t; void _p

  try {
    const res = await fetch(`${ERP_API_URL}/public/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(siteKey() ? { 'x-site-key': siteKey() } : {}) },
      body: JSON.stringify({ ...rest, ...(promo ? { promo } : {}) }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok && promo && data?.orderNumber) {
      try { incrementPromoUsage(promo.code) } catch { /* sayaç hatası siparişi bozmasın */ }
    }
    return NextResponse.json(data, { status: res.ok ? 200 : res.status })
  } catch {
    return NextResponse.json({}, { status: 503 })
  }
}
