import Link from 'next/link'
import Image from 'next/image'
import type { PublicProduct } from '@/lib/api/catalog'
import { getImageUrl } from '@/lib/api/catalog'
import { formatPrice } from '@/lib/utils/format'
import { AddToCartButton } from './AddToCartButton'

interface Props {
  products: PublicProduct[]
  pagination: { total: number; page: number; totalPages: number }
  currentPage: number
}

export function ProductGrid({ products, pagination, currentPage }: Props) {
  if (products.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <div className="text-6xl mb-4">🌿</div>
        <p className="text-lg font-medium text-gray-600">Ürün bulunamadı</p>
        <p className="text-sm mt-1">Farklı bir arama deneyin veya tüm ürünlere göz atın</p>
        <Link
          href="/urunler"
          className="inline-block mt-4 text-flora-600 font-semibold hover:underline"
        >
          Tüm Ürünleri Gör →
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Grid */}
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {products.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} />
          </li>
        ))}
      </ul>

      {/* Sayfalama */}
      {pagination.totalPages > 1 && (
        <nav className="mt-10 flex justify-center gap-2" aria-label="Sayfalama">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`?sayfa=${p}`}
              aria-current={p === currentPage ? 'page' : undefined}
              className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-medium transition-colors ${
                p === currentPage
                  ? 'bg-flora-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:border-flora-400 hover:text-flora-700'
              }`}
            >
              {p}
            </Link>
          ))}
        </nav>
      )}
    </div>
  )
}

function ProductCard({ product }: { product: PublicProduct }) {
  const imageUrl = getImageUrl(product.mainImage)
  const discount = product.originalPrice
    ? Math.round((1 - product.sitePrice / product.originalPrice) * 100)
    : null

  return (
    <article className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
      {/* Görsel */}
      <Link href={`/urun/${product.slug}`} className="block relative overflow-hidden bg-gray-50">
        <div className="aspect-square relative">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>

        {/* Rozetler */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          {!product.inStock && (
            <span className="bg-gray-700 text-white text-xs font-medium px-2 py-0.5 rounded-full">
              Tükendi
            </span>
          )}
          {discount && discount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              -%{discount}
            </span>
          )}
        </div>
      </Link>

      {/* Bilgi */}
      <div className="p-4">
        {product.category && (
          <Link
            href={`/urunler?kategori=${product.categorySlug}`}
            className="text-xs text-flora-600 font-medium hover:underline"
          >
            {product.category}
          </Link>
        )}

        <Link href={`/urun/${product.slug}`}>
          <h3 className="font-semibold text-gray-800 hover:text-flora-700 transition-colors mt-1 leading-snug line-clamp-2 text-sm">
            {product.name}
          </h3>
          {product.colorVariant && (
            <p className="text-xs text-gray-400 mt-0.5">{product.colorVariant}</p>
          )}
        </Link>

        <div className="mt-3 flex items-end justify-between gap-2">
          <div>
            <p className="font-bold text-lg text-gray-900 leading-none">
              {formatPrice(product.sitePrice)}
            </p>
            {product.originalPrice && (
              <p className="text-xs text-gray-400 line-through mt-0.5">
                {formatPrice(product.originalPrice)}
              </p>
            )}
          </div>

          <AddToCartButton
            product={{
              id: String(product.id),
              name: product.name,
              price: product.sitePrice,
              image: product.mainImage,
              slug: product.slug,
            }}
            disabled={!product.inStock}
          />
        </div>
      </div>
    </article>
  )
}
