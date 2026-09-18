import type { MetadataRoute } from 'next'
import { getProducts } from '@/lib/api/catalog'

const BASE = 'https://florayapaycicek.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE}/urunler`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/yapay-cicek-bakimi`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/sss`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/referanslarimiz`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/projelerimiz`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/dukkan-fotograflari`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/agac-boyut-rehberi`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/doviz-kurlari`, changeFrequency: 'hourly', priority: 0.4 },
    { url: `${BASE}/mekaninizi-gonderin`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/oneri-istek`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE}/sepet`, changeFrequency: 'never', priority: 0.3 },
  ]

  let productPages: MetadataRoute.Sitemap = []
  try {
    // Fetch all products (up to 500) for sitemap
    const { products } = await getProducts({ page: 1, sort: 'newest' })
    productPages = products.map(p => ({
      url: `${BASE}/urun/${p.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  } catch {
    // If product fetch fails, sitemap still works with static pages
  }

  return [...staticPages, ...productPages]
}
