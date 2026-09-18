import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { AddToCartButton } from '@/components/product/AddToCartButton'
import { getCategories, getProducts, getImageUrl } from '@/lib/api/catalog'
import { formatPrice } from '@/lib/utils/format'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema } from '@/lib/seo/schemas'

interface PageProps {
  searchParams: {
    kategori?: string
    q?: string
    sayfa?: string
    sirala?: string
  }
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const categoryName = searchParams.kategori
    ? searchParams.kategori.replace(/-/g, ' ')
    : null

  const title = searchParams.q
    ? `"${searchParams.q}" araması`
    : categoryName
    ? `${categoryName.charAt(0).toUpperCase() + categoryName.slice(1)}`
    : 'Tüm Yapay Çiçek Ürünleri'

  const description = categoryName
    ? `${categoryName} kategorisinde yapay çiçek ve dekorasyon ürünleri. Kaliteli, solmayan ürünler. Hızlı kargo, kolay iade.`
    : "Türkiye'nin en kaliteli yapay çiçek koleksiyonu. 349+ ürün. Yapay ağaç, çiçek, dikey bahçe. Hızlı kargo."

  return {
    title,
    description,
    alternates: { canonical: '/urunler' },
    openGraph: { title, description, type: 'website' },
  }
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const [categories, response] = await Promise.all([
    getCategories(),
    getProducts({
      category: searchParams.kategori,
      q: searchParams.q,
      page: searchParams.sayfa ? Number(searchParams.sayfa) : 1,
      sort: searchParams.sirala,
    }),
  ])

  const breadcrumbs = [
    { name: 'Ana Sayfa', url: '/' },
    { name: 'Ürünler', url: '/urunler' },
    ...(searchParams.kategori
      ? [{ name: searchParams.kategori.replace(/-/g, ' '), url: `/urunler?kategori=${searchParams.kategori}` }]
      : []),
  ]

  const activeCategory = searchParams.kategori

  return (
    <>
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <Header />
      <main className="min-h-screen bg-[#F4F2EC]">

        {/* Sayfa başlığı */}
        <div className="bg-[#F4F2EC] pt-8 pb-5 px-4 text-center border-b border-[#E0DDD4]">
          <h1 className="font-display text-3xl md:text-4xl font-light text-[#0D1510]">
            {searchParams.q
              ? `"${searchParams.q}" sonuçları`
              : activeCategory
              ? activeCategory.replace(/-/g, ' ').charAt(0).toUpperCase() + activeCategory.replace(/-/g, ' ').slice(1)
              : 'Tüm Ürünler'}
          </h1>
          <p className="text-sm text-[#8C8A82] mt-2">{response.pagination.total} ürün</p>
        </div>

        {/* Kategori tabları */}
        <div className="bg-white border-b border-[#E0DDD4] sticky top-[104px] z-40">
          <div className="max-w-screen-2xl mx-auto px-4 overflow-x-auto">
            <div className="flex gap-1 py-2 min-w-max">
              <Link
                href="/urunler"
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  !activeCategory
                    ? 'bg-[#0D1510] text-[#F4F2EC]'
                    : 'text-[#5C5C52] hover:bg-[#F4F2EC]'
                }`}
              >
                Tümü
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/urunler?kategori=${cat.slug}`}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    activeCategory === cat.slug
                      ? 'bg-[#0D1510] text-[#F4F2EC]'
                      : 'text-[#5C5C52] hover:bg-[#F4F2EC]'
                  }`}
                >
                  {cat.name}
                  <span className="ml-1.5 text-xs opacity-60">{cat.count}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Ürün grid — tam genişlik */}
        <div className="max-w-screen-2xl mx-auto px-4 py-8">
          {response.products.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-5xl mb-4">🌿</p>
              <p className="text-lg font-medium text-[#0D1510]">Ürün bulunamadı</p>
              <p className="text-sm text-[#8C8A82] mt-1 mb-6">Farklı bir kategori deneyin</p>
              <Link href="/urunler" className="text-[#5C7A62] font-semibold hover:underline">
                Tüm Ürünlere Git →
              </Link>
            </div>
          ) : (
            <>
              <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                {response.products.map((product) => (
                  <li key={product.id}>
                    <article className="group bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300">
                      {/* Görsel */}
                      <Link href={`/urun/${product.slug}`} className="block relative overflow-hidden bg-[#F4F2EC]">
                        <div className="aspect-square relative">
                          <Image
                            src={getImageUrl(product.mainImage)}
                            alt={product.name}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                        {!product.inStock && (
                          <div className="absolute top-2 left-2">
                            <span className="bg-[#5C5C52] text-white text-xs px-2 py-0.5 rounded-full">Tükendi</span>
                          </div>
                        )}
                      </Link>

                      {/* Bilgi */}
                      <div className="p-3">
                        {product.category && (
                          <p className="text-[10px] uppercase tracking-widest text-[#8C8A82] mb-1">{product.category}</p>
                        )}
                        <Link href={`/urun/${product.slug}`}>
                          <h3 className="text-sm text-[#0D1510] hover:text-[#5C7A62] transition-colors line-clamp-2 leading-snug">
                            {product.name}
                          </h3>
                        </Link>
                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          <p className="font-semibold text-[#0D1510]">{formatPrice(product.sitePrice)}</p>
                          <AddToCartButton
                            product={{
                              id: String(product.id),
                              name: product.name,
                              price: product.sitePrice,
                              image: product.mainImage,
                              slug: product.slug,
                            }}
                            disabled={!product.inStock}
                          />
                        </div>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>

              {/* Sayfalama */}
              {response.pagination.totalPages > 1 && (
                <nav className="mt-12 flex justify-center gap-2" aria-label="Sayfalama">
                  {Array.from({ length: Math.min(response.pagination.totalPages, 10) }, (_, i) => i + 1).map((p) => {
                    const currentPage = Number(searchParams.sayfa ?? 1)
                    return (
                      <Link
                        key={p}
                        href={`?${new URLSearchParams({ ...(activeCategory ? { kategori: activeCategory } : {}), sayfa: String(p) })}`}
                        aria-current={p === currentPage ? 'page' : undefined}
                        className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-medium transition-colors ${
                          p === currentPage
                            ? 'bg-[#0D1510] text-[#F4F2EC]'
                            : 'bg-white text-[#0D1510] hover:bg-[#F4F2EC]'
                        }`}
                      >
                        {p}
                      </Link>
                    )
                  })}
                </nav>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
