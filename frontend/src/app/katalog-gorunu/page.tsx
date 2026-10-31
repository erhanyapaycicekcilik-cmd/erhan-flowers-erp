'use client'

import { useEffect, useState, useMemo } from 'react'
import { AdminShell } from '@/components/AdminShell'
import { api } from '@/lib/api'

const CATS: Record<string, { label: string; subs: string[] }> = {
  Agaclar:        { label: 'Ağaçlar',                   subs: ['Yeşil Ağaçlar', 'Hazır Ağaçlar', 'Renkli Ağaçlar', 'Bambu Ağaçlar', 'Palmiye ve Areka Ağaçlar', 'Saksısız Ağaçlar'] },
  Bambu:          { label: 'Bambu',                     subs: ['Tekli Bambu', 'Plastik Separatör', 'MDF Separatör', 'Fiber Separatör'] },
  YapayKursekler: { label: 'Yapay Çiçekler',            subs: ['Renkli Çiçekler', 'Yeşil Çiçekler'] },
  Buketler:       { label: 'Buketler',                  subs: [] },
  DikeyBahce:     { label: 'Dikey Bahçeler',            subs: ['Paneller', 'Kapı Önü Dekorlar', 'Tavan Dekorları'] },
  Sarmasiklar:    { label: 'Sarmaşıklar',               subs: ['Yeşil Sarmaşıklar', 'Renkli Sarmaşıklar'] },
  BonsaiZeytin:   { label: 'Bonsai ve Zeytin Ağaçları', subs: ['Bonsai', 'Zeytin Ağacı'] },
  SaksiAranjman:  { label: 'Saksı Aranjmanları',        subs: [] },
  YapayBitkiler:  { label: 'Yapay Bitkiler',            subs: ['Yeşil Bitkiler', 'Renkli Bitkiler', 'Yapraklar'] },
  Saksilar:       { label: 'Saksılar',                  subs: ['Metal Saksılar', 'Plastik Saksılar', 'MDF Saksılar', 'Fiber Saksılar', 'Ahşap Saksılar', 'Beton Saksılar', 'Yanmaz Saksılar'] },
}
const CAT_COLORS: Record<string, string> = {
  Agaclar: 'bg-green-500', Bambu: 'bg-lime-500', YapayKursekler: 'bg-pink-500',
  Buketler: 'bg-rose-500', DikeyBahce: 'bg-teal-500', Sarmasiklar: 'bg-emerald-500',
  BonsaiZeytin: 'bg-yellow-500', SaksiAranjman: 'bg-purple-500',
  YapayBitkiler: 'bg-cyan-500', Saksilar: 'bg-orange-500',
}
const KEYS = Object.keys(CATS)

function fmt(n: number) { return '₺' + Math.round(n).toLocaleString('tr-TR') }

type Variant = {
  id: number; barcode: string; currentModelCode?: string; productName: string
  trendyolSalePrice?: string; stockQuantity: number; images?: string[]
  productCostDraft?: { marketplaceSalePrice?: string; salePrice?: string }
  product?: { catalogCategory?: string | null; catalogSubCategory?: string | null }
}

function buildWAMessage(catLabel: string, subLabel: string, products: Variant[]): string {
  const lines: string[] = []
  lines.push(`🌿 *${catLabel}${subLabel ? ` — ${subLabel}` : ''}*`)
  lines.push(`(${products.length} ürün)\n`)
  for (const p of products) {
    const price = Number(p.productCostDraft?.marketplaceSalePrice || p.trendyolSalePrice || 0)
    const code = p.currentModelCode || p.barcode
    lines.push(`• ${p.productName}`)
    lines.push(`  ${code}${price > 0 ? ' · ' + fmt(price) : ''} · Stok: ${p.stockQuantity}`)
  }
  lines.push('\nErhan Flowers — 0544 654 62 20')
  return lines.join('\n')
}

export default function KatalogGorunuPage() {
  const [variants, setVariants] = useState<Variant[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCat, setSelectedCat] = useState<string>('')
  const [selectedSub, setSelectedSub] = useState<string>('')
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api<Variant[]>('/product-center/variants')
      .then(d => setVariants(Array.isArray(d) ? d.filter(v => v.stockQuantity > 0) : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const catCounts = useMemo(() => {
    const counts: Record<string, { total: number; subs: Record<string, number> }> = {}
    for (const k of KEYS) counts[k] = { total: 0, subs: {} }
    for (const v of variants) {
      const catLabel = v.product?.catalogCategory
      if (!catLabel) continue
      const k = KEYS.find(k => CATS[k].label === catLabel)
      if (!k) continue
      counts[k].total++
      const sub = v.product?.catalogSubCategory || ''
      if (sub) counts[k].subs[sub] = (counts[k].subs[sub] || 0) + 1
    }
    return counts
  }, [variants])

  const filtered = useMemo(() => {
    return variants.filter(v => {
      const catLabel = v.product?.catalogCategory
      if (!catLabel) return false
      const k = KEYS.find(k => CATS[k].label === catLabel)
      if (selectedCat && k !== selectedCat) return false
      if (selectedSub && v.product?.catalogSubCategory !== selectedSub) return false
      if (search) {
        const q = search.toLowerCase()
        if (!v.productName.toLowerCase().includes(q) && !(v.currentModelCode || '').toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [variants, selectedCat, selectedSub, search])

  const totalAssigned = variants.filter(v => v.product?.catalogCategory).length

  function copyWA() {
    const catLabel = selectedCat ? CATS[selectedCat].label : 'Tüm Katalog'
    const subLabel = selectedSub || ''
    const msg = buildWAMessage(catLabel, subLabel, filtered)
    navigator.clipboard.writeText(msg).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  return (
    <AdminShell title="Katalog Görünümü">
      <div className="p-4 max-w-7xl mx-auto">

        {/* Başlık */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Katalog Görünümü</h1>
            <p className="text-xs text-gray-500 mt-0.5">{totalAssigned} ürün kategorili · {variants.length - totalAssigned} kategorisiz</p>
          </div>
          <div className="flex-1" />
          <button
            onClick={copyWA}
            className="text-sm bg-green-600 text-white rounded-lg px-4 py-2 font-semibold hover:bg-green-700 flex items-center gap-2"
          >
            {copied ? '✓ Kopyalandı' : '📋 WhatsApp Listesi Kopyala'}
          </button>
        </div>

        {/* Kategori kartları */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-4">
          <button
            onClick={() => { setSelectedCat(''); setSelectedSub('') }}
            className={`rounded-xl p-3 text-left border-2 transition-all ${!selectedCat ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
          >
            <div className="text-2xl font-bold text-gray-900">{totalAssigned}</div>
            <div className="text-xs text-gray-500 mt-0.5">Tüm Ürünler</div>
          </button>
          {KEYS.map(k => {
            const cnt = catCounts[k]?.total || 0
            const isActive = selectedCat === k
            return (
              <button
                key={k}
                onClick={() => { setSelectedCat(k); setSelectedSub('') }}
                className={`rounded-xl p-3 text-left border-2 transition-all ${isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
              >
                <div className={`w-2 h-2 rounded-full ${CAT_COLORS[k]} mb-1`} />
                <div className="text-2xl font-bold text-gray-900">{cnt}</div>
                <div className="text-xs text-gray-600 font-medium leading-tight mt-0.5">{CATS[k].label}</div>
              </button>
            )
          })}
        </div>

        {/* Alt kategori filtreleri */}
        {selectedCat && CATS[selectedCat].subs.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setSelectedSub('')}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${!selectedSub ? 'bg-blue-50 border-blue-400 text-blue-700 font-semibold' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
            >
              Tümü ({catCounts[selectedCat]?.total || 0})
            </button>
            {CATS[selectedCat].subs.map(s => {
              const cnt = catCounts[selectedCat]?.subs[s] || 0
              return (
                <button
                  key={s}
                  onClick={() => setSelectedSub(s)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${selectedSub === s ? 'bg-blue-50 border-blue-400 text-blue-700 font-semibold' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                >
                  {s} ({cnt})
                </button>
              )
            })}
          </div>
        )}

        {/* Arama */}
        <div className="mb-3">
          <input
            className="w-full max-w-sm border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ürün adı veya model kodu..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Tablo */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Yükleniyor...</div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-2">{filtered.length} ürün</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left p-2 text-xs text-gray-400 font-semibold uppercase tracking-wide w-14">Görsel</th>
                    <th className="text-left p-2 text-xs text-gray-400 font-semibold uppercase tracking-wide">Ürün</th>
                    <th className="text-left p-2 text-xs text-gray-400 font-semibold uppercase tracking-wide w-32">Model</th>
                    <th className="text-left p-2 text-xs text-gray-400 font-semibold uppercase tracking-wide w-36">Kategori</th>
                    <th className="text-left p-2 text-xs text-gray-400 font-semibold uppercase tracking-wide w-36">Alt Kategori</th>
                    <th className="text-right p-2 text-xs text-gray-400 font-semibold uppercase tracking-wide w-24">Fiyat</th>
                    <th className="text-right p-2 text-xs text-gray-400 font-semibold uppercase tracking-wide w-16">Stok</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const img = Array.isArray(p.images) && p.images.length ? p.images[0] : null
                    const price = Number(p.productCostDraft?.marketplaceSalePrice || p.trendyolSalePrice || 0)
                    const catLabel = p.product?.catalogCategory || ''
                    const subLabel = p.product?.catalogSubCategory || ''
                    const k = KEYS.find(k => CATS[k].label === catLabel) || ''
                    const color = k ? CAT_COLORS[k] : 'bg-gray-300'
                    return (
                      <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-2">
                          {img
                            ? <img src={img} alt="" className="w-12 h-12 rounded-lg object-cover border border-gray-100" />
                            : <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-xl text-gray-300">🌸</div>}
                        </td>
                        <td className="p-2 text-sm font-medium text-gray-800">{p.productName}</td>
                        <td className="p-2 text-xs text-gray-400 font-mono">{p.currentModelCode || p.barcode}</td>
                        <td className="p-2">
                          {catLabel && (
                            <span className="flex items-center gap-1 text-xs text-gray-700">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
                              {catLabel}
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-xs text-gray-500">{subLabel || '—'}</td>
                        <td className="p-2 text-right text-sm font-semibold text-gray-800">{price > 0 ? fmt(price) : '—'}</td>
                        <td className="p-2 text-right text-xs text-gray-500">{p.stockQuantity}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-sm">Ürün bulunamadı</div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminShell>
  )
}
