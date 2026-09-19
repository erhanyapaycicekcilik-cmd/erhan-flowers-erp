'use client'

import { useEffect, useState } from 'react'
import { AdminShell } from '@/components/AdminShell'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export default function KategorilerPage() {
  const [cats, setCats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<{ name: string; parentId: string; coverImageUrl: string } | null>(null)
  const [editing, setEditing] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`${API}/shop-categories`, { credentials: 'include' })
      setCats(await res.json())
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function save() {
    if (!form?.name.trim()) return
    setSaving(true)
    try {
      const url = editing ? `${API}/shop-categories/${editing.id}` : `${API}/shop-categories`
      await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name.trim(),
          parentId: form.parentId ? Number(form.parentId) : null,
          coverImageUrl: form.coverImageUrl.trim() || null,
        }),
      })
      setForm(null); setEditing(null)
      await load()
    } finally { setSaving(false) }
  }

  async function remove(id: number) {
    if (!confirm('Bu kategoriyi silmek istediğine emin misin?')) return
    await fetch(`${API}/shop-categories/${id}`, { method: 'DELETE', credentials: 'include' })
    await load()
  }

  function openNew(parentId?: number) {
    setEditing(null)
    setForm({ name: '', parentId: parentId ? String(parentId) : '', coverImageUrl: '' })
  }

  function openEdit(cat: any) {
    setEditing(cat)
    setForm({ name: cat.name, parentId: cat.parentId ? String(cat.parentId) : '', coverImageUrl: cat.coverImageUrl ?? '' })
  }

  // Tüm kategoriler düz liste (modal select için)
  const allFlat: any[] = []
  cats.forEach((c) => { allFlat.push(c); c.children?.forEach((ch: any) => allFlat.push(ch)) })

  return (
    <AdminShell>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kategoriler</h1>
            <p className="text-sm text-gray-500 mt-1">E-ticaret / katalog kategori yönetimi</p>
          </div>
          <button
            onClick={() => openNew()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700"
          >
            + Yeni Kategori
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Yükleniyor...</div>
        ) : (
          <div className="space-y-4">
            {cats.map((cat) => (
              <div key={cat.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Ana kategori */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    {cat.coverImageUrl && (
                      <img src={cat.coverImageUrl} alt="" className="w-8 h-8 rounded object-cover" />
                    )}
                    <span className="font-semibold text-gray-900">{cat.name}</span>
                    <span className="text-xs text-gray-400 font-mono">{cat.slug}</span>
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                      {cat.children?.length ?? 0} alt
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openNew(cat.id)} className="text-xs text-blue-600 hover:underline">+ Alt Ekle</button>
                    <button onClick={() => openEdit(cat)} className="text-xs text-gray-500 hover:underline">Düzenle</button>
                    <button onClick={() => remove(cat.id)} className="text-xs text-red-500 hover:underline">Sil</button>
                  </div>
                </div>
                {/* Alt kategoriler */}
                {cat.children?.length > 0 && (
                  <div className="divide-y divide-gray-100">
                    {cat.children.map((ch: any) => (
                      <div key={ch.id} className="flex items-center justify-between px-6 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-xs">└</span>
                          {ch.coverImageUrl && (
                            <img src={ch.coverImageUrl} alt="" className="w-6 h-6 rounded object-cover" />
                          )}
                          <span className="text-sm text-gray-800">{ch.name}</span>
                          <span className="text-xs text-gray-400 font-mono">{ch.slug}</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(ch)} className="text-xs text-gray-500 hover:underline">Düzenle</button>
                          <button onClick={() => remove(ch.id)} className="text-xs text-red-500 hover:underline">Sil</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {form && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
              <h2 className="font-bold text-gray-900 text-lg mb-4">
                {editing ? 'Kategori Düzenle' : 'Yeni Kategori'}
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Kategori Adı *</label>
                  <input
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="ör. Yeşil Ağaçlar"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Üst Kategori</label>
                  <select
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.parentId}
                    onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                  >
                    <option value="">— Ana Kategori —</option>
                    {cats.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Kapak Görseli URL</label>
                  <input
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.coverImageUrl}
                    onChange={(e) => setForm({ ...form, coverImageUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button
                  onClick={save}
                  disabled={saving || !form.name.trim()}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button
                  onClick={() => { setForm(null); setEditing(null) }}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
                >
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
