import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Projelerimiz — Kurumsal Dekorasyon Çalışmaları',
  description: 'Erhan Flowers olarak tamamladığımız otel, restoran, ofis ve mağaza dekorasyon projeleri. Yapay çiçek ve bitki ile dönüştürdüğümüz mekanlar.',
  alternates: { canonical: '/projelerimiz' },
}

const projects = [
  {
    title: 'Lüks Otel Lobby Dekorasyonu',
    location: 'Antalya',
    category: 'Otel',
    desc: '5 yıldızlı otel lobisine 3 adet 3 metrelik yapay zeytin ağacı ve 12 adet saksı bitkisi yerleştirildi. Kalıcı taze görünüm, sıfır bakım.',
    color: '#1E3A28',
    img: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&q=80',
  },
  {
    title: 'Restoran Dikey Bahçe Duvarı',
    location: 'Manavgat',
    category: 'Restoran',
    desc: '8m² dikey bahçe duvarı kurulumu. Yeşil arka plan, müşteri fotoğraf noktası olarak sosyal medyada viral oldu.',
    color: '#3A5C28',
    img: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
  },
  {
    title: 'Kurumsal Ofis Yeşillendirme',
    location: 'İstanbul',
    category: 'Ofis',
    desc: '200m² açık ofis alanına 40+ yapay saksı bitki yerleşimi. Çalışan memnuniyeti ve ofis estetiği için tercih edildi.',
    color: '#2A4A34',
    img: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
  },
  {
    title: 'Butik Giyim Mağazası',
    location: 'Side',
    category: 'Mağaza',
    desc: 'Vitrin ve iç mekân için sezonluk dekorasyon paketi. Renkli yapay çiçeklerle marka kimliğine uygun konsept.',
    color: '#4A3A28',
    img: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800&q=80',
  },
]

export default function ProjelerimizPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#F4F2EC]">
        <section className="bg-[#0D1510] text-[#EAE6DC] py-16 px-4 text-center">
          <p className="text-xs tracking-widest uppercase text-[#8BAF8A] mb-3">Portfolyo</p>
          <h1 className="font-display text-4xl md:text-5xl font-light mb-4">Projelerimiz</h1>
          <p className="text-[#8C8A82] max-w-xl mx-auto">
            Otel, restoran, ofis ve mağazalarda hayata geçirdiğimiz dekorasyon projeleri.
          </p>
        </section>

        <section className="max-w-screen-xl mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {projects.map((p) => (
              <div key={p.title} className="bg-white rounded-2xl overflow-hidden border border-[#E0DDD4] group">
                <div className="aspect-video overflow-hidden bg-[#E0DDD4]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.img} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs bg-[#F4F2EC] text-[#5C7A62] px-2.5 py-1 rounded-full font-medium">{p.category}</span>
                    <span className="text-xs text-[#8C8A82]">📍 {p.location}</span>
                  </div>
                  <h2 className="font-semibold text-[#0D1510] text-lg mb-2">{p.title}</h2>
                  <p className="text-sm text-[#5C5C52] leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#1E3A28] text-[#EAE6DC] py-16 px-4 text-center">
          <h2 className="font-display text-3xl font-light mb-4">Mekanınız için Teklif Alın</h2>
          <p className="text-[#8C8A82] mb-8 max-w-lg mx-auto">Otel, restoran, ofis veya mağazanız için kurumsal dekorasyon çözümleri üretiyoruz.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/mekaninizi-gonderin"
              className="inline-block bg-[#F4F2EC] text-[#0D1510] px-8 py-3 rounded-xl font-semibold hover:bg-white transition-colors"
            >
              📸 Fotoğraf Gönderin
            </Link>
            <a
              href="https://wa.me/905446546220?text=Merhaba, kurumsal dekorasyon teklifi almak istiyorum."
              className="inline-block bg-[#25D366] text-white px-8 py-3 rounded-xl font-semibold hover:bg-green-600 transition-colors"
            >
              💬 WhatsApp&apos;tan Yazın
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
