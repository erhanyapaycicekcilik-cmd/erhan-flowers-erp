import Link from 'next/link'
import { getProducts } from '@/lib/api/catalog'
import { ProductTile } from '@/components/product/ProductTile'

export async function FeaturedProducts() {
  let products: Awaited<ReturnType<typeof getProducts>>['products'] = []
  try {
    const res = await getProducts({ page: 1, limit: 60, sort: 'newest' })
    // Vitrinde sadece hemen satın alınabilen (fiyatlı, stoklu) ürünler
    products = res.products.filter((p) => !p.priceOnRequest && p.sitePrice > 0 && p.inStock).slice(0, 8)
  } catch {
    return null
  }

  if (products.length === 0) return null

  return (
    <section className="py-14 bg-[#F4F2EC]" aria-labelledby="featured-heading">
      <div className="max-w-screen-2xl mx-auto px-4">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#5C7A62] mb-1">Koleksiyon</p>
            <h2 id="featured-heading" className="font-display text-3xl font-light text-[#0D1510]">
              Öne Çıkan Ürünler
            </h2>
          </div>
          <Link href="/urunler" className="text-[#5C7A62] font-semibold text-sm hover:underline hidden md:block">
            Tümünü Gör →
          </Link>
        </div>

        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {products.map((product) => (
            <li key={product.id}>
              <ProductTile product={product} />
            </li>
          ))}
        </ul>

        <div className="text-center mt-8">
          <Link href="/urunler" className="inline-block bg-[#1E3A28] text-[#F4F2EC] px-10 py-3.5 rounded-full font-semibold hover:bg-[#2D4A3E] transition-colors">
            Tüm Ürünleri Gör
          </Link>
        </div>
      </div>
    </section>
  )
}

