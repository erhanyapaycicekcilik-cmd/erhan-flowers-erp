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

export const metadata: Metadata = {
  title: 'Erhan Flowers | Kaliteli Yapay Çiçek & Dekorasyon',
  description:
    'Türkiye\'nin en kaliteli yapay çiçek ve bitki dekorasyonları. Yapay orkide, yapay ağaç, dikey bahçe ve daha fazlası. Hızlı kargo, kolay iade.',
  alternates: {
    canonical: '/',
  },
}

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <TrustBadges />
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
