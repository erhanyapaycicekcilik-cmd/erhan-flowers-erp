'use client'

import Script from 'next/script'

// Google Tag Manager — hem Google Analytics hem Google Ads conversion tracking buradan
// GTM ID'yi .env'e NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX olarak ekle
export function GoogleTagManager({ gtmId }: { gtmId: string }) {
  return (
    <>
      {/* GTM Script — <head> içinde yükle */}
      <Script
        id="gtm-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${gtmId}');
          `,
        }}
      />
      {/* GTM noscript — JS kapalı tarayıcılar için */}
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
        />
      </noscript>
    </>
  )
}

// Google Ads conversion event gönderimi — sipariş tamamlandığında çağır
export function trackPurchase(params: {
  transactionId: string
  value: number
  currency?: string
  items?: Array<{ id: string; name: string; price: number; quantity: number }>
}) {
  if (typeof window === 'undefined') return

  // GTM dataLayer'a push — GTM içinde GA4 + Google Ads trigger ayarla
  ;(window as unknown as { dataLayer: unknown[] }).dataLayer?.push({
    event: 'purchase',
    ecommerce: {
      transaction_id: params.transactionId,
      value: params.value,
      currency: params.currency || 'TRY',
      items: params.items || [],
    },
  })
}

// Sepete ekleme event'i
export function trackAddToCart(params: {
  itemId: string
  itemName: string
  price: number
  quantity: number
}) {
  if (typeof window === 'undefined') return

  ;(window as unknown as { dataLayer: unknown[] }).dataLayer?.push({
    event: 'add_to_cart',
    ecommerce: {
      items: [
        {
          item_id: params.itemId,
          item_name: params.itemName,
          price: params.price,
          quantity: params.quantity,
        },
      ],
    },
  })
}

// Ürün görüntüleme event'i — Google Ads remarketing için önemli
export function trackViewItem(params: {
  itemId: string
  itemName: string
  price: number
  category?: string
}) {
  if (typeof window === 'undefined') return

  ;(window as unknown as { dataLayer: unknown[] }).dataLayer?.push({
    event: 'view_item',
    ecommerce: {
      items: [
        {
          item_id: params.itemId,
          item_name: params.itemName,
          price: params.price,
          item_category: params.category,
        },
      ],
    },
  })
}
