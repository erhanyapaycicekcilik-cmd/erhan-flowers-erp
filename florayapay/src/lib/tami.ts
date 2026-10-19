import { createHash, createHmac, randomUUID } from 'crypto'

const MERCHANT_ID = process.env.TAMI_MERCHANT_ID || ''
const TERMINAL_ID = process.env.TAMI_TERMINAL_ID || ''
const SECRET_KEY = process.env.TAMI_SECRET_KEY || ''
const JWK_KID = process.env.TAMI_JWK_KID || ''
const JWK_K = process.env.TAMI_JWK_K || ''
const API_URL = process.env.TAMI_API_URL || 'https://paymentapi.tami.com.tr'

export function tamiEnabled() {
  return !!(MERCHANT_ID && TERMINAL_ID && SECRET_KEY && JWK_KID && JWK_K)
}

// PG-Auth-Token header: MerchantNumber:TerminalNumber:sha256base64(merchant+terminal+secret)
function generatePGAuthToken(): string {
  const hash = createHash('sha256')
    .update(MERCHANT_ID + TERMINAL_ID + SECRET_KEY)
    .digest('base64')
  return `${MERCHANT_ID}:${TERMINAL_ID}:${hash}`
}

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// securityHash: JWT HS512 — payload is the request body JSON (without securityHash field)
function generateSecurityHash(body: object): string {
  const header = { alg: 'HS512', typ: 'JWT', kid: JWK_KID.trim() }
  const headerEnc = base64url(Buffer.from(JSON.stringify(header)))
  const payloadEnc = base64url(Buffer.from(JSON.stringify(body)))
  const signingInput = `${headerEnc}.${payloadEnc}`
  const key = Buffer.from(JWK_K, 'base64')
  const sig = base64url(createHmac('sha512', key).update(signingInput).digest())
  return `${headerEnc}.${payloadEnc}.${sig}`
}

// Callback hashedData doğrulaması
// cardOrg+cardBrand+cardType+maskedNumber+installmentCount+currency+originalAmount+orderID+systemTime+status
export function verifyCallbackHashedData(params: {
  cardOrganization: string
  cardBrand: string
  cardType: string
  maskedNumber: string
  installmentCount: string
  currency: string
  txnAmount: string
  orderId: string
  systemTime: string
  success: string
  hashedData: string
}): boolean {
  const data =
    params.cardOrganization +
    params.cardBrand +
    params.cardType +
    params.maskedNumber +
    params.installmentCount +
    params.currency +
    params.txnAmount +
    params.orderId +
    params.systemTime +
    params.success
  const computed = createHmac('sha256', SECRET_KEY).update(data).digest('base64')
  return computed === params.hashedData
}

export interface TamiCardInfo {
  holderName: string
  number: string
  expireMonth: number
  expireYear: number
  cvv: string
}

export interface TamiInitRequest {
  orderId: string
  amount: number
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
    ulke?: string
  }
  kart: TamiCardInfo
  urunler: { id: string; ad: string; kategori: string; fiyat: number; adet: number }[]
  callbackUrl: string
}

export interface TamiInitResponse {
  success: boolean
  threeDSHtmlContent?: string
  errorCode?: string
  errorMessage?: string
}

export interface TamiCompleteResponse {
  success: boolean
  orderId?: string
  amount?: number
  bankAuthCode?: string
  errorCode?: string
  errorMessage?: string
}

export async function initiate3DS(req: TamiInitRequest): Promise<TamiInitResponse> {
  const bodyWithoutHash = {
    orderId: req.orderId,
    amount: req.amount,
    currency: 'TRY',
    installmentCount: 1,
    paymentGroup: 'PRODUCT',
    paymentChannel: 'WEB',
    callbackUrl: req.callbackUrl,
    card: {
      holderName: req.kart.holderName,
      number: req.kart.number.replace(/\s/g, ''),
      expireMonth: req.kart.expireMonth,
      expireYear: req.kart.expireYear,
      cvv: req.kart.cvv,
    },
    buyer: {
      buyerId: req.musteri.email,
      name: req.musteri.ad,
      surName: req.musteri.soyad,
      emailAddress: req.musteri.email,
      phoneNumber: req.musteri.telefon.replace(/\s/g, ''),
      ipAddress: req.musteri.ip || '127.0.0.1',
      city: req.adres.sehir,
      country: req.adres.ulke || 'Turkey',
    },
    shippingAddress: {
      contactName: `${req.musteri.ad} ${req.musteri.soyad}`,
      address: req.adres.adres,
      city: req.adres.sehir,
      country: req.adres.ulke || 'Turkey',
    },
    billingAddress: {
      contactName: `${req.musteri.ad} ${req.musteri.soyad}`,
      address: req.adres.adres,
      city: req.adres.sehir,
      country: req.adres.ulke || 'Turkey',
    },
    basket: {
      basketId: req.orderId,
      basketItems: req.urunler.map(u => ({
        itemId: u.id,
        name: u.ad,
        itemType: 'PHYSICAL',
        category: u.kategori,
        unitPrice: u.fiyat,
        totalPrice: u.fiyat * u.adet,
        numberOfProducts: u.adet,
      })),
    },
  }

  const securityHash = generateSecurityHash(bodyWithoutHash)
  const body = { ...bodyWithoutHash, securityHash }

  const correlationId = randomUUID()
  const res = await fetch(`${API_URL}/payment/auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'PG-Auth-Token': generatePGAuthToken(),
      'X-Correlation-ID': correlationId,
    },
    body: JSON.stringify(body),
  })

  const raw = await res.json()
  console.log('[tami] initiate3DS response:', JSON.stringify(raw))
  return raw
}

export async function complete3DS(orderId: string): Promise<TamiCompleteResponse> {
  const bodyWithoutHash = { orderId }
  const securityHash = generateSecurityHash(bodyWithoutHash)

  const res = await fetch(`${API_URL}/payment/complete-3ds`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'PG-Auth-Token': generatePGAuthToken(),
      'X-Correlation-ID': randomUUID(),
    },
    body: JSON.stringify({ ...bodyWithoutHash, securityHash }),
  })

  return res.json()
}
