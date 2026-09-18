import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { JsonLd } from '@/components/seo/JsonLd'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Sık Sorulan Sorular (SSS)',
  description: 'Yapay çiçek siparişi, kargo, iade, ödeme ve ürün kalitesi hakkında en çok sorulan sorular ve cevapları.',
  alternates: { canonical: '/sss' },
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'Kargo kaç günde teslim edilir?', acceptedAnswer: { '@type': 'Answer', text: 'Siparişler genellikle 1–3 iş günü içinde kargoya verilir. Kargo süresi bölgeye göre 1–3 gün ekstra sürebilir.' } },
    { '@type': 'Question', name: 'Ücretsiz kargo var mı?', acceptedAnswer: { '@type': 'Answer', text: '1.000 TL ve üzeri siparişlerde kargo ücretsizdir.' } },
    { '@type': 'Question', name: 'İade şartları nelerdir?', acceptedAnswer: { '@type': 'Answer', text: '14 gün içinde, ürün kullanılmamış ve orijinal ambalajında ise iade kabul edilir.' } },
    { '@type': 'Question', name: 'Ürünler gerçekçi görünüyor mu?', acceptedAnswer: { '@type': 'Answer', text: 'Evet. PE ve ipek serisi ürünlerimiz gerçek bitkilerden kalıpla üretilir, damarlar ve doku detayları birebir aktarılır.' } },
  ],
}

const categories = [
  {
    title: 'Sipariş & Ödeme',
    items: [
      { q: 'Nasıl sipariş verebilirim?', a: 'Ürünü sepete ekleyip sipariş formunu doldurun. WhatsApp veya EFT/Havale ile ödeme seçenekleri mevcuttur.' },
      { q: 'Hangi ödeme yöntemlerini kabul ediyorsunuz?', a: 'WhatsApp üzerinden teslimatta nakit/havale ve EFT/Havale (%3 indirimli) seçeneklerimiz var. Kart ödemesi için iletişime geçin.' },
      { q: 'EFT/Havale indirimi nasıl çalışır?', a: 'Sipariş formunda "EFT / Havale" seçeneğini seçin. Toplam tutardan %3 otomatik düşülür. IBAN bilgisi siparişinizle birlikte iletilir.' },
      { q: 'Faturamı alabilir miyim?', a: 'Evet, kurumsal fatura talep edebilirsiniz. Sipariş notuna vergi numaranızı ve şirket adınızı yazmanız yeterlidir.' },
    ],
  },
  {
    title: 'Kargo & Teslimat',
    items: [
      { q: 'Kargo kaç günde teslim edilir?', a: 'Siparişler 1–3 iş günü içinde kargoya verilir. Kargo firmasına göre teslim 1–3 gün ekstra sürebilir.' },
      { q: 'Ücretsiz kargo var mı?', a: '1.000 TL ve üzeri siparişlerde kargo ücretsizdir. Altındaki siparişlerde kargo ücreti sepette belirtilir.' },
      { q: 'Kargomun nerede olduğunu nasıl takip ederim?', a: 'Siparişiniz kargoya verildikten sonra WhatsApp üzerinden takip numaranız iletilir.' },
      { q: 'Büyük ürünler (ağaçlar) nasıl kargolanıyor?', a: 'Büyük ağaçlar demonte edilebilir parçalar halinde gönderilir. Kutuda kurulum talimatı bulunur, montaj 5–10 dakika sürer.' },
    ],
  },
  {
    title: 'Ürün & Kalite',
    items: [
      { q: 'Ürünler gerçekçi görünüyor mu?', a: 'PE ve ipek serisi ürünlerimiz gerçek bitkilerden kalıp alınarak üretilir. Damar ve doku detayları çok gerçekçidir, yanına yaklaşılmadan anlaşılmaz.' },
      { q: 'Güneş ışığında solar mı?', a: 'Standart ürünler uzun süreli doğrudan güneşte solar. UV dayanımlı serimizi tercih edin veya direkt güneşten uzak tutun.' },
      { q: 'Evcil hayvanlar için güvenli mi?', a: 'Yapay bitkiler toksik değildir. Ancak küçük hayvanların yaprakları yutmasını engelleyin.' },
      { q: 'Saksı dahil mi?', a: 'Ürün fotoğrafındaki saksı ürüne dahildir. "Saksısız" olarak belirtilen ürünler sadece bitki kısmını içerir.' },
    ],
  },
  {
    title: 'İade & Garanti',
    items: [
      { q: 'İade şartları nelerdir?', a: '14 gün içinde, ürün kullanılmamış ve orijinal ambalajındaysa iade kabul edilir. İade kargo ücreti müşteriye aittir.' },
      { q: 'Hasarlı ürün aldım, ne yapmalıyım?', a: 'Teslimat sırasında hasar görürseniz kargo görevlisiyle tutanak tutturun. Fotoğraflı şikayetinizi WhatsApp\'a gönderin, en kısa sürede çözüm üretiriz.' },
      { q: 'Garanti var mı?', a: 'Ürünlerimiz üretim kaynaklı hatalara karşı 6 ay garantilidir. Normal kullanım ve bakım şartlarında bu süre çok daha uzundur.' },
    ],
  },
]

export default function SSSPage() {
  return (
    <>
      <JsonLd data={faqSchema} />
      <Header />
      <main className="min-h-screen bg-[#F4F2EC]">
        <section className="bg-[#0D1510] text-[#EAE6DC] py-16 px-4 text-center">
          <p className="text-xs tracking-widest uppercase text-[#8BAF8A] mb-3">Yardım</p>
          <h1 className="font-display text-4xl md:text-5xl font-light mb-4">Sık Sorulan Sorular</h1>
          <p className="text-[#8C8A82] max-w-xl mx-auto">Aradığınızı bulamadıysanız WhatsApp'tan yazın, hemen yanıtlayalım.</p>
        </section>

        <div className="max-w-4xl mx-auto px-4 py-16 space-y-14">
          {categories.map((cat) => (
            <section key={cat.title}>
              <h2 className="text-lg font-semibold text-[#1E3A28] border-b border-[#D6D2C4] pb-3 mb-6 tracking-wide">{cat.title}</h2>
              <div className="space-y-5">
                {cat.items.map((item) => (
                  <div key={item.q} className="bg-white rounded-2xl p-5 border border-[#E0DDD4]">
                    <h3 className="font-semibold text-[#0D1510] mb-2 text-sm">{item.q}</h3>
                    <p className="text-sm text-[#5C5C52] leading-relaxed">{item.a}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="bg-[#1E3A28] text-[#EAE6DC] py-12 px-4 text-center">
          <p className="text-lg mb-4">Sorunuz cevaplandı mı? Hâlâ takılı kaldıysanız:</p>
          <a
            href="https://wa.me/905446546220?text=Merhaba, bir sorum var."
            className="inline-block bg-[#25D366] text-white px-8 py-3 rounded-xl font-semibold hover:bg-green-600 transition-colors"
          >
            💬 WhatsApp'tan Sor
          </a>
        </section>
      </main>
      <Footer />
    </>
  )
}
