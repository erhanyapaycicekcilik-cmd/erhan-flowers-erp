import Link from 'next/link'

const WHATSAPP_NUMBER = '905446546220'
const PHONE_DISPLAY = '0544 654 62 20'

function inquiryUrl(productName: string, slug: string) {
  const message = encodeURIComponent(
    `Merhaba! "${productName}" ürününün fiyatını öğrenmek istiyorum.\nhttps://www.erhanflowers.com/urun/${slug}`,
  )
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
      />
    </svg>
  )
}

/** Ürün kartlarında fiyat + sepet butonu yerine */
export function PriceOnRequestInline({ productName, slug }: { productName: string; slug: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Link href={`/urun/${slug}`} className="text-xs font-semibold text-[#0D1510] leading-tight">
        Fiyat için iletişime geçin
      </Link>
      <a
        href={inquiryUrl(productName, slug)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${productName} fiyatını WhatsApp'tan sor`}
        className="shrink-0 inline-flex items-center gap-1 bg-[#25D366] text-white text-xs font-semibold px-2.5 py-1.5 rounded-full hover:bg-green-600 transition-colors"
      >
        <WhatsAppIcon className="w-3.5 h-3.5" />
        Fiyat Sor
      </a>
    </div>
  )
}

/** Ürün sayfasında fiyat alanı */
export function PriceOnRequestPrice() {
  return (
    <div>
      <span className="text-2xl font-semibold text-[#0D1510]">Fiyat için iletişime geçin</span>
      <p className="text-xs text-[#8C8A82] mt-1">
        Bu ürün siparişe özel hazırlanır. Fiyat, renk ve teslim süresi için WhatsApp&apos;tan ya da telefonla yazın.
      </p>
    </div>
  )
}

/** Ürün sayfasında "Sepete ekle" yerine */
export function PriceInquiryButtons({ productName, slug }: { productName: string; slug: string }) {
  return (
    <div className="space-y-3">
      <a
        href={inquiryUrl(productName, slug)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2.5 w-full bg-[#25D366] text-white py-3.5 rounded-2xl font-semibold text-sm hover:bg-green-600 active:scale-[0.98] transition-all"
      >
        <WhatsAppIcon className="w-5 h-5" />
        WhatsApp&apos;tan Fiyat Sor
      </a>
      <a
        href={`tel:+${WHATSAPP_NUMBER}`}
        className="flex items-center justify-center w-full border border-[#0D1510] text-[#0D1510] py-3.5 rounded-2xl font-semibold text-sm hover:bg-[#0D1510] hover:text-white transition-all"
      >
        Hemen Ara: {PHONE_DISPLAY}
      </a>
    </div>
  )
}
