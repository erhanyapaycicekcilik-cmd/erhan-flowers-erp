'use server'
import { adminSecret } from '@/lib/admin-secret'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'erhan2024'
const COOKIE_NAME = 'admin_auth'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8101'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3200'

async function revalidateSite() {
  const secret = adminSecret()
  await fetch(`${APP_URL}/api/revalidate?secret=${secret}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  }).catch(() => null)
}

export async function adminLogin(form: FormData) {
  const password = form.get('password')?.toString() || ''
  if (password !== ADMIN_PASSWORD) {
    return { error: 'Şifre hatalı. Tekrar deneyin.' }
  }
  const jar = await cookies()
  jar.set(COOKIE_NAME, password, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 gün
    path: '/',
  })
  return { ok: true }
}

export async function adminLogout() {
  const jar = await cookies()
  jar.delete(COOKIE_NAME)
  redirect('/admin/login')
}

export async function createProduct(form: FormData) {
  const secret = adminSecret()
  const data = {
    name: form.get('name'),
    modelCode: form.get('modelCode') || null,
    sitePrice: Number(form.get('sitePrice')),
    originalPrice: form.get('originalPrice') ? Number(form.get('originalPrice')) : null,
    brand: form.get('brand') || 'Erhan Flowers',
    description: form.get('description') || null,
    origin: form.get('origin') || 'ÇİN',
    vatRate: Number(form.get('vatRate')) || 10,
    warrantyMonths: Number(form.get('warrantyMonths')) || 0,
    inStock: form.get('inStock') === 'true',
    images: form.get('images') ? (form.get('images') as string).split('\n').map(s => s.trim()).filter(Boolean) : [],
    videoUrl: form.get('videoUrl') ? String(form.get('videoUrl')).trim() : null,
  }

  const res = await fetch(`${API_URL}/public/catalog/admin/products?secret=${secret}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text()
    return { error: `Ürün eklenemedi: ${text}` }
  }
  await revalidateSite()
  return { ok: true }
}

export async function deleteProduct(id: number) {
  const res = await fetch(`${API_URL}/public/catalog/products/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) return { error: 'Silinemedi' }
  await revalidateSite()
  return { ok: true }
}

/** Ürün adına göre otomatik kategori ataması */
export async function triggerRecategorize(): Promise<{ error?: string; data?: unknown }> {
  try {
    const secret = adminSecret()
    const res = await fetch(`${API_URL}/public/catalog/admin/recategorize?secret=${secret}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) return { error: `Backend hatası (${res.status})` }
    const data = await res.json()
    return { data }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Bağlantı hatası' }
  }
}

/** Ürün kategorisi güncelle (admin panelinden) */
export async function updateProductCategory(
  productId: number,
  category: string,
  subCategory?: string | null,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    const secret = adminSecret()
    const res = await fetch(`${API_URL}/public/catalog/admin/set-category?secret=${secret}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, category, subCategory: subCategory ?? null }),
      cache: 'no-store',
    })
    if (!res.ok) return { error: `Hata (${res.status})` }
    return { ok: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Bağlantı hatası' }
  }
}

/** Toplu fiyat ayarı (keyword + yüzde değişim) */
export async function bulkPriceAdjust(params: {
  search: string
  changePercent: number
  dryRun?: boolean
}): Promise<{ error?: string; updated?: number; skipped?: number; preview?: Array<{ id: number; name: string; oldSitePrice: number; newSitePrice: number; oldMarketPrice: number; newMarketPrice: number }> }> {
  try {
    const secret = adminSecret()
    const res = await fetch(`${API_URL}/public/catalog/admin/bulk-price-adjust?secret=${secret}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      cache: 'no-store',
    })
    if (!res.ok) return { error: `Hata (${res.status})` }
    const data = await res.json()
    if (!params.dryRun) await revalidateSite()
    return data
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Bağlantı hatası' }
  }
}

/** Trendyol'dan ürünleri çek ve siteyi revalidate et */
export async function triggerTrendyolSync(): Promise<{ error?: string; data?: unknown }> {
  try {
    const secret = adminSecret()
    const res = await fetch(`${API_URL}/public/catalog/admin/trendyol-sync?secret=${secret}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!res.ok) {
      await revalidateSite()
      return { error: `Backend yanıt vermedi (${res.status}). Sadece cache temizlendi.` }
    }

    const data = await res.json()
    return { data }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Bağlantı hatası' }
  }
}

/** Ürün videosunu kaydet — anahtar sunucuda kalır (eskiden tarayıcıdan gönderiliyordu) */
export async function setProductVideo(productId: number, videoUrl: string | null): Promise<{ error?: string }> {
  const res = await fetch(`${API_URL}/public/catalog/admin/set-video?secret=${encodeURIComponent(adminSecret())}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, videoUrl }),
    cache: 'no-store',
  })
  return res.ok ? {} : { error: `Hata (${res.status})` }
}
