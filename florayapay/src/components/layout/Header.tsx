'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { ShoppingCart, Menu, X } from 'lucide-react'
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

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { itemCount } = useCart()

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

      {/* Logo — ortalanmış */}
      <div className="flex items-center justify-between px-6 py-4">
        {/* Mobil menü sol */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Menüyü kapat' : 'Menüyü aç'}
          className="md:hidden p-1 text-[#0D1510]"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Logo */}
        <Link href="/" className="flex-1 flex justify-center md:justify-center">
          <Image
            src="/logo.png"
            alt="Erhan Flowers"
            width={160}
            height={80}
            style={{ objectFit: 'contain' }}
            priority
          />
        </Link>

        {/* Sepet sağ */}
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

      {/* Navigasyon — masaüstü */}
      <nav className="hidden md:flex justify-center border-t border-[#D6D2C4]" aria-label="Ana navigasyon">
        <ul className="flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="block px-5 py-2.5 text-[11px] tracking-[0.12em] uppercase font-medium text-[#3A3A34] hover:text-[#1E3A28] hover:bg-[#EAE6DC] transition-colors"
              >
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
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-6 py-3 text-sm text-[#0D1510] hover:bg-[#EAE6DC] tracking-wide"
                >
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
