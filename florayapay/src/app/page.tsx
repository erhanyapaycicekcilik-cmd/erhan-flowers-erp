import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { HeroSection } from '@/components/home/HeroSection'
import { CategoryGrid } from '@/components/home/CategoryGrid'
import { FeaturedProducts } from '@/components/home/FeaturedProducts'
import { TrustBadges } from '@/components/home/TrustBadges'
import { WhyUs } from '@/components/home/WhyUs'
import { PromoBanners } from '@/components/home/PromoBanners'
import { MekanKategorileri } from '@/components/home/MekanKategorileri'
import { SocialProofBar } from '@/components/home/SocialProofBar'
import { FlashSaleBanner } from '@/components/home/FlashSaleBanner'

export const metadata: Metadata = {
  title: 'Erhan Flowers | Yapay Çiçek & Dekorasyon — Manavgat, Antalya',
  description:
    'Erhan Flowers — Manavgat\'ın en kaliteli yapay çiçek ve bitki dekorasyonları. Yapay ağaç, orkide, dikey bahçe ve daha fazlası. Hızlı kargo, kolay iade. 500+ mutlu müşteri.',
  keywords: ['yapay çiçek', 'yapay ağaç', 'yapay çiçek manavgat', 'yapay orkide', 'dikey bahçe', 'yapay bitki dekorasyon', 'erhan flowers'],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Erhan Flowers — Kaliteli Yapay Çiçek & Dekorasyon',
    description: 'Manavgat\'ın en kaliteli yapay çiçek ve bitki dekorasyonları. 500+ mutlu müşteri.',
    url: 'https://florayapaycicek.com',
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
        <HeroSection />
        <TrustBadges />
        <FlashSaleBanner />
        <CategoryGrid />
        <PromoBanners />
        <MekanKategorileri />
        <FeaturedProducts />
        <WhyUs />
      </main>
      <Footer />
    </>
  )
}
