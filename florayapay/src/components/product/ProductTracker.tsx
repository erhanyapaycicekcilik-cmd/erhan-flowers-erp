'use client'

import { useEffect } from 'react'
import { trackViewItem } from '@/components/analytics/GoogleTagManager'

// Google Ads view_item event — sayfa yüklenince tetiklenir
export function ProductTracker({
  productId,
  productName,
  price,
  category,
}: {
  productId: string
  productName: string
  price: number
  category?: string
}) {
  useEffect(() => {
    trackViewItem({ itemId: productId, itemName: productName, price, category })
  }, [productId, productName, price, category])

  return null
}
