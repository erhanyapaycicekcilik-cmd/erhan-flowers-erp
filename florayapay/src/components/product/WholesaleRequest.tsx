'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Building2, X, Check } from 'lucide-react'

const WA_NUMBER = '905446546220'

interface Props {
  productName?: string
  productSlug?: string
}

/** Toptan / kurumsal alım formu: talep ERP'ye kaydedilir, istenirse WhatsApp'tan da yazılabilir */
export function WholesaleForm({ productName, productSlug, onDone }: Props & { onDone?: () => void }) {
  const [f, setF] = useState({ name: '', company: '', phone: '', city: '', quantity: '', message: '', website: '' })
  const [state, setState] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle')
  const [err, setErr] = useState('')
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }))

  const waText = [
    'Merhaba, toptan/kurumsal alım için fiyat teklifi almak istiyorum.',
    productName && `Ürün: ${productName}`,
    productSlug && `https://www.erhanflowers.com/urun/${productSlug}`,
    f.quantity && `Adet: ${f.quantity}`,
    f.company && `Firma: ${f.company}`,
  ].filter(Boolean).join('\n')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState('sending'); setErr('')
    try {
      const res = await fetch('/api/wholesale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, productName, productSlug }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(data?.message || data?.error || 'Gönderilemedi, lütfen WhatsApp\'tan yazın.'); setState('err'); return }
      setState('ok')
    } catch {
      setErr('Bağlantı hatası, lütfen WhatsApp\'tan yazın.'); setState('err')
    }
  }

  if (state === 'ok') {
    return (
      <div className="text-center py-6">
        <div className="mx-auto w-12 h-12 rounded-full bg-[#E8F0EA] flex items-center justify-center mb-3"><Check className="text-[#1E3A28]" /></div>
        <p className="font-semibold text-[#0D1510]">Talebiniz alındı</p>
        <p className="text-sm text-[#5C5C52] mt-1">En kısa sürede sizi arayıp fiyat teklifimizi ileteceğiz.</p>
        {onDone && <button onClick={onDone} className="mt-4 text-sm font-semibold text-[#5C7A62] underline">Kapat</button>}
      </div>
    )
  }

  const input = 'w-full px-3 py-2.5 rounded-xl border border-[#D6D2C4] bg-white text-sm focus:outline-none focus:border-[#5C7A62]'
  return (
    <form onSubmit={submit} className="space-y-2.5">
      {productName && <p className="text-xs text-[#5C5C52] bg-[#F4F2EC] rounded-lg px-3 py-2">Ürün: <span className="font-medium text-[#0D1510]">{productName}</span></p>}
      <div className="grid grid-cols-2 gap-2">
        <input required className={input} placeholder="Ad soyad *" value={f.name} onChange={set('name')} autoComplete="name" />
        <input required className={input} placeholder="Telefon *" value={f.phone} onChange={set('phone')} inputMode="tel" autoComplete="tel" />
        <input className={input} placeholder="Firma (otel, kafe, ofis…)" value={f.company} onChange={set('company')} />
        <input className={input} placeholder="Şehir" value={f.city} onChange={set('city')} />
      </div>
      <input className={input} placeholder="Yaklaşık adet (ör. 20 adet)" value={f.quantity} onChange={set('quantity')} />
      <textarea className={input + ' min-h-[70px]'} placeholder="Not (ölçü, renk, teslim tarihi…)" value={f.message} onChange={set('message')} />
      {/* bot tuzağı */}
      <input tabIndex={-1} autoComplete="off" className="hidden" aria-hidden value={f.website} onChange={set('website')} />
      {state === 'err' && <p className="text-sm text-red-600">{err}</p>}
      <button disabled={state === 'sending'} className="w-full py-3 rounded-xl bg-[#1E3A28] text-white font-semibold disabled:opacity-60">
        {state === 'sending' ? 'Gönderiliyor…' : 'Fiyat Teklifi İste'}
      </button>
      <a href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener noreferrer" className="block text-center text-sm font-semibold text-[#128C7E] py-1">
        veya WhatsApp&apos;tan yazın →
      </a>
    </form>
  )
}

/** Ürün sayfası: "Toptan / kurumsal alım" kutusu + açılır form */
export function WholesaleButton({ productName, productSlug }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className="rounded-2xl border border-dashed border-[#5C7A62]/50 bg-[#F0F5F1] p-3.5 flex items-center gap-3">
        <Building2 className="text-[#1E3A28] flex-shrink-0" size={26} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#0D1510]">Toptan veya kurumsal alım mı?</p>
          <p className="text-xs text-[#5C5C52]">Otel, kafe, ofis ve mağaza projeleri için adetli alımlarda özel fiyat.</p>
        </div>
        <button onClick={() => setOpen(true)} className="flex-shrink-0 px-3 py-2 rounded-xl bg-[#1E3A28] text-white text-xs font-semibold">
          Teklif Al
        </button>
      </div>
      {open && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Toptan alım talebi">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-[#0D1510]">Toptan / Kurumsal Fiyat Teklifi</p>
              <button onClick={() => setOpen(false)} aria-label="Kapat" className="p-1.5 rounded-full hover:bg-[#F4F2EC]"><X size={20} /></button>
            </div>
            <WholesaleForm productName={productName} productSlug={productSlug} onDone={() => setOpen(false)} />
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
