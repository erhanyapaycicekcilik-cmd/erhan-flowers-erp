'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

function formatCardNumber(v: string) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}

function formatExpiry(v: string) {
  const digits = v.replace(/\D/g, '').slice(0, 4)
  if (digits.length > 2) return digits.slice(0, 2) + '/' + digits.slice(2)
  return digits
}

function OdemeKartInner() {
  const params = useSearchParams()
  const orderDataStr = params.get('data')

  const [orderData, setOrderData] = useState<Record<string, unknown> | null>(null)
  const [kart, setKart] = useState({ holderName: '', number: '', expiry: '', cvv: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [threeDsHtml, setThreeDsHtml] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!orderDataStr) return
    try {
      setOrderData(JSON.parse(decodeURIComponent(orderDataStr)))
    } catch {
      setError('Geçersiz sipariş verisi.')
    }
  }, [orderDataStr])

  useEffect(() => {
    if (threeDsHtml) {
      document.open()
      document.write(threeDsHtml)
      document.close()
    }
  }, [threeDsHtml])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!orderData) return
    setLoading(true)
    setError(null)

    const [expMonth, expYear] = kart.expiry.split('/')
    if (!expMonth || !expYear || expYear.length !== 2) {
      setError('Geçerli bir son kullanma tarihi girin (AA/YY).')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/payment/tami/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...orderData,
          kart: {
            holderName: kart.holderName,
            number: kart.number.replace(/\s/g, ''),
            expireMonth: parseInt(expMonth, 10),
            expireYear: parseInt('20' + expYear, 10),
            cvv: kart.cvv,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || 'Ödeme başlatılamadı.')
        return
      }
      setThreeDsHtml(data.html)
    } catch {
      setError('Sunucuya bağlanılamadı.')
    } finally {
      setLoading(false)
    }
  }

  if (error && !threeDsHtml) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <p className="text-4xl mb-4">❌</p>
        <h1 className="font-display text-2xl font-light text-[#0D1510] mb-3">Ödeme Başlatılamadı</h1>
        <p className="text-[#8C8A82] mb-6">{error}</p>
        <a href="/siparis" className="inline-block bg-[#0D1510] text-[#F4F2EC] px-6 py-3 rounded-xl font-semibold hover:bg-[#1E3A28] transition-colors">
          Siparişe Dön
        </a>
      </div>
    )
  }

  if (threeDsHtml) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-[#E0DDD4] overflow-hidden">
          <div className="bg-[#F0F5F1] border-b border-[#C5D9C8] px-6 py-3 flex items-center gap-2">
            <span className="text-green-600">🔒</span>
            <p className="text-xs text-[#2D5A36] font-medium">3D Güvenli Doğrulama</p>
          </div>
          <div className="p-4" ref={containerRef} />
        </div>
        <p className="text-center text-xs text-[#8C8A82] mt-4">
          Bankanızın doğrulama sayfasındasınız. Telefonunuza gelen kodu girin.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl border border-[#E0DDD4] overflow-hidden">
        <div className="bg-[#F0F5F1] border-b border-[#C5D9C8] px-6 py-3 flex items-center gap-2">
          <span className="text-green-600">🔒</span>
          <p className="text-xs text-[#2D5A36] font-medium">Güvenli Ödeme — Tami 3D Secure</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#5C5A52] mb-1">Kart Üzerindeki Ad Soyad</label>
            <input
              required
              type="text"
              placeholder="AD SOYAD"
              value={kart.holderName}
              onChange={e => setKart(k => ({ ...k, holderName: e.target.value.toUpperCase() }))}
              className="w-full border border-[#D0CEC6] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#5C7A62] bg-[#FAFAF8]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#5C5A52] mb-1">Kart Numarası</label>
            <input
              required
              type="text"
              inputMode="numeric"
              placeholder="0000 0000 0000 0000"
              value={kart.number}
              onChange={e => setKart(k => ({ ...k, number: formatCardNumber(e.target.value) }))}
              className="w-full border border-[#D0CEC6] rounded-xl px-4 py-3 text-sm font-mono tracking-widest focus:outline-none focus:border-[#5C7A62] bg-[#FAFAF8]"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-[#5C5A52] mb-1">Son Kullanma</label>
              <input
                required
                type="text"
                inputMode="numeric"
                placeholder="AA/YY"
                value={kart.expiry}
                onChange={e => setKart(k => ({ ...k, expiry: formatExpiry(e.target.value) }))}
                className="w-full border border-[#D0CEC6] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-[#5C7A62] bg-[#FAFAF8]"
              />
            </div>
            <div className="w-28">
              <label className="block text-xs font-medium text-[#5C5A52] mb-1">CVV</label>
              <input
                required
                type="text"
                inputMode="numeric"
                placeholder="000"
                maxLength={4}
                value={kart.cvv}
                onChange={e => setKart(k => ({ ...k, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                className="w-full border border-[#D0CEC6] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-[#5C7A62] bg-[#FAFAF8]"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2D5A36] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[#1E3A28] transition-colors disabled:opacity-60"
          >
            {loading ? 'İşleniyor...' : '3D Güvenli Ödeme Yap'}
          </button>
        </form>
      </div>
      <p className="text-center text-xs text-[#8C8A82] mt-4">
        Kartınız Tami Sanal POS güvencesiyle korunmaktadır.
      </p>
    </div>
  )
}

export default function OdemeKartPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#F4F2EC] py-10">
        <Suspense fallback={
          <div className="min-h-[60vh] flex items-center justify-center">
            <span className="inline-block w-8 h-8 border-2 border-[#5C7A62] border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <OdemeKartInner />
        </Suspense>
      </main>
      <Footer />
    </>
  )
}
