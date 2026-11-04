'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import { ShoppingCart, Menu, X, Search, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/hooks/useCart'

const DEFAULT_ANNOUNCEMENTS = [
  '🚚 1.000 TL ve üzeri ÜCRETSİZ kargo  ·  📞 0544 654 62 20',
  '⭐ Google\'da 4.9 yıldız — 127 yorum  ·  14 gün iade garantisi',
  '🔥 Yüzlerce mutlu müşteri — Google\'da 4.9 yıldız',
  '💬 WhatsApp\'tan sipariş — anında yanıt',
  '🌿 Trendyol\'a göre %15 daha uygun fiyat',
]

function AnnouncementBar() {
  const [idx, setIdx] = useState(0)
  const [vis, setVis] = useState(true)
  const [announcements, setAnnouncements] = useState(DEFAULT_ANNOUNCEMENTS)

  useEffect(() => {
    fetch('/api/admin/site-config')
      .then(r => r.json())
      .then(cfg => {
        if (cfg?.announcementBar) {
          setAnnouncements([cfg.announcementBar, ...DEFAULT_ANNOUNCEMENTS.slice(1)])
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const t = setInterval(() => {
      setVis(false)
      setTimeout(() => { setIdx(i => (i + 1) % announcements.length); setVis(true) }, 350)
    }, 3500)
    return () => clearInterval(t)
  }, [announcements.length])
  return (
    <div className="bg-[#0D1510] text-[#EAE6DC] text-xs py-2 text-center overflow-hidden h-7 flex items-center justify-center">
      <p className={`transition-all duration-300 ${vis ? 'opacity-100' : 'opacity-0'}`}>
        {announcements[idx]}
      </p>
    </div>
  )
}

const navLinks = [
  { href: '/urunler', label: 'Tüm Ürünler', emoji: '🌿' },
  { href: '/urunler?kategori=agaclar', label: 'Ağaçlar', emoji: '🌳' },
  { href: '/urunler?kategori=bambu', label: 'Bambu', emoji: '🎋' },
  { href: '/urunler?kategori=yapay-cicekler', label: 'Çiçekler', emoji: '🌸' },
  { href: '/urunler?kategori=buketler', label: 'Buketler', emoji: '💐' },
  { href: '/urunler?kategori=dikey-bahceler', label: 'Dikey Bahçe', emoji: '🪴' },
  { href: '/urunler?kategori=sarmasiklar', label: 'Sarmaşıklar', emoji: '🌿' },
  { href: '/urunler?kategori=bonsai-ve-zeytin-agaclari', label: 'Bonsai & Zeytin', emoji: '🫒' },
  { href: '/urunler?kategori=yapay-bitkiler', label: 'Yapay Bitkiler', emoji: '🌱' },
  { href: '/urunler?kategori=saksilar', label: 'Saksılar', emoji: '🪣' },
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
      {/* Dönen duyuru çubuğu */}
      <AnnouncementBar />

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
          <Link href="/hesabim" aria-label="Hesabım" className="p-1 text-[#0D1510] hover:text-[#5C7A62] transition-colors">
            <User size={20} />
          </Link>
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

      {/* Kategori navigasyonu — masaüstü */}
      <nav className="hidden md:block bg-[#1E3A28] border-t border-[#2A4F38]" aria-label="Kategori navigasyonu">
        <div className="max-w-screen-2xl mx-auto px-4 overflow-x-auto">
          <ul className="flex min-w-max">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="flex items-center gap-1.5 px-4 py-3 text-[12px] font-semibold text-[#C8DEC8] hover:text-white hover:bg-[#2A4F38] transition-colors whitespace-nowrap">
                  <span>{link.emoji}</span>
                  <span>{link.label}</span>
                </Link>
              </li>
            ))}
            <li className="flex-1" />
            {extraLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="block px-3 py-3 text-[11px] font-medium text-[#8CAD8C] hover:text-white hover:bg-[#2A4F38] transition-colors whitespace-nowrap">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Mobil menü */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-[#D6D2C4] bg-[#F4F2EC]" aria-label="Mobil navigasyon">
          <div className="py-2">
            <p className="px-6 pt-2 pb-1 text-[10px] uppercase tracking-widest text-[#8C8A82] font-semibold">Kategoriler</p>
            <ul>
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-6 py-3 text-sm font-medium text-[#0D1510] hover:bg-[#EAE6DC]">
                    <span className="text-base">{link.emoji}</span>
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="px-6 pt-3 pb-1 text-[10px] uppercase tracking-widest text-[#8C8A82] font-semibold border-t border-[#D6D2C4] mt-2">Daha Fazlası</p>
            <ul>
              {extraLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} onClick={() => setMobileOpen(false)} className="block px-6 py-3 text-sm text-[#5C7A62] hover:bg-[#EAE6DC]">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      )}
    </header>
  )
}
