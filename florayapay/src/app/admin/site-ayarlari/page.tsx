'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface SiteSettings {
  announcementBar: string
  phone: string
  whatsapp: string
  address: string
  freeShippingThreshold: number
  workingHours: string
  instagramHandle: string
  facebookUrl: string
  ibanBanka: string
  ibanNo: string
  ibanHesapSahibi: string
  ibanSwift: string
}

export default function SiteAyarlari() {
  const [form, setForm] = useState<SiteSettings>({
    announcementBar: '',
    phone: '',
    whatsapp: '',
    address: '',
    freeShippingThreshold: 1000,
    workingHours: '',
    instagramHandle: '',
    facebookUrl: '',
    ibanBanka: '',
    ibanNo: '',
    ibanHesapSahibi: '',
    ibanSwift: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const [tamiTesting, setTamiTesting] = useState(false)
  const [tamiResult, setTamiResult] = useState<Record<string, unknown> | null>(null)

  async function testTami() {
    setTamiTesting(true)
    setTamiResult(null)
    try {
      const res = await fetch('/api/payment/tami/test')
      setTamiResult(await res.json())
    } catch {
      setTamiResult({ ok: false, error: 'Sunucuya bağlanılamadı' })
    } finally {
      setTamiTesting(false)
    }
  }

  useEffect(() => {
    fetch('/api/admin/site-config')
      .then(r => r.json())
      .then(cfg => {
        setForm({
          announcementBar: cfg.announcementBar ?? '',
          phone: cfg.phone ?? '',
          whatsapp: cfg.whatsapp ?? '',
          address: cfg.address ?? '',
          freeShippingThreshold: cfg.freeShippingThreshold ?? 1000,
          workingHours: cfg.workingHours ?? '',
          instagramHandle: cfg.instagramHandle ?? '',
          facebookUrl: cfg.facebookUrl ?? '',
          ibanBanka: cfg.ibanBanka ?? '',
          ibanNo: cfg.ibanNo ?? '',
          ibanHesapSahibi: cfg.ibanHesapSahibi ?? '',
          ibanSwift: cfg.ibanSwift ?? '',
        })
        setLoading(false)
      })
  }, [])

  async function save() {
    setSaving(true)
    setMsg('')
    const cfg = await fetch('/api/admin/site-config').then(r => r.json())
    const res = await fetch('/api/admin/site-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...cfg, ...form }),
    })
    setSaving(false)
    setMsg(res.ok ? '✓ Kaydedildi' : '✗ Hata oluştu')
  }

  if (loading) return <div className="p-10 text-center text-[#8C8A82]">Yükleniyor…</div>

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin" className="text-[#8C8A82] hover:text-[#0D1510] text-sm">← Geri</Link>
        <h1 className="font-display text-2xl font-light text-[#0D1510]">Site Ayarları</h1>
      </div>

      <div className="space-y-6 bg-white rounded-2xl border border-[#E0DDD4] p-6">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-[#5C7A62] mb-2">Duyuru Çubuğu (header)</label>
          <input
            value={form.announcementBar}
            onChange={e => setForm(f => ({ ...f, announcementBar: e.target.value }))}
            className="w-full border border-[#D6D2C4] rounded-xl px-4 py-2.5 text-sm text-[#0D1510] focus:outline-none focus:border-[#5C7A62]"
            placeholder="🚚 1.000 TL ve üzeri ÜCRETSİZ kargo  ·  📞 0544 654 62 20"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-[#5C7A62] mb-2">Telefon</label>
            <input
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className="w-full border border-[#D6D2C4] rounded-xl px-4 py-2.5 text-sm text-[#0D1510] focus:outline-none focus:border-[#5C7A62]"
              placeholder="0544 654 62 20"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-[#5C7A62] mb-2">WhatsApp (ülke kodu ile)</label>
            <input
              value={form.whatsapp}
              onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
              className="w-full border border-[#D6D2C4] rounded-xl px-4 py-2.5 text-sm text-[#0D1510] focus:outline-none focus:border-[#5C7A62]"
              placeholder="905446546220"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-[#5C7A62] mb-2">Adres</label>
          <input
            value={form.address}
            onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
            className="w-full border border-[#D6D2C4] rounded-xl px-4 py-2.5 text-sm text-[#0D1510] focus:outline-none focus:border-[#5C7A62]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-[#5C7A62] mb-2">Ücretsiz Kargo Limiti (₺)</label>
            <input
              type="number"
              value={form.freeShippingThreshold}
              onChange={e => setForm(f => ({ ...f, freeShippingThreshold: Number(e.target.value) }))}
              className="w-full border border-[#D6D2C4] rounded-xl px-4 py-2.5 text-sm text-[#0D1510] focus:outline-none focus:border-[#5C7A62]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-[#5C7A62] mb-2">Çalışma Saatleri</label>
            <input
              value={form.workingHours}
              onChange={e => setForm(f => ({ ...f, workingHours: e.target.value }))}
              className="w-full border border-[#D6D2C4] rounded-xl px-4 py-2.5 text-sm text-[#0D1510] focus:outline-none focus:border-[#5C7A62]"
              placeholder="Pzt–Cum 09:00–18:00"
            />
          </div>
        </div>

        {/* IBAN / EFT Bilgileri */}
        <div className="border-t border-[#E0DDD4] pt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#5C7A62] mb-4">EFT / Havale Banka Bilgileri</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-[#8C8A82] mb-2">Banka Adı</label>
              <input
                value={form.ibanBanka}
                onChange={e => setForm(f => ({ ...f, ibanBanka: e.target.value }))}
                className="w-full border border-[#D6D2C4] rounded-xl px-4 py-2.5 text-sm text-[#0D1510] focus:outline-none focus:border-[#5C7A62]"
                placeholder="Yapı Kredi Bankası"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-[#8C8A82] mb-2">SWIFT / BIC</label>
              <input
                value={form.ibanSwift}
                onChange={e => setForm(f => ({ ...f, ibanSwift: e.target.value }))}
                className="w-full border border-[#D6D2C4] rounded-xl px-4 py-2.5 text-sm text-[#0D1510] focus:outline-none focus:border-[#5C7A62]"
                placeholder="YAPITRISXXX"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-xs font-semibold uppercase tracking-widest text-[#8C8A82] mb-2">IBAN Numarası</label>
            <input
              value={form.ibanNo}
              onChange={e => setForm(f => ({ ...f, ibanNo: e.target.value }))}
              className="w-full border border-[#D6D2C4] rounded-xl px-4 py-2.5 text-sm font-mono text-[#0D1510] focus:outline-none focus:border-[#5C7A62]"
              placeholder="TR00 0000 0000 0000 0000 0000 00"
            />
          </div>
          <div className="mt-4">
            <label className="block text-xs font-semibold uppercase tracking-widest text-[#8C8A82] mb-2">Hesap Sahibi Unvanı</label>
            <input
              value={form.ibanHesapSahibi}
              onChange={e => setForm(f => ({ ...f, ibanHesapSahibi: e.target.value }))}
              className="w-full border border-[#D6D2C4] rounded-xl px-4 py-2.5 text-sm text-[#0D1510] focus:outline-none focus:border-[#5C7A62]"
              placeholder="ERHAN FLOWERS ÇİÇEKÇİLİK..."
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-[#5C7A62] mb-2">Instagram Kullanıcı Adı</label>
            <input
              value={form.instagramHandle}
              onChange={e => setForm(f => ({ ...f, instagramHandle: e.target.value }))}
              className="w-full border border-[#D6D2C4] rounded-xl px-4 py-2.5 text-sm text-[#0D1510] focus:outline-none focus:border-[#5C7A62]"
              placeholder="erhanflowers"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-[#5C7A62] mb-2">Facebook URL</label>
            <input
              value={form.facebookUrl}
              onChange={e => setForm(f => ({ ...f, facebookUrl: e.target.value }))}
              className="w-full border border-[#D6D2C4] rounded-xl px-4 py-2.5 text-sm text-[#0D1510] focus:outline-none focus:border-[#5C7A62]"
            />
          </div>
        </div>
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

      {/* Tami POS Bağlantı Testi */}
      <div className="mt-8 bg-white rounded-2xl border border-[#E0DDD4] p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#5C7A62] mb-4">Kredi Kartı (Tami) Bağlantı Testi</p>
        <p className="text-xs text-[#8C8A82] mb-4">Müşteriler ödeme yapamıyorsa buradan Tami bağlantısını test edin. Sonuç, sunucu .env dosyasındaki Tami ayarlarını ve API erişimini kontrol eder.</p>
        <button
          onClick={testTami}
          disabled={tamiTesting}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {tamiTesting ? 'Test ediliyor…' : '🔍 Tami Bağlantısını Test Et'}
        </button>
        {tamiResult && (
          <div className={`mt-4 rounded-xl p-4 text-xs font-mono whitespace-pre-wrap break-all ${tamiResult.ok ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
            {JSON.stringify(tamiResult, null, 2)}
          </div>
        )}
      </div>
    </div>
  )
}
