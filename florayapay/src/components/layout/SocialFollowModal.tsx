'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

type Platform = 'instagram' | 'youtube' | 'tiktok'

interface SocialLink {
  platform: Platform
  label: string
  href: string
  color: string
  discountCode: string
  followerCount?: string
  icon: React.ReactNode
}

const PLATFORM_INFO: Record<Platform, { action: string; verb: string }> = {
  instagram: { action: 'Takip Et', verb: 'takip' },
  youtube:   { action: 'Abone Ol', verb: 'abone' },
  tiktok:    { action: 'Takip Et', verb: 'takip' },
}

interface Props {
  link: SocialLink
  onClose: () => void
}

export function SocialFollowModal({ link, onClose }: Props) {
  const info = PLATFORM_INFO[link.platform]

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Renkli üst şerit */}
        <div className={`h-2 w-full ${link.color}`} />

        {/* Kapat */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
          aria-label="Kapat"
        >
          <X size={20} />
        </button>

        <div className="p-6 text-center">
          {/* İkon */}
          <div className={`w-16 h-16 ${link.color} rounded-2xl flex items-center justify-center mx-auto mb-4 text-white`}>
            {link.icon}
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-1">
            {link.label}&apos;da bizi {info.verb} edin!
          </h2>
          <p className="text-gray-500 text-sm mb-4">
            Bizi {info.verb} edenlere özel <span className="font-bold text-flora-600">%10 indirim</span> kodu vereceğiz. Ürün, fiyat ve kampanyalardan ilk siz haberdar olun.
          </p>

          {/* İndirim kodu */}
          <div className="bg-flora-50 border-2 border-dashed border-flora-300 rounded-xl px-4 py-3 mb-5">
            <p className="text-xs text-flora-600 font-medium mb-1">İndirim kodunuz</p>
            <p className="text-2xl font-bold tracking-widest text-flora-700">{link.discountCode}</p>
            <p className="text-xs text-gray-400 mt-1">Takip ettikten sonra alışverişte kullanın</p>
          </div>

          {/* CTA butonu */}
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className={`block w-full py-3.5 rounded-xl font-bold text-white text-center transition-opacity hover:opacity-90 ${link.color}`}
          >
            {link.label}&apos;ı Aç &amp; {info.action}
          </a>

          <button onClick={onClose} className="mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Şimdi değil
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Sosyal medya buton listesi (Footer + Header'da paylaşılır) ───────────────

const igIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
)

const ytIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
)

const ttIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.16 8.16 0 0 0 4.77 1.52V6.75a4.85 4.85 0 0 1-1-.06z"/>
  </svg>
)

export const SOCIAL_LINKS: SocialLink[] = [
  {
    platform: 'instagram',
    label: 'Instagram',
    href: 'https://www.instagram.com/erhanflowers',
    color: 'bg-gradient-to-br from-purple-600 to-pink-500',
    discountCode: 'FLORA10',
    icon: igIcon,
  },
  {
    platform: 'youtube',
    label: 'YouTube',
    href: 'https://youtube.com/@erhanflowers',
    color: 'bg-red-600',
    discountCode: 'FLORA10',
    icon: ytIcon,
  },
  {
    platform: 'tiktok',
    label: 'TikTok',
    href: 'https://www.tiktok.com/@erhanflowers',
    color: 'bg-gray-900',
    discountCode: 'FLORA10',
    icon: ttIcon,
  },
]

// ─── Tek kullanım bileşeni: ikonlar + modal ───────────────────────────────────

export function SocialIcons({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const [active, setActive] = useState<SocialLink | null>(null)
  const btnClass = size === 'sm'
    ? 'w-9 h-9 text-xs'
    : 'w-11 h-11'

  return (
    <>
      <div className="flex gap-2">
        {SOCIAL_LINKS.map((link) => (
          <button
            key={link.platform}
            type="button"
            onClick={() => setActive(link)}
            aria-label={link.label}
            className={`${btnClass} bg-gray-800 text-white rounded-xl flex items-center justify-center hover:opacity-90 transition-opacity ${link.color}`}
          >
            <span className={size === 'sm' ? 'scale-75' : ''}>{link.icon}</span>
          </button>
        ))}
      </div>

      {active && (
        <SocialFollowModal link={active} onClose={() => setActive(null)} />
      )}
    </>
  )
}
