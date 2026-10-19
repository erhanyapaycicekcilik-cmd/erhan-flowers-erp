/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict mode for better React practices
  reactStrictMode: true,

  // Güvenlik headers — HSTS, CSP, XSS koruması
  async headers() {
    return [
      {
        // 3DS render sayfası için izin verici CSP — Garanti BBVA'ya form submit gerekli
        source: '/api/payment/tami/3ds-render',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; form-action *; frame-ancestors 'self'",
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          // HTTPS zorunluluğu (1 yıl)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          // Clickjacking koruması
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // MIME sniffing koruması
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // XSS koruması
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Referrer politikası
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // İzin politikası (kamera/mikrofon erişimi engelle)
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://googleads.g.doubleclick.net",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https: http:",
              "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com",
              "frame-src https://www.google.com https://maps.google.com https://maps.googleapis.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self' https://sanalposprov.garanti.com.tr",
              "upgrade-insecure-requests",
            ].join('; '),
          },
        ],
      },
    ]
  },

  // HTTPS'e yönlendirme (production)
  async redirects() {
    return [
      // www'suz → www'lu yönlendirme (production'da Caddy/nginx yapacak ama yedek)
    ]
  },

  // Meta katalog feed proxy — backend:8001'e yönlendirir (standalone build'de çalışır)
  async rewrites() {
    const internalApiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8101'
    return [
      {
        source: '/feed/meta-catalog',
        destination: `${internalApiUrl}/public/catalog/meta-feed`,
      },
    ]
  },

  // Görseller için optimize edilmiş domain listesi
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.florayapay.com',
      },
      {
        protocol: 'https',
        hostname: '**.florayapaycicek.com',
      },
      {
        protocol: 'https',
        hostname: 'erhanflowers.com',
      },
      // Trendyol CDN
      {
        protocol: 'https',
        hostname: 'cdn.dsmcdn.com',
      },
      {
        protocol: 'https',
        hostname: '**.dsmcdn.com',
      },
      // ERP API (production)
      {
        protocol: 'https',
        hostname: 'api.erhanflowers.com',
      },
      {
        protocol: 'https',
        hostname: 'api.florayapaycicek.com',
      },
      // ERP upload server (local dev)
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8001',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8101',
      },
      // Instagram CDN
      {
        protocol: 'https',
        hostname: '**.cdninstagram.com',
      },
      {
        protocol: 'https',
        hostname: 'scontent.cdninstagram.com',
      },
      {
        protocol: 'https',
        hostname: '**.fbcdn.net',
      },
      // Unsplash (telif yok)
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      // Pexels (telif yok)
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [64, 128, 256, 384],
    minimumCacheTTL: 86400,
  },

  // Çıktı modu (standalone = Docker-friendly)
  output: 'standalone',

  // Env değişkenleri (public olanlar NEXT_PUBLIC_ prefix ile)
  env: {
    SITE_URL: process.env.SITE_URL || 'https://www.erhanflowers.com',
  },
}

module.exports = nextConfig
