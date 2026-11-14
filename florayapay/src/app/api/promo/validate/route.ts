import { NextRequest, NextResponse } from 'next/server'
import { readSiteConfig } from '@/lib/site-config'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.trim().toUpperCase()
  if (!code) return NextResponse.json({ ok: false, error: 'Kod giriniz' })

  const config = readSiteConfig()
  const promo = (config.promoCodes ?? []).find(
    (p) => p.code.toUpperCase() === code && p.active,
  )

  if (!promo) return NextResponse.json({ ok: false, error: 'Geçersiz veya süresi dolmuş kod' })

  if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
    return NextResponse.json({ ok: false, error: 'Bu kodun geçerlilik süresi dolmuş' })
  }

  if (promo.usageLimit > 0 && promo.usedCount >= promo.usageLimit) {
    return NextResponse.json({ ok: false, error: 'Bu kod kullanım limitine ulaşmış' })
  }

  return NextResponse.json({
    ok: true,
    code: promo.code,
    type: promo.type,
    value: promo.value,
    description: promo.description,
  })
}

// Kullanım sayısı artık sipariş başarıyla kaydedilince sunucuda artırılır (api/orders/create).
