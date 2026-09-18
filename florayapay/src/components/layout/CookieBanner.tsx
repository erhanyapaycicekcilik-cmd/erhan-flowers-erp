'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem('cerez_onay')) setVisible(true)
    } catch {
      // localStorage erişim hatası
    }
  }, [])

  function kabul() {
    try { localStorage.setItem('cerez_onay', 'kabul') } catch {}
    setVisible(false)
  }

  function reddet() {
    try { localStorage.setItem('cerez_onay', 'reddet') } catch {}
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto bg-[#0D1510] text-[#F4F2EC] rounded-2xl shadow-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 text-sm leading-relaxed">
          <p>
            <span className="font-semibold">🍪 Çerez Politikası</span> — Siteyi daha iyi bir deneyim sunmak amacıyla çerezler kullanıyoruz.
            Detaylar için{' '}
            <Link href="/cerez-politikasi" className="underline text-[#8FBF97] hover:text-white transition-colors">
              Çerez Politikamızı
            </Link>{' '}
            ve{' '}
            <Link href="/gizlilik-politikasi" className="underline text-[#8FBF97] hover:text-white transition-colors">
              KVKK Aydınlatma Metni
            </Link>
            &apos;ni inceleyebilirsiniz.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={reddet}
            className="px-4 py-2 text-sm rounded-xl border border-[#F4F2EC]/30 text-[#F4F2EC]/70 hover:text-[#F4F2EC] hover:border-[#F4F2EC]/60 transition-colors"
          >
            Reddet
          </button>
          <button
            onClick={kabul}
            className="px-5 py-2 text-sm rounded-xl bg-[#5C7A62] text-white font-semibold hover:bg-[#4A6650] transition-colors"
          >
            Kabul Et
          </button>
        </div>
      </div>
    </div>
  )
}
