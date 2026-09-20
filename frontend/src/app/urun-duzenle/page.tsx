'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AdminShell } from '@/components/AdminShell'
import { api } from '@/lib/api'

function fmt(n: number) {
  return '₺' + new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(n)
}

export default function UrunDuzenlePage() {
  const router = useRouter()
  const [products, setProducts] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const searchTimeout = useRef<any>(null)

  async function loadProducts(q = '') {
    setLoading(true)
    try {
      const qs = q ? `?search=${encodeURIComponent(q)}` : ''
      const data = await api<any[]>(`/product-center/variants${qs}`)
      setProducts(Array.isArray(data) ? data : [])
    } catch { setProducts([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadProducts() }, [])

  function handleSearchChange(val: string) {
    setSearch(val)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => loadProducts(val), 400)
  }

  return (
    <AdminShell>
      <div className="p-4 max-w-2xl mx-auto">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900">Ürün Düzenle</h1>
          <p className="text-xs text-gray-500 mt-0.5">Düzenlemek istediğiniz ürüne tıklayın</p>
        </div>

        <input
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ürün adı, barkod veya model kodu..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />

        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-12 text-gray-400 text-sm">Yükleniyor...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">Ürün bulunamadı</div>
          ) : products.map((p) => {
            const firstImage = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null
            const price = Number(p.product?.productCostDraft?.marketplaceSalePrice || p.trendyolSalePrice || 0)

            // Eksik bilgi tespiti
            const missingCount = [
              !p.productDescription,
              !Array.isArray(p.images) || p.images.length === 0,
              !p.shopCategoryId,
              !p.currentModelCode,
            ].filter(Boolean).length

            return (
              <div
                key={p.id}
                onClick={() => router.push(`/urun-duzenle/${p.id}`)}
                className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-3 cursor-pointer hover:border-blue-400 hover:shadow-sm transition-all"
              >
                {firstImage ? (
                  <img src={firstImage} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-2xl text-gray-300">🌸</div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-gray-900 line-clamp-2">{p.productName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{p.barcode} · {p.currentModelCode || <span className="text-red-400">Kod yok</span>}</p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {p.shopCategory && (
                      <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{p.shopCategory.name}</span>
                    )}
                    {missingCount > 0 && (
                      <span className="text-xs bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">⚠️ {missingCount} eksik</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-gray-900">{fmt(price)}</p>
                  <p className="text-xs text-gray-400">stok: {p.stockQuantity}</p>
                  <p className="text-xs text-blue-500 mt-1">Düzenle →</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AdminShell>
  )
}
