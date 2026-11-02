import { NextRequest, NextResponse } from 'next/server'

const API = () => process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || ''

export async function POST(req: NextRequest) {
  const body = await req.json()
  try {
    const res = await fetch(`${API()}/web-customers/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ message: 'Bağlantı hatası' }, { status: 503 })
  }
}
