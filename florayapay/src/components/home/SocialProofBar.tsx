'use client'

import { useState, useEffect } from 'react'

// Sadece doğru bilgiler — uydurma sipariş/yorum/sayı yazılmaz
const messages = [
  '🌿 Tüm ürünler Trendyol fiyatından %25 ucuz',
  '🚚 1.000 TL ve üzeri siparişlerde kargo bedava',
  '📍 Manavgat mağazamızda ürünleri yerinde görebilirsiniz',
  '💬 WhatsApp\'tan sipariş — 0544 654 62 20',
]

export function SocialProofBar() {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIdx(i => (i + 1) % messages.length)
        setVisible(true)
      }, 400)
    }, 4000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="bg-[#1E3A28] text-[#EAE6DC] py-2.5 px-4 text-center text-xs md:text-sm overflow-hidden">
      <p
        className={`transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}
      >
        {messages[idx]}
      </p>
    </div>
  )
}
