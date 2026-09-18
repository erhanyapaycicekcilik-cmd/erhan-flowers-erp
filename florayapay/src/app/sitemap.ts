import type { MetadataRoute } from 'next'

const SITE_URL = process.env.SITE_URL || 'https://erhanflowers.com'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8101'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/urunler`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/hakkimizda`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/iletisim`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/kargo-ve-iade`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/iletisim`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/odeme-kosullari`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/gizlilik-politikasi`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/kullanim-kosullari`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/cerez-politikasi`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/mesafeli-satis-sozlesmesi`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ]

  // Dinamik ürün sayfaları
  let productPages: MetadataRoute.Sitemap = []
  try {
    const res = await fetch(`${API_URL}/public/catalog/products?limit=1000&page=1`, {
      next: { revalidate: 3600 },
    })
    if (res.ok) {
      const data = await res.json() as { products: Array<{ slug: string }> }
      productPages = data.products
        .filter((p) => p.slug)
        .map((p) => ({
          url: `${SITE_URL}/urun/${p.slug}`,
          lastModified: new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.8,
        }))
    }
  } catch {
    // API erişilemezse sadece statik sayfalar döner
  }

  return [...staticPages, ...productPages]
}
