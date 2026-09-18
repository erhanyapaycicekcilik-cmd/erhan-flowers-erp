'use client'

import { ShoppingCart, Check } from 'lucide-react'
import { useState } from 'react'
import { useCart } from '@/hooks/useCart'
import { trackAddToCart } from '@/components/analytics/GoogleTagManager'

interface Props {
  product: {
    id: string
    name: string
    price: number
    image: string | null
    slug: string
  }
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function AddToCartButton({ product, disabled, size = 'sm' }: Props) {
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)

  const handleAdd = () => {
    if (disabled || added) return
    addItem(product)
    trackAddToCart({ itemId: product.id, itemName: product.name, price: product.price, quantity: 1 })
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  if (size === 'lg') {
    return (
      <button
        onClick={handleAdd}
        disabled={disabled}
        className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-base transition-all ${
          disabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : added
            ? 'bg-green-500 text-white'
            : 'bg-flora-600 text-white hover:bg-flora-700 active:scale-95 shadow-lg shadow-flora-200'
        }`}
      >
        {disabled ? (
          'Stokta Yok'
        ) : added ? (
          <>
            <Check size={20} />
            Sepete Eklendi!
          </>
        ) : (
          <>
            <ShoppingCart size={20} />
            Sepete Ekle
          </>
        )}
      </button>
    )
  }

  return (
    <button
      onClick={handleAdd}
      disabled={disabled}
      aria-label={disabled ? 'Stokta yok' : `${product.name} sepete ekle`}
      className={`flex-shrink-0 p-2.5 rounded-xl transition-all ${
        disabled
          ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
          : added
          ? 'bg-green-500 text-white'
          : 'bg-flora-600 text-white hover:bg-flora-700 active:scale-95'
      }`}
    >
      {added ? <Check size={16} /> : <ShoppingCart size={16} />}
    </button>
  )
}
