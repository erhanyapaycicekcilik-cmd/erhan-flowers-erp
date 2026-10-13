import Link from 'next/link'
import Image from 'next/image'
import { readSiteConfig } from '@/lib/site-config'

export function CategoryGrid() {
  const { categories } = readSiteConfig()
  const active = categories.filter(c => c.active)

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
          {active.map((cat) => (
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
                  unoptimized={cat.image.startsWith('http') && !cat.image.includes('erhanflowers')}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
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
