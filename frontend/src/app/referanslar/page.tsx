'use client'

import { useEffect, useState } from 'react'
import { AdminShell } from '@/components/AdminShell'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

type Ref = {
  id: number
  title: string
  description: string | null
  location: string | null
  imageUrls: string[]
  sortOrder: number
  status: string
}

const empty = { title: '', description: '', location: '', imageUrls: '', sortOrder: '0' }

export default function ReferanslarPage() {
  const [refs, setRefs] = useState<Ref[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<typeof empty | null>(null)
  const [editing, setEditing] = useState<Ref | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`${API}/project-references`, { credentials: 'include' })
      setRefs(await res.json())
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function save() {
    if (!form?.title.trim()) return
    setSaving(true)
    try {
      const url = editing ? `${API}/project-references/${editing.id}` : `${API}/project-references`
      await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          location: form.location.trim() || null,
          imageUrls: form.imageUrls.split('\n').map(s => s.trim()).filter(Boolean),
          sortOrder: Number(form.sortOrder) || 0,
        }),
      })
      setForm(null); setEditing(null)
      await load()
    } finally { setSaving(false) }
  }

  async function remove(id: number) {
    if (!confirm('Bu referansı silmek istediğine emin misin?')) return
    await fetch(`${API}/project-references/${id}`, { method: 'DELETE', credentials: 'include' })
    await load()
  }

  async function toggleStatus(r: Ref) {
    await fetch(`${API}/project-references/${r.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status: r.status === 'ACTIVE' ? 'PASSIVE' : 'ACTIVE' }),
    })
    await load()
  }

  function openNew() {
    setEditing(null)
    setForm({ ...empty })
  }

  function openEdit(r: Ref) {
    setEditing(r)
    setForm({
      title: r.title,
      description: r.description ?? '',
      location: r.location ?? '',
      imageUrls: r.imageUrls.join('\n'),
      sortOrder: String(r.sortOrder),
    })
  }

  return (
    <AdminShell>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Referans Projeler</h1>
            <p className="text-sm text-gray-500 mt-1">florayapaycicek.com/referanslarimiz sayfasında gösterilir</p>
          </div>
          <button onClick={openNew} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">
            + Yeni Proje
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Yükleniyor...</div>
        ) : refs.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-4">🌿</p>
            <p>Henüz referans proje eklenmedi.</p>
            <button onClick={openNew} className="mt-4 text-blue-600 text-sm hover:underline">İlk projeyi ekle</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {refs.map((r) => (
              <div key={r.id} className={`bg-white rounded-2xl border overflow-hidden ${r.status === 'PASSIVE' ? 'opacity-50 border-gray-200' : 'border-gray-200'}`}>
                {/* Görseller */}
                {r.imageUrls.length > 0 ? (
                  <div className="flex gap-1 h-40 overflow-hidden">
                    {r.imageUrls.slice(0, 3).map((url, i) => (
                      <img key={i} src={url} alt="" className="object-cover flex-1 min-w-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    ))}
                  </div>
                ) : (
                  <div className="h-40 bg-gray-50 flex items-center justify-center text-gray-300 text-4xl">🌸</div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 text-sm leading-snug">{r.title}</h3>
                    <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${r.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {r.status === 'ACTIVE' ? 'Yayında' : 'Gizli'}
                    </span>
                  </div>
                  {r.location && <p className="text-xs text-gray-400 mb-1">📍 {r.location}</p>}
                  {r.description && <p className="text-xs text-gray-500 line-clamp-2 mb-3">{r.description}</p>}
                  <div className="flex gap-3 text-xs">
                    <button onClick={() => openEdit(r)} className="text-blue-600 hover:underline">Düzenle</button>
                    <button onClick={() => toggleStatus(r)} className="text-gray-500 hover:underline">
                      {r.status === 'ACTIVE' ? 'Gizle' : 'Yayınla'}
                    </button>
                    <button onClick={() => remove(r.id)} className="text-red-500 hover:underline">Sil</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {form && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
              <h2 className="font-bold text-gray-900 text-lg mb-4">
                {editing ? 'Projeyi Düzenle' : 'Yeni Referans Proje'}
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Proje Adı *</label>
                  <input
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="ör. Akdeniz Otel Lobi Düzenlemesi"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Konum</label>
                  <input
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="ör. Antalya, Side"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Açıklama</label>
                  <textarea
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Bu proje hakkında kısa açıklama..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Görsel URL'leri <span className="text-gray-400 font-normal">(her satıra bir URL)</span>
                  </label>
                  <textarea
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={4}
                    value={form.imageUrls}
                    onChange={(e) => setForm({ ...form, imageUrls: e.target.value })}
                    placeholder="https://i.ibb.co/abc123/proje.jpg&#10;https://i.ibb.co/def456/proje2.jpg"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Görseli <a href="https://imgbb.com" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">imgbb.com</a>'a yükle → "Direct Link" kopyala → buraya yapıştır
                  </p>
                  {/* Önizleme */}
                  {form.imageUrls.split('\n').filter(s => s.trim().startsWith('http')).length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {form.imageUrls.split('\n').filter(s => s.trim().startsWith('http')).slice(0, 5).map((url, i) => (
                        <img key={i} src={url.trim()} alt="" className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Sıra (küçük = önce)</label>
                  <input type="number"
                    className="mt-1 w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={save} disabled={saving || !form.title.trim()}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button onClick={() => { setForm(null); setEditing(null) }}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                  İptal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
