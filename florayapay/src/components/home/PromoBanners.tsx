import type { ReactNode } from 'react'
import Link from 'next/link'
import { readSiteConfig } from '@/lib/site-config'

const PATTERNS: Record<string, ReactNode> = {
  agaclar: (
    <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="350" cy="50" r="120" fill="#7AB88A"/>
      <circle cx="80" cy="280" r="80" fill="#5C7A62"/>
      <circle cx="200" cy="150" r="60" fill="#8BAF8A"/>
    </svg>
  ),
  'dikey-bahce': (
    <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="0" y="0" width="50" height="300" fill="#5C7A62"/>
      <rect x="70" y="0" width="50" height="300" fill="#7AB88A"/>
      <rect x="140" y="0" width="50" height="300" fill="#5C7A62"/>
      <rect x="210" y="0" width="30" height="300" fill="#8BAF8A"/>
      <rect x="260" y="0" width="50" height="300" fill="#5C7A62"/>
      <rect x="330" y="0" width="70" height="300" fill="#7AB88A"/>
    </svg>
  ),
}

const DEFAULT_PATTERN: ReactNode = (
  <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="300" cy="150" r="100" fill="#7AB88A"/>
    <circle cx="100" cy="200" r="70" fill="#5C7A62"/>
  </svg>
)

export function PromoBanners() {
  const { promoBanners } = readSiteConfig()
  const active = promoBanners.filter(b => b.active)

  return (
    <section className="py-10" aria-label="Öne çıkan kategoriler">
      <div className="max-w-screen-2xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {active.map((b) => (
            <Link
              key={b.id}
              href={b.href}
              style={{ backgroundColor: b.bg }}
              className="relative overflow-hidden rounded-3xl p-8 md:p-10 text-white group min-h-[200px] flex flex-col justify-between"
            >
              {PATTERNS[b.id] ?? DEFAULT_PATTERN}
              <div className="relative z-10">
                <p className="text-xs uppercase tracking-[0.2em] font-medium mb-2 text-[#7AB88A]">
                  {b.subtitle}
                </p>
                <h3 className="font-display text-3xl font-light text-white leading-tight">
                  {b.title}
                </h3>
                <p className="text-sm text-white/60 mt-2">{b.desc}</p>
              </div>
              <div className="relative z-10 mt-6">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#A8C9A0] group-hover:gap-3 transition-all">
                  {b.cta} →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
