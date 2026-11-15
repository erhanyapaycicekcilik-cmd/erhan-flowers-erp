import Link from 'next/link'
import Image from 'next/image'
import { readSiteConfig } from '@/lib/site-config'

/** Kategoriler: telefonda yana kayan küçük kartlar (az yer kaplar), masaüstünde tek satır ızgara */
export function CategoryGrid() {
  const { categories } = readSiteConfig()
  const active = categories.filter((c) => c.active)

  return (
    <section className="py-4 md:py-10 bg-white" aria-labelledby="categories-heading">
      <div className="max-w-screen-2xl mx-auto">
        <div className="flex items-end justify-between px-4 mb-3 md:mb-6">
          <h2 id="categories-heading" className="text-base md:text-2xl font-semibold text-[#0D1510]">
            Kategoriler
          </h2>
          <Link href="/urunler" className="text-xs md:text-sm font-semibold text-[#5C7A62] hover:underline">
            Tümü →
          </Link>
        </div>

        <ul className="flex md:grid md:grid-cols-6 lg:grid-cols-9 gap-3 md:gap-4 overflow-x-auto md:overflow-visible snap-x snap-mandatory scroll-px-4 px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {active.map((cat) => (
            <li key={cat.label} className="snap-start flex-shrink-0 w-[92px] md:w-auto">
              <Link href={cat.slug ? `/urunler?kategori=${cat.slug}` : '/urunler'} className="group block text-center">
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#F4F2EC] ring-1 ring-[#E0DDD4] group-hover:ring-[#5C7A62] transition">
                  <Image
                    src={cat.image}
                    alt={cat.label}
                    fill
                    sizes="(max-width: 768px) 92px, 160px"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    unoptimized={cat.image.startsWith('http') && !cat.image.includes('erhanflowers')}
                  />
                </div>
                <p className="mt-1.5 text-[12px] md:text-sm font-medium text-[#0D1510] leading-tight line-clamp-2">{cat.label}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
