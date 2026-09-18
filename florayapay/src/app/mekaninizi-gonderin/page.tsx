'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

const WHATSAPP = '905446546220'

export default function MekaninGonderPage() {
  const [form, setForm] = useState({ name: '', phone: '', mekan: 'ev', note: '' })
  const [photo, setPhoto] = useState<File | null>(null)
  const [sent, setSent] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = encodeURIComponent(
      `Merhaba! Mekanıma özel ağaç/dekorasyon tavsiyesi istiyorum.\n\nAd: ${form.name}\nTelefon: ${form.phone}\nMekan tipi: ${form.mekan}\nNot: ${form.note || '—'}\n\n📸 Fotoğrafı ayrıca göndereceğim.`
    )
    window.open(`https://wa.me/${WHATSAPP}?text=${text}`, '_blank')
    setSent(true)
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#F4F2EC]">
        {/* Hero */}
        <section className="bg-[#0D1510] text-[#EAE6DC] py-16 px-4 text-center">
          <p className="text-xs tracking-widest uppercase text-[#8BAF8A] mb-3">Kişiye Özel Dekorasyon</p>
          <h1 className="font-display text-4xl md:text-5xl font-light mb-4">Mekanınızı Gönderin</h1>
          <p className="text-[#8C8A82] max-w-2xl mx-auto text-lg">
            Evinizin, ofisinizin veya dükkanınızın fotoğrafını gönderin — size en uygun yapay ağaç ve dekorasyonu birlikte seçelim.
          </p>
        </section>

        {/* Nasıl çalışır */}
        <section className="max-w-4xl mx-auto px-4 py-14">
          <h2 className="text-center font-display text-2xl font-light text-[#0D1510] mb-10">Nasıl Çalışır?</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
            {[
              { step: '1', icon: '📸', title: 'Fotoğraf Gönderin', desc: 'Mekanınızın bir veya birkaç fotoğrafını WhatsApp ile gönderin.' },
              { step: '2', icon: '📐', title: 'Ölçü Verin', desc: 'Tavan yüksekliği ve köşe/alan ölçüsünü paylaşın.' },
              { step: '3', icon: '🌿', title: 'Öneri Alın', desc: 'Size özel ürün önerileri ve fiyat bilgisi iletilir.' },
              { step: '4', icon: '🚚', title: 'Sipariş Edin', desc: 'Beğendiğiniz ürünü kolayca sipariş edin, kapınıza gelsin.' },
            ].map((s) => (
              <div key={s.step} className="bg-white rounded-2xl p-6 border border-[#E0DDD4]">
                <div className="w-8 h-8 rounded-full bg-[#1E3A28] text-[#F4F2EC] text-sm font-bold flex items-center justify-center mx-auto mb-3">{s.step}</div>
                <div className="text-3xl mb-2">{s.icon}</div>
                <h3 className="font-semibold text-[#0D1510] mb-1 text-sm">{s.title}</h3>
                <p className="text-xs text-[#8C8A82] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Form */}
        <section className="max-w-xl mx-auto px-4 pb-16">
          {sent ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-[#E0DDD4]">
              <div className="text-5xl mb-4">🌿</div>
              <h2 className="font-display text-2xl font-light text-[#0D1510] mb-2">WhatsApp Açıldı!</h2>
              <p className="text-[#5C5C52] text-sm mb-6">Mesajınızı gönderin ve mekan fotoğrafınızı ekleyin. Ekibimiz en kısa sürede size önerilerini iletecek.</p>
              <button onClick={() => setSent(false)} className="text-sm text-[#5C7A62] underline">Tekrar form doldur</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 border border-[#E0DDD4] space-y-5">
              <h2 className="font-display text-xl font-light text-[#0D1510] mb-2">Bilgilerinizi Girin</h2>

              <div>
                <label className="block text-xs font-semibold text-[#5C5C52] mb-1 uppercase tracking-wide">Adınız *</label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ad Soyad"
                  className="w-full border border-[#D6D2C4] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#5C7A62]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C5C52] mb-1 uppercase tracking-wide">Telefon *</label>
                <input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="05XX XXX XX XX"
                  className="w-full border border-[#D6D2C4] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#5C7A62]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C5C52] mb-1 uppercase tracking-wide">Mekan Tipi</label>
                <select
                  value={form.mekan}
                  onChange={e => setForm(f => ({ ...f, mekan: e.target.value }))}
                  className="w-full border border-[#D6D2C4] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#5C7A62] bg-white"
                >
                  <option value="ev">Ev / Daire</option>
                  <option value="ofis">Ofis</option>
                  <option value="dukkan">Dükkan / Mağaza</option>
                  <option value="restoran">Restoran / Kafe</option>
                  <option value="otel">Otel / Lobi</option>
                  <option value="diger">Diğer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C5C52] mb-1 uppercase tracking-wide">Notunuz (opsiyonel)</label>
                <textarea
                  rows={3}
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="Renk tercihi, bütçe, özel istek..."
                  className="w-full border border-[#D6D2C4] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#5C7A62] resize-none"
                />
              </div>

              <p className="text-xs text-[#8C8A82] bg-[#F4F2EC] rounded-xl p-3">
                📸 Formu gönderdikten sonra WhatsApp açılacak. Mekanınızın fotoğrafını oradan ekleyin.
              </p>

              <button
                type="submit"
                className="w-full bg-[#25D366] text-white py-3 rounded-xl font-semibold hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
              >
                💬 WhatsApp ile Gönder
              </button>
            </form>
          )}
        </section>
      </main>
      <Footer />
    </>
  )
}
