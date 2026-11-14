import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { WholesaleForm } from '@/components/product/WholesaleRequest'

export const metadata: Metadata = {
  title: 'Toptan & Kurumsal Yapay Çiçek ve Ağaç',
  description: 'Otel, kafe, restoran, ofis ve mağaza projeleri için toptan yapay ağaç, yapay çiçek, dikey bahçe ve saksı. Adetli alımlarda özel fiyat teklifi — Erhan Flowers, Manavgat.',
  alternates: { canonical: '/toptan-satis' },
}

const items = [
  { icon: '🏨', title: 'Otel & Restoran', text: 'Lobi, teras ve salonlar için yapay ağaç, dikey bahçe ve saksı.' },
  { icon: '🏢', title: 'Ofis & Mağaza', text: 'Bakım gerektirmeyen yeşillik; vitrin ve çalışma alanları.' },
  { icon: '📐', title: 'Mimar & Dekoratör', text: 'Proje bazlı ürün seçimi ve adetli fiyatlandırma.' },
]

export default function ToptanSatisPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#F4F2EC]">
        <section className="bg-[#1E3A28] text-[#EAE6DC] px-4 py-10 text-center">
          <p className="text-xs uppercase tracking-widest text-[#8BAF8A] mb-2">Toptan & Kurumsal</p>
          <h1 className="text-2xl md:text-4xl font-semibold">Adetli alımlarda size özel fiyat</h1>
          <p className="mt-3 text-sm md:text-base text-[#C8D6C8] max-w-xl mx-auto">
            Projeniz için ürünleri ve adetleri yazın, sizi arayıp fiyat teklifimizi iletelim. Manavgat mağazamızda ürünleri yerinde de görebilirsiniz.
          </p>
        </section>

        <div className="max-w-screen-lg mx-auto px-4 py-8 grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            {items.map((i) => (
              <div key={i.title} className="bg-white rounded-2xl border border-[#E0DDD4] p-4 flex gap-3">
                <span className="text-2xl" aria-hidden>{i.icon}</span>
                <div>
                  <p className="font-semibold text-[#0D1510]">{i.title}</p>
                  <p className="text-sm text-[#5C5C52]">{i.text}</p>
                </div>
              </div>
            ))}
            <Link href="/urunler" className="block text-center text-sm font-semibold text-[#5C7A62] py-2 hover:underline">Ürünlere göz atın →</Link>
          </div>
          <div className="bg-white rounded-2xl border border-[#E0DDD4] p-5">
            <p className="font-semibold text-[#0D1510] mb-3">Fiyat teklifi isteyin</p>
            <WholesaleForm />
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
