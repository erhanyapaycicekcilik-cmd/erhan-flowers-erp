import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export const metadata = { title: 'Ödeme Başarısız' }

export default function OdemeBasarisizPage({ searchParams }: { searchParams: { kod?: string } }) {
  const hata = searchParams.kod && searchParams.kod !== 'sunucu_hata' ? searchParams.kod : null
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#F4F2EC] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">❌</span>
          </div>
          <h1 className="font-display text-3xl font-light text-[#0D1510] mb-3">Ödeme Başarısız</h1>
          {hata && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-4">{hata.slice(0, 200)}</p>
          )}
          <p className="text-[#8C8A82] mb-8">
            Ödeme işlemi tamamlanamadı. Kartınızdan para çekilmedi. Kart bilgilerinizi kontrol edip tekrar deneyebilir ya da farklı bir ödeme yöntemi seçebilirsiniz.
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
      <Footer />
    </>
  )
}
