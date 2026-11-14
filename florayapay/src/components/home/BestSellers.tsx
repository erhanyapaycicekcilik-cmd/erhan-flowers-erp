import Link from 'next/link'
import { getProducts } from '@/lib/api/catalog'
import { ProductTile } from '@/components/product/ProductTile'

/** Ana sayfa: Çok Satanlar — son 90 gün satışları, önce Trendyol'da en çok satanlar */
export async function BestSellers() {
  const res = await getProducts({ page: 1, limit: 24, sort: 'bestseller' })
  const items = res.products.filter((p) => p.bestseller && !p.priceOnRequest && p.inStock).slice(0, 12)
  if (items.length === 0) return null

  return (
    <section className="py-5 md:py-12 bg-[#FFF8F2]" aria-labelledby="bestsellers-heading">
      <div className="max-w-screen-2xl mx-auto px-4">
        <div className="flex items-end justify-between mb-3 md:mb-6">
          <h2 id="bestsellers-heading" className="text-base md:text-2xl font-semibold text-[#0D1510]">
            🔥 Çok Satanlar
          </h2>
          <Link href="/urunler?sirala=bestseller" className="text-[#5C7A62] font-semibold text-xs md:text-sm hover:underline">
            Tümü →
          </Link>
        </div>
        <ul className="flex md:grid md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 overflow-x-auto md:overflow-visible snap-x snap-mandatory -mx-4 px-4 scroll-px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((product) => (
            <li key={product.id} className="snap-start flex-shrink-0 w-[160px] md:w-auto">
              <ProductTile product={product} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
