'use client'

import { useState } from 'react'

interface Props {
  googleReviewUrl: string
}

const steps = [
  { n: '1', title: 'Google\'da Yorum Yapın', desc: 'Mağazamızı ziyaret edin veya ürün aldıktan sonra Google\'da yorum bırakın.' },
  { n: '2', title: 'Ekran Görüntüsü Alın', desc: 'Yorumunuzun ekran görüntüsünü alın.' },
  { n: '3', title: 'WhatsApp\'tan Gönderin', desc: 'Ekran görüntüsünü WhatsApp\'tan bize gönderin.' },
  { n: '4', title: '%10 İndirim Kodunuzu Alın', desc: 'Bir sonraki siparişinizde geçerli %10 indirim kodu anında gönderilir.' },
]

export function DiscountReviewSection({ googleReviewUrl }: Props) {
  const [claimed, setClaimed] = useState(false)

  return (
    <section id="indirim-kazan" className="max-w-3xl mx-auto px-4 pb-16">
      <div className="bg-gradient-to-br from-[#1E3A28] to-[#0D1510] rounded-3xl p-8 text-[#EAE6DC]">
        <div className="text-center mb-8">
          <p className="text-[#8BAF8A] text-xs tracking-widest uppercase mb-2">Özel Fırsat</p>
          <h2 className="font-display text-3xl font-light mb-3">
            Yorum Yap, <span className="text-[#8BAF8A]">%10 Kazan</span>
          </h2>
          <p className="text-[#8C8A82] text-sm max-w-md mx-auto">
            Google&apos;da bıraktığınız her yorum bizi büyütür. Bu yüzden her yorumu bir indirimle ödüllendiriyoruz.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {steps.map(s => (
            <div key={s.n} className="flex gap-4 bg-white/5 rounded-2xl p-4">
              <div className="w-8 h-8 rounded-full bg-[#8BAF8A] text-[#0D1510] flex items-center justify-center font-bold text-sm flex-shrink-0">
                {s.n}
              </div>
              <div>
                <p className="font-semibold text-sm">{s.title}</p>
                <p className="text-xs text-[#8C8A82] mt-1 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {!claimed ? (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={googleReviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setTimeout(() => setClaimed(true), 3000)}
              className="inline-flex items-center justify-center gap-2 bg-[#4285F4] text-white px-7 py-3.5 rounded-xl font-semibold hover:bg-blue-600 transition-colors"
            >
              ⭐ Google&apos;da Yorum Yap
            </a>
            <a
              href="https://wa.me/905446546220?text=Merhaba! Google yorumu yaptım, indirim kodumu alabilir miyim? Yorumun ekran görüntüsünü gönderiyorum."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-[#25D366] text-white px-7 py-3.5 rounded-xl font-semibold hover:bg-green-600 transition-colors"
            >
              💬 Ekran Görüntüsü Gönder
            </a>
          </div>
        ) : (
          <div className="text-center bg-white/10 rounded-2xl p-6">
            <p className="text-2xl mb-2">🎉</p>
            <p className="font-semibold text-[#8BAF8A] text-lg">Harika! Yorumunuz için teşekkürler.</p>
            <p className="text-sm text-[#8C8A82] mt-2">Şimdi ekran görüntüsünü WhatsApp&apos;tan gönderin, indirim kodunuzu hemen alın.</p>
            <a
              href="https://wa.me/905446546220?text=Merhaba! Google yorumu yaptım, indirim kodumu alabilir miyim? Yorumun ekran görüntüsünü gönderiyorum."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-4 bg-[#25D366] text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-600 transition-colors"
            >
              💬 WhatsApp&apos;tan Gönder
            </a>
          </div>
        )}
      </div>
    </section>
  )
}
