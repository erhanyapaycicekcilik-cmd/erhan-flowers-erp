import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Ödeme Koşulları',
  description: 'Erhan Flowers ödeme yöntemleri ve güvenli alışveriş koşulları.',
}

const methods = [
  {
    icon: '💳',
    title: 'Kredi Kartı',
    desc: 'Visa, Mastercard ve American Express ile tek çekim veya taksitli ödeme. 3, 6, 9 ve 12 taksit seçenekleri mevcuttur (bankaya göre değişebilir).',
  },
  {
    icon: '🏦',
    title: 'Banka Kartı (Debit)',
    desc: 'Tüm banka kartlarıyla tek çekim ödeme yapabilirsiniz.',
  },
  {
    icon: '🔄',
    title: 'Havale / EFT',
    desc: 'Banka havalesi veya EFT ile ödeme. Ödeme yapıldıktan sonra dekontu WhatsApp\'a iletmeniz yeterlidir; siparişiniz aynı gün işleme alınır.',
  },
  {
    icon: '🚪',
    title: 'Kapıda Ödeme',
    desc: 'Nakit veya banka kartı ile kapıda ödeme seçeneği mevcuttur. Kapıda ödeme için +15 TL hizmet bedeli uygulanır.',
  },
]

const rules = [
  'Tüm ödemeler Türk Lirası (TL) cinsinden gerçekleştirilir.',
  'SSL sertifikası ile şifrelenmiş güvenli ödeme altyapısı kullanılmaktadır.',
  'Kredi kartı bilgileriniz sistemimizde saklanmaz.',
  'Taksit seçenekleri, bankanızın kampanyalarına göre değişiklik gösterebilir.',
  'Sipariş tutarı, ödeme onaylandıktan sonra kartınızdan tahsil edilir.',
  'Ödeme onaylanamadığında sipariş otomatik iptal edilir; ücret alınmaz.',
  'Fatura, sipariş kargoya verilmeden önce e-posta ile iletilir.',
  'Kurumsal alışverişlerde e-fatura kesilir; fatura bilgilerinizi sipariş notuna ekleyin.',
]

export default function OdemeKosullariPage() {
  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="font-display text-4xl font-light text-gray-900 mb-2">Ödeme Koşulları</h1>
        <p className="text-gray-500 mb-10 text-sm">Son güncelleme: Eylül 2026</p>

        {/* Ödeme yöntemleri */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 pb-2 border-b border-gray-200">
            Kabul Edilen Ödeme Yöntemleri
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {methods.map((m) => (
              <div key={m.title} className="border border-gray-200 rounded-xl p-5">
                <div className="text-2xl mb-2">{m.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{m.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Kurallar */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Genel Ödeme Kuralları
          </h2>
          <ul className="space-y-2.5">
            {rules.map((rule, i) => (
              <li key={i} className="flex gap-3 text-gray-700 text-sm leading-relaxed">
                <span className="mt-1 flex-shrink-0 w-4 h-4 rounded-full bg-flora-100 text-flora-600 flex items-center justify-center text-[10px] font-bold">✓</span>
                {rule}
              </li>
            ))}
          </ul>
        </section>

        {/* Taksit tablosu */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Taksit Seçenekleri (Tahmini)
          </h2>
          <p className="text-sm text-gray-500 mb-4">Taksit tutarları 1.000 TL sipariş için örnek gösterimdir. Gerçek tutarlar bankanıza göre değişebilir.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-3 font-semibold text-gray-700 border border-gray-200">Taksit</th>
                  <th className="text-right p-3 font-semibold text-gray-700 border border-gray-200">Aylık Taksit</th>
                  <th className="text-right p-3 font-semibold text-gray-700 border border-gray-200">Toplam</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { n: 'Tek Çekim', monthly: '1.000,00 TL', total: '1.000,00 TL' },
                  { n: '3 Taksit', monthly: '340,00 TL', total: '1.020,00 TL' },
                  { n: '6 Taksit', monthly: '175,00 TL', total: '1.050,00 TL' },
                  { n: '9 Taksit', monthly: '120,00 TL', total: '1.080,00 TL' },
                  { n: '12 Taksit', monthly: '93,00 TL', total: '1.116,00 TL' },
                ].map((row) => (
                  <tr key={row.n} className="hover:bg-gray-50">
                    <td className="p-3 border border-gray-200 text-gray-700">{row.n}</td>
                    <td className="p-3 border border-gray-200 text-gray-700 text-right font-mono">{row.monthly}</td>
                    <td className="p-3 border border-gray-200 text-gray-700 text-right font-mono">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="bg-flora-50 border border-flora-200 rounded-2xl p-6">
          <h3 className="font-semibold text-flora-800 mb-1">🔒 Güvenli Alışveriş</h3>
          <p className="text-sm text-flora-700">
            Tüm ödemeler 256-bit SSL şifrelemesiyle korunmaktadır. Kart bilgileriniz hiçbir şekilde sunucularımızda saklanmaz.
            Sorun yaşarsanız: <a href="tel:+905446546220" className="underline">0544 654 62 20</a>
          </p>
        </div>
      </main>
      <Footer />
    </>
  )
}
