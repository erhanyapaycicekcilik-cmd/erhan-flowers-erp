'use client'

import { useState } from 'react'
import { apiBaseUrl } from '@/lib/api'

const PLATFORMS = [
  { key: 'TRENDYOL',     label: 'Trendyol',      color: 'bg-orange-500', desc: 'Barkod, Miktar, Satış/Piyasa Fiyatı' },
  { key: 'HEPSIBURADA',  label: 'Hepsiburada',   color: 'bg-yellow-500', desc: 'Satıcı Stok Kodu, Fiyat, Stok' },
  { key: 'N11',          label: 'N11',            color: 'bg-purple-600', desc: 'Ürün Kodu, Barkod, Fiyat, Stok, Görsel' },
  { key: 'PAZARAMA',     label: 'Pazarama',       color: 'bg-blue-600',   desc: 'stockCode, price, quantity, imageUrl' },
  { key: 'IDEAFIX',      label: 'Ideafix',        color: 'bg-green-600',  desc: 'Ürün Kodu, Barkod, Fiyat, Stok, Görsel' },
  { key: 'GENEL',        label: 'Genel (Tümü)',   color: 'bg-gray-600',   desc: 'Tüm alanlar — adaptasyon için' },
]

export default function ExcelExportPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function download(platform: string) {
    setLoading(platform)
    setError(null)
    try {
      const token = localStorage.getItem(`auth_token_${window.location.hostname}_${window.location.port || 'default'}`) ?? localStorage.getItem('auth_token') ?? ''
      const res = await fetch(`${apiBaseUrl}/products/export-excel?platform=${platform}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`Sunucu hatası: ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `urunler-${platform.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Toplu Excel İndirme</h1>
      <p className="text-gray-500 mb-6 text-sm">
        Ürünleri istediğiniz pazaryerinin formatında Excel olarak indirin. Fiyatlar ERP'deki güncel değerlerden alınır ve tam sayıya yuvarlanır.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PLATFORMS.map((p) => (
          <div key={p.key} className="border rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${p.color}`} />
              <span className="font-semibold text-gray-800">{p.label}</span>
            </div>
            <p className="text-xs text-gray-400">{p.desc}</p>
            <button
              onClick={() => download(p.key)}
              disabled={!!loading}
              className="mt-auto w-full py-2 px-4 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading === p.key ? 'İndiriliyor…' : 'Excel İndir'}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
        <strong>Nasıl kullanılır?</strong>
        <ol className="list-decimal ml-4 mt-2 space-y-1">
          <li>İstediğiniz platformun Excel'ini indirin</li>
          <li>Fiyatları kontrol edin, gerekirse düzeltin</li>
          <li>İlgili pazaryerinin satıcı paneliне → <em>Ürünlerim → Fiyat/Stok Güncelle → Excel ile yükle</em></li>
          <li>İndirdiğiniz dosyayı seçip yükleyin</li>
        </ol>
      </div>
    </div>
  )
}
