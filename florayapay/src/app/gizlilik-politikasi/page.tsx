import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Gizlilik Politikası & KVKK Aydınlatma Metni',
  description: 'Erhan Flowers kişisel verilerin korunması (KVKK) politikası ve gizlilik ilkeleri.',
}

export default function GizlilikPolitikasiPage() {
  return (
    <>
      <Header />
      <main className="bg-[#F4F2EC] min-h-screen">
        <div className="max-w-3xl mx-auto px-4 py-16">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-[0.3em] text-[#8C8A82] mb-2">Yasal Bilgilendirme</p>
            <h1 className="font-display text-4xl font-light text-[#0D1510]">Gizlilik Politikası</h1>
            <p className="text-sm text-[#8C8A82] mt-3">KVKK Madde 10 Kapsamında Aydınlatma Metni</p>
          </div>

          <div className="bg-white rounded-2xl border border-[#E0DDD4] p-8 space-y-8 text-[#5C5C52] text-sm leading-relaxed">

            <section>
              <h2 className="font-semibold text-[#0D1510] text-base mb-3">1. Veri Sorumlusu</h2>
              <p>
                6698 sayılı Kişisel Verilerin Korunması Kanunu (&ldquo;KVKK&rdquo;) uyarınca kişisel verileriniz; veri
                sorumlusu sıfatıyla <strong>Erhan Flowers / Erhan Yapay Çiçekçilik</strong> tarafından aşağıda
                açıklanan kapsamda işlenebilecektir.
              </p>
              <div className="mt-3 bg-[#F4F2EC] rounded-xl p-4 text-xs space-y-1">
                <p><strong>Unvan:</strong> Erhan Flowers / Erhan Yapay Çiçekçilik</p>
                <p><strong>Adres:</strong> Sarılar Mah. Cumhuriyet Cd. 2038 Sk. No:52/1/2, 07600 Manavgat/Antalya</p>
                <p><strong>E-posta:</strong> erhanyapaycicekcilik@gmail.com</p>
                <p><strong>Telefon:</strong> 0544 654 62 20</p>
              </div>
            </section>

            <section>
              <h2 className="font-semibold text-[#0D1510] text-base mb-3">2. İşlenen Kişisel Veriler</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>Ad, soyad</li>
                <li>Telefon numarası ve e-posta adresi</li>
                <li>Teslimat ve fatura adresi</li>
                <li>Sipariş bilgileri ve satın alma geçmişi</li>
                <li>Web sitesi kullanım verileri (çerezler aracılığıyla)</li>
              </ul>
            </section>

            <section>
              <h2 className="font-semibold text-[#0D1510] text-base mb-3">3. İşleme Amaçları ve Hukuki Dayanak</h2>
              <p>Kişisel verileriniz şu amaçlarla işlenmektedir:</p>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>Sipariş tamamlama ve teslimat süreçlerinin yürütülmesi (sözleşme ifası)</li>
                <li>Müşteri hizmetleri ve şikayet yönetimi (meşru menfaat)</li>
                <li>Yasal yükümlülüklerin yerine getirilmesi (vergi, e-ticaret mevzuatı)</li>
                <li>Pazarlama ve kampanya bildirimleri (açık rıza)</li>
              </ul>
            </section>

            <section>
              <h2 className="font-semibold text-[#0D1510] text-base mb-3">4. Verilerin Aktarılması</h2>
              <p>
                Kişisel verileriniz; kargo şirketlerine (teslimat amacıyla), ödeme kuruluşlarına (güvenli ödeme için),
                yasal zorunluluk halinde kamu kurumlarına aktarılabilir. Üçüncü taraflarla KVKK gerekliliklerine
                uygun şekilde çalışılmaktadır.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-[#0D1510] text-base mb-3">5. Haklarınız (KVKK Madde 11)</h2>
              <p>Veri sorumlusuna başvurarak aşağıdaki haklarınızı kullanabilirsiniz:</p>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
                <li>İşlenen veriler hakkında bilgi talep etme</li>
                <li>Verilerin düzeltilmesini veya silinmesini isteme</li>
                <li>İşlemeye itiraz etme</li>
                <li>Otomatik sistemlerle analiz sonucu aleyhinize çıkan karara itiraz etme</li>
                <li>Hukuka aykırı işleme nedeniyle zararın giderilmesini talep etme</li>
              </ul>
              <p className="mt-3">
                Haklarınızı kullanmak için <strong>erhanyapaycicekcilik@gmail.com</strong> adresine yazabilirsiniz.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-[#0D1510] text-base mb-3">6. Çerez Kullanımı</h2>
              <p>
                Sitemizde oturum çerezleri, analitik çerezler (Google Analytics) kullanılmaktadır. Çerezler
                tarayıcı ayarlarınızdan yönetilebilir. Detaylı bilgi için{' '}
                <a href="/cerez-politikasi" className="text-[#5C7A62] underline">Çerez Politikamızı</a> inceleyebilirsiniz.
              </p>
            </section>

            <p className="text-xs text-[#8C8A82] pt-4 border-t border-[#E0DDD4]">
              Son güncelleme: Eylül 2026
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
