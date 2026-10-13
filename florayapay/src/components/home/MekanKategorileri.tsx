import Link from 'next/link'
import Image from 'next/image'
import { readSiteConfig } from '@/lib/site-config'

export function MekanKategorileri() {
  const { mekanlar } = readSiteConfig()
  const active = mekanlar.filter(m => m.active)

  return (
    <section className="py-14 bg-[#F4F2EC]" aria-labelledby="mekan-heading">
      <div className="max-w-screen-2xl mx-auto px-4">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.25em] text-[#5C7A62] mb-2">Kullanım Alanına Göre</p>
          <h2 id="mekan-heading" className="font-display text-3xl font-light text-[#0D1510]">
            Mekan Dekorasyonu
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {active.map((m, i) => (
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
                unoptimized={m.image.startsWith('http') && !m.image.includes('erhanflowers')}
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
