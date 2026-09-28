'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'

interface Slide {
  id: string
  image: string
  tag: string
  title: string
  accent: string
  description: string
  active: boolean
}

const DEFAULT_SLIDES: Slide[] = [
  {
    id: '1',
    image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=1600&q=90&fit=crop',
    tag: 'Yapay Ağaç Koleksiyonu',
    title: 'Doğanın Güzelliği,',
    accent: 'Ömür Boyu',
    description: 'Solmayan yapay çiçek ve bitkilerle evinize ya da ofisinize doğal dokunuş katın.',
    active: true,
  },
]

export function HeroSection() {
  const [slides, setSlides] = useState<Slide[]>(DEFAULT_SLIDES)
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    fetch('/api/admin/banner')
      .then(r => r.json())
      .then(data => {
        const active = (data.slides as Slide[]).filter(s => s.active)
        if (active.length > 0) setSlides(active)
      })
      .catch(() => null)
  }, [])

  useEffect(() => {
    if (slides.length <= 1) return
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length)
    }, 4500)
    return () => clearInterval(timer)
  }, [slides])

  const slide = slides[current]
  if (!slide) return null

  return (
    <section className="relative h-[55vh] min-h-[380px] max-h-[520px] overflow-hidden">
      {slides.map((s, i) => (
        <div
          key={s.id}
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

      <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

      <div className="relative h-full flex items-center">
        <div className="max-w-screen-2xl mx-auto px-6 md:px-12 w-full">
          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-[0.3em] text-white/70 mb-4">
              {slide.tag}
            </p>
            <h1 className="font-display text-5xl md:text-6xl font-light text-white leading-none tracking-tight mb-4">
              {slide.title}<br />
              <em className="not-italic text-[#8FBF97]">{slide.accent}</em>
            </h1>
            <p className="text-white/75 text-base md:text-lg max-w-md mb-8 leading-relaxed">
              {slide.description}
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

      {slides.length > 1 && (
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
      )}
    </section>
  )
}
