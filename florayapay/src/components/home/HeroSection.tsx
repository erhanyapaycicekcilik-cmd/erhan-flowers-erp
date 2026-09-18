'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'

const slides = [
  {
    image: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=1600&q=90&fit=crop',
    tag: 'Yapay Ağaç Koleksiyonu',
    title: 'Doğanın Güzelliği,',
    accent: 'Ömür Boyu',
  },
  {
    image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1600&q=90&fit=crop',
    tag: 'Yapay Çiçek & Dekorasyon',
    title: 'Solmayan Renkler,',
    accent: 'Canlı Dokunuşlar',
  },
  {
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=90&fit=crop',
    tag: 'Dikey Bahçe Sistemleri',
    title: 'Duvarlarınıza',
    accent: 'Yeşil Hayat Katın',
  },
  {
    image: 'https://images.unsplash.com/photo-1524247108137-732e0f642303?w=1600&q=90&fit=crop',
    tag: 'Premium Dekorasyon',
    title: 'Evinizi',
    accent: 'Doğayla Buluşturun',
  },
]

export function HeroSection() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length)
    }, 4500)
    return () => clearInterval(timer)
  }, [])

  const slide = slides[current]

  return (
    <section className="relative h-[80vh] min-h-[520px] max-h-[800px] overflow-hidden">
      {/* Görsel katmanı */}
      {slides.map((s, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-1000 ${i === current ? 'opacity-100' : 'opacity-0'}`}
        >
          <Image
            src={s.image}
            alt={s.tag}
            fill
            priority={i === 0}
            sizes="100vw"
            className="object-cover"
          />
        </div>
      ))}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

      {/* İçerik */}
      <div className="relative h-full flex items-center">
        <div className="max-w-screen-2xl mx-auto px-6 md:px-12 w-full">
          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-[0.3em] text-white/70 mb-4 transition-all duration-700">
              {slide.tag}
            </p>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-light text-white leading-none tracking-tight mb-4">
              {slide.title}<br />
              <em className="not-italic text-[#8FBF97]">{slide.accent}</em>
            </h1>
            <p className="text-white/75 text-base md:text-lg max-w-md mb-8 leading-relaxed">
              Solmayan yapay çiçek ve bitkilerle evinize ya da ofisinize doğal dokunuş katın.
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <Link
                href="/urunler"
                className="bg-white text-[#0D1510] px-8 py-3 rounded-full text-sm font-semibold tracking-wide hover:bg-[#F4F2EC] transition-colors"
              >
                Koleksiyonu Keşfet
              </Link>
              <a
                href="https://wa.me/905446546220"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-white/70 text-white px-8 py-3 rounded-full text-sm font-semibold tracking-wide hover:bg-white/10 transition-colors"
              >
                WhatsApp&apos;tan Yazın
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Nokta göstergeleri */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`Slayt ${i + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === current ? 'bg-white w-8' : 'bg-white/40 w-2'
            }`}
          />
        ))}
      </div>
    </section>
  )
}
