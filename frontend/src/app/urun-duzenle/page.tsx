'use client'

import { useEffect, useState, useRef } from 'react'
import { AdminShell } from '@/components/AdminShell'
import { api } from '@/lib/api'

function fmt(n: number) {
  return '₺' + new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(n)
}

export default function UrunDuzenlePage() {
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const searchTimeout = useRef<any>(null)

  // Tüm kategoriler düz liste
  const allCats: any[] = []
  categories.forEach((c) => {
    allCats.push(c)
    c.children?.forEach((ch: any) => allCats.push({ ...ch, _indent: true }))
  })

  async function loadCategories() {
    try {
      const data = await api<any[]>('/shop-categories')
      setCategories(Array.isArray(data) ? data : [])
    } catch { setCategories([]) }
  }

  async function loadProducts(q = '') {
    setLoading(true)
    try {
      const qs = q ? `?search=${encodeURIComponent(q)}` : ''
      const data = await api<any[]>(`/product-center/variants${qs}`)
      setProducts(Array.isArray(data) ? data : [])
    } catch { setProducts([]) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    loadCategories()
    loadProducts()
  }, [])

  function handleSearchChange(val: string) {
    setSearch(val)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => loadProducts(val), 400)
  }

  function selectProduct(p: any) {
    setSelected(p)
    setForm({
      productName: p.productName ?? '',
      productDescription: p.productDescription ?? '',
      images: Array.isArray(p.images) ? p.images.join('\n') : '',
      currentModelCode: p.currentModelCode ?? '',
      supplierStockCode: p.supplierStockCode ?? '',
      barcode: p.barcode ?? '',
      shopCategoryId: p.shopCategoryId ? String(p.shopCategoryId) : '',
    })
    setSaved(false)
  }

  async function save() {
    if (!selected || !form) return
    setSaving(true)
    try {
      const imagesArr = form.images
        .split('\n')
        .map((s: string) => s.trim())
        .filter(Boolean)

      await api(`/product-center/variants/${selected.id}`, {
        method: 'PATCH',
        json: {
          productName: form.productName,
          productDescription: form.productDescription,
          images: imagesArr,
          currentModelCode: form.currentModelCode,
          supplierStockCode: form.supplierStockCode,
          barcode: form.barcode,
          shopCategoryId: form.shopCategoryId ? Number(form.shopCategoryId) : null,
        },
      })
      setSaved(true)
      await loadProducts(search)
      // Seçili ürünü güncelle
      setSelected((prev: any) => ({ ...prev, ...form, images: form.images.split('\n').map((s: string) => s.trim()).filter(Boolean) }))
    } finally { setSaving(false) }
  }

  return (
    <AdminShell>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Ürün Düzenle</h1>
          <p className="text-sm text-gray-500 mt-1">Açıklama, görsel, model kodu ve kategori güncelleme</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Ürün listesi */}
          <div className="lg:col-span-2">
            <input
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ürün adı, barkod veya model kodu..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            <div className="space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
              {loading ? (
                <div className="text-center py-10 text-gray-400 text-sm">Yükleniyor...</div>
              ) : products.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">Ürün bulunamadı</div>
              ) : products.map((p) => {
                const firstImage = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null
                return (
                  <div
                    key={p.id}
                    onClick={() => selectProduct(p)}
                    className={`flex items-center gap-3 bg-white rounded-xl border p-3 cursor-pointer hover:shadow-sm transition-shadow ${
                      selected?.id === p.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'
                    }`}
                  >
                    {firstImage ? (
                      <img src={firstImage} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        <span className="text-gray-300 text-xl">🌸</span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-gray-900 line-clamp-2">{p.productName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{p.barcode} · {p.currentModelCode}</p>
                      {p.shopCategory && (
                        <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded mt-0.5 inline-block">{p.shopCategory.name}</span>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-gray-900">{fmt(Number(p.trendyolSalePrice))}</p>
                      <p className="text-xs text-gray-400">stok: {p.stockQuantity}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Düzenleme formu */}
          <div className="lg:col-span-3">
            {!selected ? (
              <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 h-64 flex items-center justify-center text-gray-400 text-sm">
                Sol taraftan bir ürün seçin
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-bold text-gray-900">{selected.productName}</h2>
                  {saved && <span className="text-xs text-green-600 font-semibold">✓ Kaydedildi</span>}
                </div>

                <div className="space-y-4">
                  {/* Ürün Adı */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ürün Adı</label>
                    <input
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.productName}
                      onChange={(e) => { setForm({ ...form, productName: e.target.value }); setSaved(false) }}
                    />
                  </div>

                  {/* Açıklama */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ürün Açıklaması</label>
                    <textarea
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={5}
                      value={form.productDescription}
                      onChange={(e) => { setForm({ ...form, productDescription: e.target.value }); setSaved(false) }}
                      placeholder="Ürün açıklaması..."
                    />
                  </div>

                  {/* Görsel URL'leri */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Görsel URL'leri <span className="text-gray-400 normal-case font-normal">(her satıra bir URL)</span>
                    </label>
                    <textarea
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={4}
                      value={form.images}
                      onChange={(e) => { setForm({ ...form, images: e.target.value }); setSaved(false) }}
                      placeholder="https://cdn.example.com/resim1.jpg&#10;https://cdn.example.com/resim2.jpg"
                    />
                    {/* Önizleme */}
                    {form.images.split('\n').filter((s: string) => s.trim().startsWith('http')).length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {form.images.split('\n').filter((s: string) => s.trim().startsWith('http')).slice(0, 6).map((url: string, i: number) => (
                          <img key={i} src={url.trim()} alt="" className="w-16 h-16 rounded-lg object-cover border border-gray-200" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Kodlar */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Model Kodu</label>
                      <input
                        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={form.currentModelCode}
                        onChange={(e) => { setForm({ ...form, currentModelCode: e.target.value }); setSaved(false) }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Stok Kodu</label>
                      <input
                        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={form.supplierStockCode}
                        onChange={(e) => { setForm({ ...form, supplierStockCode: e.target.value }); setSaved(false) }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Barkod</label>
                      <input
                        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={form.barcode}
                        onChange={(e) => { setForm({ ...form, barcode: e.target.value }); setSaved(false) }}
                      />
                    </div>
                  </div>

                  {/* Kategori */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Kategori</label>
                    <select
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.shopCategoryId}
                      onChange={(e) => { setForm({ ...form, shopCategoryId: e.target.value }); setSaved(false) }}
                    >
                      <option value="">— Kategori Seçin —</option>
                      {allCats.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c._indent ? `  └ ${c.name}` : c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                  {/* Fiziksel Özellikler — maliyet bölümünden okunur, buradan düzenlenemez */}
                  {selected.product && (selected.product.potSize || selected.product.leafCount != null || selected.product.branchCount != null) && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Fiziksel Özellikler <span className="normal-case font-normal text-gray-400">(Maliyet bölümünden güncellenir)</span>
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'Saksı Boyu', val: selected.product.potSize },
                          { label: 'Saksı Türü', val: selected.product.potType },
                          { label: 'Yükseklik', val: selected.product.productHeight },
                          { label: 'Yaprak Sayısı', val: selected.product.leafCount },
                          { label: 'Dal Sayısı', val: selected.product.branchCount },
                          { label: 'Daldaki Yaprak', val: selected.product.leavesPerBranch },
                        ].filter(f => f.val != null && f.val !== '').map(({ label, val }) => (
                          <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
                            <p className="text-xs text-gray-400">{label}</p>
                            <p className="text-sm font-medium text-gray-700">{String(val)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                <button
                  onClick={save}
                  disabled={saving}
                  className="mt-5 w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>

                <p className="text-xs text-gray-400 mt-2 text-center">
                  Kaydedince fiyat/stok tüm platformlara (Trendyol, N11, HB) ve siteye otomatik iletilir. Trendyol görseli/adı değişikliği Seller Panel onayı gerektirebilir.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
