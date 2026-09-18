const reasons = [
  {
    icon: '🌿',
    title: 'Gerçeğinden Ayırt Edilemeyen Kalite',
    desc: 'Doğal bitki dokusunu birebir taklit eden premium malzemeler kullanıyoruz. Misafirleriniz fark etmeyecek.',
  },
  {
    icon: '♾️',
    title: 'Ömür Boyu Dayanıklı',
    desc: 'Solmaz, kurumaz, bakım istemez. Bir kere alın, yıllarca kullanın. UV korumalı malzemeler.',
  },
  {
    icon: '🏨',
    title: 'Geniş Ürün Yelpazesi',
    desc: 'Küçük masa bitkisinden 3 metrelik ağaca, dikey bahçeden dekoratif saksıya geniş koleksiyon.',
  },
  {
    icon: '🤝',
    title: 'Müşteri Memnuniyeti Garantisi',
    desc: '14 gün içinde iade hakkı. Ürünü beğenmediyseniz sormadan geri alıyoruz.',
  },
]

export function WhyUs() {
  return (
    <section className="py-14 bg-white" aria-labelledby="whyus-heading">
      <div className="max-w-screen-2xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2
            id="whyus-heading"
            className="font-display text-3xl font-bold text-gray-900 mb-2"
          >
            Neden Erhan Flowers?
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Binlerce mutlu müşteri ve yıllarca süren deneyimle kaliteyi en uygun fiyata sunuyoruz.
          </p>
        </div>

        <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reasons.map((r) => (
            <li key={r.title} className="flex gap-4 p-6 rounded-2xl bg-flora-50 border border-flora-100">
              <span className="text-3xl flex-shrink-0" aria-hidden="true">{r.icon}</span>
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">{r.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{r.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
