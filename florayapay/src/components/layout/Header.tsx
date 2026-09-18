'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import { ShoppingCart, Menu, X, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/hooks/useCart'

const navLinks = [
  { href: '/urunler', label: 'Tüm Ürünler' },
  { href: '/urunler?kategori=yapay-agac-yesil', label: 'Yapay Ağaç' },
  { href: '/urunler?kategori=yapay-agac-renkli', label: 'Renkli Ağaç' },
  { href: '/urunler?kategori=bambu', label: 'Bambu' },
  { href: '/urunler?kategori=cicekler', label: 'Çiçekler' },
  { href: '/urunler?kategori=separator', label: 'Seperatör' },
  { href: '/urunler?kategori=dikey-bahce', label: 'Dikey Bahçe' },
  { href: '/urunler?kategori=duvar-dekor', label: 'Duvar Dekor' },
]

const extraLinks = [
  { href: '/dukkan-fotograflari', label: 'Mağazamız' },
  { href: '/projelerimiz', label: 'Projelerimiz' },
  { href: '/referanslarimiz', label: 'Referanslar' },
  { href: '/agac-boyut-rehberi', label: 'Boyut Rehberi' },
  { href: '/yapay-cicek-bakimi', label: 'Bakım Rehberi' },
  { href: '/sss', label: 'SSS' },
]

const popularSearches = ['yapay zeytin ağacı', 'bambu', 'dikey bahçe', 'renkli ağaç', 'orkide']

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const { itemCount } = useCart()
  const router = useRouter()
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    setSearchOpen(false)
    router.push(`/urunler?q=${encodeURIComponent(q)}`)
  }

  return (
    <header className="sticky top-0 z-50 bg-[#F4F2EC] border-b border-[#D6D2C4]">
      {/* Duyuru çubuğu */}
      <div className="bg-[#0D1510] text-[#EAE6DC] text-xs py-2 text-center tracking-widest uppercase">
        <span>Ücretsiz kargo — 1.000 TL ve üzeri &nbsp;·&nbsp; 14 gün iade garantisi</span>
        <a
          href="tel:+905446546220"
          className="ml-6 underline underline-offset-2 opacity-70 hover:opacity-100 transition-opacity"
        >
          0544 654 62 20
        </a>
      </div>

      {/* Logo satırı */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Menüyü kapat' : 'Menüyü aç'}
          className="md:hidden p-1 text-[#0D1510]"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <Link href="/" className="flex-1 flex justify-center">
          <Image src="/logo.png" alt="Erhan Flowers" width={160} height={80} style={{ objectFit: 'contain' }} priority />
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            aria-label="Ürün ara"
            className="p-1 text-[#0D1510] hover:text-[#5C7A62] transition-colors"
          >
            <Search size={20} />
          </button>
          <Link
            href="/sepet"
            aria-label={`Sepet, ${itemCount} ürün`}
            className="relative p-1 text-[#0D1510] hover:text-[#5C7A62] transition-colors"
          >
            <ShoppingCart size={22} />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#1E3A28] text-[#F4F2EC] text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-medium">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Arama kutusu */}
      {searchOpen && (
        <div className="border-t border-[#D6D2C4] bg-white px-4 py-4">
          <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C8A82]" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Ne aramak istersiniz? (yapay ağaç, orkide, bambu...)"
              className="w-full pl-9 pr-24 py-3 rounded-xl border border-[#D6D2C4] bg-[#F4F2EC] text-sm text-[#0D1510] placeholder-[#8C8A82] focus:outline-none focus:border-[#5C7A62]"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#0D1510] text-[#F4F2EC] px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-[#1E3A28] transition-colors"
            >
              Ara
            </button>
          </form>
          {query === '' && (
            <div className="flex flex-wrap gap-2 mt-3 max-w-2xl mx-auto">
              <span className="text-xs text-[#8C8A82] self-center">Popüler:</span>
              {popularSearches.map(s => (
                <button
                  key={s}
                  onClick={() => { setQuery(s); router.push(`/urunler?q=${encodeURIComponent(s)}`); setSearchOpen(false) }}
                  className="text-xs bg-[#F4F2EC] border border-[#D6D2C4] text-[#3A3A34] px-3 py-1.5 rounded-full hover:border-[#5C7A62] hover:text-[#1E3A28] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navigasyon — masaüstü */}
      <nav className="hidden md:flex justify-center border-t border-[#D6D2C4]" aria-label="Ana navigasyon">
        <ul className="flex flex-wrap justify-center">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="block px-4 py-2.5 text-[11px] tracking-[0.12em] uppercase font-medium text-[#3A3A34] hover:text-[#1E3A28] hover:bg-[#EAE6DC] transition-colors">
                {link.label}
              </Link>
            </li>
          ))}
          <li className="border-l border-[#D6D2C4] mx-1" />
          {extraLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="block px-4 py-2.5 text-[11px] tracking-[0.12em] uppercase font-medium text-[#5C7A62] hover:text-[#1E3A28] hover:bg-[#EAE6DC] transition-colors">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Mobil menü */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-[#D6D2C4] bg-[#F4F2EC]" aria-label="Mobil navigasyon">
          <ul className="py-2">
            {[...navLinks, ...extraLinks].map((link) => (
              <li key={link.href}>
                <Link href={link.href} onClick={() => setMobileOpen(false)} className="block px-6 py-3 text-sm text-[#0D1510] hover:bg-[#EAE6DC] tracking-wide">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  )
}
