'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, SlidersHorizontal, X } from 'lucide-react'

interface Category {
  id: number
  name: string
  slug: string
  count: number
}

interface Props {
  categories: Category[]
  subCategories: Category[]
  activeCategory?: string
  activeSubCategory?: string
  totalCount: number
}

export function SidebarFilters({ categories, subCategories, activeCategory, activeSubCategory, totalCount }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [categoryOpen, setCategoryOpen] = useState(true)

  const activeCat = categories.find(c => c.slug === activeCategory)

  const sidebar = (
    <aside className="w-64 shrink-0 space-y-3">
      {/* Ana Kategoriler */}
      <div className="bg-white rounded-xl border border-[#E0DDD4] overflow-hidden">
        <button
          onClick={() => setCategoryOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-[#0D1510] hover:bg-[#F4F2EC] transition-colors"
        >
          <span className="uppercase tracking-wide text-xs">
            {activeCat ? activeCat.name : 'Tüm Ürünler'}
            <span className="ml-2 text-[#8C8A82] font-normal">({activeCat?.count ?? totalCount})</span>
          </span>
          {categoryOpen ? <ChevronUp size={14} className="text-[#8C8A82]" /> : <ChevronDown size={14} className="text-[#8C8A82]" />}
        </button>

        {categoryOpen && (
          <div className="border-t border-[#F0EDE6] py-1">
            <Link
              href="/urunler"
              className={`flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                !activeCategory
                  ? 'text-[#5C7A62] font-semibold bg-[#F0F5F1]'
                  : 'text-[#5C5C52] hover:text-[#0D1510] hover:bg-[#F9F8F5]'
              }`}
            >
              <span>Tüm {activeCat ? activeCat.name : 'Ürünler'}</span>
              <span className="text-xs text-[#B0ADA6]">{activeCat?.count ?? totalCount}</span>
            </Link>

            {/* Kategori aktifken alt kategorileri, değilse tüm kategorileri göster */}
            {activeCategory && subCategories.length > 0 ? (
              subCategories.map(sub => (
                <Link
                  key={sub.slug}
                  href={`/urunler?kategori=${activeCategory}&altkategori=${sub.slug}`}
                  className={`flex items-center justify-between pl-6 pr-4 py-2 text-sm transition-colors ${
                    activeSubCategory === sub.slug
                      ? 'text-[#5C7A62] font-semibold bg-[#F0F5F1]'
                      : 'text-[#5C5C52] hover:text-[#0D1510] hover:bg-[#F9F8F5]'
                  }`}
                >
                  <span>{sub.name}</span>
                  <span className="text-xs text-[#B0ADA6]">{sub.count}</span>
                </Link>
              ))
            ) : (
              categories.map(cat => (
                <Link
                  key={cat.slug}
                  href={`/urunler?kategori=${cat.slug}`}
                  className={`flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                    activeCategory === cat.slug
                      ? 'text-[#5C7A62] font-semibold bg-[#F0F5F1]'
                      : 'text-[#5C5C52] hover:text-[#0D1510] hover:bg-[#F9F8F5]'
                  }`}
                >
                  <span>{cat.name}</span>
                  <span className="text-xs text-[#B0ADA6]">{cat.count}</span>
                </Link>
              ))
            )}
          </div>
        )}
      </div>

      {/* Ana kategoriler (aktif kategori seçiliyse göster) */}
      {activeCategory && (
        <div className="bg-white rounded-xl border border-[#E0DDD4] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#F0EDE6]">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#8C8A82]">Diğer Kategoriler</span>
          </div>
          <div className="py-1">
            {categories.map(cat => (
              <Link
                key={cat.slug}
                href={`/urunler?kategori=${cat.slug}`}
                className={`flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                  activeCategory === cat.slug
                    ? 'text-[#5C7A62] font-semibold bg-[#F0F5F1]'
                    : 'text-[#5C5C52] hover:text-[#0D1510] hover:bg-[#F9F8F5]'
                }`}
              >
                <span>{cat.name}</span>
                <span className="text-xs text-[#B0ADA6]">{cat.count}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Marka */}
      <div className="bg-white rounded-xl border border-[#E0DDD4] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#F0EDE6]">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#8C8A82]">Marka</span>
        </div>
        <div className="px-4 py-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" defaultChecked className="accent-[#5C7A62] w-4 h-4 rounded" readOnly />
            <span className="text-sm text-[#0D1510]">Flora Yapay Çiçek</span>
            <span className="ml-auto text-xs text-[#B0ADA6]">{totalCount}</span>
          </label>
        </div>
      </div>
    </aside>
  )

  return (
    <>
      {/* Mobil filtre butonu */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E0DDD4] rounded-xl text-sm font-medium text-[#0D1510] hover:bg-[#F4F2EC] transition-colors"
        >
          <SlidersHorizontal size={16} />
          Filtrele
        </button>
      </div>

      {/* Mobil overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative bg-[#F4F2EC] w-72 max-h-screen overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-[#0D1510]">Filtrele</span>
              <button onClick={() => setMobileOpen(false)} className="p-1 rounded hover:bg-[#E0DDD4]">
                <X size={18} />
              </button>
            </div>
            {sidebar}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:block">{sidebar}</div>
    </>
  )
}
