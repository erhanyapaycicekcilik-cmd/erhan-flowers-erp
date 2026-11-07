'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ProductGroup, ProductGroupVariant, getImageUrl } from '@/lib/api/catalog'
import { formatPrice } from '@/lib/utils/format'
import { AddToCartButton } from './AddToCartButton'

interface Props {
  group: ProductGroup
}

export function ProductGroupConfigurator({ group }: Props) {
  // Tüm boylar ve saksılar
  const sizes = useMemo(() => {
    const seen = new Set<string>()
    return group.variants
      .filter(v => v.sizeLabel)
      .reduce((acc, v) => {
        if (!seen.has(v.sizeLabel!)) { seen.add(v.sizeLabel!); acc.push(v.sizeLabel!) }
        return acc
      }, [] as string[])
  }, [group.variants])

  const pots = useMemo(() => {
    const seen = new Set<string>()
    return group.variants
      .filter(v => v.potLabel)
      .reduce((acc, v) => {
        if (!seen.has(v.potLabel!)) {
          seen.add(v.potLabel!)
          acc.push({ label: v.potLabel!, image: v.potImage ?? null })
        }
        return acc
      }, [] as { label: string; image: string | null }[])
  }, [group.variants])

  const hasSizes = sizes.length > 0
  const hasPots = pots.length > 0

  const [selectedSize, setSelectedSize] = useState<string | null>(hasSizes ? sizes[0] : null)
  const [selectedPot, setSelectedPot] = useState<string | null>(hasPots ? pots[0].label : null)

  // Seçilen kombinasyona uyan varyant
  const matched: ProductGroupVariant | null = useMemo(() => {
    return group.variants.find(v =>
      (!hasSizes || v.sizeLabel === selectedSize) &&
      (!hasPots || v.potLabel === selectedPot)
    ) ?? group.variants[0] ?? null
  }, [group.variants, selectedSize, selectedPot, hasSizes, hasPots])

  const [activeImg, setActiveImg] = useState(0)
  const images = matched?.images?.length ? matched.images : (group.mainImage ? [group.mainImage] : [])

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-[#8C8A82] mb-6 flex gap-2">
        <Link href="/" className="hover:text-[#5C7A62]">Ana Sayfa</Link>
        <span>/</span>
        <Link href="/urunler" className="hover:text-[#5C7A62]">Ürünler</Link>
        {group.category && <>
          <span>/</span>
          <Link href={`/urunler?kategori=${group.category?.toLowerCase().replace(/\s+/g, '-')}`} className="hover:text-[#5C7A62]">{group.category}</Link>
        </>}
        <span>/</span>
        <span className="text-[#0D1510]">{group.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Görseller */}
        <div className="space-y-3">
          <div className="relative aspect-square bg-white rounded-2xl overflow-hidden">
            {images[activeImg] && (
              <Image
                src={getImageUrl(images[activeImg])}
                alt={group.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${i === activeImg ? 'border-[#5C7A62]' : 'border-transparent'}`}>
                  <Image src={getImageUrl(img)} alt="" width={64} height={64} className="object-cover w-full h-full" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Seçenekler */}
        <div className="space-y-6">
          {group.category && (
            <p className="text-xs uppercase tracking-widest text-[#8C8A82]">{group.category}</p>
          )}
          <h1 className="font-display text-3xl font-light text-[#0D1510]">{group.name}</h1>

          {/* Fiyat */}
          <div className="text-3xl font-semibold text-[#0D1510]">
            {matched ? formatPrice(matched.price) : '—'}
          </div>

          {/* Boy seçimi */}
          {hasSizes && (
            <div>
              <p className="text-sm font-medium text-[#5C5C52] mb-2">
                Boy: <span className="text-[#0D1510]">{selectedSize}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {sizes.map(size => (
                  <button key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                      selectedSize === size
                        ? 'border-[#5C7A62] bg-[#5C7A62] text-white'
                        : 'border-[#E0DDD4] text-[#5C5C52] hover:border-[#5C7A62]'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Saksı seçimi */}
          {hasPots && (
            <div>
              <p className="text-sm font-medium text-[#5C5C52] mb-2">
                Saksı: <span className="text-[#0D1510]">{selectedPot}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {pots.map(pot => (
                  <button key={pot.label}
                    onClick={() => setSelectedPot(pot.label)}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 text-xs font-medium transition-all ${
                      selectedPot === pot.label
                        ? 'border-[#5C7A62] bg-[#5C7A62]/5'
                        : 'border-[#E0DDD4] text-[#5C5C52] hover:border-[#5C7A62]'
                    }`}
                  >
                    {pot.image ? (
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-[#F4F2EC]">
                        <Image src={getImageUrl(pot.image)} alt={pot.label} width={56} height={56} className="object-cover w-full h-full" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-[#F4F2EC] flex items-center justify-center text-2xl">🪴</div>
                    )}
                    <span className={selectedPot === pot.label ? 'text-[#5C7A62] font-semibold' : ''}>{pot.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stok durumu */}
          {!matched && (
            <p className="text-sm text-red-500">Bu kombinasyon mevcut değil</p>
          )}

          {/* Sepete ekle */}
          {matched && (
            <div className="pt-2">
              <AddToCartButton
                product={{
                  id: String(matched.productId ?? `v${matched.trendyolVariantId}`),
                  name: `${group.name}${selectedSize ? ` — ${selectedSize}` : ''}${selectedPot ? ` — ${selectedPot}` : ''}`,
                  price: matched.price,
                  image: images[0] ?? null,
                  slug: group.slug,
                }}
                size="lg"
              />
            </div>
          )}

          {/* Açıklama */}
          {group.description && (
            <div className="pt-4 border-t border-[#E0DDD4]">
              <p className="text-sm text-[#5C5C52] leading-relaxed whitespace-pre-line">{group.description}</p>
            </div>
          )}

          {/* Kombinasyon tablosu */}
          {group.variants.length > 1 && (
            <div className="pt-4 border-t border-[#E0DDD4]">
              <p className="text-xs font-medium text-[#8C8A82] uppercase tracking-widest mb-3">Tüm Seçenekler</p>
              <div className="space-y-1">
                {group.variants.map(v => (
                  <button key={v.id}
                    onClick={() => { if (v.sizeLabel) setSelectedSize(v.sizeLabel); if (v.potLabel) setSelectedPot(v.potLabel) }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      matched?.id === v.id ? 'bg-[#5C7A62]/10 text-[#0D1510]' : 'hover:bg-[#F4F2EC] text-[#5C5C52]'
                    }`}
                  >
                    <span>
                      {[v.sizeLabel, v.potLabel].filter(Boolean).join(' · ') || v.productName}
                    </span>
                    <span className="font-semibold">{formatPrice(v.price)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
