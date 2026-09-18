import Link from 'next/link'
import Image from 'next/image'
import { getProducts, getImageUrl } from '@/lib/api/catalog'
import { formatPrice } from '@/lib/utils/format'
import { AddToCartButton } from '@/components/product/AddToCartButton'

export async function FeaturedProducts() {
  let products: Awaited<ReturnType<typeof getProducts>>['products'] = []
  try {
    const res = await getProducts({ page: 1, sort: 'newest' })
    products = res.products.slice(0, 8)
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
              <article className="group bg-white rounded-2xl border border-[#E8E4DA] overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                <Link href={`/urun/${product.slug}`} className="block relative aspect-square bg-gray-50 overflow-hidden">
                  <Image
                    src={getImageUrl(product.mainImage)}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </Link>
                <div className="p-3">
                  {product.category && (
                    <p className="text-xs text-[#5C7A62] font-medium mb-1">{product.category}</p>
                  )}
                  <Link href={`/urun/${product.slug}`}>
                    <h3 className="text-sm font-semibold text-[#0D1510] hover:text-[#5C7A62] transition-colors line-clamp-2 leading-snug">
                      {product.name}
                    </h3>
                  </Link>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="font-bold text-[#0D1510]">{formatPrice(product.sitePrice)}</p>
                    <AddToCartButton
                      product={{ id: String(product.id), name: product.name, price: product.sitePrice, image: product.mainImage, slug: product.slug }}
                      disabled={!product.inStock}
                    />
                  </div>
                </div>
              </article>
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

