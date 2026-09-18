import Link from 'next/link'
import { getProducts, getCategories } from '@/lib/api/catalog'
import { TrendyolSyncButton } from '@/components/admin/TrendyolSyncButton'

export default async function AdminDashboard() {
  const [res, categories] = await Promise.all([
    getProducts({ page: 1 }),
    getCategories(),
  ])

  const stats = [
    { label: 'Toplam Ürün', value: res.pagination.total, href: '/admin/urunler' },
    { label: 'Kategori', value: categories.length, href: '/admin/urunler' },
    { label: 'Sayfa Sayısı', value: res.pagination.totalPages, href: '/admin/urunler' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-10">
        <h1 className="font-display text-3xl font-light text-[#0D1510]">Yönetim Paneli</h1>
        <p className="text-[#8C8A82] mt-1">Erhan Flowers mağaza yönetimi</p>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}
            className="bg-white rounded-2xl p-6 border border-[#E0DDD4] hover:shadow-md transition-shadow">
            <p className="text-4xl font-semibold text-[#0D1510]">{s.value}</p>
            <p className="text-sm text-[#8C8A82] mt-1">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* Trendyol Sync */}
      <div className="mb-6">
        <TrendyolSyncButton />
      </div>

      {/* Hızlı işlemler */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/admin/urun-ekle"
          className="bg-[#0D1510] text-[#F4F2EC] rounded-2xl p-6 hover:bg-[#1E3A28] transition-colors group">
          <div className="text-3xl mb-3">＋</div>
          <h3 className="font-semibold text-lg">Yeni Ürün Ekle</h3>
          <p className="text-sm text-white/60 mt-1">Manuel ürün kaydı oluştur</p>
        </Link>

        <Link href="/admin/urunler"
          className="bg-white border border-[#E0DDD4] rounded-2xl p-6 hover:shadow-md transition-shadow">
          <div className="text-3xl mb-3">📦</div>
          <h3 className="font-semibold text-lg text-[#0D1510]">Ürünleri Yönet</h3>
          <p className="text-sm text-[#8C8A82] mt-1">Listele, düzenle, sil</p>
        </Link>
      </div>

      {/* Kategoriler özeti */}
      {categories.length > 0 && (
        <div className="mt-10 bg-white rounded-2xl border border-[#E0DDD4] p-6">
          <h2 className="font-semibold text-[#0D1510] mb-4">Kategoriler</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link key={c.id} href={`/admin/urunler?kategori=${c.slug}`}
                className="px-3 py-1.5 bg-[#F4F2EC] rounded-full text-sm text-[#5C5C52] hover:bg-[#E0DDD4] transition-colors">
                {c.name}
                <span className="ml-1.5 text-[#8C8A82]">{c.count}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
