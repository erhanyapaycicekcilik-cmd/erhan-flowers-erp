import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Sipariş Alındı',
  description: 'Siparişiniz başarıyla alındı. Erhan Flowers ekibi en kısa sürede sizinle iletişime geçecek.',
  robots: { index: false, follow: false },
}

export default function SiparisTamamlandiPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#F4F2EC] flex items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full text-center">
          <div className="text-6xl mb-6">🌿</div>
          <h1 className="font-display text-3xl font-light text-[#0D1510] mb-3">
            Siparişiniz Alındı!
          </h1>
          <p className="text-[#5C5C52] leading-relaxed mb-2">
            WhatsApp üzerinden sipariş detaylarınız iletildi.
            Ekibimiz en kısa sürede sizinle iletişime geçecek.
          </p>
          <p className="text-[#8C8A82] text-sm mb-8">
            Sorularınız için <a href="tel:+905446546220" className="text-[#5C7A62] underline">0544 654 62 20</a> numarasını arayabilirsiniz.
          </p>

          <div className="bg-white rounded-2xl border border-[#E0DDD4] p-6 mb-8 text-left space-y-3">
            <h2 className="font-semibold text-[#0D1510] mb-4">Sonraki Adımlar</h2>
            {[
              { icon: '💬', title: 'WhatsApp Onayı', desc: 'Ekibimiz siparişinizi WhatsApp üzerinden onaylayacak.' },
              { icon: '💳', title: 'Ödeme', desc: 'Havale/EFT veya teslimatta nakit ödeme seçenekleri sunulacak.' },
              { icon: '📦', title: 'Kargo', desc: 'Ödeme onayının ardından 1–3 iş günü içinde kargoya verilir.' },
              { icon: '🚚', title: 'Teslimat', desc: 'Kargo takip numaranız WhatsApp ile paylaşılacak.' },
            ].map((step) => (
              <div key={step.title} className="flex items-start gap-3">
                <span className="text-xl shrink-0">{step.icon}</span>
                <div>
                  <p className="font-medium text-[#0D1510] text-sm">{step.title}</p>
                  <p className="text-xs text-[#8C8A82]">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/urunler"
              className="bg-[#0D1510] text-[#F4F2EC] px-6 py-3 rounded-xl font-semibold hover:bg-[#1E3A28] transition-colors">
              Alışverişe Devam Et
            </Link>
            <a href="https://wa.me/905446546220" target="_blank" rel="noopener noreferrer"
              className="bg-white border border-[#E0DDD4] text-[#0D1510] px-6 py-3 rounded-xl font-semibold hover:shadow-md transition-shadow">
              WhatsApp&apos;ı Aç
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
