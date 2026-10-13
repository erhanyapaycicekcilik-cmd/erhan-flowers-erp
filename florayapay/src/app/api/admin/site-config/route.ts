import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { readSiteConfig, writeSiteConfig } from '@/lib/site-config'

export async function GET() {
  try {
    return NextResponse.json(readSiteConfig())
  } catch {
    return NextResponse.json({ error: 'Okunamadı' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const jar = await cookies()
  const auth = jar.get('admin_auth')?.value
  const password = process.env.ADMIN_PASSWORD || 'erhan2024'
  if (auth !== password) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }
  try {
    const body = await req.json()
    writeSiteConfig(body)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Yazılamadı' }, { status: 500 })
  }
}
