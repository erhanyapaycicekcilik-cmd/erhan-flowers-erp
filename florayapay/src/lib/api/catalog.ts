const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8101'

export interface PublicProduct {
  id: number
  name: string
  slug: string
  modelCode: string
  category: string | null
  categorySlug: string | null
  sitePrice: number
  originalPrice: number | null
  brand: string
  description: string | null
  colorVariant: string | null
  material: string | null
  origin: string
  vatRate: number
  warrantyMonths: number
  inStock: boolean
  images: string[]
  mainImage: string | null
}

export interface ProductsResponse {
  products: PublicProduct[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface Category {
  id: number
  name: string
  slug: string
  count: number
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    next: { revalidate: 60 }, // 60 saniye cache — yeni ürün 1 dakikada sitede
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function getCategories(): Promise<Category[]> {
  try {
    return await apiFetch<Category[]>('/public/catalog/categories')
  } catch {
    return []
  }
}

export async function getProducts(params: {
  category?: string
  q?: string
  page?: number
  limit?: number
  sort?: string
}): Promise<ProductsResponse> {
  const qs = new URLSearchParams()
  if (params.category) qs.set('category', params.category)
  if (params.q) qs.set('q', params.q)
  if (params.page) qs.set('page', String(params.page))
  if (params.limit) qs.set('limit', String(params.limit))
  if (params.sort) qs.set('sort', params.sort)

  try {
    return await apiFetch<ProductsResponse>(`/public/catalog/products?${qs}`)
  } catch {
    return { products: [], pagination: { total: 0, page: 1, limit: 48, totalPages: 0 } }
  }
}

export async function getProductBySlug(slug: string): Promise<PublicProduct | null> {
  try {
    return await apiFetch<PublicProduct>(`/public/catalog/products/slug/${encodeURIComponent(slug)}`)
  } catch {
    return null
  }
}

export function getImageUrl(path: string | null): string {
  if (!path) return '/placeholder-product.jpg'
  if (path.startsWith('http')) return path
  return `${API_URL}/${path.replace(/^\//, '')}`
}
