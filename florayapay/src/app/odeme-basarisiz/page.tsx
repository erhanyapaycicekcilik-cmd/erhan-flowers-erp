import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export const metadata = { title: 'Ödeme Başarısız' }

export default function OdemeBasarisizPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#F4F2EC] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">❌</span>
          </div>
          <h1 className="font-display text-3xl font-light text-[#0D1510] mb-3">Ödeme Başarısız</h1>
          <p className="text-[#8C8A82] mb-8">
            Ödeme işlemi tamamlanamadı. Kart bilgilerinizi kontrol edip tekrar deneyebilir ya da farklı bir ödeme yöntemi seçebilirsiniz.
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
