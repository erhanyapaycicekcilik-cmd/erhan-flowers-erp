'use client'

import { useState, useEffect } from 'react'

const messages = [
  '🛒 Ayşe H. (İstanbul) az önce sipariş verdi',
  '⭐ "Gerçek gibi görünüyor, çok memnunum" — Fatma K.',
  '🚚 Bu hafta 214 sipariş gönderildi',
  '🛒 Mehmet T. (Ankara) az önce sipariş verdi',
  '⭐ "Ofisime aldım, herkes soruyor" — Ali R.',
  '🔥 Bu ay 500+ müşteri alışveriş yaptı',
  '🛒 Selin B. (İzmir) az önce sepete ekledi',
  '⭐ Google\'da 4.9 yıldız — 127 yorum',
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
