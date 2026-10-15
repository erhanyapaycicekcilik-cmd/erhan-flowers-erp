import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Hakkımızda',
  description: 'Erhan Flowers — vizyonumuz, misyonumuz ve değerlerimiz. Kaliteli yapay çiçek ve dekorasyonda Türkiye\'nin güvenilir markası.',
}

export default function HakkimizdaPage() {
  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="bg-gray-900 text-white py-20 px-4 text-center">
          <p className="text-flora-400 text-sm font-medium tracking-widest uppercase mb-3">Hakkımızda</p>
          <h1 className="font-display text-5xl font-light mb-5">
            Yapay çiçeğe verdiğimiz<br />
            <em>gerçek özen</em>
          </h1>
          <p className="text-gray-300 max-w-xl mx-auto text-base leading-relaxed">
            Erhan Flowers olarak yapay çiçek ve bitki dekorasyonunu bir sanat dalı olarak ele alıyor, yaşam alanlarınıza solmayan bir zarafet katıyoruz.
          </p>
        </section>

        {/* Vizyon & Misyon */}
        <section className="max-w-5xl mx-auto px-4 py-20 grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="bg-flora-50 rounded-2xl p-8">
            <p className="text-flora-600 text-xs font-semibold tracking-widest uppercase mb-3">Vizyonumuz</p>
            <h2 className="font-display text-3xl font-medium text-gray-900 mb-4">
              Türkiye&apos;nin yapay çiçekte akla gelen ilk markası olmak
            </h2>
            <p className="text-gray-600 leading-relaxed text-sm">
              Kalite, estetik ve müşteri memnuniyetini merkeze alarak yapay çiçek sektöründe lider konuma gelmek; her eve ve her ofise solmayan güzelliği taşımak istiyoruz.
            </p>
          </div>
          <div className="bg-gray-900 rounded-2xl p-8 text-white">
            <p className="text-flora-400 text-xs font-semibold tracking-widest uppercase mb-3">Misyonumuz</p>
            <h2 className="font-display text-3xl font-medium mb-4">
              Doğanın güzelliğini sonsuzlaştırmak
            </h2>
            <p className="text-gray-300 leading-relaxed text-sm">
              Sulama gerektirmeyen, solmayan ve bakımı kolay ürünlerle insanların hayatını güzelleştirmek; uygun fiyatlı ama asla kaliteden ödün vermeden, müşteri odaklı bir alışveriş deneyimi sunmak.
            </p>
          </div>
        </section>

        {/* Değerler */}
        <section className="bg-gray-50 py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-display text-3xl font-light text-center text-gray-900 mb-12">Değerlerimiz</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { icon: '🌿', title: 'Kalite', desc: 'Her ürün titizlikle seçilir, kalite kontrolünden geçirilir.' },
                { icon: '💚', title: 'Güven', desc: 'Şeffaf fiyat, dürüst bilgi, söz verilen teslimat.' },
                { icon: '🎨', title: 'Estetik', desc: 'Doğayı taklit etmek değil, ilham almak.' },
                { icon: '🤝', title: 'Hizmet', desc: 'Satış sonrası destek, 14 gün iade, kolay değişim.' },
              ].map((v) => (
                <div key={v.title} className="bg-white rounded-2xl p-6 shadow-sm">
                  <div className="text-3xl mb-3">{v.icon}</div>
                  <h3 className="font-semibold text-gray-900 mb-2">{v.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Rakamlar */}
        <section className="max-w-5xl mx-auto px-4 py-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { n: '5.000+', label: 'Mutlu Müşteri' },
            { n: '300+', label: 'Ürün Çeşidi' },
            { n: '14 Gün', label: 'İade Garantisi' },
            { n: '1–3 İş Günü', label: 'Kargo Süresi' },
          ].map((s) => (
            <div key={s.label}>
              <div className="font-display text-4xl font-medium text-flora-600 mb-1">{s.n}</div>
              <div className="text-sm text-gray-500">{s.label}</div>
            </div>
          ))}
        </section>

        {/* CTA */}
        <section className="bg-gray-900 text-white py-16 px-4 text-center">
          <h2 className="font-display text-3xl font-light mb-4">Sorularınız için buradayız</h2>
          <p className="text-gray-300 mb-8 text-sm">Ürün tavsiyesi, toplu sipariş veya kurumsal alım için bize ulaşın.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://wa.me/905446546220?text=Merhaba%2C%20ürünleriniz%20hakkında%20bilgi%20almak%20istiyorum."
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] hover:bg-[#1fb858] text-white font-semibold py-3 px-8 rounded-full transition-colors"
            >
              WhatsApp&apos;tan Yazın
            </a>
            <a
              href="/urunler"
              className="border border-white/30 hover:bg-white/10 text-white font-semibold py-3 px-8 rounded-full transition-colors"
            >
              Ürünleri İncele
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
