'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Slide {
  id: string
  image: string
  tag: string
  title: string
  accent: string
  description: string
  active: boolean
}

interface Konsept {
  ay: string
  tema: string
  aciklama: string
}

interface BannerConfig {
  slides: Slide[]
  konsept: Konsept
}

export default function BannerYonetimi() {
  const router = useRouter()
  const [config, setConfig] = useState<BannerConfig | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [editSlide, setEditSlide] = useState<Slide | null>(null)

  useEffect(() => {
    fetch('/api/admin/banner')
      .then(r => r.json())
      .then(setConfig)
      .catch(() => setMsg('Yüklenemedi'))
  }, [])

  async function save(updated: BannerConfig) {
    setSaving(true)
    setMsg('')
    const res = await fetch('/api/admin/banner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
    setSaving(false)
    if (res.ok) {
      setConfig(updated)
      setMsg('✅ Kaydedildi!')
      setEditSlide(null)
      setTimeout(() => setMsg(''), 3000)
    } else {
      setMsg('❌ Kaydetme hatası')
    }
  }

  function toggleActive(id: string) {
    if (!config) return
    const slides = config.slides.map(s => s.id === id ? { ...s, active: !s.active } : s)
    save({ ...config, slides })
  }

  function removeSlide(id: string) {
    if (!config || !confirm('Bu banner silinsin mi?')) return
    save({ ...config, slides: config.slides.filter(s => s.id !== id) })
  }

  function addSlide() {
    const newSlide: Slide = {
      id: Date.now().toString(),
      image: '',
      tag: 'Yeni Koleksiyon',
      title: 'Başlık,',
      accent: 'Vurgu Metin',
      description: 'Açıklama metni',
      active: true,
    }
    setEditSlide(newSlide)
  }

  function saveSlide(slide: Slide) {
    if (!config) return
    const exists = config.slides.find(s => s.id === slide.id)
    const slides = exists
      ? config.slides.map(s => s.id === slide.id ? slide : s)
      : [...config.slides, slide]
    save({ ...config, slides })
  }

  function saveKonsept(k: Konsept) {
    if (!config) return
    save({ ...config, konsept: k })
  }

  if (!config) return <div className="p-10 text-gray-500">Yükleniyor…</div>

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[#0D1510]">Banner Yönetimi</h1>
          <p className="text-sm text-gray-500 mt-1">Ana sayfa slider görsellerini düzenle</p>
        </div>
        <button onClick={() => router.push('/admin')} className="text-sm text-gray-500 hover:text-gray-700">
          ← Panele Dön
        </button>
      </div>

      {msg && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
          {msg}
        </div>
      )}

      {/* Aylık Konsept */}
      <div className="bg-white border border-[#E0DDD4] rounded-2xl p-6 mb-6">
        <h2 className="font-semibold text-[#0D1510] mb-4">🎨 Aylık Konsept</h2>
        <KonseptForm konsept={config.konsept} onSave={saveKonsept} saving={saving} />
      </div>

      {/* Banner Listesi */}
      <div className="bg-white border border-[#E0DDD4] rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-[#0D1510]">🖼 Slider Bannerleri ({config.slides.length})</h2>
          <button
            onClick={addSlide}
            className="bg-[#0D1510] text-white text-sm px-4 py-2 rounded-xl hover:bg-[#1E3A28] transition-colors"
          >
            + Banner Ekle
          </button>
        </div>

        <div className="space-y-3">
          {config.slides.map((slide, i) => (
            <div key={slide.id} className={`border rounded-xl p-4 transition-colors ${slide.active ? 'border-[#E0DDD4] bg-white' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
              <div className="flex items-start gap-4">
                {/* Önizleme */}
                {slide.image && (
                  <img src={slide.image} alt="" className="w-20 h-14 object-cover rounded-lg flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-400">#{i + 1}</span>
                    <span className="text-xs font-medium text-[#5C7A62] bg-[#f0fdf4] px-2 py-0.5 rounded-full">{slide.tag}</span>
                    {!slide.active && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Gizli</span>}
                  </div>
                  <p className="font-medium text-[#0D1510] text-sm truncate">{slide.title} <em className="text-[#22c55e] not-italic">{slide.accent}</em></p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{slide.image}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setEditSlide(slide)}
                    className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    Düzenle
                  </button>
                  <button
                    onClick={() => toggleActive(slide.id)}
                    className={`text-xs px-3 py-1.5 rounded-lg ${slide.active ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' : 'bg-green-50 text-green-700 border border-green-200'}`}
                  >
                    {slide.active ? 'Gizle' : 'Göster'}
                  </button>
                  <button
                    onClick={() => removeSlide(slide.id)}
                    className="text-xs px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100"
                  >
                    Sil
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Slide Edit Modal */}
      {editSlide && (
        <SlideEditModal
          slide={editSlide}
          onSave={saveSlide}
          onClose={() => setEditSlide(null)}
          saving={saving}
        />
      )}
    </div>
  )
}

function KonseptForm({ konsept, onSave, saving }: { konsept: Konsept; onSave: (k: Konsept) => void; saving: boolean }) {
  const [form, setForm] = useState(konsept)
  useEffect(() => setForm(konsept), [konsept])

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Ay</label>
          <input
            value={form.ay}
            onChange={e => setForm({ ...form, ay: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#22c55e]"
            placeholder="Eylül 2026"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Tema</label>
          <input
            value={form.tema}
            onChange={e => setForm({ ...form, tema: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#22c55e]"
            placeholder="Sonbahar Yeşili"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-1">Açıklama</label>
        <input
          value={form.aciklama}
          onChange={e => setForm({ ...form, aciklama: e.target.value })}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#22c55e]"
        />
      </div>
      <button
        onClick={() => onSave(form)}
        disabled={saving}
        className="bg-[#22c55e] text-white text-sm px-5 py-2 rounded-xl hover:bg-[#16a34a] disabled:opacity-50 transition-colors"
      >
        {saving ? 'Kaydediliyor…' : 'Konsepti Kaydet'}
      </button>
    </div>
  )
}

function SlideEditModal({ slide, onSave, onClose, saving }: {
  slide: Slide; onSave: (s: Slide) => void; onClose: () => void; saving: boolean
}) {
  const [form, setForm] = useState(slide)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[#0D1510]">Banner Düzenle</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1">Görsel URL</label>
          <input
            value={form.image}
            onChange={e => setForm({ ...form, image: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#22c55e]"
            placeholder="https://images.unsplash.com/..."
          />
          {form.image && (
            <img src={form.image} alt="" className="mt-2 w-full h-32 object-cover rounded-xl" />
          )}
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1">Etiket (küçük üst yazı)</label>
          <input
            value={form.tag}
            onChange={e => setForm({ ...form, tag: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#22c55e]"
            placeholder="Yapay Ağaç Koleksiyonu"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Başlık (beyaz)</label>
            <input
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#22c55e]"
              placeholder="Doğanın Güzelliği,"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Vurgu (yeşil)</label>
            <input
              value={form.accent}
              onChange={e => setForm({ ...form, accent: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#22c55e]"
              placeholder="Ömür Boyu"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1">Açıklama</label>
          <textarea
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#22c55e] resize-none"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.active}
            onChange={e => setForm({ ...form, active: e.target.checked })}
            className="w-4 h-4 accent-[#22c55e]"
          />
          <span className="text-sm text-gray-700">Aktif (sitede göster)</span>
        </label>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => onSave(form)}
            disabled={saving}
            className="flex-1 bg-[#0D1510] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#1E3A28] disabled:opacity-50 transition-colors"
          >
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">
            İptal
          </button>
        </div>
      </div>
    </div>
  )
}
