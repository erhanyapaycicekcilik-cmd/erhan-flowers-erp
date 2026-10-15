import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { JsonLd } from '@/components/seo/JsonLd'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Referans Projelerimiz',
  description: 'Erhan Flowers olarak hayata geçirdiğimiz yapay bitki ve çiçek projeleri. Otel, restoran, ofis ve mekan tasarımları.',
  alternates: { canonical: '/referanslarimiz' },
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8101'

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
  { name: 'Ayşe K.', city: 'İstanbul', rating: 5, text: 'Oturma odama aldığım yapay zeytin ağacı inanılmaz gerçekçi. Misafirlerim gerçek mi diye soruyor.', product: 'Yapay Zeytin Ağacı 180cm' },
  { name: 'Mehmet T.', city: 'Ankara', rating: 5, text: 'Ofisimize birkaç saksı bitki aldık. Hem görünüm mükemmel hem de bakım derdi yok.', product: 'Ofis Bitki Seti' },
  { name: 'Fatma Y.', city: 'Antalya', rating: 5, text: 'Kargo çok hızlı geldi, ambalaj güzeldi. Bambu separatör tam istediğim gibiydi.', product: 'Bambu Seperatör' },
  { name: 'Ali R.', city: 'İzmir', rating: 4, text: 'Ürün kalitesi beklentimin üzerindeydi. Sonuç harika.', product: 'Dikey Bahçe Panel' },
  { name: 'Selin B.', city: 'Bursa', rating: 5, text: 'Butik açılışımda vitrin dekorasyonu için kullandım. Müşteriler fotoğraf çekiyor!', product: 'Renkli Ağaç Koleksiyonu' },
  { name: 'Hasan Ö.', city: 'Manavgat', rating: 5, text: 'Restoranımıza dikey bahçe yaptırdık. Hem içeride hem dışarıdan muhteşem görünüyor.', product: 'Dikey Bahçe Kurulum' },
]

async function getProjects() {
  try {
    const res = await fetch(`${API}/public/references`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export default async function ReferanslarPage() {
  const projects: Array<{ id: number; title: string; description: string | null; location: string | null; imageUrls: string[] }> = await getProjects()

  return (
    <>
      <JsonLd data={reviewSchema} />
      <Header />
      <main className="min-h-screen bg-[#F4F2EC]">
        {/* Hero */}
        <section className="bg-[#0D1510] text-[#EAE6DC] py-16 px-4 text-center">
          <p className="text-xs tracking-widest uppercase text-[#8BAF8A] mb-3">Projelerimiz</p>
          <h1 className="font-display text-4xl md:text-5xl font-light mb-4">Referanslarımız</h1>
          <p className="text-[#8C8A82] text-sm max-w-xl mx-auto">Hayata geçirdiğimiz yapay bitki ve çiçek projeleri</p>
          <div className="flex justify-center gap-8 mt-8 text-center">
            {[{ n: '500+', l: 'Mutlu Müşteri' }, { n: '4.9★', l: 'Ortalama Puan' }, { n: '50+', l: 'Kurumsal Proje' }].map(s => (
              <div key={s.l}>
                <p className="text-3xl font-display font-light text-[#8BAF8A]">{s.n}</p>
                <p className="text-xs text-[#8C8A82] mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Projeler */}
        {projects.length > 0 && (
          <section className="max-w-screen-xl mx-auto px-4 py-16">
            <h2 className="font-display text-2xl font-light text-[#0D1510] mb-10 text-center">Tamamlanan Projeler</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl overflow-hidden border border-[#E0DDD4] group">
                  {/* Görsel */}
                  {p.imageUrls.length > 0 ? (
                    <div className="relative h-56 overflow-hidden">
                      {p.imageUrls.length === 1 ? (
                        <img src={p.imageUrls[0]} alt={p.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="flex h-full gap-0.5">
                          <img src={p.imageUrls[0]} alt={p.title}
                            className="flex-1 min-w-0 object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="flex flex-col gap-0.5 w-1/3">
                            {p.imageUrls.slice(1, 3).map((url, i) => (
                              <img key={i} src={url} alt=""
                                className="flex-1 min-h-0 object-cover group-hover:scale-105 transition-transform duration-500" />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-56 bg-[#F4F2EC] flex items-center justify-center text-5xl">🌿</div>
                  )}
                  <div className="p-5">
                    <h3 className="font-semibold text-[#0D1510] mb-1">{p.title}</h3>
                    {p.location && (
                      <p className="text-xs text-[#8BAF8A] mb-2">📍 {p.location}</p>
                    )}
                    {p.description && (
                      <p className="text-sm text-[#5C5C52] leading-relaxed">{p.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Müşteri Yorumları */}
        <section className={`max-w-screen-xl mx-auto px-4 py-16 ${projects.length > 0 ? 'pt-0' : ''}`}>
          <h2 className="text-center font-display text-2xl font-light text-[#0D1510] mb-10">Müşteri Yorumları</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl p-6 border border-[#E0DDD4] flex flex-col">
                <div className="flex text-yellow-400 mb-3 text-lg">
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

        {/* CTA */}
        <section className="bg-[#0D1510] py-16 px-4 text-center text-[#EAE6DC]">
          <h2 className="font-display text-2xl font-light mb-4">Projenizi Birlikte Tasarlayalım</h2>
          <p className="text-[#8C8A82] mb-8 max-w-md mx-auto">Otel, restoran, ofis veya eviniz için özel yapay bitki çözümleri sunuyoruz.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/urunler" className="inline-block bg-[#8BAF8A] text-[#0D1510] px-8 py-3 rounded-xl font-semibold hover:bg-[#7A9E79] transition-colors">
              Ürünleri İncele
            </Link>
            <Link href="/oneri-istek" className="inline-block border border-[#8BAF8A] text-[#8BAF8A] px-8 py-3 rounded-xl font-semibold hover:bg-[#1E3A28] transition-colors">
              Teklif Al
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
