'use client'

import { useState } from 'react'
import { triggerTrendyolSync } from '@/app/admin/actions'

interface SyncResult {
  inserted: number
  updated: number
  skipped: number
}

export function TrendyolSyncButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<SyncResult | null>(null)
  const [error, setError] = useState('')
  const [lastSync, setLastSync] = useState<string | null>(null)

  async function handleSync() {
    setState('loading')
    setError('')
    try {
      const res = await triggerTrendyolSync()
      if (res.error) throw new Error(res.error)
      setResult(res.data as SyncResult)
      setLastSync(new Date().toLocaleTimeString('tr-TR'))
      setState('done')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata')
      setState('error')
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E0DDD4] p-5 flex items-center justify-between gap-4 flex-wrap">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🔄</span>
          <h3 className="font-semibold text-[#0D1510]">Trendyol Ürün Senkronizasyonu</h3>
          <span className="text-xs bg-[#E8F0EA] text-[#5C7A62] px-2 py-0.5 rounded-full font-medium">Her 15 dk otomatik</span>
        </div>
        <p className="text-sm text-[#8C8A82]">
          Trendyol&apos;daki ürünleri çek, fiyat ve stok bilgilerini güncelle, siteyi anında yenile.
        </p>
        {state === 'done' && result && (
          <p className="text-xs text-[#5C7A62] mt-1.5">
            ✅ {lastSync} — +{result.inserted} yeni, ~{result.updated} güncellendi, {result.skipped} atlandı
          </p>
        )}
        {state === 'error' && (
          <p className="text-xs text-red-500 mt-1.5">❌ {error}</p>
        )}
      </div>
      <button
        onClick={handleSync}
        disabled={state === 'loading'}
        className="flex items-center gap-2 bg-[#0D1510] text-[#F4F2EC] px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1E3A28] transition-colors disabled:opacity-60 whitespace-nowrap"
      >
        {state === 'loading' ? (
          <>
            <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            Senkronize ediliyor...
          </>
        ) : (
          <>🔄 Şimdi Senkronize Et</>
        )}
      </button>
    </div>
  )
}
