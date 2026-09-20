'use client'

import { useEffect, useState, useRef } from 'react'
import { AdminShell } from '@/components/AdminShell'
import { api, apiFileUrl, apiBaseUrl } from '@/lib/api'

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
  const [physOpen, setPhysOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const searchTimeout = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function uploadImage(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api<any>('/media/upload', { method: 'POST', body: fd })
      const url = res.cleanBackground?.filePath
        ? apiFileUrl(res.cleanBackground.filePath)
        : apiFileUrl(res.filePath)
      setForm((f: any) => {
        const existing = (f.images || '').trim()
        return { ...f, images: existing ? existing + '\n' + url : url }
      })
      setSaved(false)
    } finally { setUploading(false) }
  }

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
      potSize: p.product?.potSize ?? '',
      potType: p.product?.potType ?? '',
      productHeight: p.product?.productHeight ?? '',
      leafCount: p.product?.leafCount ?? '',
      stemCount: p.product?.stemCount ?? '',
      branchCount: p.product?.branchCount ?? '',
      leavesPerBranch: p.product?.leavesPerBranch ?? '',
    })
    setPhysOpen(false)
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
          shopCategoryId: form.shopCategoryId ? Number(form.shopCategoryId) : null,
          potSize: form.potSize || null,
          potType: form.potType || null,
          productHeight: form.productHeight || null,
          leafCount: form.leafCount !== '' ? Number(form.leafCount) : null,
          stemCount: form.stemCount !== '' ? Number(form.stemCount) : null,
          branchCount: form.branchCount !== '' ? Number(form.branchCount) : null,
          leavesPerBranch: form.leavesPerBranch !== '' ? Number(form.leavesPerBranch) : null,
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
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Görseller
                      </label>
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs text-blue-600 font-medium hover:underline disabled:opacity-50"
                      >
                        {uploading ? 'Yükleniyor...' : '+ Görsel Yükle'}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={async (e) => {
                          const files = Array.from(e.target.files ?? [])
                          for (const f of files) await uploadImage(f)
                          e.target.value = ''
                        }}
                      />
                    </div>
                    {/* Önizleme + sıralama */}
                    {form.images.split('\n').filter((s: string) => s.trim()).length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {form.images.split('\n').filter((s: string) => s.trim()).map((url: string, i: number, arr: string[]) => (
                          <div key={i} className="relative group">
                            <img
                              src={url.trim()}
                              alt=""
                              className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const lines = arr.filter((_, j) => j !== i)
                                setForm({ ...form, images: lines.join('\n') }); setSaved(false)
                              }}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs leading-none hidden group-hover:flex items-center justify-center"
                            >×</button>
                          </div>
                        ))}
                      </div>
                    )}
                    <textarea
                      className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={3}
                      value={form.images}
                      onChange={(e) => { setForm({ ...form, images: e.target.value }); setSaved(false) }}
                      placeholder="https://cdn.example.com/resim1.jpg&#10;https://cdn.example.com/resim2.jpg"
                    />
                  </div>

                  {/* Kodlar — salt okunur (Trendyol kuralları gereği değiştirilemez) */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Model Kodu', val: selected.currentModelCode },
                      { label: 'Stok Kodu', val: selected.supplierStockCode },
                      { label: 'Barkod', val: selected.barcode },
                    ].map(({ label, val }) => (
                      <div key={label}>
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</label>
                        <div className="mt-1 w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-sm text-gray-500 select-all break-all">
                          {val || <span className="text-gray-300">—</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                    ⚠️ Barkod, model kodu ve stok kodu Trendyol kuralları gereği değiştirilemez. Değiştirilirse ürün kilitlenebilir.
                  </p>

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

                  {/* Fiziksel Özellikler — düzenlenebilir, varsayılan kapalı */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setPhysOpen(o => !o)}
                      className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
                    >
                      <span>{physOpen ? '▾' : '▸'}</span>
                      Fiziksel Özellikler
                    </button>
                    {physOpen && (
                      <div className="mt-2">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-400">Saksı Boyu</label>
                            <input className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.potSize} onChange={(e) => { setForm({ ...form, potSize: e.target.value }); setSaved(false) }} placeholder="örn. 14cm" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400">Saksı Türü</label>
                            <input className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.potType} onChange={(e) => { setForm({ ...form, potType: e.target.value }); setSaved(false) }} placeholder="örn. Plastik" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400">Yükseklik</label>
                            <input className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.productHeight} onChange={(e) => { setForm({ ...form, productHeight: e.target.value }); setSaved(false) }} placeholder="örn. 40cm" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400">Yaprak Sayısı</label>
                            <input type="number" className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.leafCount} onChange={(e) => { setForm({ ...form, leafCount: e.target.value }); setSaved(false) }} placeholder="0" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400">Gövde / Dal Sayısı</label>
                            <input type="number" className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.branchCount} onChange={(e) => { setForm({ ...form, branchCount: e.target.value }); setSaved(false) }} placeholder="0" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400">Daldaki Yaprak</label>
                            <input type="number" className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.leavesPerBranch} onChange={(e) => { setForm({ ...form, leavesPerBranch: e.target.value }); setSaved(false) }} placeholder="0" />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const lines: string[] = []
                            if (form.productHeight) lines.push(`Yükseklik: ${form.productHeight}`)
                            if (form.potSize) lines.push(`Saksı Boyu: ${form.potSize}`)
                            if (form.potType) lines.push(`Saksı Türü: ${form.potType}`)
                            if (form.branchCount !== '') lines.push(`Dal Sayısı: ${form.branchCount}`)
                            if (form.leafCount !== '') lines.push(`Yaprak Sayısı: ${form.leafCount}`)
                            if (form.leavesPerBranch !== '') lines.push(`Daldaki Yaprak: ${form.leavesPerBranch}`)
                            if (lines.length === 0) return
                            const block = '\n' + lines.join('\n')
                            setForm({ ...form, productDescription: (form.productDescription || '').trimEnd() + block })
                            setSaved(false)
                          }}
                          className="mt-3 w-full border border-blue-300 text-blue-600 rounded-lg py-2 text-sm font-medium hover:bg-blue-50"
                        >
                          ↑ Açıklamaya Ekle
                        </button>
                      </div>
                    )}
                  </div>

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
