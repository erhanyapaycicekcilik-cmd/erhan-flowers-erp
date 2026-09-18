import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

// ERP backend bu endpoint'i çağırınca ürünler listesi anında güncellenir.
// Güvenlik: REVALIDATE_SECRET token ile korunur.
// ERP'ye ekle: process.env.SITE_REVALIDATE_URL + ?secret=...
export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')

  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const slug = body.slug as string | undefined

  // Belirli bir ürün sayfasını veya tüm ürünler listesini yenile
  if (slug) {
    revalidatePath(`/urun/${slug}`)
  }
  revalidatePath('/urunler')
  revalidatePath('/')

  return NextResponse.json({ revalidated: true, at: new Date().toISOString() })
}
