'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getImageUrl } from '@/lib/api/catalog'
import { formatPrice } from '@/lib/utils/format'
import { updateGroup, deleteGroup, addVariant, updateVariant, deleteVariant, searchProducts } from '../actions'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8101'

const CATEGORIES = [
  'Yapay Ağaç', 'Yapay Çiçek', 'Bambu', 'Sarmaşık', 'Bodur Ağaç',
  'Dikey Bahçe', 'Saksı & Vazo', 'Kaktüs & Sukulent', 'Orkide', 'Palmiye', 'Ficus', 'Lavanta',
]

const SIZE_PRESETS = ['60 CM', '90 CM', '120 CM', '150 CM', '180 CM', '210 CM', '240 CM']
const POT_PRESETS = ['Antrasit Küre Saksı', 'Beyaz Silindir Saksı', 'Siyah Kare Saksı', 'Gri Yuvarlak Saksı', 'Naturel Ahşap Saksı', 'Saksısız']

type Variant = {
  id: number; sizeLabel: string | null; potLabel: string | null
  productId: number | null; trendyolVariantId: number | null
  priceOverride: number | null; isActive: boolean; sortOrder: number
}
type Group = {
  id: number; name: string; slug: string; description: string | null
  mainImage: string | null; category: string | null; subCategory: string | null
  isActive: boolean; variants: Variant[]
}
type SearchResult = { type: 'product' | 'variant'; id: number; name: string; modelCode: string | null; price: number; image: string | null }

export default function GroupEditPage() {
  const params = useParams()
  const router = useRouter()
  const id = Number(params.id)

  const [group, setGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // Yeni varyant form
  const [sizeLabel, setSizeLabel] = useState('')
  const [customSize, setCustomSize] = useState('')
  const [potLabel, setPotLabel] = useState('')
  const [customPot, setCustomPot] = useState('')
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [selectedProduct, setSelectedProduct] = useState<SearchResult | null>(null)
  const [priceOverride, setPriceOverride] = useState('')
  const [addingVariant, setAddingVariant] = useState(false)

  const load = useCallback(async () => {
    try {
      const secret = 'dev-secret-local' // gerçek ortamda env'den gelecek
      const r = await fetch(`${API_URL}/public/catalog/groups/admin/${id}?secret=${secret}`, { cache: 'no-store' })
      if (r.ok) setGroup(await r.json())
    } finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleSaveGroup(field: Partial<Group>) {
    if (!group) return
    setSaving(true)
    await updateGroup(id, field as any)
    setSaving(false)
    setMsg('Kaydedildi ✓')
    setTimeout(() => setMsg(''), 2000)
    setGroup({ ...group, ...field })
  }

  async function handleSearch(q: string) {
    setSearchQ(q)
    if (q.length < 2) { setSearchResults([]); return }
    const res = await searchProducts(q)
    setSearchResults([...res.products, ...res.variants])
  }

  async function handleAddVariant() {
    const size = sizeLabel === '__custom' ? customSize : sizeLabel
    const pot = potLabel === '__custom' ? customPot : potLabel
    if (!size && !pot) { setMsg('Boy veya saksı seçin'); return }
    setAddingVariant(true)
    const res = await addVariant(id, {
      sizeLabel: size || null,
      potLabel: pot || null,
      productId: selectedProduct?.type === 'product' ? selectedProduct.id : null,
      trendyolVariantId: selectedProduct?.type === 'variant' ? selectedProduct.id : null,
      priceOverride: priceOverride ? Number(priceOverride) : null,
    })
    setAddingVariant(false)
    if (res.error) { setMsg(res.error); return }
    setSizeLabel(''); setCustomSize(''); setPotLabel(''); setCustomPot('')
    setSearchQ(''); setSearchResults([]); setSelectedProduct(null); setPriceOverride('')
    await load()
    setMsg('Varyant eklendi ✓')
    setTimeout(() => setMsg(''), 2000)
  }

  async function handleDeleteVariant(variantId: number) {
    if (!confirm('Bu varyantı sil?')) return
    await deleteVariant(variantId)
    await load()
  }

  async function handleDeleteGroup() {
    if (!confirm(`"${group?.name}" grubunu ve tüm varyantlarını sil?`)) return
    await deleteGroup(id)
    router.push('/admin/gruplar')
  }

  if (loading) return <div className="max-w-screen-xl mx-auto px-6 py-8 text-[#8C8A82]">Yükleniyor…</div>
  if (!group) return <div className="max-w-screen-xl mx-auto px-6 py-8 text-red-500">Grup bulunamadı</div>

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/gruplar" className="text-[#8C8A82] hover:text-[#0D1510] text-sm">← Gruplar</Link>
          <h1 className="font-display text-2xl font-light text-[#0D1510]">{group.name}</h1>
          {!group.isActive && <span className="text-xs px-2 py-0.5 bg-[#F4F2EC] text-[#8C8A82] rounded-full">Pasif</span>}
        </div>
        <div className="flex gap-2">
          <Link href={`/urun-grubu/${group.slug}`} target="_blank"
            className="text-xs px-3 py-2 bg-[#F4F2EC] text-[#5C5C52] rounded-lg hover:bg-[#E0DDD4]">
            Sitede Gör ↗
          </Link>
          <button onClick={handleDeleteGroup}
            className="text-xs px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">
            Grubu Sil
          </button>
        </div>
      </div>

      {msg && <div className="bg-[#5C7A62]/10 border border-[#5C7A62]/30 text-[#5C7A62] rounded-xl px-4 py-2.5 text-sm">{msg}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol: Grup bilgileri */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl border border-[#E0DDD4] p-5 space-y-4">
            <h2 className="font-semibold text-[#0D1510] text-sm uppercase tracking-wider">Grup Bilgileri</h2>

            <div>
              <label className="block text-xs text-[#8C8A82] mb-1">Grup Adı</label>
              <input defaultValue={group.name}
                onBlur={e => handleSaveGroup({ name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#E0DDD4] text-sm focus:outline-none focus:ring-2 focus:ring-[#5C7A62]" />
            </div>

            <div>
              <label className="block text-xs text-[#8C8A82] mb-1">Kategori</label>
              <select defaultValue={group.category ?? ''}
                onChange={e => handleSaveGroup({ category: e.target.value || null })}
                className="w-full px-3 py-2 rounded-lg border border-[#E0DDD4] text-sm focus:outline-none focus:ring-2 focus:ring-[#5C7A62] bg-white">
                <option value="">— seç —</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-[#8C8A82] mb-1">Açıklama</label>
              <textarea defaultValue={group.description ?? ''}
                onBlur={e => handleSaveGroup({ description: e.target.value || null })}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-[#E0DDD4] text-sm focus:outline-none focus:ring-2 focus:ring-[#5C7A62] resize-none" />
            </div>

            <div>
              <label className="block text-xs text-[#8C8A82] mb-1">Video URL (YouTube / TikTok / MP4)</label>
              <input defaultValue={(group as any).videoUrl ?? ''}
                onBlur={e => handleSaveGroup({ videoUrl: e.target.value || null } as any)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full px-3 py-2 rounded-lg border border-[#E0DDD4] text-sm focus:outline-none focus:ring-2 focus:ring-[#5C7A62]" />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-sm text-[#5C5C52]">Aktif</span>
              <button onClick={() => handleSaveGroup({ isActive: !group.isActive })}
                className={`w-11 h-6 rounded-full transition-colors ${group.isActive ? 'bg-[#5C7A62]' : 'bg-[#E0DDD4]'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${group.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="pt-1 border-t border-[#F4F2EC]">
              <p className="text-xs text-[#C4C0B8]">URL: /urun-grubu/{group.slug}</p>
            </div>
          </div>
        </div>

        {/* Sağ: Varyantlar */}
        <div className="lg:col-span-2 space-y-4">
          {/* Mevcut varyantlar */}
          <div className="bg-white rounded-2xl border border-[#E0DDD4] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#F4F2EC] flex items-center justify-between">
              <h2 className="font-semibold text-[#0D1510] text-sm uppercase tracking-wider">Varyantlar</h2>
              <span className="text-xs text-[#8C8A82]">{group.variants.length} adet</span>
            </div>

            {group.variants.length === 0 ? (
              <div className="p-8 text-center text-[#8C8A82] text-sm">
                Henüz varyant yok. Aşağıdan ekleyin.
              </div>
            ) : (
              <div className="divide-y divide-[#F4F2EC]">
                {group.variants.map(v => (
                  <div key={v.id} className={`px-5 py-3 flex items-center justify-between gap-3 ${!v.isActive ? 'opacity-50' : ''}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {v.sizeLabel && (
                          <span className="text-xs px-2 py-0.5 bg-[#E8F0EA] text-[#5C7A62] rounded-full font-medium">{v.sizeLabel}</span>
                        )}
                        {v.potLabel && (
                          <span className="text-xs px-2 py-0.5 bg-[#F4F2EC] text-[#5C5C52] rounded-full">{v.potLabel}</span>
                        )}
                        {v.priceOverride && (
                          <span className="text-xs font-semibold text-[#0D1510]">{formatPrice(Number(v.priceOverride))}</span>
                        )}
                      </div>
                      <p className="text-xs text-[#C4C0B8] mt-0.5">
                        {v.productId ? `Product #${v.productId}` : v.trendyolVariantId ? `Trendyol Varyant #${v.trendyolVariantId}` : 'Ürün bağlı değil'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateVariant(v.id, { isActive: !v.isActive }).then(load)}
                        className="text-xs px-2 py-1 rounded-lg bg-[#F4F2EC] text-[#5C5C52] hover:bg-[#E0DDD4]">
                        {v.isActive ? 'Gizle' : 'Göster'}
                      </button>
                      <button onClick={() => handleDeleteVariant(v.id)}
                        className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-500 hover:bg-red-100">
                        Sil
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Yeni varyant ekle */}
          <div className="bg-white rounded-2xl border border-[#5C7A62]/30 p-5 space-y-4">
            <h2 className="font-semibold text-[#0D1510] text-sm uppercase tracking-wider">+ Yeni Varyant Ekle</h2>

            <div className="grid grid-cols-2 gap-4">
              {/* Boy */}
              <div>
                <label className="block text-xs text-[#8C8A82] mb-1.5">Boy</label>
                <select value={sizeLabel} onChange={e => setSizeLabel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E0DDD4] text-sm focus:outline-none focus:ring-2 focus:ring-[#5C7A62] bg-white">
                  <option value="">— yok —</option>
                  {SIZE_PRESETS.map(s => <option key={s} value={s}>{s}</option>)}
                  <option value="__custom">Özel gir…</option>
                </select>
                {sizeLabel === '__custom' && (
                  <input value={customSize} onChange={e => setCustomSize(e.target.value)}
                    placeholder="örn: 200 CM"
                    className="mt-1.5 w-full px-3 py-2 rounded-lg border border-[#E0DDD4] text-sm focus:outline-none focus:ring-2 focus:ring-[#5C7A62]" />
                )}
              </div>

              {/* Saksı */}
              <div>
                <label className="block text-xs text-[#8C8A82] mb-1.5">Saksı</label>
                <select value={potLabel} onChange={e => setPotLabel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E0DDD4] text-sm focus:outline-none focus:ring-2 focus:ring-[#5C7A62] bg-white">
                  <option value="">— yok —</option>
                  {POT_PRESETS.map(p => <option key={p} value={p}>{p}</option>)}
                  <option value="__custom">Özel gir…</option>
                </select>
                {potLabel === '__custom' && (
                  <input value={customPot} onChange={e => setCustomPot(e.target.value)}
                    placeholder="örn: Hasır Saksı"
                    className="mt-1.5 w-full px-3 py-2 rounded-lg border border-[#E0DDD4] text-sm focus:outline-none focus:ring-2 focus:ring-[#5C7A62]" />
                )}
              </div>
            </div>

            {/* Ürün ara */}
            <div>
              <label className="block text-xs text-[#8C8A82] mb-1.5">Bağlı Ürün (opsiyonel — fiyat ve görseli buradan alır)</label>
              <input value={selectedProduct ? selectedProduct.name : searchQ}
                onChange={e => { setSelectedProduct(null); handleSearch(e.target.value) }}
                placeholder="Ürün adı veya model kodu ara…"
                className="w-full px-3 py-2 rounded-lg border border-[#E0DDD4] text-sm focus:outline-none focus:ring-2 focus:ring-[#5C7A62]" />
              {searchResults.length > 0 && !selectedProduct && (
                <div className="mt-1 border border-[#E0DDD4] rounded-xl overflow-hidden max-h-48 overflow-y-auto shadow-lg">
                  {searchResults.map(r => (
                    <button key={`${r.type}-${r.id}`}
                      onClick={() => { setSelectedProduct(r); setSearchResults([]); if (!priceOverride) setPriceOverride(String(r.price)) }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#F4F2EC] text-left text-sm border-b border-[#F4F2EC] last:border-0">
                      {r.image && (
                        <div className="w-8 h-8 relative rounded overflow-hidden flex-shrink-0 bg-[#F4F2EC]">
                          <Image src={getImageUrl(r.image)} alt="" fill className="object-cover" sizes="32px" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium text-[#0D1510]">{r.name}</p>
                        <p className="text-xs text-[#8C8A82]">{r.modelCode} · {formatPrice(r.price)}</p>
                      </div>
                      <span className="text-xs px-1.5 py-0.5 bg-[#F4F2EC] rounded text-[#8C8A82]">
                        {r.type === 'product' ? 'ERP' : 'Trendyol'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {selectedProduct && (
                <div className="mt-1.5 flex items-center gap-2 px-3 py-2 bg-[#5C7A62]/10 rounded-lg text-sm">
                  <span className="flex-1 text-[#0D1510] truncate">{selectedProduct.name}</span>
                  <button onClick={() => { setSelectedProduct(null); setSearchQ('') }} className="text-[#8C8A82] hover:text-red-500 text-xs">✕</button>
                </div>
              )}
            </div>

            {/* Fiyat override */}
            <div>
              <label className="block text-xs text-[#8C8A82] mb-1.5">Fiyat (boş bırakırsanız bağlı üründen alınır)</label>
              <input type="number" value={priceOverride} onChange={e => setPriceOverride(e.target.value)}
                placeholder="örn: 1250"
                className="w-full px-3 py-2 rounded-lg border border-[#E0DDD4] text-sm focus:outline-none focus:ring-2 focus:ring-[#5C7A62]" />
            </div>

            <button onClick={handleAddVariant} disabled={addingVariant || (!sizeLabel && !potLabel)}
              className="w-full py-3 bg-[#5C7A62] text-white rounded-xl font-semibold text-sm disabled:opacity-50 hover:bg-[#4a6350]">
              {addingVariant ? 'Ekleniyor…' : '+ Varyant Ekle'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
