import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const CONFIG_PATH = join(process.cwd(), 'src/lib/banner-config.json')

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
  try {
    const body = await req.json()
    writeFileSync(CONFIG_PATH, JSON.stringify(body, null, 2), 'utf-8')
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Yazılamadı' }, { status: 500 })
  }
}
