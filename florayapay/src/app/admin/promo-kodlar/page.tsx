'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { PromoCode } from '@/lib/site-config'

const EMPTY: PromoCode = {
  code: '',
  type: 'percent',
  value: 10,
  active: true,
  description: '',
  usageLimit: 0,
  usedCount: 0,
  expiresAt: null,
}

export default function PromoKodlarPage() {
  const [codes, setCodes] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState<PromoCode>(EMPTY)
  const [editIdx, setEditIdx] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/admin/site-config')
      .then(r => r.json())
      .then(cfg => {
        setCodes(cfg.promoCodes ?? [])
        setLoading(false)
      })
  }, [])

  async function save(newCodes: PromoCode[]) {
    setSaving(true)
    setMsg('')
    try {
      const cfg = await fetch('/api/admin/site-config').then(r => r.json())
      await fetch('/api/admin/site-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...cfg, promoCodes: newCodes }),
      })
      setCodes(newCodes)
      setMsg('Kaydedildi ✓')
    } catch {
      setMsg('Hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  function addOrUpdate() {
    if (!form.code.trim() || !form.description.trim()) return
    const code: PromoCode = { ...form, code: form.code.toUpperCase().trim() }
    let newCodes: PromoCode[]
    if (editIdx !== null) {
      newCodes = codes.map((c, i) => (i === editIdx ? code : c))
      setEditIdx(null)
    } else {
      if (codes.some(c => c.code.toUpperCase() === code.code)) {
        setMsg('Bu kod zaten mevcut')
        return
      }
      newCodes = [...codes, code]
    }
    setForm(EMPTY)
    save(newCodes)
  }

  function remove(idx: number) {
    if (!confirm('Bu kodu silmek istediğinize emin misiniz?')) return
    save(codes.filter((_, i) => i !== idx))
  }

  function edit(idx: number) {
    setForm(codes[idx])
    setEditIdx(idx)
  }

  function toggle(idx: number) {
    const newCodes = codes.map((c, i) => (i === idx ? { ...c, active: !c.active } : c))
    save(newCodes)
  }

  if (loading) return <div className="p-8 text-gray-500">Yükleniyor…</div>

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600">← Admin</Link>
        <h1 className="text-xl font-bold">Promosyon Kodları</h1>
      </div>

      {/* Yeni kod formu */}
      <div className="bg-white border rounded-xl p-5 mb-6">
        <h2 className="font-semibold mb-4">{editIdx !== null ? 'Kodu Düzenle' : 'Yeni Kod Ekle'}</h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Kod (büyük harf)</label>
            <input
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="TAKIPET10"
              className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Açıklama</label>
            <input
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Instagram takip indirimi"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">İndirim türü</label>
            <select
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value as 'percent' | 'fixed' }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="percent">Yüzde (%)</option>
              <option value="fixed">Sabit tutar (₺)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              {form.type === 'percent' ? 'Yüzde (örn. 10 = %10)' : 'Tutar (₺)'}
            </label>
            <input
              type="number"
              min={1}
              value={form.value}
              onChange={e => setForm(f => ({ ...f, value: Number(e.target.value) }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Kullanım limiti (0=sınırsız)</label>
            <input
              type="number"
              min={0}
              value={form.usageLimit}
              onChange={e => setForm(f => ({ ...f, usageLimit: Number(e.target.value) }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Son geçerlilik tarihi</label>
            <input
              type="date"
              value={form.expiresAt ? form.expiresAt.slice(0, 10) : ''}
              onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value ? e.target.value : null }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <button
            onClick={addOrUpdate}
            disabled={saving || !form.code.trim() || !form.description.trim()}
            className="px-5 py-2 bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-green-800"
          >
            {saving ? 'Kaydediliyor…' : editIdx !== null ? 'Güncelle' : 'Ekle'}
          </button>
          {editIdx !== null && (
            <button onClick={() => { setForm(EMPTY); setEditIdx(null) }} className="text-sm text-gray-500 hover:text-gray-700">
              İptal
            </button>
          )}
          {msg && <span className="text-sm text-green-700">{msg}</span>}
        </div>
      </div>

      {/* Kod listesi */}
      <div className="space-y-3">
        {codes.length === 0 && (
          <div className="text-center text-gray-400 py-8">Henüz promosyon kodu yok</div>
        )}
        {codes.map((c, i) => (
          <div key={c.code} className={`bg-white border rounded-xl p-4 flex items-center gap-4 ${!c.active ? 'opacity-50' : ''}`}>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-lg">{c.code}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {c.active ? 'Aktif' : 'Pasif'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-0.5">{c.description}</p>
              <div className="flex gap-3 text-xs text-gray-400 mt-1">
                <span>{c.type === 'percent' ? `%${c.value} indirim` : `₺${c.value} indirim`}</span>
                <span>Kullanım: {c.usedCount}{c.usageLimit > 0 ? `/${c.usageLimit}` : ''}</span>
                {c.expiresAt && <span>Son: {new Date(c.expiresAt).toLocaleDateString('tr-TR')}</span>}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toggle(i)} className="text-xs px-3 py-1.5 border rounded-lg hover:bg-gray-50">
                {c.active ? 'Pasif Et' : 'Aktif Et'}
              </button>
              <button onClick={() => edit(i)} className="text-xs px-3 py-1.5 border rounded-lg hover:bg-gray-50">
                Düzenle
              </button>
              <button onClick={() => remove(i)} className="text-xs px-3 py-1.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50">
                Sil
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
        <strong>Örnek kodlar:</strong>
        <ul className="mt-2 space-y-1 list-disc ml-4">
          <li><code className="font-mono">TAKIPET10</code> — Instagram hesabımızı takip et, %10 indirim kazan</li>
          <li><code className="font-mono">YORUMYAP15</code> — Trendyol'a yorum yap, %15 indirim kazan</li>
          <li><code className="font-mono">ILKALISVERIS</code> — İlk alışverişe özel sabit ₺200 indirim</li>
        </ul>
      </div>
    </div>
  )
}
