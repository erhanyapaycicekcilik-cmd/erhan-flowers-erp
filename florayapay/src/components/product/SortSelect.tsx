'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const options = [
  { value: 'newest', label: 'En Yeni' },
  { value: 'price_asc', label: 'Fiyat: Düşükten Yükseğe' },
  { value: 'price_desc', label: 'Fiyat: Yüksekten Düşüğe' },
  { value: 'name', label: 'İsme Göre (A-Z)' },
]

export function SortSelect({ activeSort }: { activeSort?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('sirala', value)
    params.delete('sayfa')
    router.push(`/urunler?${params.toString()}`)
  }

  return (
    <div>
      <label htmlFor="sirala" className="sr-only">Sıralama</label>
      <select
        id="sirala"
        value={activeSort ?? 'newest'}
        onChange={(e) => handleChange(e.target.value)}
        className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-flora-500 focus:border-flora-500 outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
