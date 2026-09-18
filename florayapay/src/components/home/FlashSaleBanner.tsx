'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export function FlashSaleBanner() {
  const [time, setTime] = useState({ h: 0, m: 0, s: 0 })

  useEffect(() => {
    function calc() {
      const now = new Date()
      // Reset every day at midnight
      const end = new Date(now)
      end.setHours(23, 59, 59, 0)
      const diff = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000))
      setTime({
        h: Math.floor(diff / 3600),
        m: Math.floor((diff % 3600) / 60),
        s: diff % 60,
      })
    }
    calc()
    const t = setInterval(calc, 1000)
    return () => clearInterval(t)
  }, [])

  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <section className="bg-gradient-to-r from-[#7B2D2D] to-[#B03A2E] text-white py-5 px-4">
      <div className="max-w-screen-xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔥</span>
          <div>
            <p className="font-bold text-base leading-tight">Günlük Fırsat — Seçili Ürünlerde %15 İndirim</p>
            <p className="text-white/70 text-xs">Bugün sona eriyor, kaçırmayın!</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2 text-center">
            {[{ v: pad(time.h), l: 'Saat' }, { v: pad(time.m), l: 'Dak' }, { v: pad(time.s), l: 'Sn' }].map(({ v, l }) => (
              <div key={l} className="bg-white/20 rounded-lg px-3 py-1.5 min-w-[44px]">
                <p className="font-mono font-bold text-xl leading-none">{v}</p>
                <p className="text-[10px] text-white/70 mt-0.5">{l}</p>
              </div>
            ))}
          </div>
          <Link
            href="/urunler?sirala=indirimli"
            className="bg-white text-[#B03A2E] px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#FFF5F5] transition-colors whitespace-nowrap"
          >
            Fırsatları Gör →
          </Link>
        </div>
      </div>
    </section>
  )
}
