import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { AddToCartButton } from '@/components/product/AddToCartButton'
import { PriceOnRequestInline } from '@/components/product/PriceOnRequest'
import { SidebarFilters } from '@/components/product/SidebarFilters'
import { getCategories, getSubCategories, getProducts, getProductGroups, getImageUrl } from '@/lib/api/catalog'
import { formatPrice } from '@/lib/utils/format'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema } from '@/lib/seo/schemas'

interface PageProps {
  searchParams: {
    kategori?: string
    altkategori?: string
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

  const canonical = searchParams.kategori
    ? `/urunler?kategori=${searchParams.kategori}`
    : '/urunler'

  return {
    title,
    description,
    alternates: { canonical },
    robots: searchParams.q ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: { title, description, type: 'website' },
  }
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const [categories, subCategories, response, groups] = await Promise.all([
    getCategories(),
    searchParams.kategori ? getSubCategories(searchParams.kategori) : Promise.resolve([]),
    getProducts({
      category: searchParams.kategori,
      subcategory: searchParams.altkategori,
      q: searchParams.q,
      page: searchParams.sayfa ? Number(searchParams.sayfa) : 1,
      limit: 24,
      sort: searchParams.sirala,
    }),
    !searchParams.q ? getProductGroups(searchParams.kategori, searchParams.altkategori) : Promise.resolve([]),
  ])

  const activeCategory = searchParams.kategori
  const activeSubCategory = searchParams.altkategori
  const currentPage = Number(searchParams.sayfa ?? 1)
  const activeCatName = activeCategory
    ? categories.find(c => c.slug === activeCategory)?.name ?? activeCategory.replace(/-/g, ' ')
    : null
  const activeSubCatName = activeSubCategory
    ? subCategories.find(s => s.slug === activeSubCategory)?.name ?? activeSubCategory.replace(/-/g, ' ')
    : null

  const pageTitle = searchParams.q
    ? `"${searchParams.q}" sonuçları`
    : activeSubCatName ?? activeCatName ?? 'Tüm Ürünler'

  const breadcrumbs = [
    { name: 'Ana Sayfa', url: '/' },
    { name: 'Ürünler', url: '/urunler' },
    ...(activeCatName
      ? [{ name: activeCatName, url: `/urunler?kategori=${activeCategory}` }]
      : []),
    ...(activeSubCatName
      ? [{ name: activeSubCatName, url: `/urunler?kategori=${activeCategory}&altkategori=${activeSubCategory}` }]
      : []),
  ]

  return (
    <>
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <Header />

      <main className="min-h-screen bg-[#F4F2EC]">
        <div className="max-w-screen-xl mx-auto px-4 py-6">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 text-xs text-[#8C8A82] mb-6 flex-wrap">
            <Link href="/" className="hover:text-[#5C7A62] transition-colors">Ana Sayfa</Link>
            <ChevronRight size={12} />
            <Link href="/urunler" className="hover:text-[#5C7A62] transition-colors">Ürünler</Link>
            {activeCatName && (
              <>
                <ChevronRight size={12} />
                <Link
                  href={`/urunler?kategori=${activeCategory}`}
                  className={activeSubCatName ? 'hover:text-[#5C7A62] transition-colors' : 'text-[#0D1510] font-medium'}
                >
                  {activeCatName}
                </Link>
              </>
            )}
            {activeSubCatName && (
              <>
                <ChevronRight size={12} />
                <span className="text-[#0D1510] font-medium">{activeSubCatName}</span>
              </>
            )}
          </nav>

          {/* Ana layout: sidebar + içerik */}
          <div className="flex gap-6 items-start">

            {/* Sol kenar çubuğu */}
            <SidebarFilters
              categories={categories}
              subCategories={subCategories}
              activeCategory={activeCategory}
              activeSubCategory={activeSubCategory}
              totalCount={response.pagination.total}
            />

            {/* Sağ içerik */}
            <div className="flex-1 min-w-0">

              {/* Başlık + sıralama */}
              <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
                <div>
                  <h1 className="text-xl font-semibold text-[#0D1510]">{pageTitle}</h1>
                  <p className="text-sm text-[#8C8A82] mt-0.5">{response.pagination.total} ürün bulundu</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {(['price_asc', 'price_desc', 'newest', 'name'] as const).map(s => {
                    const labels: Record<string, string> = {
                      price_asc: 'Fiyat ↑',
                      price_desc: 'Fiyat ↓',
                      newest: 'En Yeni',
                      name: 'İsim',
                    }
                    const qs = new URLSearchParams({
                      ...(activeCategory ? { kategori: activeCategory } : {}),
                      ...(activeSubCategory ? { altkategori: activeSubCategory } : {}),
                      sirala: s,
                    })
                    return (
                      <Link
                        key={s}
                        href={`/urunler?${qs}`}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                          searchParams.sirala === s
                            ? 'bg-[#1E3A28] text-white'
                            : 'bg-white border border-[#E0DDD4] text-[#5C5C52] hover:bg-[#F4F2EC]'
                        }`}
                      >
                        {labels[s]}
                      </Link>
                    )
                  })}
                </div>
              </div>

              {/* Koleksiyon grupları */}
              {groups.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs font-semibold uppercase tracking-widest text-[#5C7A62]">
                      {activeCatName ? `${activeCatName} Koleksiyonları` : 'Öne Çıkan Koleksiyonlar'}
                    </span>
                    <div className="flex-1 h-px bg-[#E0DDD4]" />
                  </div>
                  <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {groups.map((group, idx) => {
                      const prices = group.variants?.map((v: any) => v.price).filter(Boolean) ?? []
                      const minPrice = prices.length ? Math.min(...prices) : 0
                      const maxPrice = prices.length ? Math.max(...prices) : 0
                      const optionCount = group.variants?.length ?? 0
                      const sizes = [...new Set(group.variants?.map((v: any) => v.sizeLabel).filter(Boolean))] as string[]
                      return (
                        <li key={group.id}>
                          <article className="group bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 ring-2 ring-[#5C7A62]/20">
                            <Link href={`/urun-grubu/${group.slug}`} className="block relative overflow-hidden bg-[#F4F2EC]">
                              <div className="aspect-square relative">
                                {group.mainImage ? (
                                  <Image
                                    src={getImageUrl(group.mainImage)}
                                    alt={group.name}
                                    fill
                                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                    quality={70}
                                    priority={idx < 4}
                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-4xl">🌳</div>
                                )}
                              </div>
                              {sizes.length > 0 && (
                                <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                                  {sizes.slice(0, 3).map(s => (
                                    <span key={s} className="bg-white/90 backdrop-blur text-[#0D1510] text-[9px] font-semibold px-1.5 py-0.5 rounded-full shadow-sm">
                                      {s}
                                    </span>
                                  ))}
                                  {sizes.length > 3 && (
                                    <span className="bg-white/90 backdrop-blur text-[#8C8A82] text-[9px] px-1.5 py-0.5 rounded-full shadow-sm">
                                      +{sizes.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                              <div className="absolute bottom-2 right-2">
                                <span className="bg-[#5C7A62] text-white text-[10px] font-semibold px-2 py-1 rounded-full shadow">
                                  {optionCount} seçenek
                                </span>
                              </div>
                            </Link>
                            <div className="p-3">
                              {group.category && (
                                <p className="text-[10px] uppercase tracking-widest text-[#8C8A82] mb-1">{group.category}</p>
                              )}
                              <Link href={`/urun-grubu/${group.slug}`}>
                                <h3 className="text-sm text-[#0D1510] hover:text-[#5C7A62] transition-colors line-clamp-2 leading-snug font-medium">
                                  {group.name}
                                </h3>
                              </Link>
                              <div className="mt-2.5 flex items-center justify-between gap-2">
                                <p className="font-semibold text-[#0D1510] text-sm">
                                  {minPrice > 0
                                    ? minPrice === maxPrice
                                      ? formatPrice(minPrice)
                                      : `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`
                                    : '—'}
                                </p>
                                <Link
                                  href={`/urun-grubu/${group.slug}`}
                                  className="flex items-center gap-1 bg-[#5C7A62] text-white text-xs px-2.5 py-1.5 rounded-xl font-medium hover:bg-[#4a6350] transition-colors whitespace-nowrap"
                                >
                                  Boy Seç
                                </Link>
                              </div>
                            </div>
                          </article>
                        </li>
                      )
                    })}
                  </ul>

                  {response.products.length > 0 && (
                    <div className="flex items-center gap-2 mt-8 mb-5">
                      <span className="text-xs font-semibold uppercase tracking-widest text-[#8C8A82]">Tüm Ürünler</span>
                      <div className="flex-1 h-px bg-[#E0DDD4]" />
                    </div>
                  )}
                </div>
              )}

              {/* Ürün bulunamadı */}
              {response.products.length === 0 && groups.length === 0 && (
                <div className="text-center py-24">
                  <p className="text-5xl mb-4">🌿</p>
                  <p className="text-lg font-medium text-[#0D1510]">Ürün bulunamadı</p>
                  <p className="text-sm text-[#8C8A82] mt-1 mb-6">Farklı bir kategori deneyin</p>
                  <Link href="/urunler" className="text-[#5C7A62] font-semibold hover:underline">
                    Tüm Ürünlere Git →
                  </Link>
                </div>
              )}

              {/* Ürün grid */}
              {response.products.length > 0 && (
                <>
                  <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
                    {response.products.map((product, idx) => {
                      const discount = product.originalPrice && product.originalPrice > product.sitePrice
                        ? Math.round((1 - product.sitePrice / product.originalPrice) * 100)
                        : null

                      return (
                        <li key={product.id}>
                          <article className="group bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300">
                            <Link href={`/urun/${product.slug}`} className="block relative overflow-hidden bg-[#F4F2EC]">
                              <div className="aspect-square relative">
                                <Image
                                  src={getImageUrl(product.mainImage)}
                                  alt={product.name}
                                  fill
                                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                  quality={60}
                                  priority={idx < 8}
                                  loading={idx < 8 ? 'eager' : 'lazy'}
                                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                              </div>

                              {/* Dairesel rozetler */}
                              <div className="absolute top-2 left-2 flex flex-col gap-1">
                                {!product.inStock && (
                                  <span className="bg-[#5C5C52] text-white text-[10px] font-semibold w-10 h-10 rounded-full flex items-center justify-center text-center leading-tight shadow">
                                    Tükendi
                                  </span>
                                )}
                                {discount && discount >= 5 && (
                                  <span className="bg-[#8C2D2D] text-white text-[10px] font-bold w-10 h-10 rounded-full flex items-center justify-center shadow">
                                    %{discount}
                                  </span>
                                )}
                              </div>

                              <div className="absolute bottom-2 left-2">
                                <span className="bg-white/90 backdrop-blur text-[#1E3A28] text-[9px] font-semibold px-2 py-0.5 rounded-full shadow-sm">
                                  Ücretsiz Kargo
                                </span>
                              </div>
                            </Link>

                            <div className="p-3">
                              {product.category && (
                                <p className="text-[10px] uppercase tracking-widest text-[#8C8A82] mb-1">{product.category}</p>
                              )}
                              <Link href={`/urun/${product.slug}`}>
                                <h3 className="text-sm text-[#0D1510] hover:text-[#5C7A62] transition-colors line-clamp-2 leading-snug">
                                  {product.name}
                                </h3>
                              </Link>

                              {product.priceOnRequest ? (
                                <div className="mt-2.5">
                                  <PriceOnRequestInline productName={product.name} slug={product.slug} />
                                </div>
                              ) : (
                                <div className="mt-2.5 flex items-center justify-between gap-2">
                                  <div>
                                    <p className="font-bold text-[#0D1510] text-base">{formatPrice(product.sitePrice)}</p>
                                    {product.originalPrice && product.originalPrice > product.sitePrice && (
                                      <p className="text-xs text-[#B0ADA6] line-through">{formatPrice(product.originalPrice)}</p>
                                    )}
                                  </div>
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
                              )}
                            </div>
                          </article>
                        </li>
                      )
                    })}
                  </ul>

                  {/* Sayfalama */}
                  {response.pagination.totalPages > 1 && (
                    <nav className="mt-10 flex justify-center gap-2 flex-wrap" aria-label="Sayfalama">
                      {currentPage > 1 && (
                        <Link
                          href={`/urunler?${new URLSearchParams({
                            ...(activeCategory ? { kategori: activeCategory } : {}),
                            ...(activeSubCategory ? { altkategori: activeSubCategory } : {}),
                            ...(searchParams.sirala ? { sirala: searchParams.sirala } : {}),
                            sayfa: String(currentPage - 1),
                          })}`}
                          className="px-4 py-2 bg-white border border-[#E0DDD4] rounded-xl text-sm font-medium text-[#5C5C52] hover:bg-[#F4F2EC] transition-colors"
                        >
                          ← Önceki
                        </Link>
                      )}
                      {Array.from({ length: Math.min(response.pagination.totalPages, 10) }, (_, i) => i + 1).map((p) => (
                        <Link
                          key={p}
                          href={`/urunler?${new URLSearchParams({
                            ...(activeCategory ? { kategori: activeCategory } : {}),
                            ...(activeSubCategory ? { altkategori: activeSubCategory } : {}),
                            ...(searchParams.sirala ? { sirala: searchParams.sirala } : {}),
                            sayfa: String(p),
                          })}`}
                          aria-current={p === currentPage ? 'page' : undefined}
                          className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-medium transition-colors ${
                            p === currentPage
                              ? 'bg-[#1E3A28] text-white'
                              : 'bg-white border border-[#E0DDD4] text-[#0D1510] hover:bg-[#F4F2EC]'
                          }`}
                        >
                          {p}
                        </Link>
                      ))}
                      {currentPage < response.pagination.totalPages && (
                        <Link
                          href={`/urunler?${new URLSearchParams({
                            ...(activeCategory ? { kategori: activeCategory } : {}),
                            ...(activeSubCategory ? { altkategori: activeSubCategory } : {}),
                            ...(searchParams.sirala ? { sirala: searchParams.sirala } : {}),
                            sayfa: String(currentPage + 1),
                          })}`}
                          className="px-4 py-2 bg-white border border-[#E0DDD4] rounded-xl text-sm font-medium text-[#5C5C52] hover:bg-[#F4F2EC] transition-colors"
                        >
                          Sonraki →
                        </Link>
                      )}
                    </nav>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  )
}
