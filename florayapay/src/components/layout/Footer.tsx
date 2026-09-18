import Link from 'next/link'
import { SocialIcons } from './SocialFollowModal'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-[#0D1510] text-[#8C8A82] mt-16">
      <div className="max-w-screen-2xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Marka */}
          <div className="md:col-span-1">
            <Link href="/" className="font-display text-2xl font-light text-[#EAE6DC] block mb-3 tracking-wide">
              Erhan<em className="not-italic text-[#8BAF8A]"> Flowers</em>
            </Link>
            <p className="text-sm leading-relaxed text-[#8C8A82]">
              Kaliteli yapay çiçek ve dekorasyon ürünleriyle yaşam alanlarınızı güzelleştiriyoruz.
            </p>
            <div className="mt-5">
              <p className="text-xs text-gray-500 mb-2">Takip edin, %10 indirim kazanın</p>
              <SocialIcons />
            </div>
          </div>

          {/* Kategoriler */}
          <div>
            <h3 className="text-[#EAE6DC] font-medium mb-4 tracking-widest text-xs uppercase">Kategoriler</h3>
            <ul className="space-y-2 text-sm">
              {[
                { href: '/urunler?kategori=yapay-agac', label: 'Yapay Ağaç' },
                { href: '/urunler?kategori=cicekler', label: 'Yapay Çiçekler' },
                { href: '/urunler?kategori=dikey-bahce', label: 'Dikey Bahçe' },
                { href: '/urunler?kategori=saksilar', label: 'Saksılar' },
                { href: '/urunler?kategori=bambu', label: 'Bambu' },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-[#8BAF8A] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Kurumsal */}
          <div>
            <h3 className="text-[#EAE6DC] font-medium mb-4 tracking-widest text-xs uppercase">Kurumsal</h3>
            <ul className="space-y-2 text-sm">
              {[
                { href: '/hakkimizda', label: 'Hakkımızda' },
                { href: '/iletisim', label: 'İletişim' },
                { href: '/kargo-ve-iade', label: 'Kargo & İade' },
                { href: '/odeme-kosullari', label: 'Ödeme Koşulları' },
                { href: '/gizlilik-politikasi', label: 'Gizlilik Politikası' },
                { href: '/kullanim-kosullari', label: 'Kullanım Koşulları' },
                { href: '/cerez-politikasi', label: 'Çerez Politikası' },
                { href: '/mesafeli-satis-sozlesmesi', label: 'Mesafeli Satış Sözleşmesi' },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-[#8BAF8A] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* İletişim */}
          <div>
            <h3 className="text-[#EAE6DC] font-medium mb-4 tracking-widest text-xs uppercase">İletişim</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="tel:+905446546220" className="hover:text-[#8BAF8A] transition-colors">
                  📞 0544 654 62 20
                </a>
              </li>
              <li>
                <a href="mailto:erhanyapaycicekcilik@gmail.com" className="hover:text-[#8BAF8A] transition-colors">
                  ✉️ erhanyapaycicekcilik@gmail.com
                </a>
              </li>
              <li className="text-gray-400 leading-relaxed">
                📍 Sarılar Mah. Cumhuriyet Cd. 2038 Sk. No:52/1/2, Manavgat/Antalya
              </li>
              <li className="text-gray-400">
                🕐 Hafta içi 09:00–18:00
              </li>
            </ul>
          </div>
        </div>

        {/* Alt bar */}
        <div className="border-t border-[#1E3A28] mt-10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <p>© {year} Erhan Flowers. Tüm hakları saklıdır.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-xs">
              🔒 SSL Güvenli Ödeme
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
