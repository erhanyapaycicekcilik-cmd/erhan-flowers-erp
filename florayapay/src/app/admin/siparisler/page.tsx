'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface OrderItem {
  id: number
  productName: string
  productImage: string | null
  unitPrice: number
  quantity: number
  lineTotal: number
}

interface Order {
  id: number
  orderNumber: string
  status: string
  paymentMethod: string
  customerName: string
  customerPhone: string
  customerEmail: string
  city: string
  district: string
  address: string
  note: string | null
  subtotal: number
  grandTotal: number
  createdAt: string
  items: OrderItem[]
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:    { label: 'Bekliyor',       color: 'bg-yellow-100 text-yellow-800' },
  CONFIRMED:  { label: 'Onaylandı',      color: 'bg-blue-100 text-blue-800' },
  PREPARING:  { label: 'Hazırlanıyor',   color: 'bg-purple-100 text-purple-800' },
  SHIPPED:    { label: 'Kargoya Verildi', color: 'bg-indigo-100 text-indigo-800' },
  DELIVERED:  { label: 'Teslim Edildi',  color: 'bg-green-100 text-green-800' },
  CANCELLED:  { label: 'İptal',          color: 'bg-red-100 text-red-800' },
}

const PAYMENT_LABELS: Record<string, string> = {
  CREDIT_CARD: 'Kredi Kartı',
  EFT: 'EFT / Havale',
  WHATSAPP: 'WhatsApp',
}

export default function SiparislerPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [selected, setSelected] = useState<Order | null>(null)
  const [updating, setUpdating] = useState(false)
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = filterStatus ? `?status=${filterStatus}&limit=100` : '?limit=100'
      const res = await fetch(`${apiUrl}/web-orders${qs}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Yetki hatası')
      const data = await res.json()
      setOrders(data.orders ?? data ?? [])
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [filterStatus, apiUrl])

  useEffect(() => { load() }, [load])

  async function updateStatus(id: number, status: string) {
    setUpdating(true)
    try {
      await fetch(`${apiUrl}/web-orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      })
      await load()
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null)
    } finally {
      setUpdating(false)
    }
  }

  const fmt = (n: number) => n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })
  const fmtDate = (s: string) => new Date(s).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-light text-[#0D1510]">Siparişler</h1>
        <button onClick={load} className="text-sm text-[#5C7A62] hover:underline">↻ Yenile</button>
      </div>

      {/* Durum filtresi */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setFilterStatus('')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${!filterStatus ? 'bg-[#0D1510] text-white border-[#0D1510]' : 'border-[#E0DDD4] text-[#5C5C52] hover:bg-[#F4F2EC]'}`}>
          Tümü
        </button>
        {Object.entries(STATUS_LABELS).map(([k, v]) => (
          <button key={k} onClick={() => setFilterStatus(k)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${filterStatus === k ? 'bg-[#0D1510] text-white border-[#0D1510]' : 'border-[#E0DDD4] text-[#5C5C52] hover:bg-[#F4F2EC]'}`}>
            {v.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-[#8C8A82]">Yükleniyor…</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-[#8C8A82]">Sipariş bulunamadı</div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E0DDD4] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F4F2EC] text-xs uppercase tracking-wider text-[#8C8A82]">
              <tr>
                <th className="px-4 py-3 text-left">Sipariş No</th>
                <th className="px-4 py-3 text-left">Müşteri</th>
                <th className="px-4 py-3 text-left">Tarih</th>
                <th className="px-4 py-3 text-left">Ödeme</th>
                <th className="px-4 py-3 text-right">Tutar</th>
                <th className="px-4 py-3 text-left">Durum</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EDE6]">
              {orders.map((o) => {
                const st = STATUS_LABELS[o.status] ?? { label: o.status, color: 'bg-gray-100 text-gray-800' }
                return (
                  <tr key={o.id} className="hover:bg-[#FAFAF8] transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-[#5C7A62] font-semibold">{o.orderNumber}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#0D1510]">{o.customerName}</div>
                      <div className="text-xs text-[#8C8A82]">{o.customerPhone}</div>
                    </td>
                    <td className="px-4 py-3 text-[#5C5C52] whitespace-nowrap">{fmtDate(o.createdAt)}</td>
                    <td className="px-4 py-3 text-[#5C5C52]">{PAYMENT_LABELS[o.paymentMethod] ?? o.paymentMethod}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#0D1510]">{fmt(o.grandTotal)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelected(o)}
                        className="text-xs text-[#5C7A62] hover:underline">Detay</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Sipariş detay modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-[#E0DDD4] flex items-start justify-between">
              <div>
                <p className="text-xs text-[#8C8A82] font-mono">{selected.orderNumber}</p>
                <h2 className="text-lg font-semibold text-[#0D1510] mt-0.5">{selected.customerName}</h2>
                <p className="text-sm text-[#5C5C52]">{selected.customerPhone} · {selected.customerEmail}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-[#8C8A82] hover:text-[#0D1510] text-xl">×</button>
            </div>

            <div className="p-6 space-y-5">
              {/* Adres */}
              <div>
                <p className="text-xs uppercase tracking-widest text-[#8C8A82] mb-1">Teslimat Adresi</p>
                <p className="text-sm text-[#0D1510]">{selected.address}, {selected.district} / {selected.city}</p>
                {selected.note && <p className="text-sm text-[#5C7A62] mt-1 italic">Not: {selected.note}</p>}
              </div>

              {/* Ürünler */}
              <div>
                <p className="text-xs uppercase tracking-widest text-[#8C8A82] mb-2">Ürünler</p>
                <div className="space-y-2">
                  {selected.items.map(item => (
                    <div key={item.id} className="flex items-center gap-3 bg-[#F4F2EC] rounded-xl p-3">
                      {item.productImage && (
                        <img src={item.productImage} alt={item.productName} className="w-12 h-12 object-cover rounded-lg" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#0D1510] truncate">{item.productName}</p>
                        <p className="text-xs text-[#8C8A82]">{item.quantity} adet × {fmt(item.unitPrice)}</p>
                      </div>
                      <p className="text-sm font-semibold text-[#0D1510]">{fmt(item.lineTotal)}</p>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-3 pt-3 border-t border-[#E0DDD4]">
                  <span className="text-sm text-[#5C5C52]">Ödeme: {PAYMENT_LABELS[selected.paymentMethod] ?? selected.paymentMethod}</span>
                  <span className="font-bold text-[#0D1510]">{fmt(selected.grandTotal)}</span>
                </div>
              </div>

              {/* Durum güncelle */}
              <div>
                <p className="text-xs uppercase tracking-widest text-[#8C8A82] mb-2">Durum Güncelle</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <button key={k} disabled={updating || selected.status === k}
                      onClick={() => updateStatus(selected.id, k)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors disabled:opacity-40 ${
                        selected.status === k
                          ? 'bg-[#0D1510] text-white border-[#0D1510]'
                          : 'border-[#E0DDD4] text-[#5C5C52] hover:bg-[#F4F2EC]'
                      }`}>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* WhatsApp */}
              <a
                href={`https://wa.me/90${selected.customerPhone.replace(/\D/g, '').replace(/^0/, '')}?text=${encodeURIComponent(`Merhaba ${selected.customerName}, ${selected.orderNumber} numaralı siparişiniz hakkında bilgi vermek istedik.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 justify-center w-full bg-[#25D366] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-[#1ebe5d] transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.857L.057 23.882a.5.5 0 0 0 .613.613l6.065-1.476A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.896 0-3.676-.524-5.198-1.437l-.373-.222-3.861.939.953-3.808-.244-.386A9.952 9.952 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                WhatsApp ile İletişim
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
