'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ShoppingCart, Check, Zap } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { trackAddToCart } from '@/components/analytics/GoogleTagManager'
import { formatPrice } from '@/lib/utils/format'

const FREE_SHIPPING_THRESHOLD = 1000

interface BuyProduct {
  id: string
  name: string
  price: number
  image: string | null
  slug: string
}

function useBuy(product: BuyProduct) {
  const { items, addItem } = useCart()
  const router = useRouter()
  const [added, setAdded] = useState(false)

  const add = () => {
    addItem(product)
    trackAddToCart({ itemId: product.id, itemName: product.name, price: product.price, quantity: 1 })
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }
  const buyNow = () => {
    // Sepette zaten varsa tekrar eklemeden ödemeye geç
    if (!items.some((i) => i.id === product.id)) {
      addItem(product)
      trackAddToCart({ itemId: product.id, itemName: product.name, price: product.price, quantity: 1 })
    }
    setTimeout(() => router.push('/siparis'), 80)
  }
  return { add, buyNow, added }
}

/** Masaüstü/ana alan: "Şimdi Al" butonu (Sepete Ekle'nin yanında) */
export function BuyNowButton({ product, disabled }: { product: BuyProduct; disabled?: boolean }) {
  const { buyNow } = useBuy(product)
  return (
    <button
      onClick={buyNow}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-base border-2 border-flora-600 text-flora-700 bg-white hover:bg-flora-50 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <Zap size={20} />
      Şimdi Al
    </button>
  )
}

/** Mobilde ekranın altında sabit satın alma çubuğu (fiyat + Şimdi Al + Sepete Ekle) */
export function ProductBuyBar({
  product,
  inStock,
  compareAtPrice,
  compareAtLabel,
}: {
  product: BuyProduct
  inStock: boolean
  compareAtPrice?: number | null
  compareAtLabel?: string | null
}) {
  const { add, buyNow, added } = useBuy(product)
  const freeShipping = product.price >= FREE_SHIPPING_THRESHOLD

  return (
    <>
      {/* Çubuk içeriğin üstüne binmesin diye mobilde boşluk */}
      <div className="h-24 md:hidden" aria-hidden />
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-[#E0DDD4] px-4 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-2.5">
          <div className="flex-1 min-w-0 leading-tight">
            {freeShipping && <p className="text-[11px] font-semibold text-[#2E7D32]">🚚 Kargo Bedava</p>}
            <p className="font-bold text-[#0D1510] text-xl">{formatPrice(product.price)}</p>
            {compareAtPrice && compareAtPrice > product.price && (
              <p className="text-[11px] text-[#8C8A82] truncate">
                {compareAtLabel ? `${compareAtLabel}'da ` : ''}
                <span className="line-through">{formatPrice(compareAtPrice)}</span>
              </p>
            )}
          </div>
          <button
            onClick={buyNow}
            disabled={!inStock}
            className="flex flex-col items-center justify-center px-3 py-2 rounded-xl border-2 border-flora-600 text-flora-700 text-xs font-semibold active:scale-95 disabled:opacity-40"
          >
            <Zap size={18} />
            Şimdi Al
          </button>
          <button
            onClick={add}
            disabled={!inStock}
            className={`flex items-center justify-center gap-1.5 px-4 py-3.5 rounded-xl font-semibold text-base text-white active:scale-95 transition-all disabled:bg-gray-300 ${
              added ? 'bg-green-500' : 'bg-flora-600'
            }`}
          >
            {!inStock ? 'Stokta Yok' : added ? (<><Check size={18} /> Eklendi</>) : (<><ShoppingCart size={18} /> Sepete Ekle</>)}
          </button>
        </div>
      </div>
    </>
  )
}
