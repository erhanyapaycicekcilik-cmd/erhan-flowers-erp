import type { MetadataRoute } from 'next'

const SITE_URL = process.env.SITE_URL || 'https://erhanflowers.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/sepet/',        // sepet sayfası index'lenmesin
          '/odeme/',        // ödeme akışı index'lenmesin
          '/hesabim/',      // kullanıcı hesabı index'lenmesin
          '/siparis-takip/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
