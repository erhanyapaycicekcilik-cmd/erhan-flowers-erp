import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Sayfa Bulunamadı',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#F4F2EC] flex items-center justify-center px-4 py-20">
        <div className="text-center max-w-md">
          <p className="text-8xl font-display font-light text-[#C5D9C8] mb-4">404</p>
          <div className="text-5xl mb-6">🌿</div>
          <h1 className="font-display text-2xl font-light text-[#0D1510] mb-3">
            Sayfa Bulunamadı
          </h1>
          <p className="text-[#8C8A82] mb-8 leading-relaxed">
            Aradığınız sayfa taşınmış ya da silinmiş olabilir. Ana sayfaya dönerek devam edebilirsiniz.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="bg-[#0D1510] text-[#F4F2EC] px-6 py-3 rounded-xl font-semibold hover:bg-[#1E3A28] transition-colors"
            >
              Ana Sayfaya Dön
            </Link>
            <Link
              href="/urunler"
              className="bg-white border border-[#E0DDD4] text-[#0D1510] px-6 py-3 rounded-xl font-semibold hover:shadow-sm transition-shadow"
            >
              Ürünlere Git
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
