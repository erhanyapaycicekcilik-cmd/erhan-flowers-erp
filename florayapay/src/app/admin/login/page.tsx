'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { adminLogin } from '@/app/admin/actions'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from') || '/admin'
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const result = await adminLogin(form)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      router.push(from)
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F2EC] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-[#8C8A82] mb-2">Yönetim Paneli</p>
          <h1 className="font-display text-3xl font-light text-[#0D1510]">Erhan<em className="not-italic text-[#5C7A62]"> Flowers</em></h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 shadow-sm border border-[#E0DDD4]">
          <h2 className="text-lg font-semibold text-[#0D1510] mb-6">Giriş Yap</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#5C5C52] mb-1.5 uppercase tracking-wider">
                Şifre
              </label>
              <input
                type="password"
                name="password"
                required
                autoFocus
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-[#E0DDD4] bg-[#F4F2EC] text-[#0D1510] placeholder-[#C4C0B8] focus:outline-none focus:ring-2 focus:ring-[#5C7A62] focus:border-transparent transition"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0D1510] text-[#F4F2EC] py-3 rounded-xl font-semibold tracking-wide hover:bg-[#1E3A28] transition-colors disabled:opacity-60"
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </div>
        </form>

        <p className="text-center text-xs text-[#8C8A82] mt-6">
          Sadece yetkili kullanıcılar erişebilir.
        </p>
      </div>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
