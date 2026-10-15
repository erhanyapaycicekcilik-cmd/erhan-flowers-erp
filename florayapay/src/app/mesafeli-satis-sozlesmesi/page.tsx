import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Mesafeli Satış Sözleşmesi',
  description: 'Erhan Flowers mesafeli satış sözleşmesi. 6502 sayılı Tüketicinin Korunması Hakkında Kanun kapsamında yasal bilgilendirme.',
}

export default function MesafeliSatisSozlesmesiPage() {
  return (
    <>
      <Header />
      <main className="bg-[#F4F2EC] min-h-screen">
        <div className="max-w-3xl mx-auto px-4 py-16">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-[0.3em] text-[#8C8A82] mb-2">Yasal Metin</p>
            <h1 className="font-display text-4xl font-light text-[#0D1510]">Mesafeli Satış Sözleşmesi</h1>
            <p className="text-sm text-[#8C8A82] mt-3">6502 sayılı Kanun & Mesafeli Sözleşmeler Yönetmeliği</p>
          </div>

          <div className="bg-white rounded-2xl border border-[#E0DDD4] p-8 space-y-7 text-[#5C5C52] text-sm leading-relaxed">

            <section>
              <h2 className="font-semibold text-[#0D1510] text-base mb-3">Madde 1 — Taraflar</h2>
              <div className="space-y-3">
                <div className="bg-[#F4F2EC] rounded-xl p-4 text-xs space-y-1">
                  <p className="font-semibold text-[#0D1510] mb-2">SATICI</p>
                  <p><strong>Unvan:</strong> Erhan Flowers / Erhan Yapay Çiçekçilik</p>
                  <p><strong>Adres:</strong> Sarılar Mah. Cumhuriyet Cd. 2038 Sk. No:52/1/2, 07600 Manavgat/Antalya</p>
                  <p><strong>Telefon:</strong> 0544 654 62 20</p>
                  <p><strong>E-posta:</strong> erhanyapaycicekcilik@gmail.com</p>
                </div>
                <div className="bg-[#F4F2EC] rounded-xl p-4 text-xs">
                  <p className="font-semibold text-[#0D1510] mb-2">ALICI</p>
                  <p>Sipariş formunu dolduran ve siparişi onaylayan kişi (bundan böyle &ldquo;Alıcı&rdquo; olarak anılacaktır).</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-semibold text-[#0D1510] text-base mb-3">Madde 2 — Sözleşme Konusu</h2>
              <p>
                İşbu sözleşme; Alıcının, Satıcıya ait <strong>erhanflowers.com</strong> internet sitesi üzerinden
                elektronik ortamda siparişini verdiği ürün/ürünlerin satışı ve teslimi ile ilgili olarak
                6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri
                gereğince tarafların hak ve yükümlülüklerini kapsar.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-[#0D1510] text-base mb-3">Madde 3 — Ürün ve Fiyat Bilgileri</h2>
              <p>
                Ürünün temel nitelikleri, toplam satış fiyatı (vergiler dahil), kargo ücreti ve ödeme koşulları
                sipariş aşamasında Alıcıya gösterilmektedir. Sipariş onayı verilmeden önce Alıcı bu bilgileri
                inceleme ve onaylama imkânına sahiptir.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-[#0D1510] text-base mb-3">Madde 4 — Sipariş ve Ödeme</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>Sipariş, Alıcı tarafından onaylandıktan sonra kesinleşir.</li>
                <li>Ödeme; kredi/banka kartı veya banka havalesi ile yapılır.</li>
                <li>Ödeme alınmadan sipariş işleme konulmaz.</li>
                <li>Kredi kartı ödemeleri güvenli ödeme altyapısı üzerinden işlenir.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-semibold text-[#0D1510] text-base mb-3">Madde 5 — Teslimat</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>Ürünler, ödeme onayının ardından 1–3 iş günü içinde kargoya verilir.</li>
                <li>Kargo süresi, bulunulan konuma göre değişmektedir (genellikle 1–3 iş günü).</li>
                <li>Teslimat süresi herhangi bir nedenle uzarsa Alıcı bilgilendirilir.</li>
                <li>Hasar görmüş veya eksik paket teslim alınmadan önce tutanak tutulmalıdır.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-semibold text-[#0D1510] text-base mb-3">Madde 6 — Cayma Hakkı (14 Günlük İade)</h2>
              <p>
                Alıcı, herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin, ürünü teslim aldığı
                tarihten itibaren <strong>14 (on dört) gün</strong> içinde cayma hakkını kullanabilir.
              </p>
              <p className="mt-2">
                Cayma hakkı kullanımı için: <a href="mailto:erhanyapaycicekcilik@gmail.com" className="text-[#5C7A62] underline">erhanyapaycicekcilik@gmail.com</a> adresine
                e-posta gönderin veya 0544 654 62 20 numaralı hattı arayın.
              </p>
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs">
                <p className="font-semibold text-amber-800 mb-1">Cayma hakkı kullanılamayan durumlar:</p>
                <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                  <li>Alıcının isteği üzerine özel üretilen ürünler</li>
                  <li>Ambalajı açılmış, kullanılmış veya hasar görmüş ürünler</li>
                  <li>Teslim sonrası birleştirilen ve ayrıştırılması mümkün olmayan ürünler</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="font-semibold text-[#0D1510] text-base mb-3">Madde 7 — İade Süreci</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>Cayma bildiriminden sonra ürün en geç 10 gün içinde iade edilmelidir.</li>
                <li>İade kargo ücreti Alıcıya aittir (ürün hasarlı veya hatalı gönderilmişse Satıcıya ait).</li>
                <li>İade alınan ürünler incelendikten sonra en geç 14 gün içinde ödeme iade edilir.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-semibold text-[#0D1510] text-base mb-3">Madde 8 — Garanti</h2>
              <p>
                Ürünler, Satıcı tarafından belirtilen süre boyunca garanti kapsamındadır. Garanti kapsamındaki
                sorunlarda Alıcı, Satıcıyla iletişime geçerek ürün değişimi veya onarımını talep edebilir.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-[#0D1510] text-base mb-3">Madde 9 — Uyuşmazlık Çözümü</h2>
              <p>
                Uyuşmazlıklarda önce Satıcıya başvurulması esastır. Çözüme kavuşturulamazsa Tüketici
                Hakem Heyetleri ve Tüketici Mahkemeleri yetkilidir. Başvuru için{' '}
                <a href="https://tuketicisikayeti.gtb.gov.tr" target="_blank" rel="noopener noreferrer"
                  className="text-[#5C7A62] underline">Ticaret Bakanlığı Şikayet Portalı</a>'nı kullanabilirsiniz.
              </p>
            </section>

            <p className="text-xs text-[#8C8A82] pt-4 border-t border-[#E0DDD4]">
              Son güncelleme: Eylül 2026 — Bu sözleşme, Sipariş Onayı ile birlikte yürürlüğe girer.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
