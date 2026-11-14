import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { JsonLd } from '@/components/seo/JsonLd'
import { productSchema, breadcrumbSchema } from '@/lib/seo/schemas'
import { getProductBySlug, getImageUrl } from '@/lib/api/catalog'
import { formatPrice } from '@/lib/utils/format'
import { ProductImageGallery } from '@/components/product/ProductImageGallery'
import { AddToCartButton } from '@/components/product/AddToCartButton'
import { PriceOnRequestPrice, PriceInquiryButtons } from '@/components/product/PriceOnRequest'
import { ProductTracker } from '@/components/product/ProductTracker'
import { UrgencyBar } from '@/components/product/UrgencyBar'
import { DeliveryEstimate } from '@/components/product/DeliveryEstimate'
import { WhatsAppOrderButton } from '@/components/product/WhatsAppOrderButton'
import { ProductBuyBar, BuyNowButton } from '@/components/product/ProductBuyBar'
import { RelatedProducts } from '@/components/product/RelatedProducts'
import { ProductVideo } from '@/components/product/ProductVideo'

const SITE_URL = process.env.SITE_URL || 'https://www.erhanflowers.com'

interface PageProps {
  params: { slug: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const product = await getProductBySlug(params.slug)
  if (!product) return { title: 'Ürün Bulunamadı' }

  const imageUrl = getImageUrl(product.mainImage)

  return {
    title: product.name,
    description:
      product.description?.slice(0, 160) ||
      `${product.name} — Kaliteli yapay çiçek. ${product.category ? product.category + ' kategorisi.' : ''} Hızlı kargo, kolay iade.`,
    alternates: { canonical: `/urun/${params.slug}` },
    openGraph: {
      title: product.name,
      description: product.description?.slice(0, 200) || `${product.name} — Erhan Flowers`,
      images: [{ url: imageUrl, width: 800, height: 800, alt: product.name }],
      type: 'website',
    },
  }
}

export default async function ProductDetailPage({ params }: PageProps) {
  const product = await getProductBySlug(params.slug)
  if (!product) notFound()

  const images = product.images.length > 0 ? product.images : []
  const priceOnRequest = Boolean(product.priceOnRequest)
  const discount = product.originalPrice
    ? Math.round((1 - product.sitePrice / product.originalPrice) * 100)
    : null

  const breadcrumbs = [
    { name: 'Ana Sayfa', url: '/' },
    { name: 'Ürünler', url: '/urunler' },
    ...(product.category
      ? [{ name: product.category, url: `/urunler?kategori=${product.categorySlug}` }]
      : []),
    { name: product.name, url: `/urun/${params.slug}` },
  ]

  const structured = productSchema({
    name: product.name,
    description: product.description || product.name,
    image: images.map(getImageUrl),
    price: product.sitePrice,
    sku: product.modelCode,
    brand: product.brand,
    availability: product.inStock ? 'InStock' : 'OutOfStock',
  })

  return (
    <>
      {/* Fiyatsız ürün için Product/Offer şeması verilmez (fiyat 0 görünmesin) */}
      {!priceOnRequest && <JsonLd data={structured} />}
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <Header />

      {/* Google Ads view_item izleme */}
      <ProductTracker
        productId={String(product.id)}
        productName={product.name}
        price={product.sitePrice}
        category={product.category ?? undefined}
      />

      <main className="min-h-screen bg-[#F4F2EC]">
        {/* Breadcrumb */}
        <div className="bg-[#F4F2EC] border-b border-[#E0DDD4]">
          <div className="max-w-screen-2xl mx-auto px-4 py-3">
            <Breadcrumb items={breadcrumbs} />
          </div>
        </div>

        <div className="max-w-screen-2xl mx-auto px-4 py-8 lg:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
            {/* Sol — Görsel galeri + video */}
            <div className="space-y-4">
              <div className="relative">
                <ProductImageGallery
                  images={images.map(getImageUrl)}
                  productName={product.name}
                />
                {/* Görsel üstü etiketler (sadece gerçek olanlar) */}
                <div className="pointer-events-none absolute top-3 left-3 z-10 flex flex-col items-start gap-1.5">
                  {!priceOnRequest && product.compareAtLabel && discount && discount > 0 && (
                    <span className="bg-[#C62828] text-white text-xs sm:text-sm font-bold px-2.5 py-1 rounded-lg shadow">
                      {product.compareAtLabel}&apos;dan %{discount} ucuz
                    </span>
                  )}
                  {!priceOnRequest && product.sitePrice >= 1000 && (
                    <span className="bg-[#F5B400] text-[#1A1A1A] text-xs sm:text-sm font-bold px-2.5 py-1 rounded-lg shadow">
                      🚚 Kargo Bedava
                    </span>
                  )}
                </div>
                {product.videoUrl && (
                  <a
                    href="#urun-videosu"
                    className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 bg-white/95 border-2 border-[#E8590C] text-[#E8590C] text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-full shadow"
                  >
                    ▶ Ürün Videosunu İzle
                  </a>
                )}
              </div>
              {product.videoUrl && (
                <ProductVideo videoUrl={product.videoUrl} title={product.name} autoplay={true} />
              )}
            </div>

            {/* Sağ — Ürün bilgisi */}
            <div className="flex flex-col">
              {/* Kategori */}
              {product.category && (
                <Link
                  href={`/urunler?kategori=${product.categorySlug}`}
                  className="text-xs uppercase tracking-widest text-[#5C7A62] font-medium hover:underline mb-3"
                >
                  {product.category}
                </Link>
              )}

              {/* Marka + ürün adı */}
              <h1 className="text-xl lg:text-2xl text-[#5C5C52] leading-snug">
                {product.brand && <span className="font-semibold text-[#0D1510] mr-1.5">{product.brand}</span>}
                {product.name}
              </h1>

              {/* Renk/varyant */}
              {product.colorVariant && (
                <p className="text-[#8C8A82] text-sm mt-1">{product.colorVariant}</p>
              )}

              {/* Stok durumu */}
              <div className="mt-3">
                {product.inStock ? (
                  <span className="inline-flex items-center gap-1.5 text-[#5C7A62] text-sm font-medium">
                    <span className="w-2 h-2 bg-[#5C7A62] rounded-full" />
                    Stokta var
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[#8C8A82] text-sm">
                    <span className="w-2 h-2 bg-[#C4C0B8] rounded-full" />
                    Stokta yok
                  </span>
                )}
              </div>

              {/* Fiyat */}
              <div className="mt-5 pb-5 border-b border-[#E0DDD4]">
                {priceOnRequest ? (
                  <PriceOnRequestPrice />
                ) : (
                <>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
                  <span className="text-4xl font-semibold text-[#0D1510]">
                    {formatPrice(product.sitePrice)}
                  </span>
                  {product.originalPrice && (
                    <span className="text-lg text-[#C4C0B8]">
                      {product.compareAtLabel && <span className="text-sm mr-1">{product.compareAtLabel}&apos;da</span>}
                      <span className="line-through">{formatPrice(product.originalPrice)}</span>
                    </span>
                  )}
                  {discount && discount > 0 && (
                    <span className="whitespace-nowrap bg-[#E8F0EA] text-[#5C7A62] text-sm font-bold px-2.5 py-0.5 rounded-full">
                      {product.compareAtLabel ? `${product.compareAtLabel}'dan %${discount} ucuz` : `%${discount} indirim`}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#8C8A82] mt-1">
                  KDV dahil. Kargo bedava (1.000₺ ve üzeri).
                </p>
                </>
                )}
              </div>

              {/* Aciliyet çubuğu */}
              {!priceOnRequest && <UrgencyBar productId={String(product.id)} />}

              {/* Sepete ekle (fiyatsız üründe fiyat sorma butonları) */}
              {priceOnRequest ? (
                <div className="mt-2">
                  <PriceInquiryButtons productName={product.name} slug={params.slug} />
                </div>
              ) : (
              <div className="mt-2 space-y-3">
                <AddToCartButton
                  product={{
                    id: String(product.id),
                    name: product.name,
                    price: product.sitePrice,
                    image: product.mainImage,
                    slug: params.slug,
                  }}
                  disabled={!product.inStock}
                  size="lg"
                />
                <BuyNowButton
                  product={{ id: String(product.id), name: product.name, price: product.sitePrice, image: product.mainImage, slug: params.slug }}
                  disabled={!product.inStock}
                />
                <WhatsAppOrderButton
                  productName={product.name}
                  price={product.sitePrice}
                  slug={params.slug}
                />
              </div>
              )}

              {/* Teslimat tahmini */}
              <div className="mt-4">
                {!priceOnRequest && <DeliveryEstimate />}
              </div>

              {/* Mobilde altta sabit satın alma çubuğu */}
              {!priceOnRequest && (
                <ProductBuyBar
                  product={{ id: String(product.id), name: product.name, price: product.sitePrice, image: product.mainImage, slug: params.slug }}
                  inStock={product.inStock}
                  compareAtPrice={product.originalPrice}
                  compareAtLabel={product.compareAtLabel}
                />
              )}

              {/* Güven göstergeleri (fiyatsız/siparişe özel üründe gösterilmez) */}
              {!priceOnRequest && (
              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  { icon: '🚚', text: '2 İş Günü Kargo' },
                  { icon: '↩️', text: '14 Gün İade' },
                  { icon: '🔒', text: 'Güvenli Ödeme' },
                ].map((b) => (
                  <div key={b.text} className="text-center bg-white rounded-2xl p-3 border border-[#E0DDD4]">
                    <div className="text-2xl mb-1">{b.icon}</div>
                    <p className="text-xs text-[#5C5C52] font-medium leading-tight">{b.text}</p>
                  </div>
                ))}
              </div>
              )}

              {/* Ürün detayları */}
              <div className="mt-8 space-y-3">
                <h2 className="font-semibold text-[#0D1510]">Ürün Detayları</h2>
                <dl className="divide-y divide-[#E0DDD4] text-sm">
                  {[
                    { label: 'Model Kodu', value: product.modelCode },
                    { label: 'Marka', value: product.brand },
                    { label: 'Menşei', value: product.origin },
                    product.material && { label: 'Malzeme', value: product.material },
                    product.warrantyMonths > 0 && {
                      label: 'Garanti',
                      value: `${product.warrantyMonths} ay`,
                    },
                    { label: 'KDV Oranı', value: `%${product.vatRate}` },
                  ]
                    .filter(Boolean)
                    .map((row) => row && (
                      <div key={row.label} className="flex py-2.5 gap-4">
                        <dt className="w-28 flex-shrink-0 text-[#8C8A82]">{row.label}</dt>
                        <dd className="text-[#0D1510] font-medium">{row.value}</dd>
                      </div>
                    ))}
                </dl>
              </div>

              {/* Açıklama */}
              {product.description && (
                <div className="mt-6">
                  <h2 className="font-semibold text-[#0D1510] mb-2">Ürün Açıklaması</h2>
                  <p className="text-sm text-[#5C5C52] leading-relaxed whitespace-pre-line">
                    {product.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Video */}
        {product.videoUrl && (
          <div id="urun-videosu" className="max-w-2xl mx-auto px-4 pb-8 scroll-mt-24">
            <h2 className="font-semibold text-[#0D1510] mb-3">Ürün Videosu</h2>
            <ProductVideo videoUrl={product.videoUrl} title={product.name} />
          </div>
        )}

        {/* Benzer ürünler */}
        <div className="max-w-screen-2xl mx-auto px-4 pb-12">
          <RelatedProducts category={product.category ?? undefined} currentSlug={params.slug} />
        </div>
      </main>

      <Footer />
    </>
  )
}
