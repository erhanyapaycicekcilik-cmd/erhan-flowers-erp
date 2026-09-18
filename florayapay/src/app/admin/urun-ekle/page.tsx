'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createProduct } from '@/app/admin/actions'

export default function AdminAddProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const result = await createProduct(form)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/admin/urunler'), 1500)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-light text-[#0D1510]">Yeni Ürün Ekle</h1>
        <p className="text-sm text-[#8C8A82] mt-1">Manuel ürün kaydı oluşturun</p>
      </div>

      {success && (
        <div className="bg-[#E8F0EA] text-[#1E3A28] px-4 py-3 rounded-xl mb-6 text-sm font-medium">
          ✅ Ürün başarıyla eklendi! Yönlendiriliyorsunuz...
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Temel bilgiler */}
        <div className="bg-white rounded-2xl border border-[#E0DDD4] p-6 space-y-4">
          <h2 className="font-semibold text-[#0D1510] text-sm uppercase tracking-wider">Temel Bilgiler</h2>

          <Field label="Ürün Adı *" name="name" required placeholder="örn. 180 cm Yapay Zeytin Ağacı" />
          <Field label="Model Kodu" name="modelCode" placeholder="örn. ZY-180-001" />

          <div className="grid grid-cols-2 gap-4">
            <Field label="Site Fiyatı (₺) *" name="sitePrice" type="number" required placeholder="0.00" step="0.01" min="0" />
            <Field label="Orijinal Fiyat (₺)" name="originalPrice" type="number" placeholder="0.00" step="0.01" min="0" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Marka" name="brand" placeholder="Erhan Flowers" />
            <Field label="Menşei" name="origin" placeholder="ÇİN" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="KDV Oranı (%)" name="vatRate" type="number" placeholder="10" min="0" max="100" />
            <Field label="Garanti (Ay)" name="warrantyMonths" type="number" placeholder="0" min="0" />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5C5C52] mb-1.5 uppercase tracking-wider">Stok Durumu</label>
            <select
              name="inStock"
              defaultValue="true"
              className="w-full px-4 py-2.5 rounded-xl border border-[#E0DDD4] bg-[#F4F2EC] text-[#0D1510] text-sm focus:outline-none focus:ring-2 focus:ring-[#5C7A62]"
            >
              <option value="true">Stokta Var</option>
              <option value="false">Stokta Yok</option>
            </select>
          </div>
        </div>

        {/* Açıklama */}
        <div className="bg-white rounded-2xl border border-[#E0DDD4] p-6 space-y-4">
          <h2 className="font-semibold text-[#0D1510] text-sm uppercase tracking-wider">Açıklama</h2>
          <div>
            <label className="block text-xs font-medium text-[#5C5C52] mb-1.5 uppercase tracking-wider">Ürün Açıklaması</label>
            <textarea
              name="description"
              rows={5}
              placeholder="Ürün hakkında detaylı bilgi..."
              className="w-full px-4 py-2.5 rounded-xl border border-[#E0DDD4] bg-[#F4F2EC] text-[#0D1510] text-sm focus:outline-none focus:ring-2 focus:ring-[#5C7A62] resize-y"
            />
          </div>
        </div>

        {/* Görseller */}
        <div className="bg-white rounded-2xl border border-[#E0DDD4] p-6 space-y-4">
          <h2 className="font-semibold text-[#0D1510] text-sm uppercase tracking-wider">Görseller</h2>
          <div>
            <label className="block text-xs font-medium text-[#5C5C52] mb-1.5 uppercase tracking-wider">
              Görsel URL&apos;leri (Her satıra bir URL)
            </label>
            <textarea
              name="images"
              rows={4}
              placeholder="https://cdn.dsmcdn.com/...&#10;https://cdn.dsmcdn.com/..."
              className="w-full px-4 py-2.5 rounded-xl border border-[#E0DDD4] bg-[#F4F2EC] text-[#0D1510] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#5C7A62] resize-y"
            />
            <p className="text-xs text-[#8C8A82] mt-1">İlk URL ana görsel olarak kullanılır.</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || success}
            className="flex-1 bg-[#0D1510] text-[#F4F2EC] py-3 rounded-xl font-semibold hover:bg-[#1E3A28] transition-colors disabled:opacity-60"
          >
            {loading ? 'Ekleniyor...' : 'Ürünü Ekle'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 rounded-xl border border-[#E0DDD4] text-[#5C5C52] hover:bg-[#F4F2EC] transition-colors"
          >
            İptal
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({
  label, name, type = 'text', required, placeholder, step, min, max
}: {
  label: string
  name: string
  type?: string
  required?: boolean
  placeholder?: string
  step?: string
  min?: string | number
  max?: string | number
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#5C5C52] mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        step={step}
        min={min}
        max={max}
        className="w-full px-4 py-2.5 rounded-xl border border-[#E0DDD4] bg-[#F4F2EC] text-[#0D1510] text-sm focus:outline-none focus:ring-2 focus:ring-[#5C7A62] transition"
      />
    </div>
  )
}
