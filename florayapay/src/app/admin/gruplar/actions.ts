'use server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8101'
const secret = () => process.env.REVALIDATE_SECRET || 'dev-secret-local'

export async function createGroup(data: {
  name: string; description?: string; mainImage?: string; category?: string; subCategory?: string
}) {
  const res = await fetch(`${API_URL}/public/catalog/groups/admin/create?secret=${secret()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    cache: 'no-store',
  })
  if (!res.ok) return { error: `Hata (${res.status})` }
  return { ok: true, data: await res.json() }
}

export async function updateGroup(id: number, data: {
  name?: string; description?: string | null; mainImage?: string | null;
  category?: string | null; subCategory?: string | null; isActive?: boolean
}) {
  const res = await fetch(`${API_URL}/public/catalog/groups/admin/${id}?secret=${secret()}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    cache: 'no-store',
  })
  if (!res.ok) return { error: `Hata (${res.status})` }
  return { ok: true }
}

export async function deleteGroup(id: number) {
  const res = await fetch(`${API_URL}/public/catalog/groups/admin/${id}?secret=${secret()}`, {
    method: 'DELETE',
    cache: 'no-store',
  })
  if (!res.ok) return { error: `Hata (${res.status})` }
  return { ok: true }
}

export async function addVariant(groupId: number, data: {
  sizeLabel?: string | null; potLabel?: string | null; potImage?: string | null;
  productId?: number | null; trendyolVariantId?: number | null; priceOverride?: number | null; sortOrder?: number
}) {
  const res = await fetch(`${API_URL}/public/catalog/groups/admin/${groupId}/variants?secret=${secret()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    cache: 'no-store',
  })
  if (!res.ok) return { error: `Hata (${res.status})` }
  return { ok: true, data: await res.json() }
}

export async function updateVariant(variantId: number, data: {
  sizeLabel?: string | null; potLabel?: string | null; priceOverride?: number | null; isActive?: boolean; sortOrder?: number
}) {
  const res = await fetch(`${API_URL}/public/catalog/groups/admin/variants/${variantId}?secret=${secret()}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    cache: 'no-store',
  })
  if (!res.ok) return { error: `Hata (${res.status})` }
  return { ok: true }
}

export async function deleteVariant(variantId: number) {
  const res = await fetch(`${API_URL}/public/catalog/groups/admin/variants/${variantId}?secret=${secret()}`, {
    method: 'DELETE',
    cache: 'no-store',
  })
  if (!res.ok) return { error: `Hata (${res.status})` }
  return { ok: true }
}

export async function searchProducts(q: string) {
  const res = await fetch(
    `${API_URL}/public/catalog/groups/admin/search/products?q=${encodeURIComponent(q)}&secret=${secret()}`,
    { cache: 'no-store' }
  )
  if (!res.ok) return { products: [], variants: [] }
  return res.json()
}
