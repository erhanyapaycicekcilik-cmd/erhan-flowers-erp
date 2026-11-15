import { adminSecret } from '@/lib/admin-secret'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8101'

async function getGroups() {
  try {
    const secret = adminSecret()
    const res = await fetch(`${API_URL}/public/catalog/groups/admin/list?secret=${secret}`, {
      cache: 'no-store',
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export default async function AdminGroupsPage() {
  const groups = await getGroups()

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-light text-[#0D1510]">Ürün Grupları</h1>
          <p className="text-sm text-[#8C8A82] mt-0.5">Boy + saksı seçici yapılandırması</p>
        </div>
        <Link href="/admin/gruplar/yeni"
          className="bg-[#0D1510] text-[#F4F2EC] px-5 py-2 rounded-xl text-sm font-semibold hover:bg-[#1E3A28] transition-colors">
          + Yeni Grup
        </Link>
      </div>

      {groups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E0DDD4] p-16 text-center">
          <p className="text-4xl mb-4">🌳</p>
          <p className="text-lg font-medium text-[#0D1510]">Henüz grup yok</p>
          <p className="text-sm text-[#8C8A82] mt-1 mb-6">
            Ürün grubu oluşturarak müşterilerin boy ve saksı seçmesini sağlayın
          </p>
          <Link href="/admin/gruplar/yeni"
            className="inline-block bg-[#5C7A62] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#4a6350]">
            İlk Grubu Oluştur
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g: any) => (
            <div key={g.id} className="bg-white rounded-2xl border border-[#E0DDD4] p-5 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-[#0D1510]">{g.name}</h3>
                  {!g.isActive && (
                    <span className="text-xs px-2 py-0.5 bg-[#F4F2EC] text-[#8C8A82] rounded-full">Pasif</span>
                  )}
                </div>
                <p className="text-xs text-[#8C8A82] mt-1">
                  {g.category && <span className="mr-3">{g.category}</span>}
                  <span>{g.variants?.length ?? 0} varyant</span>
                  <span className="ml-3 font-mono text-[#C4C0B8]">/urun-grubu/{g.slug}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link href={`/urun-grubu/${g.slug}`} target="_blank"
                  className="text-xs px-3 py-1.5 bg-[#F4F2EC] text-[#5C5C52] rounded-lg hover:bg-[#E0DDD4]">
                  Görüntüle
                </Link>
                <Link href={`/admin/gruplar/${g.id}`}
                  className="text-xs px-3 py-1.5 bg-[#5C7A62] text-white rounded-lg hover:bg-[#4a6350]">
                  Düzenle
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
