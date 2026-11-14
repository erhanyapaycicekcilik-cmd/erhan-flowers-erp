'use client'

import Image from 'next/image'
import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react'

interface Props {
  images: string[]
  productName: string
}

export function ProductImageGallery({ images, productName }: Props) {
  const [active, setActive] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const [sliding, setSliding] = useState<'left' | 'right' | null>(null)
  const autoplayRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const goTo = useCallback((index: number, direction: 'left' | 'right') => {
    if (sliding) return
    setSliding(direction)
    setTimeout(() => {
      setActive(index)
      setSliding(null)
    }, 350)
  }, [sliding])

  const prev = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation()
    goTo((active - 1 + images.length) % images.length, 'right')
  }, [active, images.length, goTo])

  const next = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation()
    goTo((active + 1) % images.length, 'left')
  }, [active, images.length, goTo])

  // Otomatik geçiş — 3 saniyede bir
  useEffect(() => {
    if (images.length <= 1) return
    autoplayRef.current = setTimeout(() => {
      goTo((active + 1) % images.length, 'left')
    }, 3000)
    return () => {
      if (autoplayRef.current) clearTimeout(autoplayRef.current)
    }
  }, [active, images.length, goTo])

  if (images.length === 0) {
    return (
      <div className="aspect-square bg-gray-100 rounded-3xl flex items-center justify-center text-8xl text-gray-200">
        🌿
      </div>
    )
  }

  const slideClass = sliding === 'left'
    ? 'animate-slide-out-left'
    : sliding === 'right'
    ? 'animate-slide-out-right'
    : ''

  return (
    <>
      <style>{`
        @keyframes slideOutLeft {
          from { transform: translateX(0); opacity: 1; }
          to   { transform: translateX(-8%); opacity: 0; }
        }
        @keyframes slideOutRight {
          from { transform: translateX(0); opacity: 1; }
          to   { transform: translateX(8%); opacity: 0; }
        }
        .animate-slide-out-left  { animation: slideOutLeft  0.35s ease forwards; }
        .animate-slide-out-right { animation: slideOutRight 0.35s ease forwards; }
      `}</style>

      <div className="space-y-3">
        {/* Ana görsel */}
        <div
          className="relative aspect-square bg-gray-50 rounded-3xl overflow-hidden cursor-zoom-in"
          onClick={() => setLightbox(true)}
        >
          <div className={`absolute inset-0 ${slideClass}`}>
            <Image
              src={images[active]}
              alt={`${productName} — görsel ${active + 1}`}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 60vw, 50vw"
              className="object-cover"
              priority
              quality={60}
            />
          </div>

          {/* Zoom ikonu */}
          <div className="absolute top-3 right-3 w-9 h-9 bg-white/80 rounded-full flex items-center justify-center shadow-sm pointer-events-none z-10">
            <ZoomIn size={16} className="text-gray-600" />
          </div>

          {images.length > 1 && (
            <>
              <button
                onClick={prev}
                aria-label="Önceki görsel"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white active:scale-95 transition-all z-10"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={next}
                aria-label="Sonraki görsel"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white active:scale-95 transition-all z-10"
              >
                <ChevronRight size={20} />
              </button>

              {/* Dot indikatörler */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); goTo(i, i > active ? 'left' : 'right') }}
                    aria-label={`Görsel ${i + 1}`}
                    className={`h-2 rounded-full transition-all ${
                      i === active ? 'bg-white w-4' : 'bg-white/50 w-2'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Küçük thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => goTo(i, i > active ? 'left' : 'right')}
                aria-label={`Görsel ${i + 1}`}
                className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                  i === active
                    ? 'border-[#5C7A62] shadow-md'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <Image
                  src={img}
                  alt={`${productName} küçük ${i + 1}`}
                  width={64}
                  height={64}
                  className="object-cover w-full h-full"
                  quality={40}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
            onClick={() => setLightbox(false)}
            aria-label="Kapat"
          >
            <X size={20} />
          </button>

          {images.length > 1 && (
            <>
              <button
                onClick={prev}
                aria-label="Önceki görsel"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={next}
                aria-label="Sonraki görsel"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          <div
            className="relative w-full h-full max-w-3xl max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[active]}
              alt={`${productName} — tam görsel ${active + 1}`}
              fill
              sizes="100vw"
              className="object-cover"
            />
          </div>

          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
              {active + 1} / {images.length}
            </div>
          )}
        </div>
      )}
    </>
  )
}
