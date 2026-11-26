'use client'

import { useState, useRef, useCallback } from 'react'
import { Search, Plus, Trash2, Printer, MessageCircle, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

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
  card: StockCard
  qty: number
  unitPrice: number
  note: string
}

export default function FiyatTeklifiPage() {
  const router = useRouter()
  const [musteri, setMusteri] = useState('')
  const [gecerlilik, setGecerlilik] = useState('7')
  const [not, setNot] = useState('')
  const [items, setItems] = useState<LineItem[]>([])
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<StockCard[]>([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const keyCounter = useRef(0)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setShowDropdown(false); return }
    setSearching(true)
    try {
      const res = await fetch(`${API}/stock-cards?search=${encodeURIComponent(q)}&limit=20`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setResults(Array.isArray(data) ? data : [])
        setShowDropdown(true)
      }
    } finally {
      setSearching(false)
    }
  }, [])

  const handleSearchChange = (v: string) => {
    setSearch(v)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => doSearch(v), 300)
  }

  const addItem = (card: StockCard) => {
    const existing = items.find(i => i.card.id === card.id)
    if (existing) {
      setItems(prev => prev.map(i => i.key === existing.key ? { ...i, qty: i.qty + 1 } : i))
    } else {
      keyCounter.current += 1
      setItems(prev => [...prev, { key: keyCounter.current, card, qty: 1, unitPrice: card.salePrice, note: '' }])
    }
    setSearch('')
    setResults([])
    setShowDropdown(false)
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
      `• ${i.card.name}${i.note ? ' (' + i.note + ')' : ''} — ${i.qty} ${i.card.unit || 'adet'} × ${Number(i.unitPrice).toLocaleString('tr-TR')} ₺ = ${(Number(i.qty) * Number(i.unitPrice)).toLocaleString('tr-TR')} ₺`
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
      alert('WhatsApp mesajı panoya kopyalandı! WhatsApp\'ta yapıştırabilirsiniz.')
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

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24">
      {/* Başlık */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fiyat Teklifi</h1>
          <p className="text-sm text-gray-500 mt-0.5">Stok kartlarından teklif oluştur</p>
        </div>
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
      </div>

      {/* Teklif Bilgileri */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 print:border-0 print:p-0">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Müşteri Adı</label>
            <input value={musteri} onChange={e => setMusteri(e.target.value)}
              placeholder="Müşteri / firma adı"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Teklif Tarihi</label>
            <div className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700">{tarih}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Geçerlilik (gün)</label>
            <select value={gecerlilik} onChange={e => setGecerlilik(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="7">7 gün</option>
              <option value="14">14 gün</option>
              <option value="30">30 gün</option>
              <option value="60">60 gün</option>
            </select>
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-xs font-medium text-gray-500 mb-1">Not (opsiyonel)</label>
          <input value={not} onChange={e => setNot(e.target.value)}
            placeholder="Teslim süresi, ödeme koşulu vb."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {/* Ürün Arama */}
      <div className="relative mb-4 print:hidden">
        <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-xl px-3 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-blue-500">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            placeholder="Stok kartından ürün ara ve ekle..."
            className="flex-1 outline-none text-sm bg-transparent"
          />
          {searching && <span className="text-xs text-gray-400">Aranıyor...</span>}
          {search && <button onClick={() => { setSearch(''); setResults([]); setShowDropdown(false) }}><X className="w-4 h-4 text-gray-400" /></button>}
        </div>
        {showDropdown && results.length > 0 && (
          <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg max-h-72 overflow-y-auto">
            {results.map(card => (
              <button key={card.id} onClick={() => addItem(card)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-blue-50 text-left transition-colors">
                <div>
                  <div className="text-sm font-medium text-gray-900">{card.name}</div>
                  <div className="text-xs text-gray-500">{card.barcode || card.sku || ''}{card.unit ? ` · ${card.unit}` : ''}</div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <div className="text-sm font-semibold text-blue-700">{Number(card.salePrice).toLocaleString('tr-TR')} ₺</div>
                  <div className="text-xs text-gray-400">Stok: {card.stockQuantity}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Teklif Tablosu — hem ekran hem yazdırma */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden print:border-0">
        {/* Print header */}
        <div className="hidden print:block p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">FİYAT TEKLİFİ</h1>
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
          <div className="py-16 text-center text-gray-400 print:hidden">
            <Plus className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Yukarıdan ürün arayın ve ekleyin</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 w-auto">Ürün</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-700 w-24">Miktar</th>
                <th className="text-right px-3 py-3 font-semibold text-gray-700 w-32">Birim Fiyat</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700 w-28">Tutar</th>
                <th className="print:hidden w-10"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.key} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{item.card.name}</div>
                    <input
                      value={item.note}
                      onChange={e => updateItem(item.key, 'note', e.target.value)}
                      placeholder="Not ekle (opsiyonel)"
                      className="print:hidden text-xs text-gray-500 border-0 outline-none bg-transparent w-full mt-0.5 placeholder-gray-300"
                    />
                    {item.note && <div className="hidden print:block text-xs text-gray-500 mt-0.5">{item.note}</div>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <input
                      type="number"
                      min={1}
                      value={item.qty}
                      onChange={e => updateItem(item.key, 'qty', Math.max(1, Number(e.target.value)))}
                      className="print:hidden w-16 text-center border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="hidden print:inline">{item.qty} {item.card.unit || 'adet'}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.unitPrice}
                      onChange={e => updateItem(item.key, 'unitPrice', Number(e.target.value))}
                      className="print:hidden w-28 text-right border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="hidden print:inline">{Number(item.unitPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {(Number(item.qty) * Number(item.unitPrice)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                  </td>
                  <td className="px-2 py-3 print:hidden">
                    <button onClick={() => removeItem(item.key)} className="text-red-400 hover:text-red-600 p-1 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-gray-300">
              <tr>
                <td colSpan={3} className="px-4 py-2 text-right text-sm text-gray-600">Ara Toplam (KDV hariç)</td>
                <td className="px-4 py-2 text-right text-sm font-medium">{totalKDVsiz.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                <td className="print:hidden"></td>
              </tr>
              <tr>
                <td colSpan={3} className="px-4 py-2 text-right text-sm text-gray-600">KDV (%10)</td>
                <td className="px-4 py-2 text-right text-sm font-medium">{totalKDV.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                <td className="print:hidden"></td>
              </tr>
              <tr className="bg-blue-50">
                <td colSpan={3} className="px-4 py-3 text-right font-bold text-gray-900">GENEL TOPLAM</td>
                <td className="px-4 py-3 text-right font-bold text-blue-700 text-base">{total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                <td className="print:hidden"></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Print footer */}
      {not && (
        <div className="hidden print:block mt-4 p-3 border border-gray-200 rounded text-sm text-gray-600">
          <span className="font-semibold">Not: </span>{not}
        </div>
      )}
      <div className="hidden print:block mt-6 text-xs text-gray-400 text-center">
        Bu teklif {gecerliTarih} tarihine kadar geçerlidir. · Erhan Flowers
      </div>

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
