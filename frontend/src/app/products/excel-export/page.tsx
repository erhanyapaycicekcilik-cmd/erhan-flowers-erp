'use client'

import { useRef, useState } from 'react'
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
  const [importResult, setImportResult] = useState<{ updated: number; skipped: number; notFound: number; errors: string[] } | null>(null)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function getToken() {
    return localStorage.getItem(`auth_token_${window.location.hostname}_${window.location.port || 'default'}`) ?? localStorage.getItem('auth_token') ?? ''
  }

  async function download(platform: string) {
    setLoading(platform)
    setError(null)
    try {
      const res = await fetch(`${apiBaseUrl}/products/export-excel?platform=${platform}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
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

  async function importPrices(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setError(null)
    setImportResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`${apiBaseUrl}/products/import-prices-excel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      })
      if (!res.ok) throw new Error(`Sunucu hatası: ${res.status}`)
      const result = await res.json()
      setImportResult(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
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

      {/* Trendyol Excel'inden Fiyat Aktarımı */}
      <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl">
        <h2 className="font-semibold text-orange-800 mb-1">Trendyol Excel'inden Fiyat Aktar</h2>
        <p className="text-xs text-orange-700 mb-3">
          Trendyol satıcı panelinden indirilen ürün Excel'ini yükleyin. Fiyatlar otomatik aktarılır:<br />
          <strong>Site fiyatı = Trendyol fiyatı × %80</strong> · <strong>Platformlar = Trendyol fiyatı</strong>
        </p>
        <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${importing ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-orange-600 text-white hover:bg-orange-700'}`}>
          {importing ? 'Aktarılıyor…' : 'Excel Seç & Aktar'}
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={importPrices} disabled={importing} />
        </label>

        {importResult && (
          <div className="mt-3 p-3 bg-white border border-orange-200 rounded-lg text-sm">
            <div className="flex gap-4 font-medium text-green-700">
              <span>✓ {importResult.updated} güncellendi</span>
              <span className="text-gray-500">{importResult.skipped} atlandı</span>
              <span className="text-red-500">{importResult.notFound} bulunamadı</span>
            </div>
            {importResult.errors.length > 0 && (
              <div className="mt-2 text-red-600 text-xs">{importResult.errors.slice(0, 5).join(' · ')}</div>
            )}
          </div>
        )}
      </div>

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
          <li>Trendyol panelinden ürün listesini Excel olarak indirin → <strong>Fiyat Aktar</strong> butonu ile yükleyin</li>
          <li>ERP fiyatları güncellenir (site %20 ucuz, platformlar aynı)</li>
          <li>İstediğiniz platformun Excel'ini indirin</li>
          <li>İlgili pazaryerinin satıcı paneline → <em>Ürünlerim → Fiyat/Stok Güncelle → Excel ile yükle</em></li>
        </ol>
      </div>
    </div>
  )
}
