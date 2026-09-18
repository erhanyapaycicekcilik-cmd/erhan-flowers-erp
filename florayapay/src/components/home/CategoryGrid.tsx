import Link from 'next/link'
import Image from 'next/image'

const categories = [
  {
    slug: 'yapay-agac',
    label: 'Yapay Ağaçlar',
    desc: 'Evinize canlı bir ağaç dokunuşu',
    image: 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=600&q=85&fit=crop',
  },
  {
    slug: 'demet-cicek',
    label: 'Demet Çiçekler',
    desc: 'Solmayan buketler, ömür boyu taze',
    image: 'https://images.unsplash.com/photo-1487530811015-780780169c2?w=600&q=85&fit=crop',
  },
  {
    slug: 'bambu',
    label: 'Bambular',
    desc: 'Sade, zarif ve dingin bir köşe',
    image: 'https://images.unsplash.com/photo-1523485096982-5b899a1c4df7?w=600&q=85&fit=crop',
  },
  {
    slug: 'yapay-bitki',
    label: 'Yapay Bitkiler',
    desc: 'Her mevsim açan, hiç solmayan renkler',
    image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=85&fit=crop',
  },
  {
    slug: 'sarmасик',
    label: 'Yapay Sarmaşıklar',
    desc: 'Tavandan sarkan, duvarı kaplayan yeşillik',
    image: 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?w=600&q=85&fit=crop',
  },
  {
    slug: 'dikey-bahce',
    label: 'Dikey Bahçe',
    desc: 'Yosun duvar, doğal yeşil atmosfer',
    image: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=600&q=85&fit=crop',
  },
  {
    slug: 'saksilar',
    label: 'Saksılar',
    desc: 'Şık saksı ve vazo koleksiyonu',
    image: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&q=85&fit=crop',
  },
  {
    slug: null,
    label: 'Tüm Ürünler',
    desc: 'Bütün koleksiyonu keşfet',
    image: 'https://images.unsplash.com/photo-1487530811015-780780169c2?w=600&q=85&fit=crop',
  },
]

export function CategoryGrid() {
  return (
    <section className="py-14 bg-white" aria-labelledby="categories-heading">
      <div className="max-w-screen-2xl mx-auto px-4">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.25em] text-[#5C7A62] mb-2">Koleksiyonlar</p>
          <h2 id="categories-heading" className="font-display text-3xl font-light text-[#0D1510]">
            Kategoriler
          </h2>
        </div>

        <ul className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <li key={cat.label}>
              <Link
                href={cat.slug ? `/urunler?kategori=${cat.slug}` : '/urunler'}
                className="group block rounded-2xl overflow-hidden relative aspect-[4/3] shadow-sm hover:shadow-xl transition-shadow duration-300"
              >
                <Image
                  src={cat.image}
                  alt={cat.label}
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {/* Koyu gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
                {/* Metin */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-white font-semibold text-base leading-tight">{cat.label}</h3>
                  <p className="text-white/70 text-xs mt-0.5">{cat.desc}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
