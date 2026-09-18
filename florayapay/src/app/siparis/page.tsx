'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { useCart } from '@/hooks/useCart'
import Image from 'next/image'
import Link from 'next/link'
import { getImageUrl } from '@/lib/api/catalog'

function fmt(n: number) {
  return '₺' + new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}

const KARGO_UCRETI = 0
const EFT_INDIRIM = 0.03

const IBAN_BILGI = {
  banka: 'Yapı Kredi Bankası',
  iban: 'TR50 0006 7010 0000 0013 5920 99',
  hesapSahibi: 'ERHAN FLOWERS ÇİÇEKÇİLİK ELEKTRONİK TİCARET VE SANAYİ LİMİTED ŞİRKETİ',
  swift: 'YAPITRISXXX',
}

export default function SiparisPage() {
  const { items, total, clearCart } = useCart()
  const router = useRouter()

  const [form, setForm] = useState({
    ad: '',
    soyad: '',
    telefon: '',
    email: '',
    sehir: '',
    ilce: '',
    adres: '',
    postaKodu: '',
    not: '',
  })
  const [odemeYontemi, setOdemeYontemi] = useState<'whatsapp' | 'eft'>('whatsapp')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<typeof form>>({})

  const eftIndirimTutar = total * EFT_INDIRIM
  const genelToplam = odemeYontemi === 'eft' ? total - eftIndirimTutar : total

  function set(key: keyof typeof form, val: string) {
    setForm((f) => ({ ...f, [key]: val }))
    setErrors((e) => ({ ...e, [key]: '' }))
  }

  function validate() {
    const e: Partial<typeof form> = {}
    if (!form.ad.trim()) e.ad = 'Ad gerekli'
    if (!form.soyad.trim()) e.soyad = 'Soyad gerekli'
    if (!form.telefon.trim()) e.telefon = 'Telefon gerekli'
    if (!form.sehir.trim()) e.sehir = 'Şehir gerekli'
    if (!form.adres.trim()) e.adres = 'Adres gerekli'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function buildWhatsApp() {
    const urunler = items
      .map((i) => `• ${i.name} x${i.quantity} — ${fmt(i.price * i.quantity)}`)
      .join('\n')
    const eftNot = odemeYontemi === 'eft'
      ? `\n*Ödeme Yöntemi:* EFT/Havale (%3 indirim uygulandı)\n*Ödenecek Tutar:* ${fmt(genelToplam)}`
      : '\n*Ödeme Yöntemi:* Teslimatta Nakit / Havale'
    const msg = [
      '🌿 *Erhan Flowers — Yeni Sipariş*',
      '',
      `*Ad Soyad:* ${form.ad} ${form.soyad}`,
      `*Telefon:* ${form.telefon}`,
      form.email ? `*E-posta:* ${form.email}` : '',
      `*Teslimat Adresi:*\n${form.adres}, ${form.ilce} ${form.sehir}${form.postaKodu ? ' ' + form.postaKodu : ''}`,
      form.not ? `*Not:* ${form.not}` : '',
      eftNot,
      '',
      '*Ürünler:*',
      urunler,
      '',
      `*Toplam:* ${fmt(genelToplam)}`,
      `*Kargo:* Ücretsiz`,
    ]
      .filter(Boolean)
      .join('\n')
    return `https://wa.me/905446546220?text=${encodeURIComponent(msg)}`
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    if (items.length === 0) return
    setLoading(true)

    const siparisKodu = Date.now().toString(36).toUpperCase()
    const waUrl = buildWhatsApp()

    if (odemeYontemi === 'eft') {
      // EFT: önce WhatsApp'a bildir, sonra dekont yükleme sayfasına git
      window.open(waUrl, '_blank')
      clearCart()
      router.push(`/dekont-yukle?kod=${siparisKodu}&tutar=${Math.round(genelToplam)}`)
    } else {
      // WhatsApp ile normal akış
      window.open(waUrl, '_blank')
      clearCart()
      router.push('/siparis-tamamlandi')
    }
  }

  if (items.length === 0) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-[#F4F2EC] flex items-center justify-center px-4">
          <div className="text-center">
            <p className="text-5xl mb-4">🌿</p>
            <h1 className="font-display text-2xl font-light text-[#0D1510] mb-3">Sepetiniz Boş</h1>
            <p className="text-[#8C8A82] mb-6">Sipariş vermek için önce ürün ekleyin.</p>
            <Link href="/urunler"
              className="inline-block bg-[#0D1510] text-[#F4F2EC] px-6 py-3 rounded-xl font-semibold hover:bg-[#1E3A28] transition-colors">
              Ürünlere Git
            </Link>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#F4F2EC] py-10">
        <div className="max-w-5xl mx-auto px-4">
          <h1 className="font-display text-3xl font-light text-[#0D1510] mb-8">Sipariş Ver</h1>

          <form onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* Sol: form alanları */}
              <div className="lg:col-span-2 space-y-6">

                {/* Kişisel bilgiler */}
                <div className="bg-white rounded-2xl border border-[#E0DDD4] p-6">
                  <h2 className="font-semibold text-[#0D1510] mb-5">Kişisel Bilgiler</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Ad *" error={errors.ad}>
                      <input value={form.ad} onChange={(e) => set('ad', e.target.value)}
                        placeholder="Adınız" className={inputCls(!!errors.ad)} />
                    </Field>
                    <Field label="Soyad *" error={errors.soyad}>
                      <input value={form.soyad} onChange={(e) => set('soyad', e.target.value)}
                        placeholder="Soyadınız" className={inputCls(!!errors.soyad)} />
                    </Field>
                    <Field label="Telefon *" error={errors.telefon}>
                      <input value={form.telefon} onChange={(e) => set('telefon', e.target.value)}
                        placeholder="05XX XXX XX XX" type="tel" className={inputCls(!!errors.telefon)} />
                    </Field>
                    <Field label="E-posta">
                      <input value={form.email} onChange={(e) => set('email', e.target.value)}
                        placeholder="opsiyonel" type="email" className={inputCls(false)} />
                    </Field>
                  </div>
                </div>

                {/* Teslimat adresi */}
                <div className="bg-white rounded-2xl border border-[#E0DDD4] p-6">
                  <h2 className="font-semibold text-[#0D1510] mb-5">Teslimat Adresi</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Şehir *" error={errors.sehir}>
                      <input value={form.sehir} onChange={(e) => set('sehir', e.target.value)}
                        placeholder="İstanbul" className={inputCls(!!errors.sehir)} />
                    </Field>
                    <Field label="İlçe">
                      <input value={form.ilce} onChange={(e) => set('ilce', e.target.value)}
                        placeholder="Kadıköy" className={inputCls(false)} />
                    </Field>
                    <Field label="Adres *" error={errors.adres} className="sm:col-span-2">
                      <textarea value={form.adres} onChange={(e) => set('adres', e.target.value)}
                        placeholder="Mahalle, cadde, sokak, bina no, daire no"
                        rows={3} className={inputCls(!!errors.adres) + ' resize-none'} />
                    </Field>
                    <Field label="Posta Kodu">
                      <input value={form.postaKodu} onChange={(e) => set('postaKodu', e.target.value)}
                        placeholder="34000" className={inputCls(false)} />
                    </Field>
                  </div>
                </div>

                {/* Ödeme yöntemi */}
                <div className="bg-white rounded-2xl border border-[#E0DDD4] p-6">
                  <h2 className="font-semibold text-[#0D1510] mb-4">Ödeme Yöntemi</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                    {/* WhatsApp */}
                    <button type="button" onClick={() => setOdemeYontemi('whatsapp')}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                        odemeYontemi === 'whatsapp'
                          ? 'border-[#0D1510] bg-[#0D1510]/5'
                          : 'border-[#E0DDD4] hover:border-[#B8B5AB]'
                      }`}>
                      <span className="text-2xl">💬</span>
                      <div>
                        <p className="font-semibold text-[#0D1510] text-sm">WhatsApp ile Sipariş</p>
                        <p className="text-xs text-[#8C8A82] mt-0.5">Ödeme teslimatta nakit veya havale</p>
                      </div>
                      <div className={`ml-auto w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 ${
                        odemeYontemi === 'whatsapp' ? 'border-[#0D1510] bg-[#0D1510]' : 'border-[#C4C0B8]'
                      }`} />
                    </button>

                    {/* EFT */}
                    <button type="button" onClick={() => setOdemeYontemi('eft')}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                        odemeYontemi === 'eft'
                          ? 'border-[#5C7A62] bg-[#5C7A62]/5'
                          : 'border-[#E0DDD4] hover:border-[#B8B5AB]'
                      }`}>
                      <span className="text-2xl">🏦</span>
                      <div>
                        <p className="font-semibold text-[#0D1510] text-sm">EFT / Havale
                          <span className="ml-2 text-[10px] bg-[#5C7A62] text-white px-1.5 py-0.5 rounded-full font-bold">%3 İNDİRİM</span>
                        </p>
                        <p className="text-xs text-[#8C8A82] mt-0.5">Banka transferi ile öde, tasarruf et</p>
                      </div>
                      <div className={`ml-auto w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 ${
                        odemeYontemi === 'eft' ? 'border-[#5C7A62] bg-[#5C7A62]' : 'border-[#C4C0B8]'
                      }`} />
                    </button>
                  </div>

                  {/* EFT seçilince IBAN bilgisi */}
                  {odemeYontemi === 'eft' && (
                    <div className="mt-4 bg-[#F0F5F1] border border-[#C5D9C8] rounded-xl p-4">
                      <p className="text-xs font-semibold text-[#2D5A36] uppercase tracking-wider mb-3">Banka Bilgileri</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-[#5C5C52]">Banka</span>
                          <span className="font-medium text-[#0D1510]">{IBAN_BILGI.banka}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#5C5C52]">Hesap Sahibi</span>
                          <span className="font-medium text-[#0D1510]">{IBAN_BILGI.hesapSahibi}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[#5C5C52]">IBAN</span>
                          <span className="font-mono font-semibold text-[#0D1510] text-xs bg-white px-2 py-1 rounded-lg border border-[#C5D9C8]">
                            {IBAN_BILGI.iban}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-[#5C7A62] mt-3">
                        ✓ Sipariş onayından sonra dekontu WhatsApp&apos;tan göndermeniz yeterli.
                      </p>
                    </div>
                  )}
                </div>

                {/* Sipariş notu */}
                <div className="bg-white rounded-2xl border border-[#E0DDD4] p-6">
                  <h2 className="font-semibold text-[#0D1510] mb-3">Sipariş Notu <span className="text-[#8C8A82] font-normal text-sm">(opsiyonel)</span></h2>
                  <textarea value={form.not} onChange={(e) => set('not', e.target.value)}
                    placeholder="Teslimat saati tercihi, özel istekler..."
                    rows={3} className={inputCls(false) + ' resize-none w-full'} />
                </div>
              </div>

              {/* Sağ: sipariş özeti */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl border border-[#E0DDD4] p-6 sticky top-28">
                  <h2 className="font-semibold text-[#0D1510] mb-4">Sipariş Özeti</h2>

                  <div className="space-y-3 mb-4">
                    {items.map((item) => {
                      const img = item.image ? getImageUrl(item.image) : null
                      return (
                        <div key={item.id} className="flex gap-3 items-start">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#F4F2EC] relative shrink-0">
                            {img ? (
                              <Image src={img} alt={item.name} fill className="object-cover" sizes="48px" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-lg">🌿</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-[#0D1510] line-clamp-2 leading-snug">{item.name}</p>
                            <p className="text-xs text-[#8C8A82] mt-0.5">x{item.quantity}</p>
                          </div>
                          <p className="text-xs font-semibold text-[#0D1510] shrink-0">{fmt(item.price * item.quantity)}</p>
                        </div>
                      )
                    })}
                  </div>

                  <div className="border-t border-[#E0DDD4] pt-4 space-y-2 text-sm">
                    <div className="flex justify-between text-[#8C8A82]">
                      <span>Ara toplam</span>
                      <span>{fmt(total)}</span>
                    </div>
                    {odemeYontemi === 'eft' && (
                      <div className="flex justify-between text-[#5C7A62] font-medium">
                        <span>EFT indirimi (%3)</span>
                        <span>-{fmt(eftIndirimTutar)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[#8C8A82]">
                      <span>Kargo</span>
                      <span className="text-[#5C7A62] font-medium">Ücretsiz</span>
                    </div>
                    <div className="flex justify-between font-bold text-[#0D1510] text-base pt-1 border-t border-[#E0DDD4]">
                      <span>Toplam</span>
                      <span>{fmt(genelToplam)}</span>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <button type="submit" disabled={loading}
                      className={`w-full py-3.5 rounded-xl font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2 ${
                        odemeYontemi === 'eft'
                          ? 'bg-[#5C7A62] text-white hover:bg-[#4A6650]'
                          : 'bg-[#0D1510] text-[#F4F2EC] hover:bg-[#1E3A28]'
                      }`}>
                      {loading ? (
                        <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Yönlendiriliyor...</>
                      ) : odemeYontemi === 'eft' ? (
                        <>🏦 EFT ile Sipariş Ver</>
                      ) : (
                        <>💬 WhatsApp ile Sipariş Ver</>
                      )}
                    </button>
                    <p className="text-xs text-center text-[#8C8A82]">
                      {odemeYontemi === 'eft'
                        ? 'IBAN bilgileri gösterilecek. Dekontu WhatsApp ile paylaşın.'
                        : 'Sipariş detayları WhatsApp\'a gönderilecek.'}
                    </p>
                  </div>

                  <Link href="/sepet" className="block text-center text-xs text-[#5C7A62] mt-4 hover:underline">
                    ← Sepete Dön
                  </Link>
                </div>
              </div>

            </div>
          </form>
        </div>
      </main>
      <Footer />
    </>
  )
}

function inputCls(hasError: boolean) {
  return `w-full px-4 py-2.5 rounded-xl border text-sm text-[#0D1510] placeholder-[#C4C0B8] focus:outline-none focus:ring-2 transition ${
    hasError
      ? 'border-red-300 focus:ring-red-200 bg-red-50'
      : 'border-[#E0DDD4] bg-[#F4F2EC] focus:ring-[#5C7A62]/30 focus:border-[#5C7A62]'
  }`
}

function Field({
  label, error, children, className = '',
}: {
  label: string; error?: string; children: React.ReactNode; className?: string
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-[#5C5C52] mb-1.5 uppercase tracking-wider">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
