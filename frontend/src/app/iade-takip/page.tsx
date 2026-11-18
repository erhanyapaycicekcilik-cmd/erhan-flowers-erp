'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, Download, ExternalLink, RefreshCw, Search, Trash2, Upload, Video } from 'lucide-react'
import { AdminShell } from '@/components/AdminShell'
import { OrdersTabs } from '@/components/OrdersTabs'
import { api, apiBaseUrl, apiFileUrl, getStoredToken } from '@/lib/api'

/**
 * İade Takip — iade gelen siparişi bul, hangi platformdan geldiğini gör, iade paketinin açılış videosunu
 * kaydet (telefonda doğrudan kamerayla), iade reddi için platforma yüklemek üzere indir.
 */

type ReturnVideo = { id: number; filename: string; originalName: string | null; mimeType: string | null; sizeByte: number | null; note: string | null; createdAt: string }
type Item = { id: number; productName: string; quantity: string; unitPrice: string; barcode: string | null; sku: string | null; productImageUrl: string | null; stockCard?: { imagePath: string | null } | null }
type ReturnOrder = {
  id: number
  platform: string
  orderNumber: string
  externalOrderId: string
  status: string
  customerName: string | null
  totalAmount: string
  orderDate: string | null
  updatedAt: string
  cargoTrackingNumber: string | null
  cargoProvider: string | null
  returnNote: string | null
  returnStatus: string | null
  returnUpdatedAt: string | null
  claimId: string | null
  claimStatus: string | null
  claimReason: string | null
  claimDate: string | null
  items: Item[]
  returnVideos: ReturnVideo[]
}

const PROCESS: { key: string; label: string; color: string }[] = [
  { key: 'WAITING', label: 'İade geldi · inceleniyor', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { key: 'REJECT_REQUESTED', label: 'Red talebi gönderildi', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  { key: 'REJECTED', label: 'İade reddedildi', color: 'bg-green-100 text-green-800 border-green-300' },
  { key: 'ACCEPTED', label: 'İade kabul edildi', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  { key: 'CLOSED', label: 'Kapandı', color: 'bg-slate-100 text-slate-500 border-slate-300' },
]
const processLabel = (k: string | null) => PROCESS.find((p) => p.key === k)

/** Satıcı panelleri — iade reddi / itiraz bu panellerden yapılır, video oraya yüklenir */
const PANEL: Record<string, { label: string; url: string }> = {
  TRENDYOL: { label: 'Trendyol Satıcı Paneli', url: 'https://partner.trendyol.com' },
  HEPSIBURADA: { label: 'Hepsiburada Satıcı Paneli', url: 'https://merchant.hepsiburada.com' },
  N11: { label: 'n11 Satıcı Ofisi', url: 'https://so.n11.com' },
}

function platformLabel(o: ReturnOrder) {
  const flora = String(o.externalOrderId ?? '').startsWith('FLORA_') || o.platform.includes('FLORA')
  const base = o.platform.replace('_FLORA', '')
  const name = base === 'TRENDYOL' ? 'Trendyol' : base === 'N11' ? 'n11' : base === 'HEPSIBURADA' ? 'Hepsiburada' : base === 'AMAZON' ? 'Amazon' : base
  return flora ? `${name} · Flora` : name
}
/** Üstteki platform sekmeleri — her biri ayrı ekran gibi */
const PLATFORM_TABS: { key: string; label: string; color: string; auto: boolean }[] = [
  { key: 'ALL', label: 'Tümü', color: 'bg-slate-900 text-white', auto: true },
  { key: 'TRENDYOL', label: 'Trendyol', color: 'bg-orange-500 text-white', auto: true },
  { key: 'TRENDYOL_FLORA', label: 'Trendyol (Flora)', color: 'bg-pink-500 text-white', auto: true },
  { key: 'HEPSIBURADA', label: 'Hepsiburada', color: 'bg-orange-600 text-white', auto: true },
  { key: 'N11', label: 'n11', color: 'bg-purple-600 text-white', auto: false },
  { key: 'OTHER', label: 'Diğer', color: 'bg-slate-600 text-white', auto: false },
]
/** Trendyol panelindeki gibi iki bölüm: müşteri talep açtı (paket yolda) / paket bize ulaştı (aksiyon bekliyor) */
const STATUS_TABS: { key: string; label: string; hint: string; match: (o: ReturnOrder) => boolean }[] = [
  {
    key: 'CREATED', label: '📦 Talep Oluşturuldu', hint: 'Müşteri iade talebi açtı, paket kargoyla bize geliyor',
    match: (o) => o.claimStatus === 'Talep oluşturuldu',
  },
  {
    key: 'ARRIVED', label: '📥 Bize Ulaştı', hint: 'Paket depoya geldi — açılış videosunu çekin, kabul / red edin',
    match: (o) => o.claimStatus === 'Bize ulaştı' || (!o.claimId && o.returnStatus === 'WAITING'),
  },
]
const isFresh = (o: ReturnOrder) => !!o.claimDate && Date.now() - new Date(o.claimDate).getTime() < 3 * 86400000

function platformKey(o: ReturnOrder) {
  const flora = String(o.externalOrderId ?? '').startsWith('FLORA_') || o.platform.includes('FLORA')
  const base = o.platform.replace('_FLORA', '')
  if (base === 'TRENDYOL') return flora ? 'TRENDYOL_FLORA' : 'TRENDYOL'
  if (base === 'HEPSIBURADA' || base === 'N11') return base
  return 'OTHER'
}
const panelOf = (o: ReturnOrder) => PANEL[o.platform.replace('_FLORA', '')]
const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—')
const fmtAmount = (s: string) => Number(s).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })
const fmtSize = (b: number | null) => (b ? `${(b / 1024 / 1024).toFixed(1)} MB` : '')
const itemImage = (i: Item) => {
  const p = i.productImageUrl || i.stockCard?.imagePath || ''
  return p ? (p.startsWith('http') ? p : apiFileUrl(p)) : ''
}
function videoUrl(filename: string, download = false) {
  const t = getStoredToken()
  const qs = new URLSearchParams()
  if (t) qs.set('token', t)
  if (download) qs.set('download', '1')
  return `${apiBaseUrl}/returns/videos/${encodeURIComponent(filename)}/stream?${qs.toString()}`
}

export default function IadeTakipPage() {
  const [orders, setOrders] = useState<ReturnOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [searched, setSearched] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [noteEdit, setNoteEdit] = useState<Record<number, string>>({})
  const [videoNote, setVideoNote] = useState('')
  const [progress, setProgress] = useState<number | null>(null)
  const [msg, setMsg] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [tab, setTab] = useState('ALL')
  const [statusTab, setStatusTab] = useState('CREATED')
  const cameraRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async (q = '') => {
    setLoading(true)
    try {
      const data = await api<{ items: ReturnOrder[] }>(`/returns?limit=200${q ? `&q=${encodeURIComponent(q)}` : ''}`)
      setOrders(data.items ?? [])
      setSearched(q)
      if (q && data.items?.length === 1) setSelectedId(data.items[0].id)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  // Platformlardan (Trendyol Erhan + Flora) iade taleplerini çek
  async function syncReturns() {
    setSyncing(true)
    setMsg('')
    try {
      const r = await api<{ results: Array<{ store: string; ok: boolean; claims: number; created: number; updated: number; message?: string }>; message?: string }>('/returns/sync?days=30', { method: 'POST' })
      const parts = (r.results ?? []).map((x) => (x.ok ? `${x.store}: ${x.claims} iade (${x.created} yeni)` : `${x.store}: hata (${(x.message ?? '').slice(0, 80)})`))
      setMsg(r.message ?? (parts.length ? parts.join(' · ') : 'Bağlı mağaza bulunamadı'))
      await load('')
      setQuery('')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'İadeler çekilemedi')
    } finally {
      setSyncing(false)
    }
  }

  // Aramada durum filtresi uygulanmaz (aranan sipariş hangi durumda olursa görünsün)
  const statusDef = STATUS_TABS.find((t) => t.key === statusTab) ?? STATUS_TABS[0]
  const byStatus = searched ? orders : orders.filter(statusDef.match)
  const tabCounts = PLATFORM_TABS.reduce<Record<string, number>>((acc, t) => {
    acc[t.key] = t.key === 'ALL' ? byStatus.length : byStatus.filter((o) => platformKey(o) === t.key).length
    return acc
  }, {})
  const byPlatform = tab === 'ALL' ? orders : orders.filter((o) => platformKey(o) === tab)
  const statusCounts = STATUS_TABS.reduce<Record<string, number>>((acc, t) => { acc[t.key] = byPlatform.filter(t.match).length; return acc }, {})
  const visible = tab === 'ALL' ? byStatus : byStatus.filter((o) => platformKey(o) === tab)
  const activeTab = PLATFORM_TABS.find((t) => t.key === tab) ?? PLATFORM_TABS[0]
  const selected = visible.find((o) => o.id === selectedId) ?? null
  const replace = (o: ReturnOrder) => setOrders((prev) => prev.map((x) => (x.id === o.id ? o : x)))

  async function saveNote(order: ReturnOrder) {
    const note = noteEdit[order.id] ?? order.returnNote ?? ''
    await api(`/returns/${order.id}/note`, { method: 'PATCH', json: { note } })
    replace({ ...order, returnNote: note })
    setMsg('Not kaydedildi')
  }

  async function setStatus(order: ReturnOrder, status: string | null) {
    const updated = await api<ReturnOrder>(`/returns/${order.id}/return-status`, { method: 'PATCH', json: { status } })
    replace(updated)
  }

  function upload(file: File | undefined) {
    if (!selected || !file) return
    const orderId = selected.id
    const fd = new FormData()
    fd.append('file', file)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${apiBaseUrl}/returns/${orderId}/videos?note=${encodeURIComponent(videoNote)}`)
    const t = getStoredToken()
    if (t) xhr.setRequestHeader('Authorization', `Bearer ${t}`)
    xhr.withCredentials = true
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100)) }
    xhr.onload = async () => {
      setProgress(null)
      if (xhr.status >= 200 && xhr.status < 300) {
        setVideoNote('')
        setMsg('Video kaydedildi ✓')
        const fresh = await api<ReturnOrder>(`/returns/${orderId}`).catch(() => null)
        if (fresh) {
          setOrders((prev) => (prev.some((x) => x.id === fresh.id) ? prev.map((x) => (x.id === fresh.id ? fresh : x)) : [fresh, ...prev]))
        }
      } else {
        setMsg(`Video yüklenemedi (HTTP ${xhr.status})`)
      }
    }
    xhr.onerror = () => { setProgress(null); setMsg('Video yüklenemedi — bağlantıyı kontrol edin') }
    setProgress(0)
    xhr.send(fd)
  }

  async function deleteVideo(order: ReturnOrder, videoId: number) {
    if (!confirm('Bu video silinsin mi?')) return
    await api(`/returns/videos/${videoId}`, { method: 'DELETE' })
    replace({ ...order, returnVideos: order.returnVideos.filter((v) => v.id !== videoId) })
  }

  return (
    <AdminShell title="Siparişler">
      <OrdersTabs />
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="rounded-xl border bg-white p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold text-slate-900">İade Takip</h1>
              <p className="text-sm text-slate-500">
                Sadece açık iadeler: müşterinin talep açtığı (paket yolda) ve bize ulaşan (aksiyon bekleyen) iadeler. Trendyol (Erhan + Flora) ve Hepsiburada 30 dakikada bir otomatik çekilir; kapanan iade ekrandan kalkar. n11 iadesi için siparişi aratın.
              </p>
            </div>
            <button onClick={() => void syncReturns()} disabled={syncing} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} /> {syncing ? 'İadeler çekiliyor…' : 'İadeleri Çek'}
            </button>
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); setTab('ALL'); void load(query.trim()) }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Sipariş no, paket no, müşteri adı, kargo kodu, barkod veya ürün adı"
                className="w-full rounded-lg border px-9 py-2.5 text-sm"
              />
            </div>
            <button className="rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white">Siparişi Bul</button>
            {searched && (
              <button type="button" onClick={() => { setQuery(''); void load('') }} className="rounded-lg border px-3 text-sm">İadelere dön</button>
            )}
          </form>
          {msg && (
            <div className="flex justify-between rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">{msg}<button onClick={() => setMsg('')}>✕</button></div>
          )}
        </div>

        {/* Platform sekmeleri — her platform ayrı ekran */}
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {PLATFORM_TABS.filter((t) => t.key === 'ALL' || t.key === 'TRENDYOL' || t.key === 'TRENDYOL_FLORA' || t.key === 'HEPSIBURADA' || t.key === 'N11' || tabCounts[t.key] > 0).map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setSelectedId(null) }}
              className={`flex shrink-0 items-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-bold transition ${
                tab === t.key ? `${t.color} border-transparent shadow` : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
              }`}
            >
              {t.label}
              <span className={`rounded-full px-2 py-0.5 text-xs font-black ${tab === t.key ? 'bg-white/25' : 'bg-slate-100 text-slate-600'}`}>{tabCounts[t.key] ?? 0}</span>
            </button>
          ))}
        </div>
        {/* Bölümler (Trendyol paneli gibi) */}
        {!searched && (
          <div className="grid grid-cols-2 gap-2">
            {STATUS_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => { setStatusTab(t.key); setSelectedId(null) }}
                className={`rounded-xl border-2 p-3 text-left transition ${statusTab === t.key ? (t.key === 'ARRIVED' ? 'border-red-500 bg-red-50' : 'border-blue-500 bg-blue-50') : 'border-slate-200 bg-white hover:border-slate-400'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold">{t.label}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-base font-black ${t.key === 'ARRIVED' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>{statusCounts[t.key] ?? 0}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">{t.hint}</div>
              </button>
            ))}
          </div>
        )}
        {!activeTab.auto && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {activeTab.label} iadeleri otomatik çekilmiyor (platformun iade servisi doğrulanamadı). İade gelen paketin siparişini yukarıdan aratıp videosunu ekleyin; platform panelinden takip edin.
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          {/* Liste */}
          <div className="space-y-2 lg:max-h-[calc(100vh-260px)] lg:overflow-y-auto">
            <div className="px-1 text-xs font-semibold uppercase text-slate-500">
              {searched ? `"${searched}" için ${visible.length} sipariş` : `${activeTab.label} · ${statusDef.label} · ${visible.length}`}
            </div>
            {loading ? (
              <div className="py-10 text-center text-slate-400">Yükleniyor…</div>
            ) : visible.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-white p-6 text-center text-sm text-slate-500">
                {searched ? 'Sipariş bulunamadı. Sipariş/paket numarasını ya da müşteri adını deneyin.' : statusTab === 'ARRIVED' ? 'Bize ulaşan iade yok 👍' : 'Açık iade talebi yok 👍 "İadeleri Çek" ile güncelleyebilirsiniz.'}
              </div>
            ) : visible.map((o) => {
              const p = processLabel(o.returnStatus)
              return (
                <button
                  key={o.id}
                  onClick={() => setSelectedId(o.id)}
                  className={`w-full rounded-xl border bg-white p-3 text-left transition ${selectedId === o.id ? 'border-emerald-500 ring-1 ring-emerald-500' : 'hover:border-slate-400'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase text-orange-600">
                      {platformLabel(o)}
                      {isFresh(o) && <span className="ml-1.5 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-black text-white">YENİ</span>}
                    </span>
                    <span className="text-xs text-slate-400">{o.claimDate ? `İade: ${fmtDate(o.claimDate)}` : fmtDate(o.orderDate ?? o.updatedAt)}</span>
                  </div>
                  <div className="mt-1 truncate text-sm font-semibold">{o.customerName ?? '—'}</div>
                  <div className="text-xs text-slate-500">#{o.orderNumber}</div>
                  {o.items[0] && <div className="truncate text-xs text-slate-600">{o.items.map((i) => i.productName).join(', ')}</div>}
                  {o.claimReason && <div className="truncate text-xs text-red-700">Sebep: {o.claimReason}</div>}
                  {o.cargoTrackingNumber && <div className="truncate text-xs text-slate-500">🚚 {[o.cargoProvider, o.cargoTrackingNumber].filter(Boolean).join(' ')}</div>}
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-bold">{fmtAmount(o.totalAmount)}</span>
                    {o.claimStatus && <span className="rounded border border-purple-300 bg-purple-50 px-1.5 py-0.5 text-[11px] font-semibold text-purple-800">{o.claimStatus}</span>}
                    {p && <span className={`rounded border px-1.5 py-0.5 text-[11px] font-semibold ${p.color}`}>{p.label}</span>}
                    {o.returnVideos.length > 0 && <span className="rounded bg-green-100 px-1.5 py-0.5 text-[11px] font-semibold text-green-700">🎥 {o.returnVideos.length}</span>}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Detay */}
          {selected ? (
            <div className="space-y-5 rounded-xl border bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-bold uppercase text-orange-700">{platformLabel(selected)}</span>
                    <span className="text-lg font-bold">#{selected.orderNumber}</span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Platform durumu: {selected.status}</span>
                    {selected.claimStatus && <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-800">İade talebi: {selected.claimStatus}</span>}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    {selected.customerName ?? '—'} · Sipariş: {fmtDate(selected.orderDate)} · Tutar: {fmtAmount(selected.totalAmount)}
                  </div>
                  <div className="text-xs text-slate-500">
                    Paket no: {selected.externalOrderId.replace(/^FLORA_/, '').replace(/^CLAIM_/, 'iade talebi ')}
                    {selected.cargoTrackingNumber ? ` · Kargo: ${[selected.cargoProvider, selected.cargoTrackingNumber].filter(Boolean).join(' ')}` : ''}
                  </div>
                </div>
                {panelOf(selected) && (
                  <a href={panelOf(selected)!.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-slate-50">
                    <ExternalLink size={15} /> {panelOf(selected)!.label}
                  </a>
                )}
              </div>

              {selected.claimReason && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  <b>Müşterinin iade sebebi:</b> {selected.claimReason}
                  {selected.claimDate && <span className="ml-1 text-xs text-red-600">· {new Date(selected.claimDate).toLocaleString('tr-TR')}</span>}
                </div>
              )}

              {/* Ürünler */}
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase text-slate-500">Ürünler</div>
                {selected.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
                    {itemImage(item)
                      ? <img src={itemImage(item)} alt="" className="h-12 w-12 rounded object-cover" />
                      : <div className="flex h-12 w-12 items-center justify-center rounded bg-slate-100 text-[9px] text-slate-400">görsel yok</div>}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{item.productName}</div>
                      <div className="text-xs text-slate-500">{[item.barcode, item.sku].filter(Boolean).join(' · ')}</div>
                    </div>
                    <span className="text-slate-500">x{Number(item.quantity)}</span>
                    <span className="font-semibold">{fmtAmount(item.unitPrice)}</span>
                  </div>
                ))}
              </div>

              {/* İade süreci */}
              <div>
                <div className="mb-2 text-xs font-semibold uppercase text-slate-500">İade Süreci</div>
                <div className="flex flex-wrap gap-2">
                  {PROCESS.map((p) => (
                    <button
                      key={p.key}
                      onClick={() => void setStatus(selected, p.key)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${selected.returnStatus === p.key ? p.color : 'bg-white text-slate-600 hover:border-slate-400'}`}
                    >
                      {p.label}
                    </button>
                  ))}
                  {selected.returnStatus && (
                    <button onClick={() => void setStatus(selected, null)} className="rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:text-red-600">Süreçten çıkar</button>
                  )}
                </div>
                {selected.returnUpdatedAt && <div className="mt-1 text-xs text-slate-400">Son güncelleme: {new Date(selected.returnUpdatedAt).toLocaleString('tr-TR')}</div>}
              </div>

              {/* Video ekle */}
              <div className="rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 p-4 space-y-3">
                <div className="flex items-center gap-2 font-semibold text-emerald-800"><Video size={18} /> İade paketinin videosu</div>
                <p className="text-xs text-slate-600">
                  Paketi açmadan önce kargo etiketi görünecek şekilde çekmeye başlayın, kesintisiz açın ve ürünün durumunu gösterin. Platform red talebinde bu video istenir.
                </p>
                <input
                  value={videoNote}
                  onChange={(e) => setVideoNote(e.target.value)}
                  placeholder="Video notu (ör. ürün kırık geldi, farklı ürün gönderilmiş)"
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => cameraRef.current?.click()} disabled={progress !== null} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                    <Camera size={16} /> Kamerayla Video Çek
                  </button>
                  <button onClick={() => fileRef.current?.click()} disabled={progress !== null} className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
                    <Upload size={16} /> Dosyadan Yükle (video / fotoğraf)
                  </button>
                  <input ref={cameraRef} type="file" accept="video/*" capture="environment" className="hidden" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = '' }} />
                  <input ref={fileRef} type="file" accept="video/*,image/*" className="hidden" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = '' }} />
                </div>
                {progress !== null && (
                  <div>
                    <div className="h-2 overflow-hidden rounded bg-slate-200"><div className="h-full bg-emerald-600 transition-all" style={{ width: `${progress}%` }} /></div>
                    <div className="mt-1 text-xs text-slate-600">Yükleniyor… %{progress} (büyük videolar 1-2 dakika sürebilir, sayfayı kapatmayın)</div>
                  </div>
                )}
              </div>

              {/* Videolar */}
              {selected.returnVideos.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase text-slate-500">Kayıtlı Videolar ({selected.returnVideos.length})</div>
                  {selected.returnVideos.map((v) => {
                    const isImage = (v.mimeType ?? '').startsWith('image/')
                    return (
                      <div key={v.id} className="rounded-xl border p-3">
                        <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                          <div className="text-sm">
                            <div className="font-medium">{v.originalName ?? v.filename}</div>
                            <div className="text-xs text-slate-500">{new Date(v.createdAt).toLocaleString('tr-TR')} {fmtSize(v.sizeByte)}{v.note ? ` · ${v.note}` : ''}</div>
                          </div>
                          <div className="flex gap-2">
                            <a href={videoUrl(v.filename, true)} className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
                              <Download size={14} /> İndir (platforma yüklemek için)
                            </a>
                            <button onClick={() => void deleteVideo(selected, v.id)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-red-500 hover:bg-red-50">
                              <Trash2 size={14} /> Sil
                            </button>
                          </div>
                        </div>
                        {isImage
                          ? <img src={videoUrl(v.filename)} alt="" className="max-h-72 rounded bg-black object-contain" />
                          : <video controls preload="metadata" className="max-h-72 w-full rounded bg-black" src={videoUrl(v.filename)} />}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Not */}
              <div>
                <div className="mb-2 text-xs font-semibold uppercase text-slate-500">İade Notu</div>
                <textarea
                  className="w-full resize-none rounded-lg border px-3 py-2 text-sm"
                  rows={3}
                  placeholder="İade sebebi, müşteri açıklaması, platforma yazılan red gerekçesi…"
                  value={noteEdit[selected.id] ?? selected.returnNote ?? ''}
                  onChange={(e) => setNoteEdit((prev) => ({ ...prev, [selected.id]: e.target.value }))}
                />
                <button onClick={() => void saveNote(selected)} className="mt-2 rounded-lg bg-blue-600 px-4 py-1.5 text-sm text-white">Notu Kaydet</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-xl border border-dashed bg-white p-10 text-sm text-slate-400">
              Soldan bir sipariş seçin ya da yukarıdan aratın
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  )
}
