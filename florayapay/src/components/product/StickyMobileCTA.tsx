'use client'

import { useState, useEffect, useRef } from 'react'
import { AddToCartButton } from './AddToCartButton'
import { formatPrice } from '@/lib/utils/format'

interface Props {
  product: { id: string; name: string; price: number; image: string; slug: string }
  inStock: boolean
}

export function StickyMobileCTA({ product, inStock }: Props) {
  const [visible, setVisible] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <>
      {/* sentinel placed right below the main "Sepete Ekle" button */}
      <div ref={sentinelRef} />

      {/* Sticky bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-[#E0DDD4] px-4 py-3 transition-transform duration-300 ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#8C8A82] truncate">{product.name}</p>
            <p className="font-bold text-[#0D1510] text-lg leading-tight">{formatPrice(product.price)}</p>
          </div>
          <div className="flex-shrink-0">
            <AddToCartButton product={product} disabled={!inStock} size="lg" />
          </div>
        </div>
      </div>
    </>
  )
}
