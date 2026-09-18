'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import Link from 'next/link'

interface Suggestion { range: string; products: string[]; tip: string }

function getSuggestion(tavan: number, alan: string): Suggestion {
  if (tavan <= 240) {
    return {
      range: '60–100 cm',
      products: ['Masa üstü saksı bitkiler', 'Küçük bambu demetleri', 'Çiçek aranjmanları'],
      tip: 'Alçak tavanlı mekânlarda zemine yakın, yayvan yapıda bitkiler daha ferah görünüm sağlar.',
    }
  } else if (tavan <= 280) {
    return {
      range: '100–160 cm',
      products: ['Orta boy yapay ağaçlar', 'Saksılı yapay limon/zeytin ağacı', 'Bambu saksı'],
      tip: 'Standart tavanlı mekânlar için 120–140 cm arası ağaçlar ideal orantıyı verir.',
    }
  } else if (tavan <= 320) {
    return {
      range: '160–200 cm',
      products: ['Büyük yapay ağaçlar', 'Tall bambu demeti', 'Büyük fikus'],
      tip: 'Yüksek tavanlı mekânlarda iri bitkiler boşluğu dengeler ve görkemli görünüm sağlar.',
    }
  } else {
    return {
      range: '200 cm +',
      products: ['Dev yapay ağaçlar (200–300 cm)', 'Çift gövdeli ağaçlar', 'Dikey bahçe duvarı'],
      tip: '3 metre ve üzeri mekânlar için standart ürünler küçük kalabilir. Bize yazın, özel çözüm üretelim.',
    }
  }
}

const alanTips: Record<string, string> = {
  salon: 'Salon için köşe yerleşimi veya TV ünitesi yanı ideal. Tek büyük ağaç, birkaç küçükten daha şık durur.',
  yatak: 'Yatak odası için yumuşak yeşil tonlar ve kompakt bitkiler rahatlık hissi verir.',
  ofis: 'Ofiste bölücü eleman olarak bambu veya separatör kullanın; hem estetik hem fonksiyonel.',
  restoran: 'Restoran için sütun dibine büyük ağaç veya masa aralarına küçük saksılar çok yakışır.',
  dukkan: 'Dükkan vitrini için renkli ağaçlar ve mevsimsel düzenleme dikkat çeker.',
  giris: 'Giriş/hol için simetrik çift ağaç veya güçlü tek odak noktası bitkisi tercih edin.',
}

export default function AgacBoyutRehberiPage() {
  const [tavan, setTavan] = useState(260)
  const [alan, setAlan] = useState('salon')
  const suggestion = getSuggestion(tavan, alan)

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#F4F2EC]">
        <section className="bg-[#0D1510] text-[#EAE6DC] py-16 px-4 text-center">
          <p className="text-xs tracking-widest uppercase text-[#8BAF8A] mb-3">Ücretsiz Rehber</p>
          <h1 className="font-display text-4xl md:text-5xl font-light mb-4">Ağaç Boyut Rehberi</h1>
          <p className="text-[#8C8A82] max-w-xl mx-auto text-lg">
            "Odama kaç cm ağaç yakışır?" — Tavan yüksekliğinizi girin, size özel öneri alalım.
          </p>
        </section>

        <section className="max-w-2xl mx-auto px-4 py-16">
          <div className="bg-white rounded-2xl p-8 border border-[#E0DDD4] space-y-8">
            {/* Tavan yüksekliği */}
            <div>
              <label className="block text-xs font-semibold text-[#5C5C52] mb-3 uppercase tracking-wide">
                Tavan Yüksekliği: <span className="text-[#1E3A28] text-base font-bold">{tavan} cm</span>
              </label>
              <input
                type="range"
                min={220}
                max={500}
                step={10}
                value={tavan}
                onChange={e => setTavan(Number(e.target.value))}
                className="w-full accent-[#1E3A28]"
              />
              <div className="flex justify-between text-xs text-[#8C8A82] mt-1">
                <span>220 cm</span>
                <span>350 cm</span>
                <span>500 cm</span>
              </div>
            </div>

            {/* Mekan tipi */}
            <div>
              <label className="block text-xs font-semibold text-[#5C5C52] mb-3 uppercase tracking-wide">Mekan Tipi</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.keys(alanTips).map(k => (
                  <button
                    key={k}
                    onClick={() => setAlan(k)}
                    className={`py-2.5 rounded-xl text-sm font-medium border transition-colors capitalize ${alan === k ? 'bg-[#1E3A28] text-[#F4F2EC] border-[#1E3A28]' : 'bg-white text-[#3A3A34] border-[#D6D2C4] hover:border-[#5C7A62]'}`}
                  >
                    {k.charAt(0).toUpperCase() + k.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Öneri */}
            <div className="bg-[#F4F2EC] rounded-2xl p-6 border border-[#D6D2C4]">
              <p className="text-xs uppercase tracking-widest text-[#5C7A62] font-semibold mb-2">Önerilen Boyut</p>
              <p className="text-4xl font-display font-light text-[#0D1510] mb-4">{suggestion.range}</p>

              <div className="space-y-2 mb-4">
                {suggestion.products.map(p => (
                  <div key={p} className="flex items-center gap-2 text-sm text-[#3A3A34]">
                    <span className="text-[#5C7A62]">✓</span> {p}
                  </div>
                ))}
              </div>

              <p className="text-xs text-[#8C8A82] leading-relaxed border-t border-[#D6D2C4] pt-3">
                💡 {suggestion.tip}
              </p>
              {alanTips[alan] && (
                <p className="text-xs text-[#8C8A82] leading-relaxed mt-2">
                  🏠 {alanTips[alan]}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <Link
                href="/urunler"
                className="flex-1 bg-[#0D1510] text-[#F4F2EC] py-3 rounded-xl font-semibold text-center hover:bg-[#1E3A28] transition-colors text-sm"
              >
                Ürünlere Git →
              </Link>
              <Link
                href="/mekaninizi-gonderin"
                className="flex-1 border border-[#0D1510] text-[#0D1510] py-3 rounded-xl font-semibold text-center hover:bg-[#F4F2EC] transition-colors text-sm"
              >
                📸 Fotoğraf Gönder
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
