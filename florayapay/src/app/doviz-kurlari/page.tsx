'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import Link from 'next/link'

interface Rate { code: string; name: string; buy: number; sell: number; icon: string }

export default function DovizPage() {
  const [rates, setRates] = useState<Rate[]>([])
  const [updated, setUpdated] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRates() {
      try {
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/TRY')
        const data = await res.json()
        const r = data.rates as Record<string, number>
        const pairs: Rate[] = [
          { code: 'USD', name: 'Amerikan Doları', icon: '🇺🇸', buy: 1 / r['USD'], sell: 1 / r['USD'] * 1.008 },
          { code: 'EUR', name: 'Euro', icon: '🇪🇺', buy: 1 / r['EUR'], sell: 1 / r['EUR'] * 1.008 },
          { code: 'GBP', name: 'İngiliz Sterlini', icon: '🇬🇧', buy: 1 / r['GBP'], sell: 1 / r['GBP'] * 1.008 },
          { code: 'CHF', name: 'İsviçre Frangı', icon: '🇨🇭', buy: 1 / r['CHF'], sell: 1 / r['CHF'] * 1.008 },
          { code: 'SAR', name: 'Suudi Riyali', icon: '🇸🇦', buy: 1 / r['SAR'], sell: 1 / r['SAR'] * 1.008 },
          { code: 'AED', name: 'BAE Dirhemi', icon: '🇦🇪', buy: 1 / r['AED'], sell: 1 / r['AED'] * 1.008 },
        ]
        setRates(pairs)
        setUpdated(new Date().toLocaleTimeString('tr-TR'))
      } catch {
        setRates([])
      } finally {
        setLoading(false)
      }
    }
    fetchRates()
    const t = setInterval(fetchRates, 60_000)
    return () => clearInterval(t)
  }, [])

  const fmt = (n: number) => n.toFixed(4).replace('.', ',')

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#F4F2EC]">
        <section className="bg-[#0D1510] text-[#EAE6DC] py-16 px-4 text-center">
          <p className="text-xs tracking-widest uppercase text-[#8BAF8A] mb-3">Canlı Kur</p>
          <h1 className="font-display text-4xl md:text-5xl font-light mb-4">Döviz Kurları</h1>
          <p className="text-[#8C8A82] max-w-xl mx-auto">Türk Lirası karşısında güncel döviz kurları. Her dakika güncellenir.</p>
        </section>

        <section className="max-w-2xl mx-auto px-4 py-16">
          {loading ? (
            <div className="text-center py-20 text-[#8C8A82]">Kurlar yükleniyor...</div>
          ) : rates.length === 0 ? (
            <div className="text-center py-20 text-[#8C8A82]">Kurlar alınamadı. Lütfen daha sonra tekrar deneyin.</div>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-[#E0DDD4] overflow-hidden">
                <div className="grid grid-cols-4 bg-[#F4F2EC] px-5 py-3 text-xs font-semibold text-[#8C8A82] uppercase tracking-wide border-b border-[#E0DDD4]">
                  <span className="col-span-2">Döviz</span>
                  <span className="text-right">Alış (₺)</span>
                  <span className="text-right">Satış (₺)</span>
                </div>
                {rates.map((rate, i) => (
                  <div key={rate.code} className={`grid grid-cols-4 px-5 py-4 items-center ${i < rates.length - 1 ? 'border-b border-[#E0DDD4]' : ''}`}>
                    <div className="col-span-2 flex items-center gap-3">
                      <span className="text-2xl">{rate.icon}</span>
                      <div>
                        <p className="font-semibold text-[#0D1510] text-sm">{rate.code}</p>
                        <p className="text-xs text-[#8C8A82]">{rate.name}</p>
                      </div>
                    </div>
                    <p className="text-right font-mono text-sm text-[#1E3A28] font-semibold">{fmt(rate.buy)}</p>
                    <p className="text-right font-mono text-sm text-[#5C5C52]">{fmt(rate.sell)}</p>
                  </div>
                ))}
              </div>
              {updated && (
                <p className="text-center text-xs text-[#8C8A82] mt-4">Son güncelleme: {updated} · Her dakika otomatik yenilenir</p>
              )}
            </>
          )}

          <div className="mt-10 bg-[#1E3A28] text-[#EAE6DC] rounded-2xl p-6 text-center">
            <p className="text-sm mb-3">Yurt dışından sipariş vermek ister misiniz?</p>
            <a
              href="https://wa.me/905446546220?text=Merhaba, dövizle sipariş vermek istiyorum."
              className="inline-block bg-[#25D366] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-600 transition-colors"
            >
              💬 WhatsApp ile İletişime Geçin
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
