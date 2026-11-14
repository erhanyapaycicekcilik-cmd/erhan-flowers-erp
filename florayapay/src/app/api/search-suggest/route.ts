import { NextRequest, NextResponse } from 'next/server'
import { ERP_API_URL } from '@/lib/erp-internal'
import { getImageUrl } from '@/lib/api/catalog'

// Arama kutusu için canlı ürün önerileri (yazarken)
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 60)
  if (q.length < 2) return NextResponse.json({ products: [] })
  try {
    const res = await fetch(`${ERP_API_URL}/public/catalog/products?q=${encodeURIComponent(q)}&limit=8&page=1`, {
      next: { revalidate: 120 },
    })
    if (!res.ok) return NextResponse.json({ products: [] })
    const data = await res.json()
    const products = (data?.products ?? []).slice(0, 6).map((p: any) => ({
      name: p.name,
      slug: p.slug,
      price: p.priceOnRequest ? null : p.sitePrice,
      compareAt: p.originalPrice && p.originalPrice > p.sitePrice ? p.originalPrice : null,
      compareAtLabel: p.compareAtLabel ?? null,
      image: p.mainImage ? getImageUrl(p.mainImage) : null,
      category: p.category ?? null,
    }))
    return NextResponse.json({ products }, { headers: { 'Cache-Control': 'public, max-age=60' } })
  } catch {
    return NextResponse.json({ products: [] })
  }
}
