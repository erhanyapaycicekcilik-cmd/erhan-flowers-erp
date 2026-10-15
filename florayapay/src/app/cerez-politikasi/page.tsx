import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Çerez Politikası',
  description: 'Erhan Flowers çerez (cookie) politikası. Hangi çerezleri kullandığımız ve nasıl yönetebileceğiniz hakkında bilgi.',
}

const cookies = [
  {
    type: 'Zorunlu Çerezler',
    desc: 'Sitenin temel işlevleri için gereklidir. Oturum yönetimi, sepet ve güvenlik. Kapatılamaz.',
    examples: 'Oturum çerezi, CSRF token',
    duration: 'Oturum süresi',
  },
  {
    type: 'Analitik Çerezler',
    desc: 'Ziyaretçi davranışlarını anlamamıza yardımcı olur. Google Analytics tarafından kullanılır.',
    examples: '_ga, _gid',
    duration: '2 yıl / 24 saat',
  },
  {
    type: 'Pazarlama Çerezleri',
    desc: 'Kişiselleştirilmiş reklam gösterimi için kullanılır. Google Ads, Meta Pixel gibi platformlar.',
    examples: '_fbp, _gcl_au',
    duration: '90 gün',
  },
]

export default function CerezPolitikasiPage() {
  return (
    <>
      <Header />
      <main className="bg-[#F4F2EC] min-h-screen">
        <div className="max-w-3xl mx-auto px-4 py-16">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-[0.3em] text-[#8C8A82] mb-2">Yasal Metin</p>
            <h1 className="font-display text-4xl font-light text-[#0D1510]">Çerez Politikası</h1>
          </div>

          <div className="bg-white rounded-2xl border border-[#E0DDD4] p-8 space-y-7 text-[#5C5C52] text-sm leading-relaxed">

            <section>
              <h2 className="font-semibold text-[#0D1510] text-base mb-2">Çerezler Nedir?</h2>
              <p>
                Çerezler (cookie), web sitelerinin tarayıcınıza yerleştirdiği küçük metin dosyalarıdır. Oturum
                bilgilerini, tercihlerinizi ve site kullanım verilerini saklamak için kullanılırlar.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-[#0D1510] text-base mb-3">Kullandığımız Çerez Türleri</h2>
              <div className="space-y-4">
                {cookies.map((c) => (
                  <div key={c.type} className="bg-[#F4F2EC] rounded-xl p-4">
                    <p className="font-semibold text-[#0D1510] mb-1">{c.type}</p>
                    <p className="text-xs mb-2">{c.desc}</p>
                    <div className="flex gap-4 text-xs text-[#8C8A82]">
                      <span><strong>Örnekler:</strong> {c.examples}</span>
                      <span><strong>Süre:</strong> {c.duration}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="font-semibold text-[#0D1510] text-base mb-2">Çerezleri Nasıl Yönetirsiniz?</h2>
              <p>
                Tarayıcı ayarlarınızdan çerezleri tamamen engelleyebilir veya mevcut çerezleri silebilirsiniz.
                Ancak zorunlu çerezlerin engellenmesi site işlevselliğini olumsuz etkileyebilir.
              </p>
              <div className="mt-3 space-y-1 text-xs">
                <p><strong>Chrome:</strong> Ayarlar → Gizlilik ve Güvenlik → Çerezler</p>
                <p><strong>Firefox:</strong> Seçenekler → Gizlilik ve Güvenlik</p>
                <p><strong>Safari:</strong> Tercihler → Gizlilik</p>
              </div>
            </section>

            <p className="text-xs text-[#8C8A82] pt-4 border-t border-[#E0DDD4]">
              Son güncelleme: Eylül 2026 — Politikamız değiştiğinde bu sayfada güncellenecektir.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
