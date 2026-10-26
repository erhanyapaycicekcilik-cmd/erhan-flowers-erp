'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

const ERROR_MESSAGES: Record<string, string> = {
  '3ds_hata': '3D Secure doğrulaması başarısız oldu. Bankanızla iletişime geçin.',
  oturum_suresi_doldu: 'Ödeme oturumu süresi doldu. Lütfen tekrar deneyin.',
  gecersiz_token: 'Geçersiz ödeme bağlantısı.',
}

function OdemeBasarisizInner() {
  const params = useSearchParams()
  const kod = params.get('kod') || ''
  const mdStatus = params.get('mdStatus') || ''
  const aciklama = ERROR_MESSAGES[kod] || (kod ? `Hata: ${kod}` : 'Ödeme işlemi tamamlanamadı.')

  return (
    <main className="min-h-screen bg-[#F4F2EC] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">❌</span>
        </div>
        <h1 className="font-display text-3xl font-light text-[#0D1510] mb-3">Ödeme Başarısız</h1>
        <p className="text-[#8C8A82] mb-4">{aciklama}</p>
        {(kod || mdStatus) && (
          <p className="text-xs text-[#B0AEA8] mb-6 font-mono">
            {kod && `Kod: ${kod}`}{mdStatus && ` · mdStatus: ${mdStatus}`}
          </p>
        )}
        <p className="text-sm text-[#8C8A82] mb-8">
          Kart bilgilerinizi kontrol edip tekrar deneyebilir ya da farklı bir ödeme yöntemi seçebilirsiniz.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/siparis"
            className="inline-block bg-[#0D1510] text-[#F4F2EC] px-6 py-3 rounded-xl font-semibold hover:bg-[#1E3A28] transition-colors"
          >
            Tekrar Dene
          </Link>
          <a
            href="https://wa.me/905446546220"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-white border border-[#E0DDD4] text-[#0D1510] px-6 py-3 rounded-xl font-semibold hover:shadow-md transition-shadow"
          >
            💬 WhatsApp ile Sipariş Ver
          </a>
        </div>
      </div>
    </main>
  )
}

export default function OdemeBasarisizPage() {
  return (
    <>
      <Header />
      <Suspense fallback={
        <main className="min-h-screen bg-[#F4F2EC] flex items-center justify-center">
          <span className="inline-block w-8 h-8 border-2 border-[#5C7A62] border-t-transparent rounded-full animate-spin" />
        </main>
      }>
        <OdemeBasarisizInner />
      </Suspense>
      <Footer />
    </>
  )
}
