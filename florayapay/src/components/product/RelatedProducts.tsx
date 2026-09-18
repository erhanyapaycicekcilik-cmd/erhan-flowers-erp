import Link from 'next/link'
import Image from 'next/image'
import { getProducts, getImageUrl } from '@/lib/api/catalog'
import { formatPrice } from '@/lib/utils/format'
import { AddToCartButton } from './AddToCartButton'

interface Props {
  category?: string
  currentSlug: string
}

export async function RelatedProducts({ category, currentSlug }: Props) {
  try {
    const { products } = await getProducts({ category, page: 1, sort: 'newest' })
    const related = products.filter(p => p.slug !== currentSlug).slice(0, 4)
    if (related.length === 0) return null

    return (
      <section className="mt-16 border-t border-[#E0DDD4] pt-12">
        <h2 className="font-display text-2xl font-light text-[#0D1510] mb-6">Benzer Ürünler</h2>
        <ul className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {related.map(product => (
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
                  <Link href={`/urun/${product.slug}`}>
                    <h3 className="text-sm font-semibold text-[#0D1510] hover:text-[#5C7A62] transition-colors line-clamp-2 leading-snug">
                      {product.name}
                    </h3>
                  </Link>
                  <div className="mt-2 flex items-center justify-between gap-2">
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
      </section>
    )
  } catch {
    return null
  }
}
