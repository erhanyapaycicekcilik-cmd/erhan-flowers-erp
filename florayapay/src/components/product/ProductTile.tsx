import Link from 'next/link'
import Image from 'next/image'
import { getImageUrl, type PublicProduct } from '@/lib/api/catalog'
import { formatPrice } from '@/lib/utils/format'
import { AddToCartButton } from '@/components/product/AddToCartButton'
import { PriceOnRequestInline } from '@/components/product/PriceOnRequest'

const FREE_SHIPPING_THRESHOLD = 1000

/** Pazaryeri tarzı ürün kartı: görsel üstü etiketler, marka + ad, büyük fiyat, Trendyol karşılaştırması */
export function ProductTile({ product, topLabel }: { product: PublicProduct; topLabel?: string }) {
  const discount =
    product.originalPrice && product.originalPrice > product.sitePrice
      ? Math.round((1 - product.sitePrice / product.originalPrice) * 100)
      : null
  const freeShipping = !product.priceOnRequest && product.sitePrice >= FREE_SHIPPING_THRESHOLD

  return (
    <article className="group h-full flex flex-col bg-white rounded-2xl border border-[#E8E4DA] overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      <Link href={`/urun/${product.slug}`} className="block relative aspect-[3/4] bg-white overflow-hidden">
        <Image
          src={getImageUrl(product.mainImage)}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, 25vw"
          className="object-contain group-hover:scale-105 transition-transform duration-500 p-2"
        />
        <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
          {product.bestseller && (
            <span className="bg-[#E8590C] text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-md shadow">🔥 Çok Satan</span>
          )}
          {topLabel && (
            <span className="bg-[#1E3A28] text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-md shadow">{topLabel}</span>
          )}
          {discount && discount > 0 && (
            <span className="bg-[#C62828] text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-md shadow">
              {product.compareAtLabel ? `${product.compareAtLabel}'dan %${discount} ucuz` : `%${discount} indirim`}
            </span>
          )}
          {freeShipping && (
            <span className="bg-[#F5B400] text-[#1A1A1A] text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-md shadow">Kargo Bedava</span>
          )}
        </div>
        {product.videoUrl && (
          <span className="absolute bottom-2 right-2 bg-white/95 border border-[#E8590C] text-[#E8590C] text-[10px] font-semibold px-2 py-0.5 rounded-full">▶ Video</span>
        )}
      </Link>
      <div className="p-3 flex flex-col flex-1">
        <Link href={`/urun/${product.slug}`} className="flex-1">
          <h3 className="text-sm text-[#5C5C52] line-clamp-2 leading-snug hover:text-[#0D1510]">
            {product.brand && <span className="font-semibold text-[#0D1510] mr-1">{product.brand}</span>}
            {product.name}
          </h3>
        </Link>
        {product.priceOnRequest ? (
          <div className="mt-3">
            <PriceOnRequestInline productName={product.name} slug={product.slug} />
          </div>
        ) : (
          <div className="mt-2 flex items-end justify-between gap-2">
            <div className="min-w-0 leading-tight">
              {product.originalPrice && product.originalPrice > product.sitePrice && (
                <p className="text-[11px] text-[#8C8A82] truncate">
                  {product.compareAtLabel ? `${product.compareAtLabel}'da ` : ''}
                  <span className="line-through">{formatPrice(product.originalPrice)}</span>
                </p>
              )}
              <p className="font-bold text-lg text-[#0D1510]">{formatPrice(product.sitePrice)}</p>
              {freeShipping && <p className="text-[11px] font-semibold text-[#2E7D32]">Kargo Bedava</p>}
            </div>
            <AddToCartButton
              product={{ id: String(product.id), name: product.name, price: product.sitePrice, image: product.mainImage, slug: product.slug }}
              disabled={!product.inStock}
            />
          </div>
        )}
      </div>
    </article>
  )
}
