'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AdminShell } from '@/components/AdminShell'
import { api, apiFileUrl } from '@/lib/api'

function fmt(n: number) {
  return '₺' + new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(n)
}

export default function UrunDetayPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [product, setProduct] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [form, setForm] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [physOpen, setPhysOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loadingSugg, setLoadingSugg] = useState(false)
  const [nextCode, setNextCode] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const allCats: any[] = []
  categories.forEach((c) => {
    allCats.push(c)
    c.children?.forEach((ch: any) => allCats.push({ ...ch, _indent: true }))
  })

  useEffect(() => {
    api<any[]>('/shop-categories').then(d => setCategories(Array.isArray(d) ? d : [])).catch(() => {})
    api<any>(`/product-center/variants/${id}`).then(v => {
      setProduct(v)
      setForm(buildForm(v))
    }).catch(() => router.replace('/urun-duzenle'))
  }, [id])

  function buildForm(p: any) {
    const prod = p.product ?? {}
    const physLines: string[] = []
    if (prod.productHeight) physLines.push(`Yükseklik: ${prod.productHeight}`)
    if (prod.potSize) physLines.push(`Saksı Boyu: ${prod.potSize}`)
    if (prod.potType) physLines.push(`Saksı Türü: ${prod.potType}`)
    if (prod.branchCount != null && prod.branchCount !== '') physLines.push(`Dal Sayısı: ${prod.branchCount}`)
    if (prod.leafCount != null && prod.leafCount !== '') physLines.push(`Yaprak Sayısı: ${prod.leafCount}`)
    if (prod.leavesPerBranch != null && prod.leavesPerBranch !== '') physLines.push(`Daldaki Yaprak: ${prod.leavesPerBranch}`)
    return {
      productName: p.productName ?? '',
      productDescription: p.productDescription || physLines.join('\n'),
      images: Array.isArray(p.images) ? p.images.join('\n') : '',
      shopCategoryId: p.shopCategoryId ? String(p.shopCategoryId) : '',
      potSize: prod.potSize ?? '', potType: prod.potType ?? '',
      productHeight: prod.productHeight ?? '', leafCount: prod.leafCount ?? '',
      stemCount: prod.stemCount ?? '', branchCount: prod.branchCount ?? '',
      leavesPerBranch: prod.leavesPerBranch ?? '',
    }
  }

  async function uploadImage(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api<any>('/media/upload', { method: 'POST', body: fd })
      const url = res.cleanBackground?.filePath ? apiFileUrl(res.cleanBackground.filePath) : apiFileUrl(res.filePath)
      setForm((f: any) => {
        const existing = (f.images || '').trim()
        return { ...f, images: existing ? existing + '\n' + url : url }
      })
      setSaved(false)
    } finally { setUploading(false) }
  }

  async function fetchSuggestions() {
    if (!form || !product) return
    setLoadingSugg(true)
    setSuggestions([])
    try {
      const catName = product.shopCategory?.parent
        ? `${product.shopCategory.parent.name} > ${product.shopCategory.name}`
        : (product.shopCategory?.name ?? '')
      const res = await api<{ suggestions: string[] }>('/product-center/suggest-name', {
        method: 'POST',
        json: { current: form.productName, description: form.productDescription, category: catName },
      })
      setSuggestions(res.suggestions ?? [])
    } finally { setLoadingSugg(false) }
  }

  async function save() {
    if (!product || !form) return
    setSaving(true)
    try {
      const imagesArr = form.images.split('\n').map((s: string) => s.trim()).filter(Boolean)
      await api(`/product-center/variants/${product.id}`, {
        method: 'PATCH',
        json: {
          productName: form.productName,
          productDescription: form.productDescription,
          images: imagesArr,
          shopCategoryId: form.shopCategoryId ? Number(form.shopCategoryId) : null,
          potSize: form.potSize || null, potType: form.potType || null,
          productHeight: form.productHeight || null,
          leafCount: form.leafCount !== '' ? Number(form.leafCount) : null,
          stemCount: form.stemCount !== '' ? Number(form.stemCount) : null,
          branchCount: form.branchCount !== '' ? Number(form.branchCount) : null,
          leavesPerBranch: form.leavesPerBranch !== '' ? Number(form.leavesPerBranch) : null,
        },
      })
      setSaved(true)
      // Refresh product data
      const updated = await api<any>(`/product-center/variants/${product.id}`)
      setProduct(updated)
    } finally { setSaving(false) }
  }

  // Drag & drop görsel sıralama
  function moveImage(from: number, to: number) {
    const lines = form.images.split('\n').filter((s: string) => s.trim())
    const [item] = lines.splice(from, 1)
    lines.splice(to, 0, item)
    setForm({ ...form, images: lines.join('\n') })
    setSaved(false)
  }

  const imageList = form ? form.images.split('\n').filter((s: string) => s.trim()) : []

  // Eksik bilgi kontrolleri
  const missing: string[] = []
  if (product) {
    if (!form?.productDescription?.trim()) missing.push('Açıklama eksik')
    if (imageList.length === 0) missing.push('Görsel yok')
    if (!form?.shopCategoryId) missing.push('Kategori seçilmemiş')
    if (!product.currentModelCode) missing.push('Model kodu yok')
  }

  if (!product || !form) {
    return <AdminShell><div className="p-8 text-center text-gray-400">Yükleniyor...</div></AdminShell>
  }

  const price = Number(product.product?.productCostDraft?.marketplaceSalePrice || product.trendyolSalePrice || 0)

  return (
    <AdminShell>
      <div className="p-4 max-w-3xl mx-auto">
        {/* Geri + başlık */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700 text-lg">←</button>
          <div className="min-w-0 flex-1">
            <h1 className="font-bold text-gray-900 text-base truncate">{product.productName}</h1>
            <p className="text-xs text-gray-400">{product.barcode} · {product.currentModelCode}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-bold text-gray-900">{fmt(price)}</p>
            <p className="text-xs text-gray-400">stok: {product.stockQuantity}</p>
          </div>
        </div>

        {/* Eksik bilgi uyarıları */}
        {missing.length > 0 && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-amber-700 mb-1">⚠️ Eksik bilgiler</p>
            <ul className="text-xs text-amber-600 space-y-0.5">
              {missing.map(m => <li key={m}>• {m}</li>)}
            </ul>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">

          {/* Ürün Adı + SEO önerisi */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ürün Adı</label>
              <button
                type="button"
                onClick={fetchSuggestions}
                disabled={loadingSugg}
                className="text-xs text-purple-600 font-medium hover:underline disabled:opacity-50"
              >
                {loadingSugg ? 'Öneriliyor...' : '✨ SEO Öneri'}
              </button>
            </div>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.productName}
              onChange={(e) => { setForm({ ...form, productName: e.target.value }); setSaved(false); setSuggestions([]) }}
            />
            {suggestions.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-400">Önerilen adlar — tıklayınca seç:</p>
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { setForm({ ...form, productName: s }); setSuggestions([]); setSaved(false) }}
                    className="block w-full text-left text-sm bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg px-3 py-2"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Açıklama */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ürün Açıklaması</label>
            <textarea
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={6}
              value={form.productDescription}
              onChange={(e) => { setForm({ ...form, productDescription: e.target.value }); setSaved(false) }}
              placeholder="Ürün açıklaması..."
            />
          </div>

          {/* Görseller */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Görseller</label>
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-blue-600 font-medium hover:underline disabled:opacity-50"
              >
                {uploading ? 'Yükleniyor...' : '+ Görsel Yükle'}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                onChange={async (e) => {
                  for (const f of Array.from(e.target.files ?? [])) await uploadImage(f)
                  e.target.value = ''
                }}
              />
            </div>
            {/* Drag & drop sıralama */}
            {imageList.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-2">
                {imageList.map((url: string, i: number) => (
                  <div
                    key={i}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', String(i))}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(i) }}
                    onDrop={(e) => { e.preventDefault(); moveImage(Number(e.dataTransfer.getData('text/plain')), i); setDragOver(null) }}
                    onDragLeave={() => setDragOver(null)}
                    className={`relative group cursor-grab active:cursor-grabbing transition-opacity ${dragOver === i ? 'opacity-50' : ''}`}
                  >
                    {i === 0 && <span className="absolute top-0 left-0 bg-blue-500 text-white text-[10px] px-1 rounded-br-lg z-10">Kapak</span>}
                    <img src={url} alt="" className="w-20 h-20 rounded-lg object-cover border border-gray-200"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    <button
                      type="button"
                      onClick={() => { setForm({ ...form, images: imageList.filter((_: string, j: number) => j !== i).join('\n') }); setSaved(false) }}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs hidden group-hover:flex items-center justify-center"
                    >×</button>
                  </div>
                ))}
              </div>
            )}
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-400"
              rows={2}
              value={form.images}
              onChange={(e) => { setForm({ ...form, images: e.target.value }); setSaved(false) }}
              placeholder="URL'leri buraya da yapıştırabilirsiniz (her satıra bir URL)"
            />
          </div>

          {/* Kategori + model kodu önizleme */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Kategori</label>
            <select
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.shopCategoryId}
              onChange={async (e) => {
                setForm({ ...form, shopCategoryId: e.target.value }); setSaved(false)
                setNextCode(null)
                if (e.target.value) {
                  try {
                    const res = await api<{ modelCode: string }>(`/product-center/next-model-code?shopCategoryId=${e.target.value}`)
                    setNextCode(res.modelCode)
                  } catch { /* ignore */ }
                }
              }}
            >
              <option value="">— Kategori Seçin —</option>
              {allCats.map((c) => (
                <option key={c.id} value={c.id}>{c._indent ? `  └ ${c.name}` : c.name}</option>
              ))}
            </select>
            {nextCode && (
              <p className="mt-1 text-xs text-blue-600">
                Bu kategoride sonraki model kodu: <strong>{nextCode}</strong>
                <span className="text-gray-400"> (kayıtta atanır)</span>
              </p>
            )}
          </div>

          {/* Kodlar — salt okunur */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Model Kodu', val: product.currentModelCode },
              { label: 'Stok Kodu', val: product.supplierStockCode },
              { label: 'Barkod', val: product.barcode },
            ].map(({ label, val }) => (
              <div key={label}>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</label>
                <div className="mt-1 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-sm text-gray-500 select-all break-all">
                  {val || <span className="text-gray-300">—</span>}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
            ⚠️ Barkod, model ve stok kodu Trendyol kuralları gereği değiştirilemez.
          </p>

          {/* Fiziksel Özellikler */}
          <div>
            <button type="button" onClick={() => setPhysOpen(o => !o)}
              className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700">
              <span>{physOpen ? '▾' : '▸'}</span> Fiziksel Özellikler
            </button>
            {physOpen && (
              <div className="mt-2">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'potSize', label: 'Saksı Boyu', placeholder: 'örn. 14cm' },
                    { key: 'potType', label: 'Saksı Türü', placeholder: 'örn. Plastik' },
                    { key: 'productHeight', label: 'Yükseklik', placeholder: 'örn. 40cm' },
                    { key: 'leafCount', label: 'Yaprak Sayısı', type: 'number' },
                    { key: 'branchCount', label: 'Gövde / Dal Sayısı', type: 'number' },
                    { key: 'leavesPerBranch', label: 'Daldaki Yaprak', type: 'number' },
                  ].map(({ key, label, placeholder, type }) => (
                    <div key={key}>
                      <label className="text-xs text-gray-400">{label}</label>
                      <input
                        type={type || 'text'}
                        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={(form as any)[key]}
                        onChange={(e) => { setForm({ ...form, [key]: e.target.value }); setSaved(false) }}
                        placeholder={placeholder || '0'}
                      />
                    </div>
                  ))}
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
                    if (!lines.length) return
                    setForm({ ...form, productDescription: (form.productDescription || '').trimEnd() + '\n' + lines.join('\n') })
                    setSaved(false)
                  }}
                  className="mt-3 w-full border border-blue-300 text-blue-600 rounded-lg py-2 text-sm font-medium hover:bg-blue-50"
                >↑ Açıklamaya Ekle</button>
              </div>
            )}
          </div>

          {/* Kaydet */}
          <button
            onClick={save}
            disabled={saving}
            className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Kaydediliyor...' : saved ? '✓ Kaydedildi' : 'Kaydet'}
          </button>
          <p className="text-xs text-gray-400 text-center">
            Kaydedince ürün adı, açıklama ve görseller Trendyol, N11, HB ve siteye otomatik iletilir.
          </p>
        </div>
      </div>
    </AdminShell>
  )
}
