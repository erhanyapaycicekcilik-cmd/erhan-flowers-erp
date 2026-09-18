import Link from 'next/link'
import type { Category } from '@/lib/api/catalog'

interface Props {
  categories: Category[]
  activeCategory?: string
  activeSort?: string
}

export function ProductFilters({ categories, activeCategory }: Props) {
  return (
    <div className="space-y-6">
      {/* Kategoriler */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-800 mb-4 text-sm uppercase tracking-wide">
          Kategoriler
        </h2>
        <ul className="space-y-1">
          <li>
            <Link
              href="/urunler"
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                !activeCategory
                  ? 'bg-flora-100 text-flora-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span>Tüm Ürünler</span>
              <span className="text-xs text-gray-400">
                {categories.reduce((s, c) => s + c.count, 0)}
              </span>
            </Link>
          </li>
          {categories.map((cat) => (
            <li key={cat.id}>
              <Link
                href={`/urunler?kategori=${cat.slug}`}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeCategory === cat.slug
                    ? 'bg-flora-100 text-flora-700 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span>{cat.name}</span>
                <span className="text-xs text-gray-400">{cat.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
