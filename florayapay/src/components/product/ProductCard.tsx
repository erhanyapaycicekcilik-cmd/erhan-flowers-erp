'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/lib/utils/format'

interface Product {
  id: string
  slug: string
  name: string
  price: number
  originalPrice: number | null
  image: string | null
  category: string
  isNew: boolean
  isBestseller: boolean
}

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart()
  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : null

  return (
    <article className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Görsel */}
      <Link href={`/urun/${product.slug}`} className="block relative aspect-square bg-gray-50">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl text-gray-200">
            🌿
          </div>
        )}

        {/* Rozet */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.isNew && (
            <span className="bg-blue-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
              Yeni
            </span>
          )}
          {product.isBestseller && (
            <span className="bg-amber-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
              Çok Satan
            </span>
          )}
          {discount && (
            <span className="bg-red-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
              -%{discount}
            </span>
          )}
        </div>
      </Link>

      {/* Bilgi */}
      <div className="p-3">
        <p className="text-xs text-gray-400 mb-1">{product.category}</p>
        <Link href={`/urun/${product.slug}`}>
          <h3 className="text-sm font-semibold text-gray-800 hover:text-flora-700 transition-colors line-clamp-2 leading-snug">
            {product.name}
          </h3>
        </Link>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div>
            <p className="font-bold text-gray-900">{formatPrice(product.price)}</p>
            {product.originalPrice && (
              <p className="text-xs text-gray-400 line-through">{formatPrice(product.originalPrice)}</p>
            )}
          </div>

          <button
            onClick={() =>
              addItem({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                slug: product.slug,
              })
            }
            aria-label={`${product.name} sepete ekle`}
            className="flex-shrink-0 bg-flora-600 text-white p-2.5 rounded-xl hover:bg-flora-700 transition-colors"
          >
            <ShoppingCart size={16} />
          </button>
        </div>
      </div>
    </article>
  )
}
