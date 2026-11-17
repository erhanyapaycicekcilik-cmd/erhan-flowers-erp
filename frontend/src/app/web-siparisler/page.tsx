'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AdminShell } from '@/components/AdminShell'
import { OrdersTabs } from '@/components/OrdersTabs'
import { api, apiFileUrl } from '@/lib/api'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING:    { label: 'Yeni',        color: 'bg-yellow-100 text-yellow-800' },
  CONFIRMED:  { label: 'Onaylandı',   color: 'bg-blue-100 text-blue-800' },
  PREPARING:  { label: 'Hazırlanıyor',color: 'bg-purple-100 text-purple-800' },
  READY:      { label: 'Kargoya Hazır',color: 'bg-teal-100 text-teal-800' },
  SHIPPED:    { label: 'Kargoda',     color: 'bg-indigo-100 text-indigo-800' },
  DELIVERED:  { label: 'Teslim',      color: 'bg-green-100 text-green-800' },
  CANCELLED:  { label: 'İptal',       color: 'bg-red-100 text-red-800' },
}

const STATUS_FLOW = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'DELIVERED']

// Telefon / WhatsApp / Instagram / dükkan siparişleri (retail_sales) aynı listede gösterilir.
// Durumlar web siparişi durumlarına eşlenir.
const CHANNEL_LABEL: Record<string, string> = {
  WEBSITE: '🌐 Web Sitesi', PHONE: '📞 Telefon', WHATSAPP: '💬 WhatsApp', INSTAGRAM: '📷 Instagram', STORE: '🏪 Dükkan', OTHER: 'Diğer',
}
const RETAIL_TO_WEB: Record<string, string> = {
  DRAFT: 'PENDING', PAYMENT_PENDING: 'PENDING', CONFIRMED: 'CONFIRMED', PREPARING: 'PREPARING', IN_PRODUCTION: 'PREPARING',
  READY: 'READY', OUT_FOR_DELIVERY: 'SHIPPED', DELIVERED: 'DELIVERED', COMPLETED: 'DELIVERED', CANCELLED: 'CANCELLED',
}
const WEB_TO_RETAIL: Record<string, string> = { PENDING: 'PAYMENT_PENDING', SHIPPED: 'OUT_FOR_DELIVERY' }
const ALL_RETAIL = 'PAYMENT_PENDING,CONFIRMED,PREPARING,IN_PRODUCTION,READY,OUT_FOR_DELIVERY,DELIVERED,COMPLETED,CANCELLED'
function retailStatusesFor(webStatus: string) {
  if (!webStatus) return ALL_RETAIL
  return Object.entries(RETAIL_TO_WEB).filter(([, w]) => w === webStatus).map(([r]) => r).join(',')
}

/** retail_sales satırını web siparişi biçimine çevirir */
function fromRetail(r: any) {
  return {
    kind: 'retail',
    key: `retail-${r.id}`,
    id: r.id,
    channel: r.platform,
    orderNumber: r.saleNumber || `S-${r.id}`,
    status: RETAIL_TO_WEB[r.status] ?? r.status,
    rawStatus: r.status,
    customerName: r.customerName,
    customerPhone: r.phone ?? '',
    city: r.city, district: r.district, address: r.fullAddress,
    note: [r.customerNote, r.internalNote].filter(Boolean).join(' · '),
    grandTotal: r.grandTotal,
    createdAt: r.orderDate ?? r.createdAt,
    items: (r.items ?? []).map((i: any) => ({ ...i, unitPrice: null, lineTotal: null })),
  }
}

function fmt(n: number) {
  return '₺' + new Intl.NumberFormat('tr-TR').format(n)
}

function fullAddress(o: any) {
  return [o.address, [o.district, o.city].filter(Boolean).join(' / '), o.postalCode].filter(Boolean).join(', ')
}

function esc(v: unknown) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

/** 10x15 kargo etiketi — alıcı bilgileri + ürün listesi, yazdırma penceresinde açılır */
function printShippingLabel(o: any) {
  const w = window.open('', '_blank', 'width=480,height=720')
  if (!w) return alert('Açılır pencere engellendi, tarayıcıda izin verin.')
  const items = (o.items ?? []).map((i: any) => `<li>${esc(i.productName)} × ${esc(i.quantity)}</li>`).join('')
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(o.orderNumber)}</title>
<style>@page{size:100mm 150mm;margin:6mm}body{font-family:Arial,sans-serif;font-size:13px;margin:0}
h1{font-size:15px;margin:0 0 6px}.box{border:2px solid #000;padding:8px;margin-bottom:8px}
.lbl{font-size:10px;color:#555;text-transform:uppercase;margin-bottom:2px}.big{font-size:17px;font-weight:bold}
ul{margin:4px 0 0 16px;padding:0}</style></head><body>
<div class="box"><div class="lbl">Alıcı</div><div class="big">${esc(o.customerName)}</div>
<div>${esc(o.customerPhone)}</div><div style="margin-top:6px">${esc(o.address)}</div>
<div class="big">${esc([o.district, o.city].filter(Boolean).join(' / '))}${o.postalCode ? ' ' + esc(o.postalCode) : ''}</div></div>
<div class="box"><div class="lbl">Gönderen</div><div><b>Erhan Flowers</b> · 0544 654 62 20</div></div>
<div class="box"><div class="lbl">Sipariş ${esc(o.orderNumber)}</div><ul>${items}</ul>
${o.note ? `<div style="margin-top:6px"><i>Not: ${esc(o.note)}</i></div>` : ''}</div>
<script>window.onload=function(){window.print()}</script></body></html>`)
  w.document.close()
}

export default function WebSiparislerPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [channel, setChannel] = useState<'all' | 'web' | 'phone'>('all')

  async function load() {
    setLoading(true)
    try {
      const qs = filterStatus ? `?status=${filterStatus}` : ''
      const [webData, retail] = await Promise.all([
        channel === 'phone' ? Promise.resolve({ orders: [], total: 0 }) :
          fetch(`${API}/web-orders${qs}`, { credentials: 'include' }).then((r) => r.json()).catch(() => ({ orders: [], total: 0 })),
        channel === 'web' ? Promise.resolve([]) :
          api<any[]>(`/integrations/retail-orders?limit=200&status=${retailStatusesFor(filterStatus)}`).catch(() => []),
      ])
      const web = (webData.orders ?? []).map((o: any) => ({ ...o, kind: 'web', key: `web-${o.id}`, channel: 'WEBSITE' }))
      // Tezgâhta tamamlanan dükkan satışları (Hızlı Dükkan Satışı) gönderilecek sipariş değildir — listelenmez
      const phone = (Array.isArray(retail) ? retail : [])
        .filter((r: any) => !(r.platform === 'STORE' && r.status === 'COMPLETED'))
        .map(fromRetail)
      const all = [...web, ...phone].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
      setOrders(all)
      setTotal((webData.total ?? 0) + phone.length)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filterStatus, channel])

  async function selectOrder(order: any) {
    if (order.kind === 'retail') { setSelected(order); return }
    // Fetch full detail (with items) in case list response was partial
    try {
      const res = await fetch(`${API}/web-orders/${order.id}`, { credentials: 'include' })
      if (res.ok) { setSelected({ ...(await res.json()), kind: 'web', key: order.key, channel: 'WEBSITE' }); return }
    } catch {}
    setSelected(order)
  }

  async function changeStatus(order: any, status: string) {
    if (order.kind === 'retail') {
      await api(`/sales/${order.id}/status`, { method: 'POST', json: { status: WEB_TO_RETAIL[status] ?? status, note: 'Web & Telefon Siparişleri ekranından güncellendi.' } })
    } else {
      await fetch(`${API}/web-orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      })
    }
    await load()
    if (selected?.key === order.key) setSelected((s: any) => ({ ...s, status }))
  }

  const pendingCount = orders.filter((o) => o.status === 'PENDING').length

  return (
    <AdminShell title="Siparişler">
      <div className="max-w-7xl mx-auto">
        <OrdersTabs />
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Web & Telefon Siparişleri</h1>
            <p className="text-sm text-gray-500 mt-1">
              {total} toplam sipariş
              {pendingCount > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  {pendingCount} yeni
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/adres-ciktisi" className="text-sm font-semibold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">+ Telefon Siparişi Gir</Link>
            <Link href="/sabah-ciktisi" className="text-sm font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">🖨️ Çıktı Merkezi</Link>
            <button onClick={load} className="text-sm text-blue-600 hover:underline">Yenile</button>
          </div>
        </div>

        {/* Kanal */}
        <div className="flex gap-2 mb-3">
          {([['all', 'Tümü'], ['web', '🌐 Web Sitesi'], ['phone', '📞 Telefon · WhatsApp · Dükkan']] as const).map(([v, l]) => (
            <button
              key={v}
              onClick={() => { setChannel(v); setSelected(null) }}
              className={`px-4 py-2 rounded-lg text-sm font-bold border ${channel === v ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Filtre */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {[{ v: '', l: 'Tümü' }, ...Object.entries(STATUS_LABEL).map(([v, { label: l }]) => ({ v, l }))].map(({ v, l }) => (
            <button
              key={v}
              onClick={() => setFilterStatus(v)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                filterStatus === v
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Yükleniyor...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 text-gray-400">Henüz sipariş yok</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sipariş listesi */}
            <div className="lg:col-span-2 space-y-3">
              {orders.map((order) => {
                const s = STATUS_LABEL[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-700' }
                return (
                  <div
                    key={order.key}
                    onClick={() => selectOrder(order)}
                    className={`bg-white rounded-xl border p-4 cursor-pointer hover:shadow-md transition-shadow ${
                      selected?.key === order.key ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">{CHANNEL_LABEL[order.channel] ?? order.channel}</span>
                          <span className="font-mono text-sm font-bold text-gray-800">{order.orderNumber}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${s.color}`}>{s.label}</span>
                          {order.paymentMethod === 'EFT' && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">EFT</span>
                          )}
                          {order.paymentMethod === 'ONLINE' && (order.paidAt ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold">KART · ÖDENDİ</span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold">KART · ödeme yok</span>
                          ))}
                        </div>
                        <p className="font-semibold text-gray-900 mt-1">{order.customerName}</p>
                        <p className="text-sm text-gray-500">{order.customerPhone} · {order.city}{order.district ? ', ' + order.district : ''}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {order.items?.length} ürün ·{' '}
                          {new Date(order.createdAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-lg text-gray-900">{fmt(Number(order.grandTotal))}</p>
                        {order.kind === 'web' && <p className="text-xs text-gray-400">Kargo ücretsiz</p>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Detay paneli */}
            <div className="lg:col-span-1">
              {selected ? (
                <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-gray-900">{CHANNEL_LABEL[selected.channel] ?? ''} · {selected.orderNumber}</h2>
                    <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
                  </div>

                  {/* Müşteri */}
                  <div className="space-y-1 text-sm mb-4 pb-4 border-b border-gray-100">
                    <p className="font-semibold text-gray-900">{selected.customerName}</p>
                    <p className="text-gray-600">📞 {selected.customerPhone}</p>
                    {selected.customerEmail && <p className="text-gray-600">✉️ {selected.customerEmail}</p>}
                    <p className="text-gray-600">📍 {fullAddress(selected)}</p>
                    {selected.note && <p className="text-gray-500 italic whitespace-pre-line">📝 {selected.note}</p>}
                    {selected.invoiceCorporate ? (
                      <p className="text-gray-600">🧾 Kurumsal fatura: {selected.companyTitle} · VKN {selected.taxNumber} · {selected.taxOffice} VD</p>
                    ) : selected.tcKimlik ? (
                      <p className="text-gray-600">🧾 Bireysel fatura · TC {selected.tcKimlik}</p>
                    ) : null}
                    {selected.paymentMethod === 'ONLINE' && (
                      selected.paidAt ? (
                        <p className="text-purple-700 font-medium">
                          💳 Kartla ödendi · {new Date(selected.paidAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          {selected.paymentRef && <> · Onay {selected.paymentRef}</>}
                        </p>
                      ) : (
                        <p className="text-red-600 font-medium">💳 Kart ödemesi tamamlanmadı — kargolamayın</p>
                      )
                    )}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => navigator.clipboard.writeText([selected.customerName, selected.customerPhone, fullAddress(selected)].join('\n'))}
                        className="flex-1 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        📋 Adresi Kopyala
                      </button>
                      <button
                        onClick={() => printShippingLabel(selected)}
                        className="flex-1 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        🏷️ Kargo Etiketi
                      </button>
                    </div>
                  </div>

                  {/* Ürünler */}
                  <div className="space-y-3 mb-4 pb-4 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ürünler</p>
                    {selected.items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between gap-2 text-sm">
                        {(item.productImage || item.imagePath) && (
                          <img
                            src={String(item.productImage || item.imagePath).startsWith('http') ? (item.productImage || item.imagePath) : apiFileUrl(item.productImage || item.imagePath)}
                            alt="" className="w-10 h-10 rounded object-cover shrink-0"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-800 line-clamp-2">{item.productName}</p>
                          <p className="text-gray-400 text-xs">x{item.quantity}{item.unitPrice != null ? ` · ${fmt(Number(item.unitPrice))}` : ''}</p>
                        </div>
                        {item.lineTotal != null && <p className="font-semibold text-gray-900 shrink-0">{fmt(Number(item.lineTotal))}</p>}
                      </div>
                    ))}
                    <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100">
                      <span>Toplam</span>
                      <span>{fmt(Number(selected.grandTotal))}</span>
                    </div>
                  </div>

                  {/* Durum değiştir */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Durum Güncelle</p>
                    <div className="grid grid-cols-2 gap-2">
                      {STATUS_FLOW.map((s) => {
                        const info = STATUS_LABEL[s]
                        return (
                          <button
                            key={s}
                            onClick={() => changeStatus(selected, s)}
                            className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                              selected.status === s
                                ? info.color + ' border-current'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                            }`}
                          >
                            {info.label}
                          </button>
                        )
                      })}
                      <button
                        onClick={() => changeStatus(selected, 'CANCELLED')}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all col-span-2 ${
                          selected.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-800 border-red-200'
                            : 'bg-white text-red-500 border-red-200 hover:bg-red-50'
                        }`}
                      >
                        İptal Et
                      </button>
                    </div>
                  </div>

                  {/* WhatsApp */}
                  <a
                    href={`https://wa.me/${String(selected.customerPhone ?? '').replace(/\D/g, '').replace(/^0/, '90')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors"
                  >
                    <span>💬</span> WhatsApp ile İletişim
                  </a>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-8 text-center text-gray-400 text-sm">
                  Detay görmek için bir sipariş seçin
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
