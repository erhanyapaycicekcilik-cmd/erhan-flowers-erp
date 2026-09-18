// JSON-LD Structured Data şemaları — Google rich results için

const SITE_URL = process.env.SITE_URL || 'https://erhanflowers.com'

export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Erhan Flowers',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+90-544-654-62-20',
    contactType: 'customer service',
    availableLanguage: 'Turkish',
    areaServed: 'TR',
  },
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Sarılar Mahallesi Cumhuriyet Caddesi 2038 Sokak No:52/1/2',
    addressLocality: 'Manavgat',
    addressRegion: 'Antalya',
    postalCode: '07600',
    addressCountry: 'TR',
  },
  sameAs: [
    'https://www.instagram.com/erhanflowers',
    'https://www.facebook.com/erhanflowers',
  ],
}

export const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Erhan Flowers',
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/urunler?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
}

export const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'Erhan Flowers',
  description: 'Yapay çiçek, yapay ağaç, dikey bahçe ve dekorasyon ürünleri.',
  url: SITE_URL,
  telephone: '+90-544-654-62-20',
  email: 'erhanyapaycicekcilik@gmail.com',
  image: `${SITE_URL}/og-image.jpg`,
  logo: `${SITE_URL}/logo.png`,
  priceRange: '₺₺',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Sarılar Mahallesi Cumhuriyet Caddesi 2038 Sokak No:52/1/2',
    addressLocality: 'Manavgat',
    addressRegion: 'Antalya',
    postalCode: '07600',
    addressCountry: 'TR',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 36.7878,
    longitude: 31.4429,
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '09:00',
      closes: '18:00',
    },
  ],
  sameAs: [
    'https://www.instagram.com/erhanflowers',
    'https://www.facebook.com/erhanflowers',
  ],
}

// Ürün şeması — ürün detay sayfasında kullan
export function productSchema(product: {
  name: string
  description: string
  image: string[]
  price: number
  currency?: string
  sku: string
  brand?: string
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder'
  ratingValue?: number
  reviewCount?: number
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image,
    sku: product.sku,
    brand: {
      '@type': 'Brand',
      name: product.brand || 'Erhan Flowers',
    },
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/urun/${product.sku}`,
      priceCurrency: product.currency || 'TRY',
      price: product.price,
      availability: `https://schema.org/${product.availability || 'InStock'}`,
      seller: {
        '@type': 'Organization',
        name: 'Erhan Flowers',
      },
    },
    ...(product.ratingValue && product.reviewCount
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.ratingValue,
            reviewCount: product.reviewCount,
          },
        }
      : {}),
  }
}

// Breadcrumb şeması — sayfa içi navigasyon için
export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  }
}
