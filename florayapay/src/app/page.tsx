import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CategoryGrid } from '@/components/home/CategoryGrid'
import { FeaturedProducts } from '@/components/home/FeaturedProducts'
import { TrustBadges } from '@/components/home/TrustBadges'
import { WhyUs } from '@/components/home/WhyUs'
// import { PromoBanners } from '@/components/home/PromoBanners'
// import { MekanKategorileri } from '@/components/home/MekanKategorileri'
import { SocialProofBar } from '@/components/home/SocialProofBar'
import { InstagramFeed } from '@/components/home/InstagramFeed'

export const metadata: Metadata = {
  title: { absolute: 'Erhan Flowers | Yapay Çiçek, Aranjman & Dekorasyon — Manavgat, Antalya' },
  description:
    'Manavgat & Antalya\'nın en kaliteli yapay çiçek ve bitki mağazası. Yapay ağaç, bambu, orkide, dikey bahçe, aranjman ve saksılı bitkiler. Hızlı kargo, kolay iade.',
  keywords: [
    'yapay çiçek', 'yapay çiçek antalya', 'yapay çiçek manavgat',
    'çiçek antalya', 'aranjman antalya', 'canlı çiçek antalya',
    'yapay ağaç', 'yapay ağaç antalya', 'saksı antalya',
    'yapay bitki', 'yapay orkide', 'dikey bahçe', 'bambu',
    'çiçekçi manavgat', 'çiçekçi antalya', 'erhan flowers',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Erhan Flowers — Yapay Çiçek & Aranjman, Manavgat Antalya',
    description: 'Manavgat & Antalya\'nın en kaliteli yapay çiçek mağazası. Yapay ağaç, orkide, aranjman, saksılı bitkiler. Hızlı kargo.',
    url: 'https://www.erhanflowers.com',
    siteName: 'Erhan Flowers',
    locale: 'tr_TR',
    type: 'website',
  },
}

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <SocialProofBar />
        <TrustBadges />
        <CategoryGrid />
        {/* <PromoBanners /> */}
        {/* <MekanKategorileri /> */}
        <FeaturedProducts />
        <WhyUs />
        <InstagramFeed />
      </main>
      <Footer />
    </>
  )
}
