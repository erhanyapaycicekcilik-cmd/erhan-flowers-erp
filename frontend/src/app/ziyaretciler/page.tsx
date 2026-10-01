'use client'

import { useEffect, useState, useCallback } from 'react'
import { apiFetch } from '@/lib/api'

interface PageView {
  id: number
  site: string
  path: string
  ipAddress: string
  deviceBrand: string | null
  deviceType: string | null
  browser: string | null
  createdAt: string
}

export default function ZiyaretcilerPage() {
  const [items, setItems] = useState<PageView[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [site, setSite] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '200' })
      if (site) params.set('site', site)
      const data = await apiFetch(`/visitor-logs?${params}`)
      setItems(data.items)
      setTotal(data.total)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [site])

  useEffect(() => { load() }, [load])

  // Her 30 saniyede otomatik yenile
  useEffect(() => {
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [load])

  function deviceIcon(type: string | null) {
    if (type === 'mobile') return '📱'
    if (type === 'tablet') return '📱'
    return '🖥️'
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Ziyaretçiler</h1>
          <p className="text-gray-500 text-sm mt-1">Toplam: {total} kayıt</p>
        </div>
        <div className="flex gap-3">
          <select
            value={site}
            onChange={(e) => setSite(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Tüm Siteler</option>
            <option value="shop">E-Ticaret (florayapaycicek.com)</option>
            <option value="erp">ERP Paneli</option>
          </select>
          <button
            onClick={load}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            Yenile
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Yükleniyor…</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Zaman</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Site</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Sayfa</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">IP Adresi</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Cihaz</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tarayıcı</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                    {new Date(v.createdAt).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      v.site === 'shop' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {v.site === 'shop' ? 'E-Ticaret' : 'ERP'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-700 max-w-xs truncate">{v.path}</td>
                  <td className="px-4 py-2 font-mono text-gray-600">{v.ipAddress || '—'}</td>
                  <td className="px-4 py-2">
                    <span className="flex items-center gap-1">
                      {deviceIcon(v.deviceType)}
                      <span>{v.deviceBrand ?? v.deviceType ?? '—'}</span>
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{v.browser ?? '—'}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    Henüz ziyaretçi kaydı yok
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
