'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ShoppingCart, Menu, X, Search, User, ChevronRight } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/lib/utils/format'

// Tek satır, sadece doğru bilgi. Yönetim panelinden "duyuru" girilmişse o gösterilir.
const DEFAULT_ANNOUNCEMENT = '🌿 Tüm ürünler Trendyol fiyatından %25 ucuz  ·  🚚 1.000 TL üzeri kargo bedava'

function AnnouncementBar() {
  const [text, setText] = useState(DEFAULT_ANNOUNCEMENT)
  useEffect(() => {
    fetch('/api/admin/site-config')
      .then((r) => r.json())
      .then((cfg) => { if (cfg?.announcementBar) setText(cfg.announcementBar) })
      .catch(() => {})
  }, [])
  return (
    <div className="bg-[#1E3A28] text-[#EAE6DC] text-[11px] sm:text-xs h-7 flex items-center justify-center px-3 text-center truncate">
      {text}
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
  { href: '/urunler?kategori=kaktus-ve-sazliklar', label: 'Kaktüs & Sazlık', emoji: '🌵' },
  { href: '/urunler?kategori=saksilar', label: 'Saksılar', emoji: '🪣' },
  { href: '/urunler?kategori=vazo-ve-samdanlar', label: 'Vazo & Şamdan', emoji: '🕯️' },
]

const extraLinks = [
  { href: '/toptan-satis', label: 'Toptan Satış' },
  { href: '/dukkan-fotograflari', label: 'Mağazamız' },
  { href: '/projelerimiz', label: 'Projelerimiz' },
  { href: '/referanslarimiz', label: 'Referanslar' },
  { href: '/agac-boyut-rehberi', label: 'Boyut Rehberi' },
  { href: '/yapay-cicek-bakimi', label: 'Bakım Rehberi' },
  { href: '/sss', label: 'SSS' },
]

const popularSearches = ['yapay zeytin ağacı', 'bambu', 'dikey bahçe', 'orkide', 'benjamin']

interface Suggestion {
  name: string
  slug: string
  price: number | null
  compareAt: number | null
  compareAtLabel: string | null
  image: string | null
  category: string | null
}

const trLower = (s: string) => s.toLocaleLowerCase('tr-TR')

function SearchBox() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  // Yazarken ürün önerileri (250 ms bekleyip sorar)
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) { setItems([]); return }
    setLoading(true)
    const ctrl = new AbortController()
    const t = setTimeout(() => {
      fetch(`/api/search-suggest?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d) => setItems(d.products ?? []))
        .catch(() => {})
        .finally(() => setLoading(false))
    }, 250)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [query])

  // Dışarı tıklayınca kapat
  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const go = (q: string) => {
    const v = q.trim()
    if (!v) return
    setOpen(false)
    router.push(`/urunler?q=${encodeURIComponent(v)}`)
  }

  const q = trLower(query.trim())
  const catMatches = q.length >= 2 ? navLinks.filter((l) => l.href !== '/urunler' && trLower(l.label).includes(q)).slice(0, 3) : []

  return (
    <div ref={boxRef} className="relative w-full">
      <form onSubmit={(e) => { e.preventDefault(); go(query) }} className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C8A82]" />
        <input
          type="search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Ürün veya kategori ara (zeytin ağacı, orkide…)"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#D6D2C4] bg-white text-sm text-[#0D1510] placeholder-[#8C8A82] focus:outline-none focus:border-[#5C7A62] focus:ring-2 focus:ring-[#5C7A62]/20"
          aria-label="Ürün ara"
          autoComplete="off"
        />
      </form>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl border border-[#E0DDD4] shadow-xl overflow-hidden max-h-[70vh] overflow-y-auto">
          {q.length < 2 ? (
            <div className="p-3">
              <p className="text-[11px] uppercase tracking-wider text-[#8C8A82] mb-2">Popüler aramalar</p>
              <div className="flex flex-wrap gap-2">
                {popularSearches.map((s) => (
                  <button key={s} onClick={() => go(s)} className="text-xs bg-[#F4F2EC] border border-[#E0DDD4] px-3 py-1.5 rounded-full hover:border-[#5C7A62]">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {catMatches.map((c) => (
                <Link key={c.href} href={c.href} onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-[#F4F2EC] border-b border-[#F0EDE6]">
                  <span>{c.emoji}</span>
                  <span className="text-[#0D1510] font-medium">{c.label}</span>
                  <span className="text-xs text-[#8C8A82]">kategorisi</span>
                </Link>
              ))}
              {items.map((p) => (
                <Link key={p.slug} href={`/urun/${p.slug}`} onClick={() => setOpen(false)} className="flex items-center gap-3 px-3 py-2 hover:bg-[#F4F2EC]">
                  <div className="relative w-12 h-12 flex-shrink-0 rounded-lg bg-[#F4F2EC] overflow-hidden">
                    {p.image && <Image src={p.image} alt="" fill sizes="48px" className="object-contain" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[#0D1510] line-clamp-1">{p.name}</p>
                    <p className="text-xs">
                      {p.price ? <span className="font-bold text-[#0D1510]">{formatPrice(p.price)}</span> : <span className="text-[#5C7A62]">Fiyat için iletişime geçin</span>}
                      {p.compareAt && (
                        <span className="ml-2 text-[#8C8A82]">{p.compareAtLabel ? `${p.compareAtLabel}'da ` : ''}<span className="line-through">{formatPrice(p.compareAt)}</span></span>
                      )}
                    </p>
                  </div>
                </Link>
              ))}
              {loading && items.length === 0 && <p className="px-4 py-3 text-sm text-[#8C8A82]">Aranıyor…</p>}
              {!loading && items.length === 0 && catMatches.length === 0 && (
                <p className="px-4 py-3 text-sm text-[#8C8A82]">Sonuç bulunamadı. Enter&apos;a basarak tümünde arayın.</p>
              )}
              <button onClick={() => go(query)} className="w-full text-left px-4 py-3 text-sm font-semibold text-[#1E3A28] bg-[#F4F2EC] hover:bg-[#EAE6DC]">
                “{query.trim()}” için tüm sonuçlar →
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/** Kategoriler: yandan değil, açılır pencere (mobilde alttan, masaüstünde ortada) */
function CategoryMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, onClose])
  if (!open || typeof document === 'undefined') return null
  // body'ye taşınır: başlığın katmanı içinde kalırsa WhatsApp düğmesi pencerenin üstüne çıkıyordu
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Kategoriler">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl bg-[#F4F2EC] rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-y-auto p-4 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-[#0D1510]">Kategoriler</p>
          <button onClick={onClose} aria-label="Kapat" className="p-1.5 rounded-full hover:bg-[#E0DDD4]"><X size={20} /></button>
        </div>
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {navLinks.map((l) => (
            <li key={l.href}>
              <Link href={l.href} onClick={onClose} className="flex items-center gap-2 bg-white rounded-xl border border-[#E0DDD4] px-3 py-3 text-sm font-medium text-[#0D1510] hover:border-[#5C7A62]">
                <span className="text-lg">{l.emoji}</span>
                <span className="truncate">{l.label}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-4 pt-4 border-t border-[#D6D2C4] grid grid-cols-2 gap-1">
          {extraLinks.map((l) => (
            <Link key={l.href} href={l.href} onClick={onClose} className="flex items-center justify-between px-2 py-2 text-sm text-[#5C7A62] hover:text-[#0D1510]">
              {l.label} <ChevronRight size={14} />
            </Link>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { itemCount } = useCart()
  const pathname = usePathname()

  useEffect(() => { setMenuOpen(false) }, [pathname])

  return (
    <header className="sticky top-0 z-50 bg-[#F4F2EC] border-b border-[#D6D2C4]">
      <AnnouncementBar />

      <div className="max-w-screen-2xl mx-auto px-3 md:px-6 py-2 md:py-3">
        <div className="flex items-center gap-2 md:gap-6">
          <button onClick={() => setMenuOpen(true)} aria-label="Kategoriler" className="p-1.5 -ml-1 text-[#0D1510] md:hidden">
            <Menu size={22} />
          </button>

          <Link href="/" className="flex-shrink-0" aria-label="Erhan Flowers ana sayfa">
            <Image src="/logo-wide.png" alt="Erhan Flowers" width={600} height={423} priority className="h-10 md:h-14 w-auto" />
          </Link>

          {/* Masaüstünde arama ortada */}
          <div className="hidden md:block flex-1 max-w-2xl mx-auto">
            <SearchBox />
          </div>

          <div className="ml-auto md:ml-0 flex items-center gap-1 md:gap-3">
            <button onClick={() => setMenuOpen(true)} className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-[#0D1510] hover:bg-[#EAE6DC]">
              <Menu size={18} /> Kategoriler
            </button>
            <Link href="/hesabim" aria-label="Hesabım" className="p-1.5 text-[#0D1510] hover:text-[#5C7A62]">
              <User size={21} />
            </Link>
            <Link href="/sepet" aria-label={`Sepet, ${itemCount} ürün`} className="relative p-1.5 text-[#0D1510] hover:text-[#5C7A62]">
              <ShoppingCart size={22} />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#C62828] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-semibold">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Mobilde arama her zaman görünür */}
        <div className="md:hidden mt-2">
          <SearchBox />
        </div>
      </div>

      {/* Masaüstü kategori şeridi */}
      <nav className="hidden md:block bg-[#1E3A28]" aria-label="Kategori navigasyonu">
        <ul className="max-w-screen-2xl mx-auto px-4 flex flex-wrap justify-center">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-semibold text-[#C8DEC8] hover:text-white hover:bg-[#2A4F38] whitespace-nowrap">
                <span>{link.emoji}</span>
                <span>{link.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <CategoryMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </header>
  )
}
