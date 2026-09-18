import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { JsonLd } from '@/components/seo/JsonLd'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Referanslarımız & Müşteri Yorumları',
  description: 'Erhan Flowers müşterilerinin gerçek yorumları ve çalıştığımız kurumsal referanslar. 500+ mutlu müşteri.',
  alternates: { canonical: '/referanslarimiz' },
}

const reviewSchema = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'Erhan Flowers',
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    reviewCount: '127',
  },
}

const testimonials = [
  { name: 'Ayşe K.', city: 'İstanbul', rating: 5, text: 'Oturma odama aldığım yapay zeytin ağacı inanılmaz gerçekçi. Misafirlerim gerçek mi diye soruyor. Kesinlikle tavsiye ederim.', product: 'Yapay Zeytin Ağacı 180cm' },
  { name: 'Mehmet T.', city: 'Ankara', rating: 5, text: 'Ofisimize birkaç saksı bitki aldık. Hem görünüm mükemmel hem de bakım derdi yok. Çalışanlarımız çok memnun.', product: 'Ofis Bitki Seti' },
  { name: 'Fatma Y.', city: 'Antalya', rating: 5, text: 'Kargo çok hızlı geldi, ambalaj güzeldi. Bambu separatör tam istediğim gibiydi. Teşekkürler!', product: 'Bambu Seperatör' },
  { name: 'Ali R.', city: 'İzmir', rating: 4, text: 'Ürün kalitesi beklentimin üzerindeydi. Sadece kargo biraz gecikti ama sonuç harika.', product: 'Dikey Bahçe Panel' },
  { name: 'Selin B.', city: 'Bursa', rating: 5, text: 'Butik açılışımda vitrin dekorasyonu için kullandım. Müşteriler fotoğraf çekiyor, sosyal medyada paylaşıyor. Harika yatırım!', product: 'Renkli Ağaç Koleksiyonu' },
  { name: 'Hasan Ö.', city: 'Manavgat', rating: 5, text: 'Restoranımıza dikey bahçe yaptırdık. Hem içeride hem dışarıdan muhteşem görünüyor. Kesinlikle gelin görün!', product: 'Dikey Bahçe Kurulum' },
]

const brands = ['Otel Akdeniz', 'Side Resort', 'Kafe Botanik', 'Ofis Plus AŞ', 'Mağaza Dünyası', 'Villa Residence']

export default function ReferanslarPage() {
  return (
    <>
      <JsonLd data={reviewSchema} />
      <Header />
      <main className="min-h-screen bg-[#F4F2EC]">
        <section className="bg-[#0D1510] text-[#EAE6DC] py-16 px-4 text-center">
          <p className="text-xs tracking-widest uppercase text-[#8BAF8A] mb-3">Güven</p>
          <h1 className="font-display text-4xl md:text-5xl font-light mb-4">Referanslarımız</h1>
          <div className="flex justify-center gap-8 mt-6 text-center">
            {[{ n: '500+', l: 'Mutlu Müşteri' }, { n: '4.9★', l: 'Ortalama Puan' }, { n: '50+', l: 'Kurumsal Proje' }].map(s => (
              <div key={s.l}>
                <p className="text-3xl font-display font-light text-[#8BAF8A]">{s.n}</p>
                <p className="text-xs text-[#8C8A82] mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Yorumlar */}
        <section className="max-w-screen-xl mx-auto px-4 py-16">
          <h2 className="text-center font-display text-2xl font-light text-[#0D1510] mb-10">Müşteri Yorumları</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl p-6 border border-[#E0DDD4] flex flex-col">
                <div className="flex text-yellow-400 mb-3">
                  {'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)}
                </div>
                <p className="text-sm text-[#5C5C52] leading-relaxed flex-1 mb-4">&ldquo;{t.text}&rdquo;</p>
                <div className="border-t border-[#E0DDD4] pt-4">
                  <p className="font-semibold text-[#0D1510] text-sm">{t.name}</p>
                  <p className="text-xs text-[#8C8A82]">{t.city} · {t.product}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Kurumsal Referanslar */}
        <section className="bg-white py-14 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-display text-2xl font-light text-[#0D1510] mb-2">Kurumsal Referanslarımız</h2>
            <p className="text-[#8C8A82] text-sm mb-10">Birlikte çalıştığımız işletmelerden bir seçki</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {brands.map((b) => (
                <div key={b} className="bg-[#F4F2EC] rounded-xl py-5 px-4 text-[#3A3A34] font-medium text-sm border border-[#E0DDD4]">
                  {b}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-4 text-center">
          <h2 className="font-display text-2xl font-light text-[#0D1510] mb-4">Siz de Referansımız Olun</h2>
          <p className="text-[#5C5C52] mb-8">Ürünlerimizden memnun kaldıysanız deneyiminizi paylaşın.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/urunler" className="inline-block bg-[#0D1510] text-[#F4F2EC] px-8 py-3 rounded-xl font-semibold hover:bg-[#1E3A28] transition-colors">
              Alışverişe Başla
            </Link>
            <Link href="/oneri-istek" className="inline-block border border-[#0D1510] text-[#0D1510] px-8 py-3 rounded-xl font-semibold hover:bg-[#F4F2EC] transition-colors">
              Yorum Gönder
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
