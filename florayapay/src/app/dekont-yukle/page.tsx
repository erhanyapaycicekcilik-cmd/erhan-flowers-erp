'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import Link from 'next/link'

const IBAN_BILGI = {
  banka: 'Yapı Kredi Bankası',
  iban: 'TR50 0006 7010 0000 0013 5920 99',
  hesapSahibi: 'ERHAN FLOWERS ÇİÇEKÇİLİK ELEKTRONİK TİCARET VE SANAYİ LİMİTED ŞİRKETİ',
  swift: 'YAPITRISXXX',
}

function DekontContent() {
  const params = useSearchParams()
  const kod = params.get('kod') ?? ''
  const tutar = params.get('tutar') ?? ''

  const fmt = (n: string) =>
    '₺' + new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0 }).format(Number(n))

  const waMsg = encodeURIComponent(
    `🌿 Erhan Flowers — EFT Dekontu\n\nSipariş Kodu: ${kod}\nÖdenen Tutar: ${tutar ? fmt(tutar) : '—'}\n\n[Dekontu bu mesaja ekleyerek gönderin]`
  )
  const waUrl = `https://wa.me/905446546220?text=${waMsg}`

  function kopyala(text: string) {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  return (
    <main className="min-h-screen bg-[#F4F2EC] py-12 px-4">
      <div className="max-w-lg mx-auto">

        {/* Başarı başlığı */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🏦</div>
          <h1 className="font-display text-3xl font-light text-[#0D1510] mb-2">
            Siparişiniz Alındı!
          </h1>
          <p className="text-[#5C5C52]">
            EFT / Havale ile ödeme seçtiniz. Aşağıdaki hesaba transfer yapın ve dekontu gönderin.
          </p>
          {kod && (
            <p className="text-xs text-[#8C8A82] mt-2">Sipariş kodu: <span className="font-mono font-semibold">{kod}</span></p>
          )}
        </div>

        {/* IBAN kartı */}
        <div className="bg-white rounded-2xl border border-[#C5D9C8] p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-[#2D5A36] uppercase tracking-wider">Banka Bilgileri</p>
            {tutar && (
              <span className="bg-[#5C7A62] text-white text-sm font-bold px-3 py-1 rounded-full">
                {fmt(tutar)}
              </span>
            )}
          </div>

          <div className="space-y-4">
            <Row label="Banka" value={IBAN_BILGI.banka} />
            <Row label="Hesap Sahibi" value={IBAN_BILGI.hesapSahibi} />
            <Row label="SWIFT (EUR/USD)" value={IBAN_BILGI.swift} />
            <div>
              <p className="text-xs text-[#8C8A82] mb-1 uppercase tracking-wider">IBAN</p>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-[#0D1510] text-sm bg-[#F4F2EC] px-3 py-2 rounded-lg border border-[#E0DDD4] flex-1">
                  {IBAN_BILGI.iban}
                </span>
                <button
                  onClick={() => kopyala(IBAN_BILGI.iban.replace(/\s/g, ''))}
                  className="text-xs bg-[#0D1510] text-white px-3 py-2 rounded-lg hover:bg-[#1E3A28] transition-colors whitespace-nowrap"
                >
                  Kopyala
                </button>
              </div>
            </div>
          </div>

          {tutar && (
            <div className="mt-4 bg-[#FFF8EC] border border-[#F0D89A] rounded-xl p-3">
              <p className="text-xs text-[#8C6A00] font-medium">
                ⚠️ Transfer açıklamasına sipariş kodunu yazın: <span className="font-mono font-bold">{kod}</span>
              </p>
            </div>
          )}
        </div>

        {/* Dekont gönderme */}
        <div className="bg-white rounded-2xl border border-[#E0DDD4] p-6 mb-6">
          <h2 className="font-semibold text-[#0D1510] mb-2">Dekontu Nasıl Gönderirim?</h2>
          <p className="text-sm text-[#5C5C52] mb-4">
            Transfer yaptıktan sonra banka dekontunuzu WhatsApp üzerinden bize gönderin. Siparişiniz ödeme onayının ardından kargoya verilecektir.
          </p>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white py-3.5 rounded-xl font-semibold hover:bg-[#1FAD55] transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            WhatsApp&apos;tan Dekont Gönder
          </a>
        </div>

        <div className="flex gap-3">
          <Link href="/urunler"
            className="flex-1 text-center bg-[#0D1510] text-[#F4F2EC] py-3 rounded-xl font-semibold hover:bg-[#1E3A28] transition-colors text-sm">
            Alışverişe Devam Et
          </Link>
          <a href="tel:+905446546220"
            className="flex-1 text-center bg-white border border-[#E0DDD4] text-[#0D1510] py-3 rounded-xl font-semibold hover:shadow-sm transition-shadow text-sm">
            Bizi Ara
          </a>
        </div>
      </div>
    </main>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-[#8C8A82] uppercase tracking-wider">{label}</span>
      <span className="font-medium text-[#0D1510] text-sm">{value}</span>
    </div>
  )
}

export default function DekontYuklePage() {
  return (
    <>
      <Header />
      <Suspense fallback={<div className="min-h-screen bg-[#F4F2EC]" />}>
        <DekontContent />
      </Suspense>
      <Footer />
    </>
  )
}
