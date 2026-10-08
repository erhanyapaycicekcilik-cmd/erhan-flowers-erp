import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { cookies } from 'next/headers'

// In Docker (standalone build): /app/data/banner-config.json (volume-mounted)
// In local dev: /app/src/lib/banner-config.json (fallback)
const CONFIG_PATH = process.env.NODE_ENV === 'production'
  ? join(process.cwd(), 'data/banner-config.json')
  : join(process.cwd(), 'src/lib/banner-config.json')

function readConfig() {
  return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'))
}

export async function GET() {
  try {
    return NextResponse.json(readConfig())
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
    writeFileSync(CONFIG_PATH, JSON.stringify(body, null, 2), 'utf-8')
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Yazılamadı' }, { status: 500 })
  }
}
