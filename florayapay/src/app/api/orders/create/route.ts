import { NextRequest, NextResponse } from 'next/server'
import { ERP_API_URL, siteKey, validatePromo, incrementPromoUsage } from '@/lib/erp-internal'

// Sipariş ERP'ye bu sunucu üzerinden gider. Fiyat ve toplam ERP'de yeniden hesaplanır;
// promosyon kodu burada (sunucuda) doğrulanır ve ERP'ye imzalı (x-site-key) iletilir.
// Aynı IP'den 15 dakikada en fazla 3 sipariş (bot / sahte sipariş koruması)
const recent = new Map<string, number[]>()
const WINDOW_MS = 15 * 60 * 1000
const MAX_PER_WINDOW = 3

function clientIp(req: NextRequest) {
  return (req.headers.get('x-forwarded-for')?.split(',')[0] ?? req.headers.get('x-real-ip') ?? 'unknown').trim()
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 })
  }

  // Bot koruması: görünmez alan doldurulmuşsa veya form 4 saniyeden kısa sürede gönderildiyse reddet
  const hp = String(body._hp ?? '').trim()
  const elapsed = Number(body._t ?? 0)
  if (hp || (Number.isFinite(elapsed) && elapsed > 0 && elapsed < 4000)) {
    return NextResponse.json({ message: 'Siparişiniz alınamadı. Lütfen sayfayı yenileyip tekrar deneyin.' }, { status: 400 })
  }
  const ip = clientIp(req)
  const now = Date.now()
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  if (hits.length >= MAX_PER_WINDOW) {
    return NextResponse.json({ message: 'Kısa sürede çok fazla sipariş denemesi yapıldı. Lütfen biraz sonra tekrar deneyin veya WhatsApp ile yazın.' }, { status: 429 })
  }
  hits.push(now)
  recent.set(ip, hits)
  if (recent.size > 5000) recent.clear()

  const promo = validatePromo(body.promoCode)
  // Tarayıcıdan gelen tutar/indirim alanları ERP'ye gönderilmez
  const { promoDiscount: _d, totalAmount: _tot, promo: _p, _hp: _h, _t: _el, ...rest } = body
  void _d; void _tot; void _p; void _h; void _el

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
