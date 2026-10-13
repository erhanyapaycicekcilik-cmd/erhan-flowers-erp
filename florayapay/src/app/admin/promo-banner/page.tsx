'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface PromoBannerItem {
  id: string
  title: string
  subtitle: string
  desc: string
  href: string
  cta: string
  bg: string
  active: boolean
}

export default function PromoBannerAdmin() {
  const [items, setItems] = useState<PromoBannerItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/admin/site-config')
      .then(r => r.json())
      .then(cfg => { setItems(cfg.promoBanners ?? []); setLoading(false) })
  }, [])

  function update(idx: number, field: keyof PromoBannerItem, value: string | boolean) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it))
  }

  async function save() {
    setSaving(true); setMsg('')
    const cfg = await fetch('/api/admin/site-config').then(r => r.json())
    const res = await fetch('/api/admin/site-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...cfg, promoBanners: items }),
    })
    setSaving(false)
    setMsg(res.ok ? '✓ Kaydedildi' : '✗ Hata oluştu')
  }

  if (loading) return <div className="p-10 text-center text-[#8C8A82]">Yükleniyor…</div>

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin" className="text-[#8C8A82] hover:text-[#0D1510] text-sm">← Geri</Link>
        <h1 className="font-display text-2xl font-light text-[#0D1510]">Promo Bannerlar</h1>
        <span className="text-xs text-[#8C8A82]">Anasayfadaki koyu renkli banner kartları</span>
      </div>

      <div className="space-y-6">
        {items.map((item, i) => (
          <div key={i} className="bg-white rounded-2xl border border-[#E0DDD4] overflow-hidden">
            {/* Preview */}
            <div className="p-6 rounded-t-2xl flex flex-col gap-1 min-h-[120px]" style={{ backgroundColor: item.bg }}>
              <p className="text-xs uppercase tracking-widest text-[#7AB88A] font-medium">{item.subtitle}</p>
              <h3 className="text-2xl font-light text-white">{item.title}</h3>
              <p className="text-sm text-white/60">{item.desc}</p>
              <span className="text-sm font-semibold text-[#A8C9A0] mt-2">{item.cta} →</span>
            </div>

            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#8C8A82] mb-1">Başlık</label>
                  <input value={item.title} onChange={e => update(i, 'title', e.target.value)}
                    className="w-full border border-[#D6D2C4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5C7A62]" />
                </div>
                <div>
                  <label className="block text-xs text-[#8C8A82] mb-1">Alt başlık</label>
                  <input value={item.subtitle} onChange={e => update(i, 'subtitle', e.target.value)}
                    className="w-full border border-[#D6D2C4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5C7A62]" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#8C8A82] mb-1">Açıklama</label>
                <input value={item.desc} onChange={e => update(i, 'desc', e.target.value)}
                  className="w-full border border-[#D6D2C4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5C7A62]" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-[#8C8A82] mb-1">Link (href)</label>
                  <input value={item.href} onChange={e => update(i, 'href', e.target.value)}
                    className="w-full border border-[#D6D2C4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5C7A62] font-mono" />
                </div>
                <div>
                  <label className="block text-xs text-[#8C8A82] mb-1">Buton Metni</label>
                  <input value={item.cta} onChange={e => update(i, 'cta', e.target.value)}
                    className="w-full border border-[#D6D2C4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5C7A62]" />
                </div>
                <div>
                  <label className="block text-xs text-[#8C8A82] mb-1">Arka Plan Rengi</label>
                  <div className="flex gap-2">
                    <input value={item.bg} onChange={e => update(i, 'bg', e.target.value)}
                      className="flex-1 border border-[#D6D2C4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5C7A62] font-mono" />
                    <input type="color" value={item.bg} onChange={e => update(i, 'bg', e.target.value)}
                      className="w-10 h-10 rounded-lg border border-[#D6D2C4] cursor-pointer" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={() => update(i, 'active', !item.active)}
                  className={`w-12 h-6 rounded-full transition-colors ${item.active ? 'bg-[#5C7A62]' : 'bg-[#D6D2C4]'}`}
                >
                  <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform mx-0.5 ${item.active ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
                <span className="text-xs text-[#8C8A82]">{item.active ? 'Aktif' : 'Pasif'}</span>
              </div>
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
