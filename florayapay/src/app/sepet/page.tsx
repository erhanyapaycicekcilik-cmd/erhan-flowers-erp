'use client'

import { useCart } from '@/hooks/useCart'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import Image from 'next/image'
import Link from 'next/link'
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react'
import { getImageUrl } from '@/lib/api/catalog'

function formatPrice(price: number) {
  return '₺' + new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price)
}

export default function SepetPage() {
  const { items, itemCount, total, removeItem, updateQuantity } = useCart()

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-50 py-8">
        <div className="max-w-5xl mx-auto px-4">
          {/* Başlık */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 font-playfair">Sepetim</h1>
            {itemCount > 0 && (
              <p className="text-gray-500 mt-1">{itemCount} ürün</p>
            )}
          </div>

          {items.length === 0 ? (
            <EmptyCart />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Ürün listesi */}
              <div className="lg:col-span-2 space-y-4">
                {items.map((item) => (
                  <CartItemRow
                    key={item.id}
                    item={item}
                    onRemove={removeItem}
                    onUpdateQty={updateQuantity}
                  />
                ))}
              </div>

              {/* Özet */}
              <div className="lg:col-span-1">
                <OrderSummary total={total} />
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}

function CartItemRow({
  item,
  onRemove,
  onUpdateQty,
}: {
  item: { id: string; name: string; price: number; image: string | null; slug: string; quantity: number }
  onRemove: (id: string) => void
  onUpdateQty: (id: string, qty: number) => void
}) {
  const imageUrl = item.image ? getImageUrl(item.image) : null

  return (
    <div className="bg-white rounded-2xl p-4 flex gap-4 shadow-sm">
      {/* Görsel */}
      <Link href={`/urun/${item.slug}`} className="shrink-0">
        <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 relative">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={item.name}
              fill
              className="object-cover"
              sizes="96px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="w-8 h-8 text-gray-300" />
            </div>
          )}
        </div>
      </Link>

      {/* Bilgi */}
      <div className="flex-1 min-w-0">
        <Link href={`/urun/${item.slug}`} className="font-medium text-gray-900 hover:text-flora-700 line-clamp-2 text-sm leading-snug">
          {item.name}
        </Link>
        <p className="text-flora-700 font-bold mt-1">{formatPrice(item.price)}</p>

        {/* Adet */}
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => onUpdateQty(item.id, item.quantity - 1)}
            className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
            aria-label="Azalt"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
          <button
            onClick={() => onUpdateQty(item.id, item.quantity + 1)}
            className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
            aria-label="Artır"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Sil + Toplam */}
      <div className="shrink-0 flex flex-col items-end justify-between">
        <button
          onClick={() => onRemove(item.id)}
          className="text-gray-400 hover:text-red-500 transition-colors"
          aria-label="Ürünü kaldır"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <p className="text-sm font-semibold text-gray-800">
          {formatPrice(item.price * item.quantity)}
        </p>
      </div>
    </div>
  )
}

function OrderSummary({ total }: { total: number }) {
  const kdvOrani = 0.20 // %20 KDV varsayımı
  const kdvDahil = total
  const kdvTutar = kdvDahil - kdvDahil / (1 + kdvOrani)

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-24">
      <h2 className="text-lg font-bold text-gray-900 mb-4 font-playfair">Sipariş Özeti</h2>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Ara toplam</span>
          <span>{formatPrice(total)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>KDV (%20)</span>
          <span>{formatPrice(kdvTutar)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Kargo</span>
          <span className="text-flora-600 font-medium">Ücretsiz</span>
        </div>
        <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-gray-900 text-base">
          <span>Toplam</span>
          <span>{formatPrice(total)}</span>
        </div>
      </div>

      <div className="mt-6">
        <a
          href="/siparis"
          className="w-full bg-[#0D1510] text-[#F4F2EC] py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-[#1E3A28] transition-colors"
        >
          Siparişe Geç
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <Link
          href="/urunler"
          className="text-sm text-flora-600 hover:text-flora-700 font-medium flex items-center gap-1"
        >
          ← Alışverişe devam et
        </Link>
      </div>
    </div>
  )
}

function EmptyCart() {
  return (
    <div className="text-center py-20">
      <div className="w-24 h-24 bg-flora-50 rounded-full flex items-center justify-center mx-auto mb-6">
        <ShoppingBag className="w-12 h-12 text-flora-400" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2 font-playfair">Sepetiniz boş</h2>
      <p className="text-gray-500 mb-6">Ürünlerimizi inceleyin ve beğendiklerinizi ekleyin.</p>
      <Link
        href="/urunler"
        className="inline-flex items-center gap-2 bg-flora-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-flora-700 transition-colors"
      >
        Ürünlere Git
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  )
}
