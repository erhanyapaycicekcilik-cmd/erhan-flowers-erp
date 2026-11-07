'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createGroup } from '../actions'

const CATEGORIES = [
  'Yapay Ağaç', 'Yapay Çiçek', 'Bambu', 'Sarmaşık', 'Bodur Ağaç',
  'Dikey Bahçe', 'Saksı & Vazo', 'Kaktüs & Sukulent', 'Orkide', 'Palmiye', 'Ficus', 'Lavanta',
]

export default function NewGroupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [mainImage, setMainImage] = useState('')
  const [category, setCategory] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const res = await createGroup({ name: name.trim(), description: description || undefined, mainImage: mainImage || undefined, category: category || undefined })
    setSaving(false)
    if (res.error) { setError(res.error); return }
    router.push(`/admin/gruplar/${res.data.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/gruplar" className="text-[#8C8A82] hover:text-[#0D1510] text-sm">← Gruplar</Link>
        <h1 className="font-display text-2xl font-light text-[#0D1510]">Yeni Grup</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#E0DDD4] p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-[#5C5C52] mb-1.5">Grup Adı *</label>
          <input value={name} onChange={e => setName(e.target.value)} required
            placeholder="örn: Benjamin Ağacı, Bambu Çiçeği"
            className="w-full px-4 py-2.5 rounded-xl border border-[#E0DDD4] text-sm focus:outline-none focus:ring-2 focus:ring-[#5C7A62]" />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#5C5C52] mb-1.5">Kategori</label>
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-[#E0DDD4] text-sm focus:outline-none focus:ring-2 focus:ring-[#5C7A62] bg-white">
            <option value="">— seç —</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#5C5C52] mb-1.5">Ana Görsel URL (opsiyonel)</label>
          <input value={mainImage} onChange={e => setMainImage(e.target.value)}
            placeholder="https://..."
            className="w-full px-4 py-2.5 rounded-xl border border-[#E0DDD4] text-sm focus:outline-none focus:ring-2 focus:ring-[#5C7A62]" />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#5C5C52] mb-1.5">Açıklama (opsiyonel)</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
            className="w-full px-4 py-2.5 rounded-xl border border-[#E0DDD4] text-sm focus:outline-none focus:ring-2 focus:ring-[#5C7A62] resize-none" />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={saving || !name.trim()}
            className="flex-1 py-3 bg-[#5C7A62] text-white rounded-xl font-semibold text-sm disabled:opacity-50 hover:bg-[#4a6350]">
            {saving ? 'Oluşturuluyor…' : 'Grup Oluştur →'}
          </button>
          <Link href="/admin/gruplar"
            className="px-5 py-3 bg-[#F4F2EC] text-[#5C5C52] rounded-xl text-sm font-medium hover:bg-[#E0DDD4]">
            İptal
          </Link>
        </div>
      </form>
    </div>
  )
}
