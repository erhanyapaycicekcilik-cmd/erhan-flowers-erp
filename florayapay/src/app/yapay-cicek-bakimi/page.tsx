import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Yapay Çiçek Bakımı — Temizlik ve Bakım Rehberi',
  description: 'Yapay çiçek ve yapay bitkilerin nasıl temizleneceği, uzun ömürlü kullanım için bakım ipuçları. Toz alma, renk koruma ve yerleştirme önerileri.',
  keywords: ['yapay çiçek bakımı', 'yapay bitki temizliği', 'yapay ağaç toz alma', 'solmayan çiçek bakım'],
  alternates: { canonical: '/yapay-cicek-bakimi' },
  openGraph: {
    title: 'Yapay Çiçek Bakımı Rehberi | Erhan Flowers',
    description: 'Yapay çiçeklerinizi yıllarca taze tutmanın yolları.',
  },
}

const tips = [
  {
    icon: '🧹',
    title: 'Haftalık Toz Alma',
    desc: 'Yapay çiçek ve yaprakları kuru, yumuşak bir bezle ya da fön makinesiyle soğuk havada nazikçe temizleyin. Toz birikmesi rengi mat gösterir.',
  },
  {
    icon: '💧',
    title: 'Islak Bez ile Derinlemesine Temizlik',
    desc: 'Ayda bir kez hafifçe nemlendirilmiş mikrofiber bezle yaprakları silin. Plastik ve ipek yapraklar için idealdir. Kesinlikle ıslatmayın, sadece nem verin.',
  },
  {
    icon: '☀️',
    title: 'Güneş Işığından Koruyun',
    desc: 'Uzun süre doğrudan güneş alan yapay çiçekler solar. Pencerenin önüne yerleştiriyorsanız UV filtreli cam ya da ara sıra yer değiştirme yöntemiyle rengi koruyun.',
  },
  {
    icon: '🌬️',
    title: 'Fön Makinesi ile Hızlı Toz Alma',
    desc: 'Karmaşık yapılı yapay ağaçlar için en pratik yöntem: Soğuk havada fön makinesiyle uzaktan üfleyin. Tüm aralar tertemiz olur.',
  },
  {
    icon: '🧴',
    title: 'İpek Çiçekler için Tuz Yöntemi',
    desc: 'Büyük bir poşete biraz kaba tuz koyun, çiçeği içine alın ve hafifçe sallayın. Tuz abrasif etki yaparak tozu çeker. Ardından dışarıda hafifçe sallayın.',
  },
  {
    icon: '🏺',
    title: 'Saksı ve Vazolu Ürünler',
    desc: 'Saksının iç kısmını ve yapay toprağı da düzenli silin. Dekoratif taş veya kum kullanıyorsanız ara sıra karıştırın; tozlanmış görünümü önler.',
  },
  {
    icon: '🌡️',
    title: 'Sıcaklık ve Nem',
    desc: 'Yüksek nem (banyo, mutfak) bazı yapay çiçeklerin yapıştırıcılarını etkileyebilir. Bu mekânlar için özellikle plastik/PE yapraklı ürünleri tercih edin.',
  },
  {
    icon: '📦',
    title: 'Saklama ve Taşıma',
    desc: 'Kullanmadığınız dönemde orijinal kutusunda ya da nefes alabilen bez torba içinde saklayın. Naylon poşet nem yapar, rengi bozabilir.',
  },
]

const faqs = [
  {
    q: 'Yapay çiçekler ne kadar dayanır?',
    a: 'Kaliteli PE ve ipek yapay çiçekler doğru bakımla 10+ yıl renk ve şeklini korur. UV korumalı modeller güneşli ortamlarda da dayanıklıdır.',
  },
  {
    q: 'Yapay çiçekleri yıkayabilir miyim?',
    a: 'Plastik ve PE yapraklı ürünleri ılık suyla nazikçe yıkayabilir, gölgede kurutabilirsiniz. İpek ve kumaş çiçekler için sadece nemli bez önerilir.',
  },
  {
    q: 'Sararan yapay çiçeği kurtarabilir miyim?',
    a: 'Hafif sararmada UV koruyucu sprey uygulanabilir. Aşırı solmuşsa renk tutturmayan kumaş boyası bazı modellerde işe yarar, ancak değiştirmek daha pratiktir.',
  },
  {
    q: 'Evcil hayvanlarım için güvenli mi?',
    a: 'Genel olarak evet — yapay bitkiler zehirli değildir. Ancak küçük yaprakları yutan hayvanlar için tıbbi danışmanlık alın. Güvenli mesafede tutmanızı öneririz.',
  },
]

export default function YapayBakimPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#F4F2EC]">
        {/* Hero */}
        <section className="bg-[#0D1510] text-[#EAE6DC] py-16 px-4 text-center">
          <p className="text-xs tracking-widest uppercase text-[#8BAF8A] mb-3">Bakım Rehberi</p>
          <h1 className="font-display text-4xl md:text-5xl font-light mb-4">Yapay Çiçek Bakımı</h1>
          <p className="text-[#8C8A82] max-w-xl mx-auto text-lg">
            Doğru bakımla yapay çiçekleriniz yıllarca ilk günkü tazeliğini korur.
          </p>
        </section>

        {/* İpuçları */}
        <section className="max-w-5xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-display font-light text-[#0D1510] mb-10 text-center">Bakım İpuçları</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tips.map((tip) => (
              <div key={tip.title} className="bg-white rounded-2xl p-6 border border-[#E0DDD4]">
                <div className="text-3xl mb-3">{tip.icon}</div>
                <h3 className="font-semibold text-[#0D1510] mb-2">{tip.title}</h3>
                <p className="text-sm text-[#5C5C52] leading-relaxed">{tip.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SSS */}
        <section className="bg-white py-16 px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-display font-light text-[#0D1510] mb-10 text-center">Sık Sorulan Sorular</h2>
            <div className="space-y-6">
              {faqs.map((faq) => (
                <div key={faq.q} className="border-b border-[#E0DDD4] pb-6">
                  <h3 className="font-semibold text-[#0D1510] mb-2">{faq.q}</h3>
                  <p className="text-sm text-[#5C5C52] leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-4 text-center">
          <h2 className="font-display text-2xl font-light text-[#0D1510] mb-4">Ürünlerimizi Keşfedin</h2>
          <p className="text-[#5C5C52] mb-8">Bakımı kolay, uzun ömürlü yapay çiçek koleksiyonumuza göz atın.</p>
          <Link
            href="/urunler"
            className="inline-block bg-[#0D1510] text-[#F4F2EC] px-8 py-3 rounded-xl font-semibold hover:bg-[#1E3A28] transition-colors"
          >
            Tüm Ürünler →
          </Link>
        </section>
      </main>
      <Footer />
    </>
  )
}
