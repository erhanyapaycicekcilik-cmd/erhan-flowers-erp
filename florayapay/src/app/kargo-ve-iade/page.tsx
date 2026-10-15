import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Kargo, İade & Değişim',
  description: '14 gün iade garantisi. Erhan Flowers kargo, iade ve değişim koşulları.',
}

const sections = [
  {
    title: 'Kargo Bilgileri',
    items: [
      'Siparişleriniz 1–3 iş günü içinde kargoya verilir.',
      '1.000 TL ve üzeri siparişlerde kargo ücretsizdir.',
      '1.000 TL altı siparişlerde kargo ücreti sepette gösterilir.',
      'Kargo firması olarak MNG Kargo ve Yurtiçi Kargo kullanılmaktadır.',
      'Kargo takip numaranız, sipariş onay e-postanıza iletilir.',
      'Büyük ve hacimli ürünlerde (yapay ağaç, dikey bahçe vb.) teslimat süresi 3–5 iş gününe uzayabilir.',
    ],
  },
  {
    title: '14 Gün İade Hakkı',
    items: [
      'Tüketiciyi Koruma Kanunu (TKHK) kapsamında ürünü teslim aldığınız tarihten itibaren 14 gün içinde iade hakkınız bulunmaktadır.',
      'İade taleplerini WhatsApp (0544 654 62 20) veya e-posta (erhanyapaycicekcilik@gmail.com) üzerinden iletebilirsiniz.',
      'İade kargo bedeli müşteriye aittir; ücretsiz iade kargo kodu talep etmek için bize ulaşın.',
      'Ürünün orijinal ambalajında, kullanılmamış ve etiketleriyle birlikte iade edilmesi gerekmektedir.',
      'Hasarlı veya eksik parçayla teslim edilen ürünlerde kargo bedeli tarafımızca karşılanır.',
      'Para iadesi, ürün tarafımıza ulaştıktan ve kontrol edildikten sonra 14 iş günü içinde yapılır.',
      'Ödeme kredi kartıyla yapıldıysa iade aynı karta, havale ile yapıldıysa bildireceğiniz IBAN\'a aktarılır.',
    ],
  },
  {
    title: 'Değişim',
    items: [
      'Teslimattan itibaren 14 gün içinde farklı renk, boyut veya model ile değişim yapabilirsiniz.',
      'Değişim talebinizi WhatsApp veya e-posta ile bildirin; size iade kargo kodu gönderilir.',
      'Değiştirilecek ürün tarafımıza ulaştıktan sonra yeni ürün 1–3 iş günü içinde kargolanır.',
      'Değişim ürünü aynı değerdeyse ekstra ücret alınmaz; fark varsa fark ücretlendirmesi yapılır.',
    ],
  },
  {
    title: 'İade Kabul Edilmeyen Durumlar',
    items: [
      'Ürünün kullanılmış, yıpranmış veya orijinal ambalajı açılmış olması.',
      'Müşteri talebiyle özel üretilen (kişiye özel boyut, tasarım) ürünler.',
      'Saksı toprağı veya bakım ürünleri gibi hijyen koşulları gerektiren ürünler.',
      'İade süresi olan 14 günün aşılmış olması.',
    ],
  },
  {
    title: 'Hasarlı / Yanlış Ürün Teslimatı',
    items: [
      'Ürünü teslim alırken kargo görevlisi önünde açın; hasar varsa tutanak tutturun.',
      'Yanlış veya hasarlı ürün teslimi durumunda 48 saat içinde bize fotoğraflı bildirim yapın.',
      'Bu durumlarda kargo bedeli ve yeni ürün gönderimi tamamen tarafımızca karşılanır.',
    ],
  },
]

export default function KargoIadePage() {
  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="font-display text-4xl font-light text-gray-900 mb-2">Kargo, İade &amp; Değişim</h1>
        <p className="text-gray-500 mb-10 text-sm">Son güncelleme: Eylül 2026</p>

        <div className="space-y-10">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                {s.title}
              </h2>
              <ul className="space-y-2.5">
                {s.items.map((item, i) => (
                  <li key={i} className="flex gap-3 text-gray-700 text-sm leading-relaxed">
                    <span className="mt-1 flex-shrink-0 w-4 h-4 rounded-full bg-flora-100 text-flora-600 flex items-center justify-center text-[10px] font-bold">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-12 bg-flora-50 border border-flora-200 rounded-2xl p-6">
          <h3 className="font-semibold text-flora-800 mb-2">İletişim</h3>
          <p className="text-sm text-flora-700">
            İade ve değişim talepleriniz için:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-flora-700">
            <li>📞 <a href="tel:+905446546220" className="underline">0544 654 62 20</a> (WhatsApp)</li>
            <li>✉️ <a href="mailto:erhanyapaycicekcilik@gmail.com" className="underline">erhanyapaycicekcilik@gmail.com</a></li>
            <li>🕐 Hafta içi 09:00–18:00</li>
          </ul>
        </div>
      </main>
      <Footer />
    </>
  )
}
