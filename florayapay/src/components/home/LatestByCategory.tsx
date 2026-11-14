import Link from 'next/link'
import { getLatestByCategory } from '@/lib/api/catalog'
import { ProductTile } from '@/components/product/ProductTile'

/** Ana sayfa: her kategoriden en son eklenen ürün */
export async function LatestByCategory() {
  const items = await getLatestByCategory()
  if (items.length === 0) return null

  return (
    <section className="py-5 md:py-12 bg-white" aria-labelledby="latest-heading">
      <div className="max-w-screen-2xl mx-auto px-4">
        <div className="flex items-end justify-between mb-3 md:mb-6">
          <h2 id="latest-heading" className="text-base md:text-2xl font-semibold text-[#0D1510]">
            Her Kategoriden En Yeni
          </h2>
          <Link href="/urunler?sirala=newest" className="text-[#5C7A62] font-semibold text-xs md:text-sm hover:underline">
            Tüm Yeniler →
          </Link>
        </div>
        {/* Telefonda yana kayan satır, masaüstünde ızgara */}
        <ul className="flex md:grid md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 overflow-x-auto md:overflow-visible snap-x snap-mandatory -mx-4 px-4 scroll-px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map(({ category, product }) => (
            <li key={category.slug} className="snap-start flex-shrink-0 w-[160px] md:w-auto flex flex-col gap-1.5">
              <Link href={`/urunler?kategori=${category.slug}`} className="text-xs font-semibold text-[#1E3A28] hover:underline truncate">
                {category.name} →
              </Link>
              <ProductTile product={product} topLabel="YENİ" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
