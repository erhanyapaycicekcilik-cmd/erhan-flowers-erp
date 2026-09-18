import Link from 'next/link'
import Image from 'next/image'

const mekanlar = [
  {
    slug: 'ofis-lobi',
    label: 'Ofis & Lobi',
    desc: 'Kurumsal alanlara şık ve bakımsız yeşillik',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=85&fit=crop',
  },
  {
    slug: 'restaurant-kafe',
    label: 'Restaurant & Kafe',
    desc: 'Müşterilerinizi büyüleyecek doğal atmosfer',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=85&fit=crop',
  },
  {
    slug: 'duvar-yesili',
    label: 'Duvar Yeşili',
    desc: 'Yosun duvar, panel ve dikey bahçe çözümleri',
    image: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=600&q=85&fit=crop',
  },
  {
    slug: 'bahce-balkon',
    label: 'Bahçe & Balkon',
    desc: 'Dış mekana dayanıklı yapay bitki ve çiçekler',
    image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=85&fit=crop',
  },
  {
    slug: 'asili-bitkiler',
    label: 'Asılı Bitkiler',
    desc: 'Tavandan sarkan sarmaşık ve sarkık bitkiler',
    image: 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?w=600&q=85&fit=crop',
  },
]

export function MekanKategorileri() {
  return (
    <section className="py-14 bg-[#F4F2EC]" aria-labelledby="mekan-heading">
      <div className="max-w-screen-2xl mx-auto px-4">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.25em] text-[#5C7A62] mb-2">Kullanım Alanına Göre</p>
          <h2 id="mekan-heading" className="font-display text-3xl font-light text-[#0D1510]">
            Mekan Dekorasyonu
          </h2>
        </div>

        {/* İlk 2 büyük kart + 3 küçük kart */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {mekanlar.map((m, i) => (
            <Link
              key={m.slug}
              href={`/urunler?kategori=${m.slug}`}
              className={`group block rounded-2xl overflow-hidden relative shadow-sm hover:shadow-xl transition-shadow duration-300 ${
                i < 2 ? 'aspect-[3/4]' : 'aspect-[4/5]'
              }`}
            >
              <Image
                src={m.image}
                alt={m.label}
                fill
                sizes="(max-width: 768px) 50vw, 20vw"
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-white font-semibold text-sm leading-tight">{m.label}</h3>
                <p className="text-white/65 text-xs mt-0.5 line-clamp-2">{m.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link
            href="/urunler"
            className="inline-block border border-[#0D1510] text-[#0D1510] px-8 py-3 rounded-full text-sm font-semibold hover:bg-[#0D1510] hover:text-[#F4F2EC] transition-colors"
          >
            Tüm Koleksiyonu Gör →
          </Link>
        </div>
      </div>
    </section>
  )
}
