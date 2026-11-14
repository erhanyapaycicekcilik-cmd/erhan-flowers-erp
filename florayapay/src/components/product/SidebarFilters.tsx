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

    </aside>
  )

  return (
    <>
      {/* Mobil: tam genişlik çubuk — kategori seçimi açılır pencerede (yandan değil) */}
      <div className="lg:hidden w-full">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none]">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex-shrink-0 flex items-center gap-2 px-3.5 py-2 bg-[#1E3A28] text-white rounded-full text-sm font-medium"
          >
            <SlidersHorizontal size={15} />
            {activeCat ? activeCat.name : 'Kategoriler'}
            <ChevronDown size={14} />
          </button>
          {(activeCategory && subCategories.length > 0 ? subCategories : categories).map((c) => {
            const href = activeCategory && subCategories.length > 0
              ? `/urunler?kategori=${activeCategory}&altkategori=${c.slug}`
              : `/urunler?kategori=${c.slug}`
            const active = activeCategory && subCategories.length > 0 ? activeSubCategory === c.slug : activeCategory === c.slug
            return (
              <Link
                key={c.slug}
                href={href}
                className={`flex-shrink-0 px-3.5 py-2 rounded-full text-sm border whitespace-nowrap ${
                  active ? 'bg-[#E8F0EA] border-[#5C7A62] text-[#1E3A28] font-semibold' : 'bg-white border-[#E0DDD4] text-[#3A3A34]'
                }`}
              >
                {c.name}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Mobil açılır pencere (alttan) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[70] flex items-end lg:hidden" role="dialog" aria-modal="true" aria-label="Kategoriler">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative w-full bg-[#F4F2EC] rounded-t-3xl max-h-[85vh] overflow-y-auto p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-[#0D1510]">Kategoriler</span>
              <button onClick={() => setMobileOpen(false)} aria-label="Kapat" className="p-1.5 rounded-full hover:bg-[#E0DDD4]">
                <X size={20} />
              </button>
            </div>
            {activeCategory && subCategories.length > 0 && (
              <>
                <p className="text-[11px] uppercase tracking-wider text-[#8C8A82] mb-2">{activeCat?.name}</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <Link href={`/urunler?kategori=${activeCategory}`} onClick={() => setMobileOpen(false)} className={`px-3 py-2.5 rounded-xl border text-sm ${!activeSubCategory ? 'bg-[#E8F0EA] border-[#5C7A62] font-semibold' : 'bg-white border-[#E0DDD4]'}`}>
                    Tümü <span className="text-[#8C8A82]">({activeCat?.count ?? totalCount})</span>
                  </Link>
                  {subCategories.map((sub) => (
                    <Link key={sub.slug} href={`/urunler?kategori=${activeCategory}&altkategori=${sub.slug}`} onClick={() => setMobileOpen(false)} className={`px-3 py-2.5 rounded-xl border text-sm ${activeSubCategory === sub.slug ? 'bg-[#E8F0EA] border-[#5C7A62] font-semibold' : 'bg-white border-[#E0DDD4]'}`}>
                      {sub.name} <span className="text-[#8C8A82]">({sub.count})</span>
                    </Link>
                  ))}
                </div>
              </>
            )}
            <p className="text-[11px] uppercase tracking-wider text-[#8C8A82] mb-2">Tüm kategoriler</p>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/urunler" onClick={() => setMobileOpen(false)} className={`px-3 py-2.5 rounded-xl border text-sm ${!activeCategory ? 'bg-[#E8F0EA] border-[#5C7A62] font-semibold' : 'bg-white border-[#E0DDD4]'}`}>
                Tüm Ürünler
              </Link>
              {categories.map((cat) => (
                <Link key={cat.slug} href={`/urunler?kategori=${cat.slug}`} onClick={() => setMobileOpen(false)} className={`px-3 py-2.5 rounded-xl border text-sm ${activeCategory === cat.slug ? 'bg-[#E8F0EA] border-[#5C7A62] font-semibold' : 'bg-white border-[#E0DDD4]'}`}>
                  {cat.name} <span className="text-[#8C8A82]">({cat.count})</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:block">{sidebar}</div>
    </>
  )
}
