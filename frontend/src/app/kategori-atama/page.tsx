'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { AdminShell } from '@/components/AdminShell'
import { api } from '@/lib/api'

const CATS: Record<string, { label: string; subs: string[] }> = {
  Agaclar:        { label: 'Ağaçlar',                   subs: ['Yeşil Ağaçlar', 'Hazır Ağaçlar', 'Renkli Ağaçlar', 'Bambu Ağaçlar', 'Palmiye ve Areka Ağaçlar'] },
  Bambu:          { label: 'Bambu',                     subs: ['Tekli Bambu', 'Separatör'] },
  YapayKursekler: { label: 'Yapay Çiçekler',            subs: ['Renkli Çiçekler', 'Yeşil Çiçekler'] },
  Buketler:       { label: 'Buketler',                  subs: [] },
  DikeyBahce:     { label: 'Dikey Bahçeler',            subs: ['Paneller', 'Kapı Önü Dekorlar', 'Tavan Dekorları'] },
  Sarmasiklar:    { label: 'Sarmaşıklar',               subs: ['Yeşil Sarmaşıklar', 'Renkli Sarmaşıklar'] },
  BonsaiZeytin:   { label: 'Bonsai ve Zeytin Ağaçları', subs: ['Bonsai', 'Zeytin Ağacı'] },
  SaksiAranjman:  { label: 'Saksı Aranjmanları',        subs: [] },
  YapayBitkiler:  { label: 'Yapay Bitkiler',            subs: ['Yeşil Bitkiler', 'Renkli Bitkiler'] },
  Saksilar:       { label: 'Saksılar',                  subs: ['Metal Saksılar', 'Plastik Saksılar', 'MDF Saksılar', 'Fiber Saksılar', 'Ahşap Saksılar', 'Beton Saksılar', 'Yanmaz Saksılar'] },
}
const KEYS = Object.keys(CATS)

const CAT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Agaclar:        { bg: 'bg-green-100',   text: 'text-green-700',  border: 'border-green-400' },
  Bambu:          { bg: 'bg-lime-100',    text: 'text-lime-700',   border: 'border-lime-400' },
  YapayKursekler: { bg: 'bg-pink-100',    text: 'text-pink-700',   border: 'border-pink-400' },
  Buketler:       { bg: 'bg-rose-100',    text: 'text-rose-700',   border: 'border-rose-400' },
  DikeyBahce:     { bg: 'bg-teal-100',    text: 'text-teal-700',   border: 'border-teal-400' },
  Sarmasiklar:    { bg: 'bg-emerald-100', text: 'text-emerald-700',border: 'border-emerald-400' },
  BonsaiZeytin:   { bg: 'bg-yellow-100',  text: 'text-yellow-700', border: 'border-yellow-400' },
  SaksiAranjman:  { bg: 'bg-purple-100',  text: 'text-purple-700', border: 'border-purple-400' },
  YapayBitkiler:  { bg: 'bg-cyan-100',    text: 'text-cyan-700',   border: 'border-cyan-400' },
  Saksilar:       { bg: 'bg-orange-100',  text: 'text-orange-700', border: 'border-orange-400' },
}

function guessKey(n: string): string {
  const s = n.toLowerCase()
  if (/bonsai|bonsaı/.test(s)) return 'BonsaiZeytin'
  if (/zeytin/.test(s)) return 'BonsaiZeytin'
  if (/dikey|panel|tavan|yapay.*çit/.test(s)) return 'DikeyBahce'
  if (/sarmaş/.test(s)) return 'Sarmasiklar'
  if (/palmiye|areka/.test(s)) return 'Agaclar'
  if (/bambu/.test(s)) return 'Bambu'
  if (/buket|demet/.test(s)) return 'Buketler'
  if (/çiçek|cicek|orkide|lale|gül/.test(s)) return 'YapayKursekler'
  if (/aranjman/.test(s)) return 'SaksiAranjman'
  if (/ağaç|agac|ficus|benjamin|strelitzia|monstera|dracena|yuka/.test(s)) return 'Agaclar'
  if (/yapay.*bitki|bitki.*saksı/.test(s)) return 'YapayBitkiler'
  if (/metal.*saks|plastik.*saks|mdf.*saks|fiber.*saks|ahşap.*saks|beton.*saks|yanmaz.*saks|saksı/.test(s)) return 'Saksilar'
  return ''
}
function guessSub(n: string, k: string): string {
  const s = n.toLowerCase()
  if (k === 'Agaclar') {
    if (/palmiye|areka/.test(s)) return 'Palmiye ve Areka Ağaçlar'
    if (/bambu/.test(s)) return 'Bambu Ağaçlar'
    if (/renk|pembe|mor|sarı|kırmızı|beyaz|renkli/.test(s)) return 'Renkli Ağaçlar'
    if (/hazır|set/.test(s)) return 'Hazır Ağaçlar'
    return 'Yeşil Ağaçlar'
  }
  if (k === 'BonsaiZeytin') return /zeytin/.test(s) ? 'Zeytin Ağacı' : 'Bonsai'
  if (k === 'Bambu') return /separat|paravan/.test(s) ? 'Separatör' : 'Tekli Bambu'
  if (k === 'YapayKursekler') return /renk|pembe|mor|sarı|kırmızı|beyaz|renkli/.test(s) ? 'Renkli Çiçekler' : 'Yeşil Çiçekler'
  if (k === 'DikeyBahce') { if (/panel/.test(s)) return 'Paneller'; if (/tavan/.test(s)) return 'Tavan Dekorları'; return 'Kapı Önü Dekorlar' }
  if (k === 'Sarmasiklar') return /renk|pembe|mor|sarı|kırmızı|beyaz|renkli/.test(s) ? 'Renkli Sarmaşıklar' : 'Yeşil Sarmaşıklar'
  if (k === 'YapayBitkiler') return /renk|pembe|mor|sarı|kırmızı|beyaz|renkli/.test(s) ? 'Renkli Bitkiler' : 'Yeşil Bitkiler'
  if (k === 'Saksilar') {
    if (/metal/.test(s)) return 'Metal Saksılar'
    if (/plastik/.test(s)) return 'Plastik Saksılar'
    if (/mdf/.test(s)) return 'MDF Saksılar'
    if (/fiber/.test(s)) return 'Fiber Saksılar'
    if (/ahşap|ahsap/.test(s)) return 'Ahşap Saksılar'
    if (/beton/.test(s)) return 'Beton Saksılar'
    if (/yanmaz/.test(s)) return 'Yanmaz Saksılar'
  }
  return ''
}

function fmt(n: number) { return '₺' + Math.round(n).toLocaleString('tr-TR') }

type Variant = {
  id: number; barcode: string; currentModelCode?: string; productName: string
  trendyolSalePrice?: string; stockQuantity: number; images?: string[]
  productCostDraft?: { marketplaceSalePrice?: string }
}
type State = Record<string, { k: string; sub: string }>

const STORAGE_KEY = 'kategori_atama_v1'
const LAST_KEY = 'kategori_atama_last'
const MANUAL_KEY = 'kategori_atama_manual'

function loadState(): State {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}
function saveState(s: State) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch { /* ignore */ }
}
function loadLast(): string {
  try { return localStorage.getItem(LAST_KEY) || '' } catch { return '' }
}
function saveLast(barcode: string) {
  try { localStorage.setItem(LAST_KEY, barcode) } catch { /* ignore */ }
}
function loadManual(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(MANUAL_KEY) || '[]')) } catch { return new Set() }
}
function saveManual(s: Set<string>) {
  try { localStorage.setItem(MANUAL_KEY, JSON.stringify([...s])) } catch { /* ignore */ }
}

export default function KategoriAtamaPage() {
  const [products, setProducts] = useState<Variant[]>([])
  const [state, setState] = useState<State>({})
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'missing'>('all')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sendMsg, setSendMsg] = useState('')
  const [bulkKey, setBulkKey] = useState('')
  const [bulkSub, setBulkSub] = useState('')
  const [lastBarcode, setLastBarcode] = useState<string>('')
  const [manual, setManual] = useState<Set<string>>(new Set())
  const searchTimeout = useRef<any>(null)
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<Variant[]>('/product-center/variants')
      const active = (Array.isArray(data) ? data : []).filter(v => v.stockQuantity > 0)
      setProducts(active)
      setState(prev => {
        const next = { ...loadState(), ...prev }
        active.forEach(v => {
          if (!next[v.barcode]) {
            const k = guessKey(v.productName)
            if (k) next[v.barcode] = { k, sub: guessSub(v.productName, k) }
          }
        })
        saveState(next)
        return next
      })
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => {
    setLastBarcode(loadLast())
    setManual(loadManual())
    load()
  }, [load])

  useEffect(() => {
    if (!loading && lastBarcode && rowRefs.current[lastBarcode]) {
      setTimeout(() => {
        rowRefs.current[lastBarcode]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }
  }, [loading, lastBarcode])

  const updateState = (next: State) => { setState(next); saveState(next) }

  const setCat = (barcode: string, k: string) => {
    updateState({ ...state, [barcode]: { k, sub: '' } })
    setLastBarcode(barcode); saveLast(barcode)
    const m = new Set(manual); m.add(barcode); setManual(m); saveManual(m)
  }
  const setSubCat = (barcode: string, sub: string) => {
    updateState({ ...state, [barcode]: { ...(state[barcode] || { k: '' }), sub } })
    setLastBarcode(barcode); saveLast(barcode)
    const m = new Set(manual); m.add(barcode); setManual(m); saveManual(m)
  }

  const filtered = products.filter(p => {
    if (filter === 'missing' && state[p.barcode]?.k) return false
    const q = search.toLowerCase()
    if (q && !p.productName.toLowerCase().includes(q) && !(p.currentModelCode || '').toLowerCase().includes(q)) return false
    return true
  })

  const assigned = products.filter(p => state[p.barcode]?.k).length
  const missing = products.length - assigned

  function bulkAssign() {
    if (!bulkKey) return
    const next = { ...state }
    filtered.forEach(p => { next[p.barcode] = { k: bulkKey, sub: bulkSub } })
    updateState(next)
  }

  async function sendToERP() {
    const toSend = products.filter(p => state[p.barcode]?.k)
    if (!toSend.length) { setSendMsg('Gönderilecek ürün yok'); return }
    setSending(true); setSendMsg('Gönderiliyor...')
    let ok = 0, err = 0
    for (const p of toSend) {
      try {
        await api(`/product-center/variants/${p.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            categoryName: CATS[state[p.barcode].k].label,
            subCategoryName: state[p.barcode].sub || undefined,
          }),
        })
        ok++
      } catch { err++ }
    }
    setSendMsg(`✅ ${ok} ürün güncellendi${err ? ` · ${err} hata` : ''}`)
    setSending(false)
  }

  return (
    <AdminShell>
      <div className="p-4 max-w-7xl mx-auto">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Kategori Atama</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {assigned}/{products.length} kategorili · {missing > 0 && <span className="text-amber-500">{missing} eksik</span>}
            </p>
          </div>
          <div className="flex-1" />
          {lastBarcode && (
            <button
              onClick={() => rowRefs.current[lastBarcode]?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              className="text-xs bg-orange-100 border border-orange-300 text-orange-700 rounded-lg px-3 py-1.5 font-semibold hover:bg-orange-200 transition-all">
              📍 Kaldığım Yere Git
            </button>
          )}
          <button onClick={load} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-all">
            ↻ Yenile
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-3 mb-3 flex flex-wrap gap-2 items-center">
          <input
            className="flex-1 min-w-[180px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ürün adı veya model kodu..."
            value={search}
            onChange={e => { setSearch(e.target.value) }}
          />
          <button onClick={() => setFilter('all')}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${filter === 'all' ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-gray-200 text-gray-500'}`}>
            Tümü ({products.length})
          </button>
          <button onClick={() => setFilter('missing')}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${filter === 'missing' ? 'bg-amber-50 border-amber-400 text-amber-700' : 'border-gray-200 text-gray-500'}`}>
            Eksik ({missing})
          </button>
        </div>

        {/* Bulk assign */}
        <div className="bg-white border border-gray-200 rounded-xl p-3 mb-3 flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-500">Toplu ata ({filtered.length} ürüne):</span>
          <select
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
            value={bulkKey} onChange={e => { setBulkKey(e.target.value); setBulkSub('') }}>
            <option value="">— Ana Kategori —</option>
            {KEYS.map(k => <option key={k} value={k}>{CATS[k].label}</option>)}
          </select>
          <select
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
            value={bulkSub} onChange={e => setBulkSub(e.target.value)}
            disabled={!bulkKey || !CATS[bulkKey]?.subs.length}>
            <option value="">— Alt Kategori —</option>
            {(bulkKey ? CATS[bulkKey]?.subs || [] : []).map(s => <option key={s}>{s}</option>)}
          </select>
          <button onClick={bulkAssign} disabled={!bulkKey}
            className="text-xs bg-amber-500 text-white rounded-lg px-3 py-1.5 font-semibold disabled:opacity-40">
            Ata
          </button>
          <div className="flex-1" />
          <button onClick={sendToERP} disabled={sending || assigned === 0}
            className="text-sm bg-blue-600 text-white rounded-lg px-4 py-1.5 font-semibold disabled:opacity-40">
            {sending ? 'Gönderiliyor...' : `ERP'ye Gönder (${assigned})`}
          </button>
          {sendMsg && <span className="text-xs text-green-600 font-medium">{sendMsg}</span>}
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Yükleniyor...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left p-2 text-xs text-gray-400 font-semibold uppercase tracking-wide w-14">Görsel</th>
                  <th className="text-left p-2 text-xs text-gray-400 font-semibold uppercase tracking-wide">Ürün</th>
                  <th className="text-left p-2 text-xs text-gray-400 font-semibold uppercase tracking-wide w-20">Model</th>
                  <th className="text-right p-2 text-xs text-gray-400 font-semibold uppercase tracking-wide w-20">Fiyat</th>
                  <th className="text-right p-2 text-xs text-gray-400 font-semibold uppercase tracking-wide w-12">Stok</th>
                  <th className="text-left p-2 text-xs text-gray-400 font-semibold uppercase tracking-wide w-44">Ana Kategori</th>
                  <th className="text-left p-2 text-xs text-gray-400 font-semibold uppercase tracking-wide w-48">Alt Kategori</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const img = Array.isArray(p.images) && p.images.length ? p.images[0] : null
                  const price = Number(p.productCostDraft?.marketplaceSalePrice || p.trendyolSalePrice || 0)
                  const k = state[p.barcode]?.k || ''
                  const sub = state[p.barcode]?.sub || ''
                  const isLast = p.barcode === lastBarcode
                  const color = k ? CAT_COLORS[k] : null
                  return (
                    <tr key={p.id}
                      ref={el => { rowRefs.current[p.barcode] = el }}
                      className={`border-b transition-colors ${isLast ? 'bg-yellow-50 border-l-[6px] border-l-orange-400' : 'border-gray-100 hover:bg-gray-50'}`}>
                      <td className="p-2">
                        <div className="relative inline-block">
                          {img ? (
                            <a href={img} target="_blank" rel="noreferrer">
                              <img src={img} alt="" className="w-12 h-12 rounded-lg object-cover border border-gray-100" />
                            </a>
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-xl text-gray-300">🌸</div>
                          )}
                          {color && (
                            <span className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold ${color.bg} ${color.text}`}>
                              ✓
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-start gap-1.5">
                          {isLast && <span className="mt-0.5 text-orange-500 text-xl leading-none font-bold">▶</span>}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium text-gray-900 leading-tight max-w-xs">{p.productName}</p>
                              {color && (
                                <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${color.bg} ${color.text} ${color.border}`}>
                                  ✓ {CATS[k].label}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{p.barcode}</p>
                            {isLast && <span className="text-[11px] text-orange-500 font-bold">📍 kaldığınız yer</span>}
                          </div>
                        </div>
                      </td>
                      <td className="p-2">
                        <code className="text-xs text-gray-600">{p.currentModelCode || '—'}</code>
                      </td>
                      <td className="p-2 text-right text-sm font-semibold tabular-nums">{price ? fmt(price) : '—'}</td>
                      <td className="p-2 text-right text-sm text-gray-600 tabular-nums">{p.stockQuantity}</td>
                      <td className="p-2">
                        <select
                          className={`w-full border rounded-lg px-2 py-1.5 text-xs ${k ? 'border-green-400 bg-green-50' : 'border-amber-400 bg-amber-50'}`}
                          value={k}
                          onChange={e => setCat(p.barcode, e.target.value)}>
                          <option value="">— Seçin —</option>
                          {KEYS.map(key => <option key={key} value={key}>{CATS[key].label}</option>)}
                        </select>
                      </td>
                      <td className="p-2">
                        <select
                          className={`w-full border rounded-lg px-2 py-1.5 text-xs ${sub ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}
                          value={sub}
                          onChange={e => setSubCat(p.barcode, e.target.value)}
                          disabled={!k || !CATS[k]?.subs.length}>
                          <option value="">— Alt Kategori —</option>
                          {(k ? CATS[k]?.subs || [] : []).map(s => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">Ürün bulunamadı</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length < products.length && (
          <p className="text-center text-xs text-gray-400 mt-3">{filtered.length} / {products.length} ürün gösteriliyor</p>
        )}
      </div>
    </AdminShell>
  )
}
