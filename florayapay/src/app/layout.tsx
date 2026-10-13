import type { Metadata, Viewport } from 'next'
import { DM_Sans, Cormorant_Garamond } from 'next/font/google'
import './globals.css'
import { GoogleTagManager } from '@/components/analytics/GoogleTagManager'
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics'
import { JsonLd } from '@/components/seo/JsonLd'
import { organizationSchema, websiteSchema, localBusinessSchema } from '@/lib/seo/schemas'
import { WhatsAppButton } from '@/components/layout/WhatsAppButton'
import { CookieBanner } from '@/components/layout/CookieBanner'

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  preload: false,
})

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-display',
  preload: false,
})

const SITE_URL = process.env.SITE_URL || 'https://www.erhanflowers.com'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: 'Flora Yapay Çiçek | Kaliteli Yapay Çiçek & Dekorasyon',
    template: '%s | Flora Yapay Çiçek',
  },
  description:
    'Flora Yapay Çiçek — Türkiye\'nin en kaliteli yapay çiçek ve bitki dekorasyonları. Solmayan güzellik, ömür boyu zarafet. Hızlı kargo, kolay iade.',

  keywords: [
    'yapay çiçek', 'yapay çiçek antalya', 'yapay çiçek manavgat',
    'çiçek antalya', 'çiçekçi antalya', 'çiçekçi manavgat',
    'aranjman antalya', 'canlı çiçek antalya',
    'yapay ağaç', 'yapay ağaç antalya', 'saksı antalya',
    'yapay bitki', 'yapay orkide', 'dikey bahçe', 'bambu',
    'erhan flowers', 'erhan çiçek', 'flora yapay çiçek',
  ],

  alternates: {
    canonical: '/',
  },

  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: SITE_URL,
    siteName: 'Erhan Flowers',
    title: 'Erhan Flowers | Kaliteli Yapay Çiçek & Dekorasyon — Antalya',
    description:
      'Erhan Flowers — Manavgat & Antalya\'nın en kaliteli yapay çiçek ve bitki dekorasyonları. Solmayan güzellik, ömür boyu zarafet.',
    images: [
      {
        url: '/logo.png',
        width: 800,
        height: 400,
        alt: 'Flora Yapay Çiçek — Kaliteli Yapay Çiçek',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Flora Yapay Çiçek | Kaliteli Yapay Çiçek & Dekorasyon',
    description: 'Flora Yapay Çiçek — Türkiye\'nin en kaliteli yapay çiçek dekorasyonları.',
    images: ['/logo.png'],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || '',
  },

  authors: [{ name: 'Flora Yapay Çiçek' }],
  creator: 'Flora Yapay Çiçek',
  publisher: 'Flora Yapay Çiçek',
  category: 'E-Ticaret / Ev Dekorasyonu',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1E3A28' },
    { media: '(prefers-color-scheme: dark)', color: '#0D1510' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID
  const gaId = process.env.NEXT_PUBLIC_GA_ID

  return (
    <html lang="tr" className={`${dmSans.variable} ${cormorant.variable}`}>
      <head>
        {/* Preconnect kritik kaynaklar — sayfa hızı için */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* JSON-LD Structured Data */}
        <JsonLd data={organizationSchema} />
        <JsonLd data={websiteSchema} />
        <JsonLd data={localBusinessSchema} />
      </head>
      <body className="font-sans antialiased bg-white text-gray-900">
        {/* Google Tag Manager — tüm izleme buradan */}
        {gtmId && <GoogleTagManager gtmId={gtmId} />}
        {gaId && <GoogleAnalytics gaId={gaId} />}

        {children}

        {/* Floating WhatsApp butonu — her sayfada görünür */}
        <WhatsAppButton />
        {/* KVKK çerez onay banner */}
        <CookieBanner />
      </body>
    </html>
  )
}
