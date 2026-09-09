import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/site', '/site/'],
        disallow: ['/dashboard', '/products', '/sales', '/finance', '/stock-cards', '/login', '/api/'],
      },
    ],
    sitemap: 'https://florayapaycicek.com/sitemap.xml',
  };
}
