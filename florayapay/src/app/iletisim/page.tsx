import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'İletişim',
  description: 'Erhan Flowers ile iletişime geçin. Telefon, WhatsApp veya e-posta ile 7/24 ulaşabilirsiniz.',
}

export default function IletisimPage() {
  return (
    <>
      <Header />
      <main className="bg-[#F4F2EC] min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.3em] text-[#8C8A82] mb-2">Bize Ulaşın</p>
            <h1 className="font-display text-4xl font-light text-[#0D1510]">İletişim</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Telefon */}
            <a href="tel:+905446546220"
              className="bg-white rounded-2xl p-8 border border-[#E0DDD4] hover:shadow-md transition-shadow flex items-start gap-5">
              <span className="text-3xl">📞</span>
              <div>
                <h2 className="font-semibold text-[#0D1510] mb-1">Telefon</h2>
                <p className="text-[#5C7A62] font-medium">0544 654 62 20</p>
                <p className="text-sm text-[#8C8A82] mt-1">Hafta içi 09:00–18:00</p>
              </div>
            </a>

            {/* WhatsApp */}
            <a href="https://wa.me/905446546220?text=Merhaba!%20Erhan%20Flowers%20hakkında%20bilgi%20almak%20istiyorum."
              target="_blank" rel="noopener noreferrer"
              className="bg-white rounded-2xl p-8 border border-[#E0DDD4] hover:shadow-md transition-shadow flex items-start gap-5">
              <span className="text-3xl">💬</span>
              <div>
                <h2 className="font-semibold text-[#0D1510] mb-1">WhatsApp</h2>
                <p className="text-[#5C7A62] font-medium">0544 654 62 20</p>
                <p className="text-sm text-[#8C8A82] mt-1">Hızlı yanıt için tercih edin</p>
              </div>
            </a>

            {/* E-posta */}
            <a href="mailto:erhanyapaycicekcilik@gmail.com"
              className="bg-white rounded-2xl p-8 border border-[#E0DDD4] hover:shadow-md transition-shadow flex items-start gap-5">
              <span className="text-3xl">✉️</span>
              <div>
                <h2 className="font-semibold text-[#0D1510] mb-1">E-posta</h2>
                <p className="text-[#5C7A62] font-medium">erhanyapaycicekcilik@gmail.com</p>
                <p className="text-sm text-[#8C8A82] mt-1">En geç 24 saat içinde yanıt</p>
              </div>
            </a>

            {/* Adres */}
            <div className="bg-white rounded-2xl p-8 border border-[#E0DDD4] flex items-start gap-5">
              <span className="text-3xl">📍</span>
              <div>
                <h2 className="font-semibold text-[#0D1510] mb-1">Adres</h2>
                <p className="text-[#5C7A62] font-medium">Sarılar Mah. Cumhuriyet Cd.</p>
                <p className="text-[#5C7A62]">2038 Sokak No:52/1/2</p>
                <p className="text-sm text-[#8C8A82] mt-1">07600 Manavgat / Antalya</p>
              </div>
            </div>
          </div>

          {/* Konum / Harita */}
          <div className="mt-6 bg-white rounded-2xl border border-[#E0DDD4] overflow-hidden">
            <div className="p-5 border-b border-[#E0DDD4]">
              <h2 className="font-semibold text-[#0D1510]">Konumumuz</h2>
              <p className="text-sm text-[#8C8A82] mt-1">Sarılar Mah. Cumhuriyet Cd. 2038 Sokak No:52/1/2, Manavgat / Antalya</p>
            </div>
            <div className="w-full h-80 relative overflow-hidden">
              <iframe
                src="https://www.google.com/maps?q=Erhan+Flowers+Sarılar+Manavgat+Antalya&output=embed&hl=tr"
                width="100%"
                height="320"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Erhan Flowers Konum — Manavgat/Antalya"
              />
            </div>
            <div className="p-4 flex gap-3">
              <a
                href="https://maps.google.com/?q=Erhan+Flowers+Sar%C4%B1lar+Cumhuriyet+Caddesi+Manavgat+Antalya"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center text-sm bg-[#0D1510] text-[#F4F2EC] py-2.5 rounded-xl font-medium hover:bg-[#1E3A28] transition-colors"
              >
                Google Maps&apos;te Aç
              </a>
              <a
                href="https://yandex.com.tr/maps/?text=Erhan+Flowers+Sarılar+Manavgat+Antalya"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center text-sm bg-[#F4F2EC] border border-[#E0DDD4] text-[#0D1510] py-2.5 rounded-xl font-medium hover:shadow-sm transition-shadow"
              >
                Yandex Maps&apos;te Aç
              </a>
            </div>
          </div>

          {/* Satıcı Bilgileri — yasal zorunluluk */}
          <div className="mt-10 bg-white rounded-2xl border border-[#E0DDD4] p-8">
            <h2 className="font-semibold text-[#0D1510] mb-4">Satıcı Bilgileri</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-[#5C5C52]">
              <div>
                <span className="font-medium text-[#0D1510]">Ticari Unvan:</span>
                <p>Erhan Flowers / Erhan Yapay Çiçekçilik</p>
              </div>
              <div>
                <span className="font-medium text-[#0D1510]">Telefon:</span>
                <p>0544 654 62 20</p>
              </div>
              <div>
                <span className="font-medium text-[#0D1510]">E-posta:</span>
                <p>erhanyapaycicekcilik@gmail.com</p>
              </div>
              <div>
                <span className="font-medium text-[#0D1510]">Adres:</span>
                <p>Sarılar Mah. Cumhuriyet Cd. 2038 Sk. No:52/1/2, 07600 Manavgat/Antalya</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
