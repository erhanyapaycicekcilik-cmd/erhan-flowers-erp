'use client'

import { useState } from 'react'
import { triggerRecategorize } from '@/app/admin/actions'

interface RecResult {
  updated: number
  skipped: number
  details: string[]
}

export function RecategorizeButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<RecResult | null>(null)
  const [error, setError] = useState('')

  async function handleRun() {
    if (!confirm('Ürünler ada göre otomatik kategorilere atanacak. Devam edilsin mi?')) return
    setState('loading')
    setError('')
    try {
      const res = await triggerRecategorize()
      if (res.error) throw new Error(res.error)
      setResult(res.data as RecResult)
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
          <span className="text-lg">🗂️</span>
          <h3 className="font-semibold text-[#0D1510]">Kategorileri Otomatik Düzenle</h3>
        </div>
        <p className="text-sm text-[#8C8A82]">
          Ürün adına göre kategorileri atar: Bambu → Bambu, Sarmaşık → Sarmaşık, Ağaç → Yapay Ağaç vb.
        </p>
        {state === 'done' && result && (
          <p className="text-xs text-[#5C7A62] mt-1.5">
            ✅ {result.updated} ürün yeniden kategorilendi, {result.skipped} atlandı
          </p>
        )}
        {state === 'error' && (
          <p className="text-xs text-red-500 mt-1.5">❌ {error}</p>
        )}
      </div>
      <button
        onClick={handleRun}
        disabled={state === 'loading'}
        className="flex items-center gap-2 bg-[#5C7A62] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1E3A28] transition-colors disabled:opacity-60 whitespace-nowrap"
      >
        {state === 'loading' ? (
          <>
            <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            Düzenleniyor...
          </>
        ) : (
          <>🗂️ Şimdi Düzenle</>
        )}
      </button>
    </div>
  )
}
