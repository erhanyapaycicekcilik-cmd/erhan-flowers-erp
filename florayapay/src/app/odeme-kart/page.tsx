'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

function OdemeKartInner() {
  const params = useSearchParams()
  const token = params.get('token')
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError('Geçersiz ödeme oturumu.')
      return
    }
    // token ile iyzico checkout form HTML'ini sunucudan al
    fetch(`/api/payment/iyzico/form?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => {
        if (d.htmlContent) setHtml(d.htmlContent)
        else setError(d.error || 'Ödeme formu yüklenemedi.')
      })
      .catch(() => setError('Sunucuya bağlanılamadı.'))
  }, [token])

  if (error) {
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

  if (!html) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-[#8C8A82]">
          <span className="inline-block w-8 h-8 border-3 border-[#5C7A62] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Güvenli ödeme sayfası yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl border border-[#E0DDD4] overflow-hidden">
        <div className="bg-[#F0F5F1] border-b border-[#C5D9C8] px-6 py-3 flex items-center gap-2">
          <span className="text-green-600">🔒</span>
          <p className="text-xs text-[#2D5A36] font-medium">Güvenli Ödeme — iyzico 3D Secure</p>
        </div>
        {/* iyzico checkout form'unu çalıştır */}
        <div
          className="p-4"
          ref={el => {
            if (el && html) {
              el.innerHTML = html
              const scripts = el.querySelectorAll('script')
              scripts.forEach(s => {
                const newScript = document.createElement('script')
                if (s.src) newScript.src = s.src
                else newScript.textContent = s.textContent
                document.body.appendChild(newScript)
              })
            }
          }}
        />
      </div>
      <p className="text-center text-xs text-[#8C8A82] mt-4">
        Kartınız iyzico güvencesiyle korunmaktadır. Bilgileriniz sitemizle paylaşılmaz.
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
