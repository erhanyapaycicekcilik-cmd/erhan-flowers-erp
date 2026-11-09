'use client'

import { useState } from 'react'
import { bulkPriceAdjust } from '@/app/admin/actions'

type PreviewRow = {
  id: number
  name: string
  oldSitePrice: number
  newSitePrice: number
  oldMarketPrice: number
  newMarketPrice: number
}

function fmt(n: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n)
}

export function BulkPriceAdjust() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [percent, setPercent] = useState('')
  const [preview, setPreview] = useState<PreviewRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null)

  async function handlePreview() {
    if (!search.trim() || !percent) return
    setLoading(true)
    setMsg(null)
    setPreview(null)
    const res = await bulkPriceAdjust({ search: search.trim(), changePercent: Number(percent), dryRun: true })
    setLoading(false)
    if (res.error) { setMsg({ text: res.error }); return }
    setPreview(res.preview ?? [])
    if (!res.preview?.length) setMsg({ text: 'Eşleşen aktif ürün bulunamadı.' })
  }

  async function handleApply() {
    if (!search.trim() || !percent || !preview?.length) return
    setLoading(true)
    const res = await bulkPriceAdjust({ search: search.trim(), changePercent: Number(percent), dryRun: false })
    setLoading(false)
    if (res.error) { setMsg({ text: res.error }); return }
    setMsg({ ok: true, text: `${res.updated} ürün güncellendi, ${res.skipped} atlandı.` })
    setPreview(null)
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-xl border border-[#E0DDD4] text-sm text-[#5C5C52] hover:bg-[#F4F2EC] transition-colors mb-6">
        % Toplu Fiyat Ayarı
      </button>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E0DDD4] p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[#0D1510]">Toplu Fiyat Ayarı</h2>
        <button onClick={() => { setOpen(false); setPreview(null); setMsg(null) }}
          className="text-[#8C8A82] hover:text-[#0D1510] text-lg leading-none">×</button>
      </div>

      <div className="flex flex-wrap gap-3 items-end mb-4">
        <div>
          <label className="block text-xs text-[#8C8A82] mb-1">Ürün adı (içeren)</label>
          <input value={search} onChange={e => { setSearch(e.target.value); setPreview(null) }}
            placeholder="ör: bambu yaprağı"
            className="px-3 py-2 rounded-lg border border-[#E0DDD4] text-sm w-52 focus:outline-none focus:ring-2 focus:ring-[#5C7A62] bg-[#F4F2EC]" />
        </div>
        <div>
          <label className="block text-xs text-[#8C8A82] mb-1">Değişim % (eksi = indirim)</label>
          <input type="number" value={percent} onChange={e => { setPercent(e.target.value); setPreview(null) }}
            placeholder="ör: 20 veya -10"
            className="px-3 py-2 rounded-lg border border-[#E0DDD4] text-sm w-36 focus:outline-none focus:ring-2 focus:ring-[#5C7A62] bg-[#F4F2EC]" />
        </div>
        <button onClick={handlePreview} disabled={loading || !search.trim() || !percent}
          className="px-4 py-2 rounded-lg bg-[#F4F2EC] border border-[#E0DDD4] text-sm text-[#0D1510] hover:bg-[#E0DDD4] disabled:opacity-40 transition-colors">
          {loading ? 'Yükleniyor…' : 'Önizle'}
        </button>
      </div>

      {msg && (
        <p className={`text-sm mb-3 ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>
      )}

      {preview && preview.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl border border-[#E0DDD4] mb-4">
            <table className="w-full text-xs">
              <thead className="bg-[#F4F2EC]">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-[#5C5C52]">Ürün</th>
                  <th className="text-right px-3 py-2 font-medium text-[#5C5C52]">Site (eski→yeni)</th>
                  <th className="text-right px-3 py-2 font-medium text-[#5C5C52]">Piyasa (eski→yeni)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F2EC]">
                {preview.map(r => (
                  <tr key={r.id}>
                    <td className="px-3 py-2 text-[#0D1510]">{r.name}</td>
                    <td className="px-3 py-2 text-right text-[#5C5C52]">
                      <span className="line-through mr-1">{fmt(r.oldSitePrice)}</span>
                      <span className="font-semibold text-[#0D1510]">{fmt(r.newSitePrice)}</span>
                    </td>
                    <td className="px-3 py-2 text-right text-[#5C5C52]">
                      <span className="line-through mr-1">{fmt(r.oldMarketPrice)}</span>
                      <span className="font-semibold text-[#0D1510]">{fmt(r.newMarketPrice)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={handleApply} disabled={loading}
            className="px-5 py-2 rounded-xl bg-[#0D1510] text-white text-sm font-semibold hover:bg-[#1E3A28] disabled:opacity-40 transition-colors">
            {loading ? 'Uygulanıyor…' : `${preview.length} ürüne uygula`}
          </button>
        </>
      )}
    </div>
  )
}
