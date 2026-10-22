import type { MetadataRoute } from 'next'

const SITE_URL = process.env.SITE_URL || 'https://www.erhanflowers.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/sepet',
          '/siparis',
          '/dekont-yukle',
          '/odeme-kart',
          '/odeme-basarili',
          '/odeme-basarisiz',
          '/siparis-tamamlandi',
          '/admin/',
          '/_next/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
