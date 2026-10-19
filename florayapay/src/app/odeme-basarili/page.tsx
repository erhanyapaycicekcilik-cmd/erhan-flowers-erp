import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { ClearCartOnMount } from '@/components/checkout/ClearCartOnMount'

export const metadata = { title: 'Ödeme Başarılı' }

export default function OdemeBasariliPage({ searchParams }: { searchParams: { siparis?: string } }) {
  const siparis = searchParams.siparis
  return (
    <>
      <ClearCartOnMount />
      <Header />
      <main className="min-h-screen bg-[#F4F2EC] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-[#5C7A62]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">✅</span>
          </div>
          <h1 className="font-display text-3xl font-light text-[#0D1510] mb-3">Ödeme Başarılı!</h1>
          <p className="text-[#8C8A82] mb-2">
            Siparişiniz alındı ve ödemeniz onaylandı.
          </p>
          {siparis && (
            <p className="text-sm text-[#0D1510] mb-2">
              Sipariş No: <span className="font-mono font-semibold">{siparis}</span>
            </p>
          )}
          <p className="text-sm text-[#8C8A82] mb-8">
            En kısa sürede hazırlanıp kargoya verilecektir. WhatsApp hattımız üzerinden sipariş durumunuzu takip edebilirsiniz.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://wa.me/905446546220"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-[#25D366] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#1db954] transition-colors"
            >
              💬 WhatsApp ile İletişim
            </a>
            <Link
              href="/urunler"
              className="inline-block bg-white border border-[#E0DDD4] text-[#0D1510] px-6 py-3 rounded-xl font-semibold hover:shadow-md transition-shadow"
            >
              Alışverişe Devam
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
