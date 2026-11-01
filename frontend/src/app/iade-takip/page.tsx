'use client'

import { useEffect, useRef, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

type ReturnVideo = {
  id: number
  filename: string
  originalName: string | null
  note: string | null
  createdAt: string
}

type ReturnOrder = {
  id: number
  platform: string
  orderNumber: string
  externalOrderId: string
  customerName: string | null
  totalAmount: string
  orderDate: string | null
  updatedAt: string
  returnNote: string | null
  items: { id: number; productName: string; quantity: string; unitPrice: string }[]
  returnVideos: ReturnVideo[]
}

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtAmount(s: string) {
  return Number(s).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })
}

function platformLabel(p: string) {
  if (p === 'TRENDYOL') return 'Trendyol'
  if (p === 'N11') return 'n11'
  if (p === 'HEPSIBURADA') return 'Hepsiburada'
  return p
}

export default function IadeTakipPage() {
  const [orders, setOrders] = useState<ReturnOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [noteEdit, setNoteEdit] = useState<{ [id: number]: string }>({})
  const [uploading, setUploading] = useState(false)
  const [videoNote, setVideoNote] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`${API}/returns?limit=200`, { credentials: 'include' })
      const data = await res.json()
      setOrders(data.items ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const selected = orders.find((o) => o.id === selectedId) ?? null

  async function saveNote(order: ReturnOrder) {
    const note = noteEdit[order.id] ?? order.returnNote ?? ''
    await fetch(`${API}/returns/${order.id}/note`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    })
    setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, returnNote: note } : o))
  }

  async function uploadVideo() {
    if (!selectedId || !fileRef.current?.files?.[0]) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', fileRef.current.files[0])
    try {
      const res = await fetch(`${API}/returns/${selectedId}/videos?note=${encodeURIComponent(videoNote)}`, {
        method: 'POST',
        credentials: 'include',
        body: fd,
      })
      const video = await res.json()
      setOrders((prev) =>
        prev.map((o) =>
          o.id === selectedId
            ? { ...o, returnVideos: [video, ...o.returnVideos] }
            : o,
        ),
      )
      setVideoNote('')
      if (fileRef.current) fileRef.current.value = ''
    } finally {
      setUploading(false)
    }
  }

  async function deleteVideo(orderId: number, videoId: number) {
    if (!confirm('Bu videoyu sil?')) return
    await fetch(`${API}/returns/videos/${videoId}`, { method: 'DELETE', credentials: 'include' })
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, returnVideos: o.returnVideos.filter((v) => v.id !== videoId) }
          : o,
      ),
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">İade Takip</h1>
          <span className="text-gray-400 text-sm">{orders.length} iade</span>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-500">Yükleniyor…</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-gray-500">İade siparişi bulunamadı.</div>
        ) : (
          <div className="flex gap-4" style={{ height: 'calc(100vh - 140px)' }}>
            {/* Left list */}
            <div className="w-80 flex-shrink-0 overflow-y-auto space-y-2">
              {orders.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setSelectedId(o.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedId === o.id
                      ? 'border-red-500 bg-red-950/40'
                      : 'border-gray-700 bg-gray-900 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-xs font-semibold text-red-400 uppercase">{platformLabel(o.platform)}</span>
                    <span className="text-xs text-gray-400">{fmtDate(o.updatedAt)}</span>
                  </div>
                  <div className="mt-1 text-sm font-medium truncate">{o.customerName ?? '—'}</div>
                  <div className="text-xs text-gray-400 mt-0.5">#{o.orderNumber}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-bold text-white">{fmtAmount(o.totalAmount)}</span>
                    {o.returnVideos.length > 0 && (
                      <span className="text-xs bg-green-900/60 text-green-400 px-1.5 py-0.5 rounded">
                        {o.returnVideos.length} video
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Right detail */}
            {selected ? (
              <div className="flex-1 overflow-y-auto bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-5">
                {/* Header */}
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-bold text-red-400 uppercase bg-red-950/40 px-2 py-0.5 rounded">
                      {platformLabel(selected.platform)}
                    </span>
                    <span className="text-lg font-bold">#{selected.orderNumber}</span>
                  </div>
                  <div className="text-gray-400 text-sm">
                    {selected.customerName ?? '—'} · Sipariş: {fmtDate(selected.orderDate)} · Tutar: {fmtAmount(selected.totalAmount)}
                  </div>
                </div>

                {/* Items */}
                <div>
                  <div className="text-xs font-semibold uppercase text-gray-500 mb-2">Ürünler</div>
                  <div className="space-y-1">
                    {selected.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm bg-gray-800 rounded px-3 py-2">
                        <span className="flex-1">{item.productName}</span>
                        <span className="text-gray-400 ml-3">x{Number(item.quantity)}</span>
                        <span className="text-gray-300 ml-4">{fmtAmount(item.unitPrice)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Note */}
                <div>
                  <div className="text-xs font-semibold uppercase text-gray-500 mb-2">İade Notu</div>
                  <textarea
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
                    rows={3}
                    placeholder="İade sebebi, müşteri açıklaması, iç not…"
                    value={noteEdit[selected.id] ?? selected.returnNote ?? ''}
                    onChange={(e) =>
                      setNoteEdit((prev) => ({ ...prev, [selected.id]: e.target.value }))
                    }
                  />
                  <button
                    onClick={() => saveNote(selected)}
                    className="mt-2 bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-1.5 rounded-lg transition-colors"
                  >
                    Notu Kaydet
                  </button>
                </div>

                {/* Upload video */}
                <div>
                  <div className="text-xs font-semibold uppercase text-gray-500 mb-2">Video Ekle</div>
                  <div className="flex gap-2 flex-wrap">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="video/*"
                      className="flex-1 min-w-0 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-300 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-gray-700 file:text-white"
                    />
                    <input
                      type="text"
                      placeholder="Video notu (opsiyonel)"
                      value={videoNote}
                      onChange={(e) => setVideoNote(e.target.value)}
                      className="w-48 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={uploadVideo}
                      disabled={uploading}
                      className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                    >
                      {uploading ? 'Yükleniyor…' : 'Yükle'}
                    </button>
                  </div>
                </div>

                {/* Videos list */}
                {selected.returnVideos.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold uppercase text-gray-500 mb-2">
                      Kayıtlı Videolar ({selected.returnVideos.length})
                    </div>
                    <div className="space-y-3">
                      {selected.returnVideos.map((v) => (
                        <div key={v.id} className="bg-gray-800 rounded-lg p-3">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <div className="text-sm font-medium">{v.originalName ?? v.filename}</div>
                              <div className="text-xs text-gray-400 mt-0.5">
                                {fmtDate(v.createdAt)}
                                {v.note ? ` · ${v.note}` : ''}
                              </div>
                            </div>
                            <button
                              onClick={() => deleteVideo(selected.id, v.id)}
                              className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-900/30 transition-colors flex-shrink-0"
                            >
                              Sil
                            </button>
                          </div>
                          <video
                            controls
                            className="w-full rounded max-h-64 bg-black"
                            src={`${API}/returns/videos/${v.filename}/stream`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
                Soldaki listeden bir iade seçin
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
