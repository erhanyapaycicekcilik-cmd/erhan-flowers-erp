import { NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8101'
const SITE_URL = process.env.SITE_URL || 'https://www.erhanflowers.com'

function escapeCsv(value: string | number | null | undefined): string {
  const str = String(value ?? '')
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET() {
  try {
    const res = await fetch(
      `${API_URL}/public/catalog/products?limit=2000&page=1`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    const data = await res.json()
    const products: any[] = data.products ?? []

    // Meta Catalog CSV header
    const headers = [
      'id', 'title', 'description', 'availability', 'condition',
      'price', 'link', 'image_link', 'brand', 'retailer_id',
    ]

    const rows = products
      .filter((p) => p.mainImage && p.sitePrice > 0)
      .map((p) => {
        const price = `${p.sitePrice.toFixed(2)} TRY`
        const availability = p.inStock ? 'in stock' : 'out of stock'
        const link = `${SITE_URL}/urun/${p.slug}`
        const description = p.description || p.name
        const brand = p.brand || 'Flora Yapay Çiçek'

        return [
          escapeCsv(p.id),
          escapeCsv(p.name),
          escapeCsv(description),
          escapeCsv(availability),
          'new',
          escapeCsv(price),
          escapeCsv(link),
          escapeCsv(p.mainImage),
          escapeCsv(brand),
          escapeCsv(p.modelCode || p.id),
        ].join(',')
      })

    const csv = [headers.join(','), ...rows].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'Content-Disposition': 'inline; filename="meta-catalog.csv"',
      },
    })
  } catch (err) {
    console.error('Meta catalog feed error:', err)
    return new NextResponse('Feed generation failed', { status: 500 })
  }
}
