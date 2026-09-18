import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/sepet', '/_next/'],
      },
    ],
    sitemap: 'https://florayapaycicek.com/sitemap.xml',
    host: 'https://florayapaycicek.com',
  }
}
