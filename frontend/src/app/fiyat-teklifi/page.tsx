'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Search, Plus, Trash2, Printer, MessageCircle, X, Package, CheckCircle2, Loader2 } from 'lucide-react'
import { api, apiFileUrl } from '@/lib/api'

interface GalleryProduct {
  id: number
  name: string
  barcode: string | null
  modelCode: string | null
  imageUrl: string | null
  price: number
  storeCode: string
}

interface StockCard {
  id: number
  name: string
  barcode: string | null
  sku: string | null
  unit: string | null
  salePrice: number
  stockQuantity: number
}

interface LineItem {
  key: number
  id: number
  name: string
  imageUrl: string | null
  unit?: string | null
  qty: number
  unitPrice: number
  note: string
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

export default function FiyatTeklifiPage() {
  const [activeTab, setActiveTab] = useState<'teklif' | 'stok'>('teklif')

  /* ── Fiyat Teklifi state ── */
  const [musteri, setMusteri] = useState('')
  const [gecerlilik, setGecerlilik] = useState('7')
  const [not, setNot] = useState('')
  const [items, setItems] = useState<LineItem[]>([])
  const [galleryQ, setGalleryQ] = useState('')
  const [gallery, setGallery] = useState<GalleryProduct[]>([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const keyCounter = useRef(0)
  const galleryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ── Stok Ekle state ── */
  const [stockQ, setStockQ] = useState('')
  const [stockCards, setStockCards] = useState<StockCard[]>([])
  const [stockLoading, setStockLoading] = useState(false)
  const [stockEdits, setStockEdits] = useState<Record<number, string>>({})
  const [stockSaving, setStockSaving] = useState<Record<number, boolean>>({})
  const [stockSaved, setStockSaved] = useState<Record<number, boolean>>({})
  const stockTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* load gallery on mount and on query change */
  const loadGallery = useCallback(async (q: string) => {
    setGalleryLoading(true)
    try {
      const data = await api<GalleryProduct[]>(`/sales/products/gallery?q=${encodeURIComponent(q)}`)
      setGallery(Array.isArray(data) ? data : [])
    } catch {
      setGallery([])
    } finally {
      setGalleryLoading(false)
    }
  }, [])

  useEffect(() => { loadGallery('') }, [loadGallery])

  const handleGallerySearch = (v: string) => {
    setGalleryQ(v)
    if (galleryTimer.current) clearTimeout(galleryTimer.current)
    galleryTimer.current = setTimeout(() => loadGallery(v), 300)
  }

  const addToQuote = (p: GalleryProduct) => {
    const existing = items.find(i => i.id === p.id)
    if (existing) {
      setItems(prev => prev.map(i => i.key === existing.key ? { ...i, qty: i.qty + 1 } : i))
    } else {
      keyCounter.current += 1
      setItems(prev => [...prev, { key: keyCounter.current, id: p.id, name: p.name, imageUrl: p.imageUrl, qty: 1, unitPrice: p.price, note: '' }])
    }
  }

  const removeItem = (key: number) => setItems(prev => prev.filter(i => i.key !== key))
  const updateItem = (key: number, field: 'qty' | 'unitPrice' | 'note', value: string | number) => {
    setItems(prev => prev.map(i => i.key === key ? { ...i, [field]: value } : i))
  }

  const totalKDVsiz = items.reduce((s, i) => s + Number(i.qty) * Number(i.unitPrice), 0)
  const totalKDV = totalKDVsiz * 0.10
  const total = totalKDVsiz + totalKDV
  const tarih = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const gecerliTarih = new Date(Date.now() + Number(gecerlilik) * 86400000)
    .toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const handlePrint = () => window.print()

  const handleWhatsApp = () => {
    if (items.length === 0) return
    const lines = items.map(i =>
      `• ${i.name}${i.note ? ' (' + i.note + ')' : ''} — ${i.qty} adet × ${Number(i.unitPrice).toLocaleString('tr-TR')} ₺ = ${(Number(i.qty) * Number(i.unitPrice)).toLocaleString('tr-TR')} ₺`
    ).join('\n')
    const msg = [
      `🌸 *FİYAT TEKLİFİ — ERHAN FLOWERS*`,
      ``,
      musteri ? `Sayın ${musteri},` : 'Merhaba,',
      ``,
      `Talep ettiğiniz ürünlere ait fiyat teklifimiz aşağıdadır:`,
      ``,
      lines,
      ``,
      `─────────────────`,
      `Ara Toplam: ${totalKDVsiz.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`,
      `KDV (%10): ${totalKDV.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`,
      `*TOPLAM: ${total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺*`,
      ``,
      `📅 Teklif tarihi: ${tarih}`,
      `⏳ Geçerlilik: ${gecerliTarih} tarihine kadar`,
      not ? `\n📝 Not: ${not}` : '',
    ].filter(l => l !== null).join('\n')

    navigator.clipboard.writeText(msg).then(() => {
      alert('WhatsApp mesajı panoya kopyalandı!')
    }).catch(() => {
      const ta = document.createElement('textarea')
      ta.value = msg
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      alert('Kopyalandı!')
    })
  }

  /* ── Stok arama ── */
  const loadStockCards = useCallback(async (q: string) => {
    if (!q.trim()) { setStockCards([]); return }
    setStockLoading(true)
    try {
      const res = await fetch(`${API}/stock-cards?search=${encodeURIComponent(q)}&limit=20`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setStockCards(Array.isArray(data) ? data : [])
        const edits: Record<number, string> = {}
        ;(Array.isArray(data) ? data : []).forEach((c: StockCard) => {
          edits[c.id] = String(c.stockQuantity ?? 0)
        })
        setStockEdits(edits)
      }
    } finally {
      setStockLoading(false)
    }
  }, [])

  const handleStockSearch = (v: string) => {
    setStockQ(v)
    if (stockTimer.current) clearTimeout(stockTimer.current)
    stockTimer.current = setTimeout(() => loadStockCards(v), 300)
  }

  const saveStock = async (card: StockCard) => {
    const val = parseFloat(String(stockEdits[card.id] ?? card.stockQuantity).replace(',', '.'))
    if (isNaN(val)) return
    setStockSaving(prev => ({ ...prev, [card.id]: true }))
    try {
      await api(`/stock-cards/${card.id}`, { method: 'PATCH', json: { stockQuantity: val } })
      setStockCards(prev => prev.map(c => c.id === card.id ? { ...c, stockQuantity: val } : c))
      setStockSaved(prev => ({ ...prev, [card.id]: true }))
      setTimeout(() => setStockSaved(prev => ({ ...prev, [card.id]: false })), 2000)
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setStockSaving(prev => ({ ...prev, [card.id]: false }))
    }
  }

  const imgSrc = (url: string | null) => {
    if (!url) return null
    if (/^https?:\/\//i.test(url)) return url
    return apiFileUrl(url)
  }

  return (
    <div className="max-w-7xl mx-auto p-4 pb-24">
      {/* Başlık + Sekmeler */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 print:hidden">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveTab('teklif')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'teklif' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Fiyat Teklifi
          </button>
          <button
            onClick={() => setActiveTab('stok')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'stok' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Package className="w-4 h-4 inline mr-1" />
            Stok Ekle
          </button>
        </div>

        {activeTab === 'teklif' && (
          <div className="flex gap-2">
            <button onClick={handleWhatsApp} disabled={items.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-40 transition-colors">
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </button>
            <button onClick={handlePrint} disabled={items.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-40 transition-colors">
              <Printer className="w-4 h-4" /> PDF / Yazdır
            </button>
          </div>
        )}
      </div>

      {/* ═══ FİYAT TEKLİFİ SEKMESİ ═══ */}
      {activeTab === 'teklif' && (
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Sol: Görsel Galeri */}
          <div className="lg:w-[55%] flex flex-col gap-3">
            {/* Arama */}
            <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-xl px-3 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-blue-500">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                value={galleryQ}
                onChange={e => handleGallerySearch(e.target.value)}
                placeholder="Ürün adı veya barkod ara..."
                className="flex-1 outline-none text-sm bg-transparent"
                autoComplete="off"
              />
              {galleryLoading && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
              {galleryQ && !galleryLoading && (
                <button onClick={() => { setGalleryQ(''); loadGallery('') }}>
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>

            {/* Grid */}
            <div className="bg-white border border-gray-200 rounded-xl p-3">
              {gallery.length === 0 && !galleryLoading && (
                <div className="py-12 text-center text-gray-400 text-sm">
                  {galleryQ ? 'Sonuç bulunamadı' : 'Ürünler yükleniyor...'}
                </div>
              )}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {gallery.map(p => {
                  const inQuote = items.find(i => i.id === p.id)
                  const src = imgSrc(p.imageUrl)
                  return (
                    <button
                      key={p.id}
                      onClick={() => addToQuote(p)}
                      className={`relative flex flex-col rounded-lg border-2 overflow-hidden text-left transition-all hover:shadow-md active:scale-95 ${inQuote ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300'}`}
                    >
                      {/* Resim */}
                      <div className="w-full aspect-square bg-gray-100 relative">
                        {src ? (
                          <img src={src} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-300" />
                          </div>
                        )}
                        {inQuote && (
                          <div className="absolute top-1 right-1 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {inQuote.qty}
                          </div>
                        )}
                      </div>
                      {/* İsim + Fiyat */}
                      <div className="p-1.5">
                        <p className="text-xs text-gray-800 font-medium line-clamp-2 leading-tight">{p.name}</p>
                        {p.price > 0 && (
                          <p className="text-xs text-blue-700 font-semibold mt-0.5">{p.price.toLocaleString('tr-TR')} ₺</p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Sağ: Teklif Paneli */}
          <div className="lg:w-[45%] flex flex-col gap-3">
            {/* Teklif bilgileri */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 print:border-0 print:p-0">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Müşteri Adı</label>
                  <input value={musteri} onChange={e => setMusteri(e.target.value)}
                    placeholder="Müşteri / firma"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Geçerlilik</label>
                  <select value={gecerlilik} onChange={e => setGecerlilik(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="7">7 gün</option>
                    <option value="14">14 gün</option>
                    <option value="30">30 gün</option>
                    <option value="60">60 gün</option>
                  </select>
                </div>
              </div>
              <div className="mt-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Not</label>
                <input value={not} onChange={e => setNot(e.target.value)}
                  placeholder="Teslim süresi, ödeme koşulu vb."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {/* Seçili ürünler */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex-1">
              {/* Print header */}
              <div className="hidden print:block p-6 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-bold">FİYAT TEKLİFİ</h1>
                    <p className="text-sm text-gray-500 mt-1">Erhan Flowers</p>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <div>Tarih: {tarih}</div>
                    <div>Geçerlilik: {gecerliTarih}</div>
                    {musteri && <div className="font-semibold mt-1">Sayın {musteri}</div>}
                  </div>
                </div>
              </div>

              {items.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <Plus className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Soldan ürün seçin</p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-gray-100">
                    {items.map(item => (
                      <div key={item.key} className="flex gap-2 px-3 py-2.5 items-start">
                        {/* Küçük resim */}
                        {imgSrc(item.imageUrl) ? (
                          <img src={imgSrc(item.imageUrl)!} alt={item.name} className="w-10 h-10 rounded object-cover flex-shrink-0 print:hidden" />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded flex-shrink-0 print:hidden" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
                          <input
                            value={item.note}
                            onChange={e => updateItem(item.key, 'note', e.target.value)}
                            placeholder="Not..."
                            className="print:hidden text-xs text-gray-400 border-0 outline-none bg-transparent w-full placeholder-gray-300"
                          />
                          <div className="flex items-center gap-2 mt-1 print:hidden">
                            <label className="text-xs text-gray-500">Adet:</label>
                            <input type="number" min={1} value={item.qty}
                              onChange={e => updateItem(item.key, 'qty', Math.max(1, Number(e.target.value)))}
                              className="w-14 text-center border border-gray-300 rounded px-1 py-0.5 text-xs" />
                            <label className="text-xs text-gray-500">Fiyat:</label>
                            <input type="number" min={0} step={0.01} value={item.unitPrice}
                              onChange={e => updateItem(item.key, 'unitPrice', Number(e.target.value))}
                              className="w-24 text-right border border-gray-300 rounded px-1 py-0.5 text-xs" />
                            <span className="text-xs text-gray-400">₺</span>
                          </div>
                          <div className="hidden print:block text-xs text-gray-600 mt-0.5">
                            {item.qty} adet × {Number(item.unitPrice).toLocaleString('tr-TR')} ₺
                            {item.note && <span className="ml-2 italic">{item.note}</span>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="text-sm font-semibold text-blue-700">
                            {(Number(item.qty) * Number(item.unitPrice)).toLocaleString('tr-TR')} ₺
                          </div>
                          <button onClick={() => removeItem(item.key)} className="text-red-400 hover:text-red-600 print:hidden">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Toplamlar */}
                  <div className="border-t-2 border-gray-200 p-3 space-y-1">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Ara Toplam (KDV hariç)</span>
                      <span>{totalKDVsiz.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>KDV (%10)</span>
                      <span>{totalKDV.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                    </div>
                    <div className="flex justify-between font-bold text-blue-700 pt-1 border-t border-gray-200 text-base">
                      <span>GENEL TOPLAM</span>
                      <span>{total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ STOK EKLE SEKMESİ ═══ */}
      {activeTab === 'stok' && (
        <div className="max-w-2xl">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Hızlı Stok Güncelleme</h2>
            <p className="text-sm text-gray-500">Stok kartı arayın ve mevcut miktarı güncelleyin.</p>
          </div>

          {/* Arama */}
          <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-xl px-3 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 mb-4">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              value={stockQ}
              onChange={e => handleStockSearch(e.target.value)}
              placeholder="Stok kartı adı veya barkod ara..."
              className="flex-1 outline-none text-sm bg-transparent"
              autoComplete="off"
            />
            {stockLoading && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
            {stockQ && !stockLoading && (
              <button onClick={() => { setStockQ(''); setStockCards([]) }}>
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* Stok Kartları Listesi */}
          {stockCards.length === 0 && !stockLoading && stockQ && (
            <div className="text-center text-gray-400 py-8 text-sm">Sonuç bulunamadı</div>
          )}
          {stockCards.length === 0 && !stockQ && (
            <div className="text-center text-gray-400 py-8 text-sm">Aramak için yazmaya başlayın</div>
          )}
          <div className="space-y-2">
            {stockCards.map(card => {
              const edited = stockEdits[card.id] !== undefined && stockEdits[card.id] !== String(card.stockQuantity)
              return (
                <div key={card.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">{card.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {card.barcode || card.sku || ''}{card.unit ? ` · ${card.unit}` : ''}
                      {card.salePrice > 0 ? ` · ${Number(card.salePrice).toLocaleString('tr-TR')} ₺` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <label className="text-xs text-gray-500">Stok:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={stockEdits[card.id] ?? card.stockQuantity}
                      onChange={e => setStockEdits(prev => ({ ...prev, [card.id]: e.target.value }))}
                      className={`w-20 text-center border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${edited ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}`}
                    />
                    <button
                      type="button"
                      onClick={() => saveStock(card)}
                      disabled={stockSaving[card.id]}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                        stockSaved[card.id]
                          ? 'bg-green-100 text-green-700'
                          : edited
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {stockSaving[card.id] ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : stockSaved[card.id] ? (
                        <><CheckCircle2 className="w-3.5 h-3.5" /> Kaydedildi</>
                      ) : (
                        'Kaydet'
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Print özel stiller */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #__next > * { display: none !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:inline { display: inline !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>
    </div>
  )
}
