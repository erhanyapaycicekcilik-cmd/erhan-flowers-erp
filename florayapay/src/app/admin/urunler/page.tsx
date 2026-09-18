import Link from 'next/link'
import Image from 'next/image'
import { getProducts, getCategories, getImageUrl } from '@/lib/api/catalog'
import { formatPrice } from '@/lib/utils/format'

interface PageProps {
  searchParams: { kategori?: string; q?: string; sayfa?: string }
}

export default async function AdminProductsPage({ searchParams }: PageProps) {
  const [res, categories] = await Promise.all([
    getProducts({
      category: searchParams.kategori,
      q: searchParams.q,
      page: searchParams.sayfa ? Number(searchParams.sayfa) : 1,
    }),
    getCategories(),
  ])

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-light text-[#0D1510]">Ürünler</h1>
          <p className="text-sm text-[#8C8A82] mt-0.5">{res.pagination.total} ürün</p>
        </div>
        <Link href="/admin/urun-ekle"
          className="bg-[#0D1510] text-[#F4F2EC] px-5 py-2 rounded-xl text-sm font-semibold hover:bg-[#1E3A28] transition-colors">
          + Ürün Ekle
        </Link>
      </div>

      {/* Filtreler */}
      <div className="bg-white rounded-2xl border border-[#E0DDD4] p-4 mb-6 flex flex-wrap gap-3 items-center">
        <form className="flex gap-2 flex-1 min-w-[200px]">
          <input
            type="search"
            name="q"
            defaultValue={searchParams.q}
            placeholder="Ürün ara..."
            className="flex-1 px-4 py-2 rounded-lg border border-[#E0DDD4] text-sm focus:outline-none focus:ring-2 focus:ring-[#5C7A62] bg-[#F4F2EC]"
          />
          <button type="submit" className="px-4 py-2 bg-[#0D1510] text-white rounded-lg text-sm hover:bg-[#1E3A28]">
            Ara
          </button>
        </form>
        <div className="flex flex-wrap gap-1">
          <Link href="/admin/urunler"
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!searchParams.kategori ? 'bg-[#0D1510] text-white' : 'bg-[#F4F2EC] text-[#5C5C52] hover:bg-[#E0DDD4]'}`}>
            Tümü
          </Link>
          {categories.map(c => (
            <Link key={c.id} href={`/admin/urunler?kategori=${c.slug}`}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${searchParams.kategori === c.slug ? 'bg-[#0D1510] text-white' : 'bg-[#F4F2EC] text-[#5C5C52] hover:bg-[#E0DDD4]'}`}>
              {c.name} <span className="opacity-60">{c.count}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Ürün tablosu */}
      <div className="bg-white rounded-2xl border border-[#E0DDD4] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F4F2EC] border-b border-[#E0DDD4]">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-[#5C5C52] w-16">Görsel</th>
              <th className="text-left px-4 py-3 font-medium text-[#5C5C52]">Ürün Adı</th>
              <th className="text-left px-4 py-3 font-medium text-[#5C5C52] hidden md:table-cell">Kategori</th>
              <th className="text-right px-4 py-3 font-medium text-[#5C5C52]">Fiyat</th>
              <th className="text-center px-4 py-3 font-medium text-[#5C5C52] hidden sm:table-cell">Stok</th>
              <th className="text-right px-4 py-3 font-medium text-[#5C5C52]">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F4F2EC]">
            {res.products.map((p) => (
              <tr key={p.id} className="hover:bg-[#F4F2EC]/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="w-12 h-12 relative rounded-lg overflow-hidden bg-[#F4F2EC]">
                    <Image
                      src={getImageUrl(p.mainImage)}
                      alt={p.name}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-[#0D1510] line-clamp-1">{p.name}</p>
                    <p className="text-xs text-[#8C8A82] mt-0.5">{p.modelCode}</p>
                  </div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="text-xs px-2 py-1 bg-[#F4F2EC] rounded-full text-[#5C5C52]">
                    {p.category || '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-[#0D1510]">
                  {formatPrice(p.sitePrice)}
                </td>
                <td className="px-4 py-3 text-center hidden sm:table-cell">
                  <span className={`inline-block w-2 h-2 rounded-full ${p.inStock ? 'bg-[#5C7A62]' : 'bg-[#C4C0B8]'}`} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/urun/${p.slug}`}
                    target="_blank"
                    className="text-xs text-[#5C7A62] hover:underline mr-3"
                  >
                    Gör
                  </Link>
                  <Link
                    href={`/admin/urun-duzenle/${p.id}`}
                    className="text-xs text-[#5C7A62] hover:underline"
                  >
                    Düzenle
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {res.products.length === 0 && (
          <div className="text-center py-16 text-[#8C8A82]">Ürün bulunamadı</div>
        )}
      </div>

      {/* Sayfalama */}
      {res.pagination.totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          {Array.from({ length: Math.min(res.pagination.totalPages, 15) }, (_, i) => i + 1).map(p => (
            <Link key={p}
              href={`?${new URLSearchParams({ ...(searchParams.kategori ? { kategori: searchParams.kategori } : {}), sayfa: String(p) })}`}
              className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${p === Number(searchParams.sayfa ?? 1) ? 'bg-[#0D1510] text-white' : 'bg-white border border-[#E0DDD4] text-[#5C5C52] hover:bg-[#F4F2EC]'}`}>
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
