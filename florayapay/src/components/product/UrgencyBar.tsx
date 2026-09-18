'use client'

import { useState, useEffect } from 'react'

interface Props {
  productId: string
  stock?: number
}

export function UrgencyBar({ productId, stock }: Props) {
  const [viewers, setViewers] = useState(0)
  const [soldToday, setSoldToday] = useState(0)

  useEffect(() => {
    // Seed deterministic numbers from productId so they don't flash on hydration
    const seed = productId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    setViewers(3 + (seed % 9))      // 3–11 arası
    setSoldToday(2 + (seed % 7))    // 2–8 arası

    // Fluctuate viewers every 8s
    const t = setInterval(() => {
      setViewers(v => {
        const delta = Math.random() < 0.5 ? -1 : 1
        return Math.max(2, Math.min(15, v + delta))
      })
    }, 8000)
    return () => clearInterval(t)
  }, [productId])

  if (!viewers) return null

  return (
    <div className="space-y-2 my-4">
      {/* Canlı izleyici */}
      <div className="flex items-center gap-2 text-sm text-[#5C5C52]">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
        </span>
        <span><strong className="text-[#0D1510]">{viewers} kişi</strong> şu an bu ürünü inceliyor</span>
      </div>

      {/* Bugün kaç kişi aldı */}
      <div className="flex items-center gap-2 text-sm text-[#5C5C52]">
        <span className="text-orange-500">🔥</span>
        <span>Bugün <strong className="text-[#0D1510]">{soldToday} kişi</strong> bu ürünü satın aldı</span>
      </div>

      {/* Stok uyarısı */}
      {stock !== undefined && stock <= 5 && stock > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm">
          <span className="text-orange-500">⚠️</span>
          <span className="text-orange-700 font-medium">Son <strong>{stock} adet</strong> kaldı!</span>
        </div>
      )}
    </div>
  )
}
