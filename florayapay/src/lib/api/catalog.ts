const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

export interface PublicProduct {
  id: number
  name: string
  slug: string
  modelCode: string
  category: string | null
  categorySlug: string | null
  sitePrice: number
  /** Fiyatı olmayan site ürünü: sepete eklenmez, "Fiyat için iletişime geçin" gösterilir */
  priceOnRequest?: boolean
  originalPrice: number | null
  /** originalPrice'ın kaynağı; 'Trendyol' ise üstü çizili fiyat Trendyol fiyatıdır (indirim değil, karşılaştırma) */
  compareAtLabel?: string | null
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
  videoUrl: string | null
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

export async function getSubCategories(categorySlug: string): Promise<Category[]> {
  try {
    return await apiFetch<Category[]>(`/public/catalog/subcategories?category=${encodeURIComponent(categorySlug)}`)
  } catch {
    return []
  }
}

export interface LatestByCategoryItem {
  category: { name: string; slug: string }
  product: PublicProduct
}

/** Ana sayfa: her kategoriden en son eklenen (satıştaki) ürün */
export async function getLatestByCategory(): Promise<LatestByCategoryItem[]> {
  try {
    return await apiFetch<LatestByCategoryItem[]>('/public/catalog/latest-by-category')
  } catch {
    return []
  }
}

export async function getProducts(params: {
  category?: string
  subcategory?: string
  q?: string
  page?: number
  limit?: number
  sort?: string
}): Promise<ProductsResponse> {
  const qs = new URLSearchParams()
  if (params.category) qs.set('category', params.category)
  if (params.subcategory) qs.set('subcategory', params.subcategory)
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

export interface ProductGroupVariant {
  id: number
  sizeLabel: string | null
  potLabel: string | null
  potImage: string | null
  price: number
  images: string[]
  productName: string
  productId: number | null
  trendyolVariantId: number | null
}

export interface ProductGroup {
  id: number
  name: string
  slug: string
  description: string | null
  mainImage: string | null
  videoUrl: string | null
  category: string | null
  subCategory: string | null
  variants: ProductGroupVariant[]
}

export async function getProductGroup(slug: string): Promise<ProductGroup | null> {
  try {
    return await apiFetch<ProductGroup>(`/public/catalog/groups/${encodeURIComponent(slug)}`)
  } catch {
    return null
  }
}

export async function getProductGroups(category?: string, subcategory?: string): Promise<ProductGroup[]> {
  try {
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    if (subcategory) params.set('subcategory', subcategory)
    const qs = params.toString() ? `?${params}` : ''
    return await apiFetch<ProductGroup[]>(`/public/catalog/groups${qs}`)
  } catch {
    return []
  }
}

export function getImageUrl(path: string | null): string {
  if (!path) return '/placeholder-product.svg'
  if (path.startsWith('http')) return path
  return `${API_URL}/${path.replace(/^\//, '')}`
}
