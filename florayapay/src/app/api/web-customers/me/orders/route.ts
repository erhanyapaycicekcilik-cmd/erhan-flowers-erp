import { NextRequest, NextResponse } from 'next/server'

const API = () => process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || ''

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  try {
    const res = await fetch(`${API()}/web-customers/me/orders`, { headers: { authorization: auth } })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ message: 'Bağlantı hatası' }, { status: 503 })
  }
}
