'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

const WHATSAPP = '905446546220'

export default function OneriIstekPage() {
  const [form, setForm] = useState({ type: 'oneri', name: '', message: '' })
  const [sent, setSent] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const typeLabel = { oneri: 'Öneri', istek: 'Ürün İsteği', sikayet: 'Şikayet', diger: 'Diğer' }[form.type] || form.type
    const text = encodeURIComponent(
      `Merhaba! ${typeLabel} iletmek istiyorum.\n\nAd: ${form.name || '—'}\n\n${form.message}`
    )
    window.open(`https://wa.me/${WHATSAPP}?text=${text}`, '_blank')
    setSent(true)
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#F4F2EC]">
        <section className="bg-[#0D1510] text-[#EAE6DC] py-16 px-4 text-center">
          <p className="text-xs tracking-widest uppercase text-[#8BAF8A] mb-3">Bize Ulaşın</p>
          <h1 className="font-display text-4xl md:text-5xl font-light mb-4">Öneri & İstek</h1>
          <p className="text-[#8C8A82] max-w-xl mx-auto">
            Ürün isteğiniz, öneriniz veya şikayetiniz varsa bize iletin. Her geri bildirim bizi geliştirir.
          </p>
        </section>

        <section className="max-w-xl mx-auto px-4 py-16">
          {sent ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-[#E0DDD4]">
              <div className="text-5xl mb-4">💌</div>
              <h2 className="font-display text-2xl font-light text-[#0D1510] mb-2">Teşekkürler!</h2>
              <p className="text-[#5C5C52] text-sm mb-6">Mesajınız WhatsApp'a iletildi. En kısa sürede dönüş yapacağız.</p>
              <button onClick={() => setSent(false)} className="text-sm text-[#5C7A62] underline">Başka bir mesaj gönder</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 border border-[#E0DDD4] space-y-5">
              <div>
                <label className="block text-xs font-semibold text-[#5C5C52] mb-2 uppercase tracking-wide">Konu</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { v: 'oneri', label: '💡 Öneri' },
                    { v: 'istek', label: '🌿 Ürün İsteği' },
                    { v: 'sikayet', label: '⚠️ Şikayet' },
                    { v: 'diger', label: '💬 Diğer' },
                  ].map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, type: opt.v }))}
                      className={`py-3 rounded-xl text-sm font-medium border transition-colors ${form.type === opt.v ? 'bg-[#1E3A28] text-[#F4F2EC] border-[#1E3A28]' : 'bg-white text-[#3A3A34] border-[#D6D2C4] hover:border-[#5C7A62]'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C5C52] mb-1 uppercase tracking-wide">Adınız (opsiyonel)</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Adınız"
                  className="w-full border border-[#D6D2C4] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#5C7A62]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C5C52] mb-1 uppercase tracking-wide">Mesajınız *</label>
                <textarea
                  required
                  rows={5}
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Mesajınızı buraya yazın..."
                  className="w-full border border-[#D6D2C4] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#5C7A62] resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#0D1510] text-[#F4F2EC] py-3 rounded-xl font-semibold hover:bg-[#1E3A28] transition-colors"
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
