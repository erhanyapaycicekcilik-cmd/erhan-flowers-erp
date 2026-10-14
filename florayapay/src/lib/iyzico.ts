import { createHmac, randomBytes } from 'crypto'

const IYZICO_API_KEY = process.env.IYZICO_API_KEY || ''
const IYZICO_SECRET_KEY = process.env.IYZICO_SECRET_KEY || ''
const IYZICO_BASE_URL = process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com'

export function iyzicoEnabled() {
  return !!(IYZICO_API_KEY && IYZICO_SECRET_KEY)
}

function generateAuthString(body: string): string {
  const randomKey = randomBytes(12).toString('base64')
  const hmac = createHmac('sha256', IYZICO_SECRET_KEY)
    .update(IYZICO_API_KEY + randomKey + body)
    .digest('hex')
  const authorizationString = Buffer.from(`${IYZICO_API_KEY}:${randomKey}:${hmac}`).toString('base64')
  return `IYZWSv2 ${authorizationString}`
}

async function iyzicoPost<T>(path: string, body: object): Promise<T> {
  const bodyStr = JSON.stringify(body)
  const res = await fetch(`${IYZICO_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: generateAuthString(bodyStr),
    },
    body: bodyStr,
  })
  return res.json()
}

export interface IyzicoInitRequest {
  orderNumber: string
  tutar: number // TL (tam sayı veya ondalık)
  musteri: {
    ad: string
    soyad: string
    email: string
    telefon: string
    ip?: string
  }
  adres: {
    adres: string
    sehir: string
    ilce: string
    postaKodu: string
    ulke?: string
  }
  urunler: {
    id: string
    ad: string
    kategori: string
    fiyat: number
    adet: number
  }[]
  callbackUrl?: string
}

export interface IyzicoInitResponse {
  status: string
  errorCode?: string
  errorMessage?: string
  token?: string
  checkoutFormContent?: string
  htmlContent?: string
}

export async function initialize3DS(req: IyzicoInitRequest, callbackUrl: string): Promise<IyzicoInitResponse> {
  const price = req.tutar.toFixed(2)

  const body = {
    locale: 'tr',
    conversationId: req.orderNumber,
    price,
    paidPrice: price,
    currency: 'TRY',
    installment: '1',
    basketId: req.orderNumber,
    paymentGroup: 'PRODUCT',
    callbackUrl,
    buyer: {
      id: req.musteri.email,
      name: req.musteri.ad,
      surname: req.musteri.soyad,
      gsmNumber: req.musteri.telefon.replace(/\s/g, ''),
      email: req.musteri.email,
      identityNumber: '00000000000',
      registrationAddress: req.adres.adres,
      ip: req.musteri.ip || '127.0.0.1',
      city: req.adres.sehir,
      country: req.adres.ulke || 'Turkey',
      zipCode: req.adres.postaKodu,
    },
    shippingAddress: {
      contactName: `${req.musteri.ad} ${req.musteri.soyad}`,
      city: req.adres.sehir,
      country: req.adres.ulke || 'Turkey',
      address: req.adres.adres,
      zipCode: req.adres.postaKodu,
    },
    billingAddress: {
      contactName: `${req.musteri.ad} ${req.musteri.soyad}`,
      city: req.adres.sehir,
      country: req.adres.ulke || 'Turkey',
      address: req.adres.adres,
      zipCode: req.adres.postaKodu,
    },
    basketItems: req.urunler.flatMap(u =>
      Array.from({ length: u.adet }, (_, i) => ({
        id: `${u.id}-${i}`,
        name: u.ad,
        category1: u.kategori,
        itemType: 'PHYSICAL',
        price: u.fiyat.toFixed(2),
      }))
    ),
  }

  return iyzicoPost<IyzicoInitResponse>('/payment/3dsecure/initialize', body)
}

export interface IyzicoCallbackPayload {
  mdStatus: string
  paymentId?: string
  conversationId?: string
  token?: string
}

export async function auth3DS(token: string): Promise<{ status: string; conversationId?: string; paymentId?: string; errorMessage?: string }> {
  return iyzicoPost('/payment/3dsecure/auth', { locale: 'tr', token })
}
