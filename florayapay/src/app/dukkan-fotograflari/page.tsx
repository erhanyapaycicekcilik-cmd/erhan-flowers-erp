import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { DiscountReviewSection } from './DiscountReviewSection'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Mağazamız — Dükkan Fotoğrafları & Google Yorumlar',
  description: 'Erhan Flowers Manavgat mağazasını ziyaret edin. Yapay çiçek ve dekorasyon ürünlerimizi yerinde görün. Google\'da yorum yapın, %10 indirim kazanın!',
  alternates: { canonical: '/dukkan-fotograflari' },
}

const photos = [
  { src: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80', alt: 'Mağaza girişi — yapay ağaç vitrini' },
  { src: 'https://images.unsplash.com/photo-1487530811015-780b3c6b4b3f?w=800&q=80', alt: 'Renkli yapay çiçek rafları' },
  { src: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80', alt: 'Yapay orkide koleksiyonu' },
  { src: 'https://images.unsplash.com/photo-1592150621744-aca64f48394a?w=800&q=80', alt: 'Büyük yapay ağaç seçkisi' },
  { src: 'https://images.unsplash.com/photo-1459156212016-c812468e2115?w=800&q=80', alt: 'Dekorasyon köşesi' },
  { src: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=800&q=80', alt: 'Yapay bambu ve separatörler' },
]

const GOOGLE_MAPS_URL = 'https://www.google.com/maps/place/Erhan+Flowers+Yapay+%C3%87i%C3%A7ek+ve+Dekorasyon/@36.7997103,31.4212618,17z'
const GOOGLE_MAPS_EMBED = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3133.8!2d31.4212618!3d36.7997103!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14c359f611f5a7a9%3A0x6c7f89ab6f52f16d!2sErhan+Flowers+Yapay+%C3%87i%C3%A7ek+ve+Dekorasyon!5e0!3m2!1str!2str!4v1726666000000!5m2!1str!2str'
const GOOGLE_REVIEW_URL = 'https://search.google.com/local/writereview?placeid=ChIJqaf1EfZZwxRt8VJvq4l_bA'

export default function DukkanFotografPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#F4F2EC]">
        {/* Hero */}
        <section className="bg-[#0D1510] text-[#EAE6DC] py-16 px-4 text-center">
          <p className="text-xs tracking-widest uppercase text-[#8BAF8A] mb-3">Mağazamız</p>
          <h1 className="font-display text-4xl md:text-5xl font-light mb-4">Dükkan Fotoğrafları</h1>
          <p className="text-[#8C8A82] max-w-xl mx-auto">
            Sarılar Mah. Cumhuriyet Cd., Manavgat/Antalya adresindeki mağazamızı ziyaret edin ya da online sipariş verin.
          </p>
          <div className="flex justify-center gap-3 mt-6 flex-wrap">
            <a href={GOOGLE_MAPS_URL} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-[#0D1510] px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#F4F2EC] transition-colors">
              📍 Google Maps&apos;te Gör
            </a>
            <a href={GOOGLE_REVIEW_URL} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#4285F4] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-600 transition-colors">
              ⭐ Google&apos;da Yorum Yap
            </a>
          </div>
        </section>

        {/* İndirim kazan banner */}
        <div className="bg-[#1E3A28] text-[#EAE6DC] py-4 px-4 text-center">
          <p className="text-sm font-medium">
            ⭐ Google&apos;da yorum yapın → <span className="text-[#8BAF8A] font-bold">%10 indirim</span> kazanın! &nbsp;·&nbsp;
            <a href="#indirim-kazan" className="underline text-[#8BAF8A] hover:text-white transition-colors">Nasıl? ↓</a>
          </p>
        </div>

        {/* Fotoğraf galerisi */}
        <section className="max-w-screen-xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {photos.map((p, i) => (
              <div key={i} className="aspect-square overflow-hidden rounded-2xl bg-[#E0DDD4] group cursor-pointer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.src} alt={p.alt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-[#8C8A82]">
            Fotoğraflar temsili gösterim amaçlıdır. Gerçek mağaza fotoğrafları yakında eklenecektir.
          </p>
        </section>

        {/* Google Maps embed */}
        <section className="max-w-screen-xl mx-auto px-4 pb-12">
          <div className="bg-white rounded-2xl border border-[#E0DDD4] overflow-hidden">
            <div className="p-5 border-b border-[#E0DDD4] flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-[#0D1510]">📍 Bizi Haritada Bulun</h2>
                <p className="text-sm text-[#8C8A82] mt-0.5">Sarılar Mah. Cumhuriyet Cd. 2038 Sk. No:52/1/2, Manavgat/Antalya</p>
              </div>
              <a href={GOOGLE_MAPS_URL} target="_blank" rel="noopener noreferrer"
                className="text-sm text-[#4285F4] hover:underline font-medium">
                Yol Tarifi Al →
              </a>
            </div>
            <div className="aspect-video w-full">
              <iframe
                src={GOOGLE_MAPS_EMBED}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Erhan Flowers Manavgat Konum"
              />
            </div>
            <div className="p-4 grid grid-cols-3 divide-x divide-[#E0DDD4] text-center text-sm">
              <div className="px-3">
                <p className="font-semibold text-[#0D1510]">Hafta içi</p>
                <p className="text-[#8C8A82] text-xs">09:00 – 18:00</p>
              </div>
              <div className="px-3">
                <p className="font-semibold text-[#0D1510]">Cumartesi</p>
                <p className="text-[#8C8A82] text-xs">09:00 – 14:00</p>
              </div>
              <div className="px-3">
                <p className="font-semibold text-[#0D1510]">Pazar</p>
                <p className="text-[#8C8A82] text-xs">Kapalı</p>
              </div>
            </div>
          </div>
        </section>

        {/* İndirim kazan — client bileşeni */}
        <DiscountReviewSection googleReviewUrl={GOOGLE_REVIEW_URL} />

        {/* CTA */}
        <section className="bg-white py-10 px-4 text-center">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="https://wa.me/905446546220" target="_blank" rel="noopener noreferrer"
              className="inline-block bg-[#25D366] text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-600 transition-colors text-sm">
              💬 WhatsApp ile Sipariş
            </a>
            <Link href="/urunler"
              className="inline-block border border-[#0D1510] text-[#0D1510] px-6 py-3 rounded-xl font-semibold hover:bg-[#F4F2EC] transition-colors text-sm">
              Online Alışveriş →
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
