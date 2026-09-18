'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'erhan2024'
const COOKIE_NAME = 'admin_auth'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8101'

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
  const data = {
    name: form.get('name'),
    modelCode: form.get('modelCode'),
    categoryId: form.get('categoryId') ? Number(form.get('categoryId')) : null,
    sitePrice: Number(form.get('sitePrice')),
    originalPrice: form.get('originalPrice') ? Number(form.get('originalPrice')) : null,
    brand: form.get('brand') || 'Erhan Flowers',
    description: form.get('description') || null,
    origin: form.get('origin') || 'ÇİN',
    vatRate: Number(form.get('vatRate')) || 10,
    warrantyMonths: Number(form.get('warrantyMonths')) || 0,
    inStock: form.get('inStock') === 'true',
    images: form.get('images') ? (form.get('images') as string).split('\n').map(s => s.trim()).filter(Boolean) : [],
  }

  const res = await fetch(`${API_URL}/public/catalog/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const text = await res.text()
    return { error: `Ürün eklenemedi: ${text}` }
  }
  return { ok: true }
}

export async function deleteProduct(id: number) {
  const res = await fetch(`${API_URL}/public/catalog/products/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) return { error: 'Silinemedi' }
  return { ok: true }
}

/** Trendyol'dan ürünleri çek ve siteyi revalidate et */
export async function triggerTrendyolSync(): Promise<{ error?: string; data?: unknown }> {
  try {
    // Backend'in internal sync endpoint'ini çağır (auth gerekmez çünkü internal)
    const secret = process.env.REVALIDATE_SECRET || 'dev-secret-local'
    const res = await fetch(`${API_URL}/public/catalog/admin/trendyol-sync?secret=${secret}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!res.ok) {
      // Eğer 401 gelirse, doğrudan TrendyolProductSyncService'i DB'ye bağlanarak çağıramayız
      // O yüzden Next.js revalidate endpoint'ini çağırarak cache'i temizleriz
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3200'}/api/revalidate?secret=${process.env.REVALIDATE_SECRET}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }).catch(() => null)

      return { error: `Backend yanıt vermedi (${res.status}). Sadece cache temizlendi.` }
    }

    const data = await res.json()
    return { data }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Bağlantı hatası' }
  }
}
