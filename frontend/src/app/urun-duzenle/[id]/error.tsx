'use client'

import { useEffect } from 'react'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('UrunDetay error:', error)
  }, [error])

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h2 className="text-lg font-bold text-red-600 mb-2">Sayfa yüklenemedi</h2>
      <pre className="text-xs bg-red-50 border border-red-200 rounded p-3 overflow-auto mb-4 text-red-800">
        {error?.message || String(error)}
        {error?.stack ? '\n\n' + error.stack : ''}
      </pre>
      <button
        onClick={reset}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
      >
        Tekrar Dene
      </button>
    </div>
  )
}
