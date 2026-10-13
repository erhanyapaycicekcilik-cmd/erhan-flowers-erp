'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface CategoryItem {
  slug: string | null
  label: string
  desc: string
  image: string
  active: boolean
}

export default function KategorilerAdmin() {
  const [items, setItems] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/admin/site-config')
      .then(r => r.json())
      .then(cfg => { setItems(cfg.categories ?? []); setLoading(false) })
  }, [])

  function update(idx: number, field: keyof CategoryItem, value: string | boolean | null) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it))
  }

  async function save() {
    setSaving(true); setMsg('')
    const cfg = await fetch('/api/admin/site-config').then(r => r.json())
    const res = await fetch('/api/admin/site-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...cfg, categories: items }),
    })
    setSaving(false)
    setMsg(res.ok ? '✓ Kaydedildi' : '✗ Hata oluştu')
  }

  if (loading) return <div className="p-10 text-center text-[#8C8A82]">Yükleniyor…</div>

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin" className="text-[#8C8A82] hover:text-[#0D1510] text-sm">← Geri</Link>
        <h1 className="font-display text-2xl font-light text-[#0D1510]">Kategori Grid</h1>
        <span className="text-xs text-[#8C8A82]">Anasayfadaki kategori kartları</span>
      </div>

      <div className="space-y-4">
        {items.map((item, i) => (
          <div key={i} className="bg-white rounded-2xl border border-[#E0DDD4] p-5 flex gap-5">
            <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 relative bg-[#F4F2EC]">
              {item.image && (
                <Image
                  src={item.image}
                  alt={item.label}
                  fill
                  className="object-cover"
                  unoptimized={item.image.startsWith('http')}
                />
              )}
            </div>
            <div className="flex-1 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#8C8A82] mb-1">Başlık</label>
                  <input
                    value={item.label}
                    onChange={e => update(i, 'label', e.target.value)}
                    className="w-full border border-[#D6D2C4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5C7A62]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#8C8A82] mb-1">Slug (URL)</label>
                  <input
                    value={item.slug ?? ''}
                    onChange={e => update(i, 'slug', e.target.value || null)}
                    className="w-full border border-[#D6D2C4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5C7A62]"
                    placeholder="(boş = tüm ürünler)"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#8C8A82] mb-1">Açıklama</label>
                <input
                  value={item.desc}
                  onChange={e => update(i, 'desc', e.target.value)}
                  className="w-full border border-[#D6D2C4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5C7A62]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#8C8A82] mb-1">Görsel URL</label>
                <input
                  value={item.image}
                  onChange={e => update(i, 'image', e.target.value)}
                  className="w-full border border-[#D6D2C4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5C7A62] font-mono"
                />
              </div>
            </div>
            <div className="flex flex-col items-center justify-center gap-2 flex-shrink-0">
              <label className="text-xs text-[#8C8A82]">Aktif</label>
              <button
                onClick={() => update(i, 'active', !item.active)}
                className={`w-12 h-6 rounded-full transition-colors ${item.active ? 'bg-[#5C7A62]' : 'bg-[#D6D2C4]'}`}
              >
                <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform mx-0.5 ${item.active ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 mt-6">
        <button
          onClick={save}
          disabled={saving}
          className="bg-[#0D1510] text-[#F4F2EC] px-8 py-3 rounded-full text-sm font-semibold hover:bg-[#1E3A28] transition-colors disabled:opacity-50"
        >
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        {msg && <span className={`text-sm font-medium ${msg.startsWith('✓') ? 'text-[#5C7A62]' : 'text-red-600'}`}>{msg}</span>}
      </div>
    </div>
  )
}
