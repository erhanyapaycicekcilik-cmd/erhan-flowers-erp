'use client'

import { useEffect } from 'react'
import { useCart } from '@/hooks/useCart'

/** Ödeme başarıyla tamamlanınca sepeti boşaltır */
export function ClearCartOnMount() {
  const { clearCart } = useCart()
  useEffect(() => {
    clearCart()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}
