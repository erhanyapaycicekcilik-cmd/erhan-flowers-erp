'use client'

import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="text-7xl mb-6">⚠️</div>
      <h1 className="font-display text-3xl font-bold text-gray-800 mb-3">Bir Hata Oluştu</h1>
      <p className="text-gray-500 mb-8 max-w-sm">
        Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="bg-flora-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-flora-700 transition-colors"
        >
          Tekrar Dene
        </button>
        <Link
          href="/"
          className="border border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
        >
          Ana Sayfa
        </Link>
      </div>
    </div>
  )
}
