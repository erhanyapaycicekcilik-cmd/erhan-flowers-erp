'use client'

import { useEffect, useState } from 'react'
import { AdminShell } from '@/components/AdminShell'
import { api } from '@/lib/api'

export default function TopluAciklamaPage() {
  const [categories, setCategories] = useState<any[]>([])
  const [selectedCat, setSelectedCat] = useState('')
  const [template, setTemplate] = useState('')
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [done, setDone] = useState(0)

  const allCats: any[] = []
  categories.forEach((c) => {
    allCats.push(c)
    c.children?.forEach((ch: any) => allCats.push({ ...ch, _indent: true }))
  })

  useEffect(() => {
    api<any[]>('/shop-categories').then(d => setCategories(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  async function loadProducts() {
    if (!selectedCat) return
    setLoading(true)
    try {
      const data = await api<any[]>(`/product-center/variants?search=`)
      const filtered = (Array.isArray(data) ? data : []).filter((p: any) => String(p.shopCategoryId) === selectedCat)
      setProducts(filtered)
    } catch { setProducts([]) }
    finally { setLoading(false) }
  }

  async function applyAll() {
    if (!template.trim() || products.length === 0) return
    setApplying(true)
    setDone(0)
    for (const p of products) {
      try {
        await api(`/product-center/variants/${p.id}`, {
          method: 'PATCH',
          json: { productDescription: template },
        })
        setDone(d => d + 1)
      } catch { /* devam et */ }
    }
    setApplying(false)
  }

  return (
    <AdminShell>
      <div className="p-4 max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Toplu Açıklama Güncelle</h1>
        <p className="text-xs text-gray-500 mb-5">Seçili kategorideki tüm ürünlere aynı açıklama şablonunu uygular.</p>

        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Kategori</label>
            <div className="flex gap-2 mt-1">
              <select
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedCat}
                onChange={(e) => { setSelectedCat(e.target.value); setProducts([]); setDone(0) }}
              >
                <option value="">— Kategori Seçin —</option>
                {allCats.map((c) => (
                  <option key={c.id} value={c.id}>{c._indent ? `  └ ${c.name}` : c.name}</option>
                ))}
              </select>
              <button
                onClick={loadProducts}
                disabled={!selectedCat || loading}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
              >
                {loading ? '...' : 'Yükle'}
              </button>
            </div>
          </div>

          {products.length > 0 && (
            <p className="text-xs text-gray-500">{products.length} ürün bulundu — hepsine aynı açıklama uygulanacak.</p>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Açıklama Şablonu</label>
            <textarea
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={8}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              placeholder="Tüm ürünlere uygulanacak açıklama metni..."
            />
          </div>

          {done > 0 && (
            <p className="text-xs text-green-600 font-semibold">✓ {done} / {products.length} ürün güncellendi</p>
          )}

          <button
            onClick={applyAll}
            disabled={applying || !template.trim() || products.length === 0}
            className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {applying ? `Uygulanıyor... (${done}/${products.length})` : `${products.length} Ürüne Uygula`}
          </button>
        </div>
      </div>
    </AdminShell>
  )
}
