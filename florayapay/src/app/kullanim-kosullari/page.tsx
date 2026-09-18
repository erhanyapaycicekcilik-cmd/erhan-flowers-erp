import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Kullanım Koşulları',
  description: 'Erhan Flowers web sitesi kullanım koşulları ve hizmet şartları.',
}

const sections = [
  {
    title: '1. Genel Hükümler',
    content: `Bu web sitesini kullanan her ziyaretçi aşağıdaki koşulları kabul etmiş sayılır. Erhan Flowers, bu koşulları önceden haber vermeksizin değiştirme hakkını saklı tutar. Değişiklikler yayınlandığı anda yürürlüğe girer.`,
  },
  {
    title: '2. Siteye Erişim',
    content: `Sitemize erişim için herhangi bir kayıt zorunluluğu yoktur. Sipariş vermek için iletişim bilgilerinizin doğru ve güncel olması gerekmektedir. Sahte kimlik veya yanıltıcı bilgi kullanmak yasaktır.`,
  },
  {
    title: '3. Fikri Mülkiyet',
    content: `Sitedeki tüm içerikler (metin, görsel, logo, tasarım) Erhan Flowers'ın mülkiyetindedir ve telif hakkı yasalarıyla korunmaktadır. İzin alınmadan kopyalanamaz, dağıtılamaz veya ticari amaçla kullanılamaz.`,
  },
  {
    title: '4. Ürün Bilgileri',
    content: `Sitedeki ürün açıklamaları ve görseller mümkün olduğunca gerçeği yansıtacak şekilde hazırlanmıştır. Renk kalibrasyonu ve ekran farklılıkları nedeniyle ürünlerin gerçek renkleri monitörden farklı görünebilir. Stok durumu anlık değişebilir.`,
  },
  {
    title: '5. Fiyatlar',
    content: `Tüm fiyatlar Türk Lirası (TL) cinsinden ve KDV dahil olarak gösterilmektedir. Kargo ücreti sipariş tutarına göre ayrıca hesaplanır. Erhan Flowers, teknik hatalar nedeniyle oluşan yanlış fiyatlandırma için siparişi iptal etme hakkına sahiptir; bu durumda Alıcı bilgilendirilir ve ödeme iade edilir.`,
  },
  {
    title: '6. Sorumluluğun Sınırlandırılması',
    content: `Erhan Flowers; teknik arızalar, internet kesintileri veya üçüncü taraf hizmet sağlayıcılarından kaynaklanan aksaklıklar nedeniyle oluşan kayıplardan sorumlu tutulamaz. Bağlantı verilen üçüncü taraf sitelerin içeriğinden Erhan Flowers sorumlu değildir.`,
  },
  {
    title: '7. Geçerli Hukuk',
    content: `Bu koşullar Türk hukukuna tabidir. Uyuşmazlıklarda Türk Mahkemeleri yetkilidir.`,
  },
]

export default function KullanimKosullariPage() {
  return (
    <>
      <Header />
      <main className="bg-[#F4F2EC] min-h-screen">
        <div className="max-w-3xl mx-auto px-4 py-16">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-[0.3em] text-[#8C8A82] mb-2">Yasal Metin</p>
            <h1 className="font-display text-4xl font-light text-[#0D1510]">Kullanım Koşulları</h1>
          </div>

          <div className="bg-white rounded-2xl border border-[#E0DDD4] p-8 space-y-7 text-[#5C5C52] text-sm leading-relaxed">
            {sections.map((s) => (
              <section key={s.title}>
                <h2 className="font-semibold text-[#0D1510] text-base mb-2">{s.title}</h2>
                <p>{s.content}</p>
              </section>
            ))}
            <p className="text-xs text-[#8C8A82] pt-4 border-t border-[#E0DDD4]">
              Son güncelleme: Eylül 2026
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
