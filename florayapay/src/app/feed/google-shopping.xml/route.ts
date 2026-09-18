import { NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8101'
const SITE_URL = process.env.SITE_URL || 'https://florayapaycicek.com'

// Google Product Category mapping for artificial flowers/plants
const CATEGORY_MAP: Record<string, string> = {
  'bambu':              '5886',  // Home & Garden > Plants
  'yapay-agac-yesil':  '5886',
  'yapay-agac-renkli': '5886',
  'cicekler':          '5886',
  'demet-cicek':       '5886',
  'sarmasik':          '5886',
  'saksili':           '5886',
  'tekli':             '5886',
  'separator':         '6342',  // Home & Garden > Decor
  'duvar-dekor':       '6342',
  'dikey-bahce':       '6342',
  'genel':             '5886',
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  try {
    // Fetch all visible products (up to 1000)
    const res = await fetch(
      `${API_URL}/public/catalog/products?limit=1000&page=1`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    const data = await res.json()
    const products = data.products ?? []

    const items = products
      .filter((p: any) => p.mainImage && p.sitePrice > 0)
      .map((p: any) => {
        const productUrl = `${SITE_URL}/urun/${escapeXml(p.slug)}`
        const imageUrl = escapeXml(p.mainImage)
        const title = escapeXml(p.name)
        const description = escapeXml(p.description || p.name)
        const price = p.sitePrice.toFixed(2)
        const availability = p.inStock ? 'in_stock' : 'out_of_stock'
        const brand = escapeXml(p.brand || 'Erhan Flowers')
        const gCategory = CATEGORY_MAP[p.categorySlug ?? ''] ?? '5886'

        return `    <item>
      <g:id>${p.id}</g:id>
      <g:title>${title}</g:title>
      <g:description>${description}</g:description>
      <g:link>${productUrl}</g:link>
      <g:image_link>${imageUrl}</g:image_link>
      <g:price>${price} TRY</g:price>${p.originalPrice ? `\n      <g:sale_price>${price} TRY</g:sale_price>` : ''}
      <g:availability>${availability}</g:availability>
      <g:condition>new</g:condition>
      <g:brand>${brand}</g:brand>
      <g:google_product_category>${gCategory}</g:google_product_category>
      <g:identifier_exists>false</g:identifier_exists>${p.modelCode ? `\n      <g:mpn>${escapeXml(p.modelCode)}</g:mpn>` : ''}
    </item>`
      })
      .join('\n')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Erhan Flowers — Yapay Çiçek &amp; Dekorasyon</title>
    <link>${SITE_URL}</link>
    <description>Erhan Flowers ürün kataloğu</description>
${items}
  </channel>
</rss>`

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    })
  } catch (err) {
    console.error('Google Shopping feed error:', err)
    return new NextResponse('Feed generation failed', { status: 500 })
  }
}
