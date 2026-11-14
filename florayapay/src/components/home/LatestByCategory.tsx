import Link from 'next/link'
import { getLatestByCategory } from '@/lib/api/catalog'
import { ProductTile } from '@/components/product/ProductTile'

/** Ana sayfa: her kategoriden en son eklenen ürün */
export async function LatestByCategory() {
  const items = await getLatestByCategory()
  if (items.length === 0) return null

  return (
    <section className="py-12 bg-white" aria-labelledby="latest-heading">
      <div className="max-w-screen-2xl mx-auto px-4">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#5C7A62] mb-1">Yeni Gelenler</p>
            <h2 id="latest-heading" className="font-display text-3xl font-light text-[#0D1510]">
              Her Kategoriden En Yeni
            </h2>
          </div>
          <Link href="/urunler?sirala=newest" className="text-[#5C7A62] font-semibold text-sm hover:underline hidden md:block">
            Tüm Yeniler →
          </Link>
        </div>
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {items.map(({ category, product }) => (
            <li key={category.slug} className="flex flex-col gap-1.5">
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
