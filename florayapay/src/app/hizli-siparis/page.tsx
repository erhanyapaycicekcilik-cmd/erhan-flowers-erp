'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.erhanflowers.com'

type InvoiceType = 'individual' | 'corporate'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent'

export default function HizliSiparisPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [district, setDistrict] = useState('')
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('individual')
  const [companyName, setCompanyName] = useState('')
  const [taxNumber, setTaxNumber] = useState('')
  const [taxOffice, setTaxOffice] = useState('')
  const [invoiceAddress, setInvoiceAddress] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; saleNumber?: string; message: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setResult(null)
    try {
      const res = await fetch(`${API_URL}/public/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, phone, city, district, address, note,
          invoiceType,
          companyName: invoiceType === 'corporate' ? companyName : undefined,
          taxNumber: invoiceType === 'corporate' ? taxNumber : undefined,
          taxOffice: invoiceType === 'corporate' ? taxOffice : undefined,
          invoiceAddress: invoiceType === 'corporate' ? invoiceAddress : undefined,
          channel: 'WHATSAPP',
        }),
      })
      const data = await res.json() as Record<string, unknown>
      if (!res.ok) {
        setResult({ ok: false, message: String((data as { message?: unknown }).message ?? 'Bir hata oluştu.') })
      } else {
        setResult({ ok: true, saleNumber: String((data as { saleNumber?: unknown }).saleNumber ?? ''), message: 'Siparişiniz alındı!' })
      }
    } catch {
      setResult({ ok: false, message: 'Bağlantı hatası. Lütfen tekrar deneyin.' })
    } finally {
      setBusy(false)
    }
  }

  if (result?.ok) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Siparişiniz Alındı!</h1>
            {result.saleNumber && (
              <p className="text-lg text-green-600 font-semibold mb-3">Sipariş No: {result.saleNumber}</p>
            )}
            <p className="text-gray-500 text-sm mb-6">
              Ekibimiz en kısa sürede sizinle iletişime geçecek.
            </p>
            <a
              href="https://wa.me/905449176220"
              className="inline-flex items-center gap-2 bg-green-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
            >
              WhatsApp&apos;tan Yaz
            </a>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-lg mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Hızlı Sipariş</h1>
            <p className="text-gray-500 text-sm mt-1">Bilgilerinizi doldurun, ekibimiz sizi arasın.</p>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-5">

            {/* Kişisel Bilgiler */}
            <div className="flex flex-col gap-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">İletişim Bilgileri</h2>
              <Field label="Ad Soyad" required>
                <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="Adınız Soyadınız" required />
              </Field>
              <Field label="Telefon" required>
                <input className={inputCls} value={phone} onChange={e => setPhone(e.target.value)} placeholder="05XX XXX XX XX" type="tel" required />
              </Field>
            </div>

            {/* Adres */}
            <div className="flex flex-col gap-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Teslimat Adresi</h2>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Şehir" required>
                  <input className={inputCls} value={city} onChange={e => setCity(e.target.value)} placeholder="İstanbul" required />
                </Field>
                <Field label="İlçe" required>
                  <input className={inputCls} value={district} onChange={e => setDistrict(e.target.value)} placeholder="Kadıköy" required />
                </Field>
              </div>
              <Field label="Tam Adres" required>
                <textarea className={`${inputCls} resize-none`} rows={3} value={address} onChange={e => setAddress(e.target.value)} placeholder="Mahalle, sokak, bina no, daire…" required />
              </Field>
            </div>

            {/* Sipariş Notu */}
            <Field label="Sipariş Notu / Ürün Açıklaması">
              <textarea className={`${inputCls} resize-none`} rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="İstediğiniz ürün, renk, boyut vb." />
            </Field>

            {/* Fatura Tipi */}
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Fatura</h2>
              <div className="flex gap-3">
                <label className={`flex-1 flex items-center gap-2 border rounded-lg px-4 py-3 cursor-pointer transition-colors ${invoiceType === 'individual' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="invoiceType" value="individual" checked={invoiceType === 'individual'} onChange={() => setInvoiceType('individual')} className="accent-green-500" />
                  <span className="text-sm font-medium">Bireysel</span>
                </label>
                <label className={`flex-1 flex items-center gap-2 border rounded-lg px-4 py-3 cursor-pointer transition-colors ${invoiceType === 'corporate' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="invoiceType" value="corporate" checked={invoiceType === 'corporate'} onChange={() => setInvoiceType('corporate')} className="accent-green-500" />
                  <span className="text-sm font-medium">Kurumsal</span>
                </label>
              </div>

              {invoiceType === 'corporate' && (
                <div className="flex flex-col gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl">
                  <Field label="Şirket / Kurum Adı" required>
                    <input className={inputCls} value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="ABC Ltd. Şti." required />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Vergi No" required>
                      <input className={inputCls} value={taxNumber} onChange={e => setTaxNumber(e.target.value)} placeholder="1234567890" required />
                    </Field>
                    <Field label="Vergi Dairesi" required>
                      <input className={inputCls} value={taxOffice} onChange={e => setTaxOffice(e.target.value)} placeholder="Kadıköy VD" required />
                    </Field>
                  </div>
                  <Field label="Fatura Adresi (farklıysa)">
                    <textarea className={`${inputCls} resize-none`} rows={2} value={invoiceAddress} onChange={e => setInvoiceAddress(e.target.value)} placeholder="Teslimat adresinden farklıysa yazın" />
                  </Field>
                </div>
              )}
            </div>

            {result && !result.ok && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {result.message}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-green-600 text-white font-semibold py-3 rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base"
            >
              {busy ? 'Gönderiliyor…' : 'Sipariş Ver'}
            </button>

            <p className="text-center text-xs text-gray-400">
              Ödeme, teslimat öncesinde ekibimiz tarafından alınır.
            </p>
          </form>
        </div>
      </main>
      <Footer />
    </>
  )
}
