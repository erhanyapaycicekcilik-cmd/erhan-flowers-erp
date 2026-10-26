'use client'

import { useState, useEffect } from 'react'
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

const EFT_INDIRIM = 0.03

const DEFAULT_IBAN = {
  banka: 'Yapı Kredi Bankası',
  iban: 'TR__ ____ ____ ____ ____ ____ __',
  hesapSahibi: 'ERHAN FLOWERS ÇİÇEKÇİLİK ELEKTRONİK TİCARET VE SANAYİ LİMİTED ŞİRKETİ',
  swift: '',
}

export default function SiparisPage() {
  const { items, total, clearCart } = useCart()
  const router = useRouter()

  const [ibanBilgi, setIbanBilgi] = useState(DEFAULT_IBAN)
  const [tamiAktif, setTamiAktif] = useState(false)

  useEffect(() => {
    fetch('/api/admin/site-config')
      .then(r => r.json())
      .then(cfg => {
        if (cfg?.ibanNo) {
          setIbanBilgi({
            banka: cfg.ibanBanka || DEFAULT_IBAN.banka,
            iban: cfg.ibanNo,
            hesapSahibi: cfg.ibanHesapSahibi || DEFAULT_IBAN.hesapSahibi,
            swift: cfg.ibanSwift || '',
          })
        }
        setTamiAktif(!!(cfg?.tamiAktif || cfg?.iyzicoAktif))
      })
      .catch(() => {})
  }, [])

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
    tcKimlik: '',
    // Kurumsal fatura
    firmaUnvan: '',
    vergiNo: '',
    vergiDairesi: '',
  })
  const [faturaKurumsal, setFaturaKurumsal] = useState(false)
  const [odemeYontemi, setOdemeYontemi] = useState<'whatsapp' | 'eft' | 'kart'>('whatsapp')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<typeof form>>({})

  // Promo kod
  const [promoInput, setPromoInput] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoError, setPromoError] = useState('')
  const [promoApplied, setPromoApplied] = useState<{ code: string; type: 'percent' | 'fixed'; value: number; description: string } | null>(null)

  async function applyPromo() {
    if (!promoInput.trim()) return
    setPromoLoading(true)
    setPromoError('')
    try {
      const res = await fetch(`/api/promo/validate?code=${encodeURIComponent(promoInput.trim())}`)
      const data = await res.json()
      if (data.ok) {
        setPromoApplied(data)
        setPromoInput('')
      } else {
        setPromoError(data.error || 'Geçersiz kod')
      }
    } catch {
      setPromoError('Bağlantı hatası')
    } finally {
      setPromoLoading(false)
    }
  }

  function removePromo() {
    setPromoApplied(null)
    setPromoError('')
  }

  const promoIndirimTutar = promoApplied
    ? promoApplied.type === 'percent'
      ? Math.round(total * promoApplied.value / 100)
      : promoApplied.value
    : 0

  const eftIndirimTutar = total * EFT_INDIRIM
  const genelToplam = Math.max(0,
    (odemeYontemi === 'eft' ? total - eftIndirimTutar : total) - promoIndirimTutar
  )

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
    if (!form.email.trim()) e.email = 'E-posta gerekli'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Geçerli bir e-posta girin'
    if (!form.tcKimlik.trim()) e.tcKimlik = 'TC Kimlik No gerekli'
    else if (!/^\d{11}$/.test(form.tcKimlik.trim())) e.tcKimlik = '11 haneli TC Kimlik No girin'
    if (faturaKurumsal) {
      if (!form.firmaUnvan.trim()) e.firmaUnvan = 'Firma unvanı gerekli'
      if (!form.vergiNo.trim()) e.vergiNo = 'Vergi numarası gerekli'
      if (!form.vergiDairesi.trim()) e.vergiDairesi = 'Vergi dairesi gerekli'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function buildWhatsAppMsg(orderNumber: string) {
    const urunler = items
      .map((i) => `• ${i.name} x${i.quantity} — ${fmt(i.price * i.quantity)}`)
      .join('\n')
    const eftNot = odemeYontemi === 'eft'
      ? `\n*Ödeme Yöntemi:* EFT/Havale (%3 indirim uygulandı)\n*Ödenecek Tutar:* ${fmt(genelToplam)}`
      : '\n*Ödeme Yöntemi:* Teslimatta Nakit / Havale'
    const promoNot = promoApplied
      ? `\n*İndirim Kodu:* ${promoApplied.code} (${promoApplied.type === 'percent' ? '%' + promoApplied.value : fmt(promoApplied.value) + ' TL'} indirim)`
      : ''
    const msg = [
      `🌿 *Erhan Flowers — Yeni Sipariş #${orderNumber}*`,
      '',
      `*Ad Soyad:* ${form.ad} ${form.soyad}`,
      `*Telefon:* ${form.telefon}`,
      form.email ? `*E-posta:* ${form.email}` : '',
      `*Teslimat Adresi:*\n${form.adres}, ${form.ilce} ${form.sehir}${form.postaKodu ? ' ' + form.postaKodu : ''}`,
      form.not ? `*Not:* ${form.not}` : '',
      eftNot,
      promoNot,
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    if (items.length === 0) return
    setLoading(true)

    try {
      // 1. ERP backend'e sipariş kaydet (proxy üzerinden — CSP bypass)
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: odemeYontemi === 'eft' ? 'EFT' : odemeYontemi === 'kart' ? 'ONLINE' : 'WHATSAPP',
          customerName: `${form.ad} ${form.soyad}`,
          customerPhone: form.telefon,
          customerEmail: form.email || undefined,
          city: form.sehir,
          district: form.ilce || undefined,
          address: form.adres,
          postalCode: form.postaKodu || undefined,
          note: form.not || undefined,
          tcKimlik: form.tcKimlik || undefined,
          faturaKurumsal,
          firmaUnvan: faturaKurumsal ? form.firmaUnvan : undefined,
          vergiNo: faturaKurumsal ? form.vergiNo : undefined,
          vergiDairesi: faturaKurumsal ? form.vergiDairesi : undefined,
          items: items.map((i) => ({
            productId: String(i.id),
            productName: i.name,
            productSlug: i.slug,
            productImage: i.image || undefined,
            unitPrice: i.price,
            quantity: i.quantity,
          })),
          promoCode: promoApplied?.code || undefined,
          promoDiscount: promoIndirimTutar || undefined,
          totalAmount: genelToplam,
        }),
      })

      // Promo kodu kullanıldıysa kullanım sayısını artır
      if (promoApplied) {
        fetch('/api/promo/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: promoApplied.code }),
        }).catch(() => {})
      }

      const data = res.ok ? await res.json() : {}

      if (odemeYontemi === 'kart' && !data.orderNumber) {
        // Sipariş ERP'ye kaydedilmeden karttan para çekme — adres/ürün bilgisi kaybolur
        alert('Siparişiniz kaydedilemedi, lütfen tekrar deneyin veya WhatsApp ile sipariş verin.')
        setLoading(false)
        return
      }
      const orderNumber = data.orderNumber || 'WEB-' + Date.now().toString(36).toUpperCase()

      if (odemeYontemi === 'kart') {
        // Tami 3D Secure ödeme — kart bilgilerini /odeme-kart sayfasında topla
        const orderPayload = {
          orderId: orderNumber,
          amount: Math.round(genelToplam),
          musteri: { ad: form.ad, soyad: form.soyad, email: form.email || `${form.telefon}@erhanflowers.com`, telefon: form.telefon },
          adres: { adres: form.adres, sehir: form.sehir, ulke: 'Turkey' },
          urunler: items.map(i => ({ id: String(i.id), ad: i.name, kategori: 'YAPAY_CICEK', fiyat: i.price, adet: i.quantity })),
        }
        clearCart()
        router.push(`/odeme-kart?data=${encodeURIComponent(JSON.stringify(orderPayload))}`)
        return
      }

      // WhatsApp'a bildir
      const waUrl = buildWhatsAppMsg(orderNumber)
      window.open(waUrl, '_blank')
      clearCart()

      if (odemeYontemi === 'eft') {
        router.push(`/dekont-yukle?kod=${orderNumber}&tutar=${Math.round(genelToplam)}`)
      } else {
        router.push('/siparis-tamamlandi')
      }
    } catch {
      // backend erişilemese de WhatsApp akışı çalışır
      if (odemeYontemi !== 'kart') {
        const orderNumber = 'WEB-' + Date.now().toString(36).toUpperCase()
        const waUrl = buildWhatsAppMsg(orderNumber)
        window.open(waUrl, '_blank')
        clearCart()
        router.push('/siparis-tamamlandi')
      } else {
        // Sipariş kaydedilemeden kartla ödeme alınmasın
        alert('Siparişiniz kaydedilemedi, lütfen tekrar deneyin veya WhatsApp ile sipariş verin.')
        setLoading(false)
      }
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
                    <Field label="E-posta *" error={errors.email}>
                      <input value={form.email} onChange={(e) => set('email', e.target.value)}
                        placeholder="ornek@email.com" type="email" className={inputCls(!!errors.email)} />
                    </Field>
                  </div>
                </div>

                {/* Fatura bilgileri */}
                <div className="bg-white rounded-2xl border border-[#E0DDD4] p-6">
                  <h2 className="font-semibold text-[#0D1510] mb-1">Fatura Bilgileri</h2>
                  <p className="text-xs text-[#8C8A82] mb-5">Yasal zorunluluk gereği fatura için TC Kimlik No gereklidir.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="TC Kimlik No *" error={errors.tcKimlik} className="sm:col-span-2">
                      <input value={form.tcKimlik} onChange={(e) => set('tcKimlik', e.target.value.replace(/\D/g, '').slice(0, 11))}
                        placeholder="00000000000" inputMode="numeric" maxLength={11} className={inputCls(!!errors.tcKimlik)} />
                    </Field>
                  </div>

                  {/* Kurumsal fatura toggle */}
                  <button type="button" onClick={() => setFaturaKurumsal(v => !v)}
                    className="mt-4 flex items-center gap-2 text-sm text-[#5C7A62] font-medium">
                    <span className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${faturaKurumsal ? 'bg-[#5C7A62] border-[#5C7A62]' : 'border-[#C4C0B8]'}`}>
                      {faturaKurumsal && <span className="text-white text-[10px] leading-none">✓</span>}
                    </span>
                    Kurumsal fatura istiyorum
                  </button>

                  {faturaKurumsal && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <Field label="Firma Unvanı *" error={errors.firmaUnvan} className="sm:col-span-2">
                        <input value={form.firmaUnvan} onChange={(e) => set('firmaUnvan', e.target.value)}
                          placeholder="Şirket adı" className={inputCls(!!errors.firmaUnvan)} />
                      </Field>
                      <Field label="Vergi Numarası *" error={errors.vergiNo}>
                        <input value={form.vergiNo} onChange={(e) => set('vergiNo', e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="0000000000" inputMode="numeric" className={inputCls(!!errors.vergiNo)} />
                      </Field>
                      <Field label="Vergi Dairesi *" error={errors.vergiDairesi}>
                        <input value={form.vergiDairesi} onChange={(e) => set('vergiDairesi', e.target.value)}
                          placeholder="Manavgat VD" className={inputCls(!!errors.vergiDairesi)} />
                      </Field>
                    </div>
                  )}
                </div>

                {/* Teslimat adresi */}
                <div className="bg-white rounded-2xl border border-[#E0DDD4] p-6">
                  <h2 className="font-semibold text-[#0D1510] mb-5">Teslimat Adresi</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Şehir *" error={errors.sehir}>
                      <input value={form.sehir} onChange={(e) => set('sehir', e.target.value)}
                        placeholder="Antalya" className={inputCls(!!errors.sehir)} />
                    </Field>
                    <Field label="İlçe">
                      <input value={form.ilce} onChange={(e) => set('ilce', e.target.value)}
                        placeholder="Manavgat" className={inputCls(false)} />
                    </Field>
                    <Field label="Adres *" error={errors.adres} className="sm:col-span-2">
                      <textarea value={form.adres} onChange={(e) => set('adres', e.target.value)}
                        placeholder="Mahalle, cadde, sokak, bina no, daire no"
                        rows={3} className={inputCls(!!errors.adres) + ' resize-none'} />
                    </Field>
                    <Field label="Posta Kodu">
                      <input value={form.postaKodu} onChange={(e) => set('postaKodu', e.target.value)}
                        placeholder="07600" className={inputCls(false)} />
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

                    {/* Kredi Kartı (Tami aktifse göster) */}
                    {tamiAktif && (
                      <button type="button" onClick={() => setOdemeYontemi('kart')}
                        className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all sm:col-span-2 ${
                          odemeYontemi === 'kart'
                            ? 'border-[#2563EB] bg-blue-50'
                            : 'border-[#E0DDD4] hover:border-[#B8B5AB]'
                        }`}>
                        <span className="text-2xl">💳</span>
                        <div>
                          <p className="font-semibold text-[#0D1510] text-sm">Kredi / Banka Kartı
                            <span className="ml-2 text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-bold">GÜVENLİ ÖDEME</span>
                          </p>
                          <p className="text-xs text-[#8C8A82] mt-0.5">Visa, Mastercard, Troy — 3D Secure ile</p>
                        </div>
                        <div className={`ml-auto w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 ${
                          odemeYontemi === 'kart' ? 'border-blue-600 bg-blue-600' : 'border-[#C4C0B8]'
                        }`} />
                      </button>
                    )}
                  </div>

                  {/* EFT seçilince IBAN bilgisi */}
                  {odemeYontemi === 'eft' && (
                    <div className="mt-4 bg-[#F0F5F1] border border-[#C5D9C8] rounded-xl p-4">
                      <p className="text-xs font-semibold text-[#2D5A36] uppercase tracking-wider mb-3">Banka Bilgileri</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-[#5C5C52]">Banka</span>
                          <span className="font-medium text-[#0D1510]">{ibanBilgi.banka}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#5C5C52]">Hesap Sahibi</span>
                          <span className="font-medium text-[#0D1510] text-right max-w-[60%] leading-snug">{ibanBilgi.hesapSahibi}</span>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-[#5C5C52] flex-shrink-0">IBAN</span>
                          <span className="font-mono font-semibold text-[#0D1510] text-xs bg-white px-2 py-1 rounded-lg border border-[#C5D9C8]">
                            {ibanBilgi.iban}
                          </span>
                        </div>
                        {ibanBilgi.swift && (
                          <div className="flex justify-between">
                            <span className="text-[#5C5C52]">SWIFT</span>
                            <span className="font-mono text-xs text-[#0D1510]">{ibanBilgi.swift}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-[#5C7A62] mt-3">
                        ✓ Sipariş onayından sonra dekontu WhatsApp&apos;tan göndermeniz yeterli.
                      </p>
                    </div>
                  )}

                  {/* Kart seçilince bilgi */}
                  {odemeYontemi === 'kart' && (
                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <p className="text-xs text-blue-800">
                        🔒 Ödemeniz Tami Sanal POS altyapısıyla güvence altında işlenir. 3D Secure ile korumalıdır.
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

                  {/* İndirim kodu */}
                  <div className="border-t border-[#E0DDD4] pt-4 mb-3">
                    {promoApplied ? (
                      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm">
                        <div>
                          <span className="font-semibold text-green-700">🎉 {promoApplied.code}</span>
                          <span className="text-green-600 ml-2 text-xs">{promoApplied.description}</span>
                        </div>
                        <button onClick={removePromo} className="text-green-600 hover:text-red-500 text-xs ml-2">✕</button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={promoInput}
                          onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError('') }}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), applyPromo())}
                          placeholder="İndirim kodu"
                          className="flex-1 border border-[#C8C5BC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5C7A62]"
                        />
                        <button
                          type="button"
                          onClick={applyPromo}
                          disabled={promoLoading || !promoInput.trim()}
                          className="px-4 py-2 bg-[#0D1510] text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-[#1E3A28] transition-colors"
                        >
                          {promoLoading ? '...' : 'Uygula'}
                        </button>
                      </div>
                    )}
                    {promoError && <p className="text-red-500 text-xs mt-1">{promoError}</p>}
                  </div>

                  <div className="space-y-2 text-sm">
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
                    {promoApplied && (
                      <div className="flex justify-between text-green-600 font-medium">
                        <span>İndirim kodu ({promoApplied.type === 'percent' ? '%' + promoApplied.value : fmt(promoApplied.value) + ' TL'})</span>
                        <span>-{fmt(promoIndirimTutar)}</span>
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
                        odemeYontemi === 'kart'
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : odemeYontemi === 'eft'
                          ? 'bg-[#5C7A62] text-white hover:bg-[#4A6650]'
                          : 'bg-[#0D1510] text-[#F4F2EC] hover:bg-[#1E3A28]'
                      }`}>
                      {loading ? (
                        <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Yönlendiriliyor...</>
                      ) : odemeYontemi === 'kart' ? (
                        <>💳 Kartla Öde</>
                      ) : odemeYontemi === 'eft' ? (
                        <>🏦 EFT ile Sipariş Ver</>
                      ) : (
                        <>💬 WhatsApp ile Sipariş Ver</>
                      )}
                    </button>
                    <p className="text-xs text-center text-[#8C8A82]">
                      {odemeYontemi === 'kart'
                        ? '3D Secure ile güvenli ödeme sayfasına yönlendirileceksiniz.'
                        : odemeYontemi === 'eft'
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
