// Site sunucusu ↔ ERP arası güvenli çağrılar. Bu dosya SADECE sunucu tarafında (route handler) kullanılır.
import { readSiteConfig, writeSiteConfig } from '@/lib/site-config'

export const ERP_API_URL = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || ''

/** ERP ile ortak anahtar (ERP'de SITE_INTERNAL_KEY, yoksa TAMI_SECRET_KEY) */
export function siteKey(): string {
  return (process.env.SITE_INTERNAL_KEY || process.env.TAMI_SECRET_KEY || '').trim()
}

export interface PayableOrder {
  orderNumber: string
  grandTotal: number
  paid: boolean
  cancelled: boolean
}

/** Kartla tahsil edilecek tutar ERP'deki kayıtlı siparişten okunur — tarayıcıdan gelen tutar KULLANILMAZ */
export async function fetchPayableOrder(orderNumber: string): Promise<PayableOrder | null> {
  if (!orderNumber || !siteKey()) return null
  try {
    const res = await fetch(`${ERP_API_URL}/public/orders/${encodeURIComponent(orderNumber)}/payable`, {
      headers: { 'x-site-key': siteKey() },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json()
    return Number(data?.grandTotal) > 0 ? data : null
  } catch {
    return null
  }
}

/** Promosyon kodunu sunucuda doğrular (site-config). Geçersizse null. */
export function validatePromo(code: unknown): { code: string; type: 'percent' | 'fixed'; value: number } | null {
  const c = typeof code === 'string' ? code.trim().toUpperCase() : ''
  if (!c) return null
  const promo = (readSiteConfig().promoCodes ?? []).find((p) => p.code.toUpperCase() === c && p.active)
  if (!promo) return null
  if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) return null
  if (promo.usageLimit > 0 && promo.usedCount >= promo.usageLimit) return null
  return { code: promo.code, type: promo.type, value: Number(promo.value) }
}

export function incrementPromoUsage(code: string) {
  const config = readSiteConfig()
  const idx = (config.promoCodes ?? []).findIndex((p) => p.code.toUpperCase() === code.toUpperCase())
  if (idx === -1) return
  config.promoCodes[idx].usedCount = (config.promoCodes[idx].usedCount ?? 0) + 1
  writeSiteConfig(config)
}
