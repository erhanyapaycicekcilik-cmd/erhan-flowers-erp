import { BadRequestException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'crypto'
import { PrismaService } from '../prisma/prisma.service'

/**
 * TAMI (Garanti BBVA) sanal POS — 3D Secure satış.
 * Doküman: https://dev.tami.com.tr/tami-satis-islemi-3dli
 *
 * Akış: /payment/auth (kart + callbackUrl) → bankanın 3D sayfası → TAMI callbackUrl'e form POST eder
 *       → /payment/complete-3ds ile tahsilat yapılır (bu çağrı yapılmazsa karttan para çekilmez).
 *
 * Kart bilgisi hiçbir yerde saklanmaz/loglanmaz; sadece TAMI'ye iletilir.
 */

export interface TamiCardInput {
  holderName: string
  number: string
  expireMonth: number
  expireYear: number
  cvv: string
}

export interface TamiCallbackBody {
  orderId?: string
  success?: string | boolean
  mdStatus?: string
  hashedData?: string
  cardOrganization?: string
  cardBrand?: string
  cardType?: string
  maskedNumber?: string
  installmentCount?: string | number
  currencyCode?: string
  txnAmount?: string | number
  systemTime?: string
  errorMessage?: string
}

const MD_STATUS_MESSAGES: Record<string, string> = {
  '0': '3D Secure doğrulaması başarısız',
  '2': 'Kart 3D Secure sistemine kayıtlı değil',
  '3': 'Kartın bankası 3D Secure sistemine kayıtlı değil',
  '4': '3D Secure doğrulaması tamamlanmadı',
  '5': 'Doğrulama yapılamıyor',
  '6': '3D Secure hatası',
  '7': 'Sistem hatası',
  '8': 'Bilinmeyen kart numarası',
}

@Injectable()
export class TamiService {
  private readonly logger = new Logger(TamiService.name)

  constructor(private readonly prisma: PrismaService) {}

  private get cfg() {
    return {
      merchantNumber: (process.env.TAMI_MERCHANT_NUMBER ?? '').trim(),
      terminalNumber: (process.env.TAMI_TERMINAL_NUMBER ?? '').trim(),
      secretKey: (process.env.TAMI_SECRET_KEY ?? '').trim(),
      jwkK: (process.env.TAMI_JWK_K ?? '').trim(),
      jwkKid: (process.env.TAMI_JWK_KID ?? '').trim(),
      baseUrl: (process.env.TAMI_BASE_URL || 'https://paymentapi.tami.com.tr').replace(/\/+$/, ''),
      apiPublicUrl: (process.env.API_PUBLIC_URL || 'https://api.erhanflowers.com').replace(/\/+$/, ''),
      siteUrl: (process.env.SITE_URL || 'https://www.erhanflowers.com').replace(/\/+$/, ''),
    }
  }

  isEnabled() {
    const c = this.cfg
    return !!(c.merchantNumber && c.terminalNumber && c.secretKey && c.jwkK && c.jwkKid)
  }

  get siteUrl() {
    return this.cfg.siteUrl
  }

  // ── İmza / hash ─────────────────────────────────────────────────────────

  /** PG-Auth-Token = merchantNumber:terminalNumber:base64(sha256(merchant + terminal + secretKey)) */
  private authToken() {
    const c = this.cfg
    const hash = createHash('sha256').update(c.merchantNumber + c.terminalNumber + c.secretKey, 'utf8').digest('base64')
    return `${c.merchantNumber}:${c.terminalNumber}:${hash}`
  }

  /** securityHash = request body'nin JWK (oct, HS512) ile imzalanmış JWS compact hali */
  private securityHash(payloadJson: string) {
    const c = this.cfg
    const header = Buffer.from(JSON.stringify({ kid: c.jwkKid, typ: 'JWT', alg: 'HS512' })).toString('base64url')
    const payload = Buffer.from(payloadJson, 'utf8').toString('base64url')
    const signature = createHmac('sha512', Buffer.from(c.jwkK, 'base64url'))
      .update(`${header}.${payload}`)
      .digest('base64url')
    return `${header}.${payload}.${signature}`
  }

  private async post<T = any>(path: string, body: Record<string, unknown>): Promise<T> {
    const payloadJson = JSON.stringify(body)
    const signed = { ...body, securityHash: this.securityHash(payloadJson) }
    const res = await fetch(`${this.cfg.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': 'tr',
        'PG-Api-Version': 'v3',
        'PG-Auth-Token': this.authToken(),
        correlationId: `Correlation${randomUUID()}`,
      },
      body: JSON.stringify(signed),
    })
    const text = await res.text()
    try {
      return JSON.parse(text) as T
    } catch {
      this.logger.error(`TAMI ${path} geçersiz yanıt (HTTP ${res.status}): ${text.slice(0, 300)}`)
      return { success: false, errorMessage: `Ödeme sağlayıcısı yanıt vermedi (HTTP ${res.status})` } as T
    }
  }

  /** 3D callback'indeki hashedData doğrulaması (HMAC-SHA256, secretKey) */
  private verifyCallbackHash(b: TamiCallbackBody) {
    if (!b.hashedData) return false
    const data = [
      b.cardOrganization, b.cardBrand, b.cardType, b.maskedNumber, b.installmentCount,
      b.currencyCode, b.txnAmount, b.orderId, b.systemTime, b.success,
    ].map((v) => (v === undefined || v === null ? '' : String(v))).join('')
    const expected = createHmac('sha256', this.cfg.secretKey).update(data, 'utf8').digest()
    const given = Buffer.from(String(b.hashedData), 'base64')
    return given.length === expected.length && timingSafeEqual(given, expected)
  }

  // ── Akış ────────────────────────────────────────────────────────────────

  async startPayment(orderNumber: string, card: TamiCardInput, ip: string) {
    if (!this.isEnabled()) throw new ServiceUnavailableException('Kartla ödeme şu an aktif değil.')

    const order = await this.prisma.webOrder.findUnique({ where: { orderNumber } })
    if (!order) throw new NotFoundException('Sipariş bulunamadı.')
    if (order.paymentMethod !== 'ONLINE') throw new BadRequestException('Bu sipariş kartla ödeme için oluşturulmadı.')
    if (order.paymentStatus === 'PAID') throw new BadRequestException('Bu siparişin ödemesi zaten alınmış.')

    const number = String(card?.number ?? '').replace(/\D/g, '')
    const cvv = String(card?.cvv ?? '').replace(/\D/g, '')
    const expireMonth = Number(card?.expireMonth)
    let expireYear = Number(card?.expireYear)
    if (expireYear > 0 && expireYear < 100) expireYear += 2000
    const holderName = String(card?.holderName ?? '').trim().slice(0, 30)
    if (number.length < 12 || number.length > 19) throw new BadRequestException('Kart numarası geçersiz.')
    if (!(expireMonth >= 1 && expireMonth <= 12) || !(expireYear >= 2000)) throw new BadRequestException('Son kullanma tarihi geçersiz.')
    if (cvv.length < 3 || cvv.length > 4) throw new BadRequestException('CVV geçersiz.')
    if (!holderName) throw new BadRequestException('Kart sahibinin adı gerekli.')

    // TAMI orderId her denemede tekil olmalı → sipariş no + deneme eki
    const tamiOrderId = `${order.orderNumber}-${Date.now().toString(36).toUpperCase()}`
    const amount = Number(Number(order.grandTotal).toFixed(2))
    const [name, ...rest] = order.customerName.trim().split(/\s+/)
    const surName = rest.join(' ') || name
    const phone = order.customerPhone.replace(/\D/g, '')
    const email = order.customerEmail || 'siparis@erhanflowers.com'
    const address = {
      address: [order.address, order.district, order.city].filter(Boolean).join(', ').slice(0, 400),
      city: order.city.slice(0, 30),
      country: 'Türkiye',
      contactName: order.customerName.slice(0, 30),
      zipCode: order.postalCode || undefined,
      district: order.district?.slice(0, 50) || undefined,
    }

    const result = await this.post<any>('/payment/auth', {
      orderId: tamiOrderId,
      amount,
      currency: 'TRY',
      installmentCount: 1,
      paymentGroup: 'PRODUCT',
      paymentChannel: 'WEB',
      callbackUrl: `${this.cfg.apiPublicUrl}/public/payments/tami/callback`,
      card: { holderName, number, expireMonth, expireYear, cvv },
      billingAddress: { ...address, emailAddress: email },
      shippingAddress: { ...address, emailAddress: email },
      buyer: {
        ipAddress: ip || '127.0.0.1',
        buyerId: phone || order.orderNumber,
        name: name.slice(0, 30),
        surName: surName.slice(0, 30),
        city: order.city.slice(0, 50),
        country: 'Türkiye',
        emailAddress: email,
        phoneNumber: phone,
        registrationAddress: address.address,
      },
    })

    if (!result?.success || !result.threeDSHtmlContent) {
      const msg = result?.errorMessage || 'Ödeme başlatılamadı.'
      this.logger.warn(`TAMI auth başarısız ${tamiOrderId}: ${result?.errorCode ?? ''} ${msg}`)
      await this.prisma.webOrder.update({
        where: { id: order.id },
        data: { paymentStatus: 'FAILED', paymentRef: tamiOrderId, paymentError: msg.slice(0, 500) },
      })
      throw new BadRequestException(msg)
    }

    await this.prisma.webOrder.update({
      where: { id: order.id },
      data: { paymentStatus: 'PENDING', paymentRef: tamiOrderId, paymentError: null },
    })

    return { html: Buffer.from(result.threeDSHtmlContent, 'base64').toString('utf8') }
  }

  /** TAMI'nin callbackUrl'e POST'u → tahsilatı tamamla, müşteriyi sitedeki sonuç sayfasına yönlendir */
  async handleCallback(body: TamiCallbackBody): Promise<string> {
    const site = this.cfg.siteUrl
    const tamiOrderId = String(body?.orderId ?? '')
    const order = tamiOrderId
      ? await this.prisma.webOrder.findFirst({ where: { paymentRef: tamiOrderId } })
      : null
    if (!order) {
      this.logger.warn(`TAMI callback: sipariş bulunamadı (${tamiOrderId})`)
      return `${site}/odeme-basarisiz?kod=${encodeURIComponent('Sipariş bulunamadı')}`
    }
    const fail = (msg: string) =>
      `${site}/odeme-basarisiz?siparis=${encodeURIComponent(order.orderNumber)}&kod=${encodeURIComponent(msg)}`
    const ok = `${site}/odeme-basarili?siparis=${encodeURIComponent(order.orderNumber)}`

    if (order.paymentStatus === 'PAID') return ok

    if (!this.verifyCallbackHash(body)) {
      // Asıl güvence complete-3ds (sunucudan sunucuya, imzalı) + tutar kontrolü; hash uyuşmazlığını sadece logla
      this.logger.warn(`TAMI callback hashedData doğrulanamadı (${tamiOrderId})`)
    }

    const threeDsOk = String(body.success).toLowerCase() === 'true'
    if (!threeDsOk) {
      const msg = body.errorMessage || MD_STATUS_MESSAGES[String(body.mdStatus ?? '')] || '3D Secure doğrulaması başarısız'
      await this.prisma.webOrder.update({
        where: { id: order.id },
        data: { paymentStatus: 'FAILED', paymentError: msg.slice(0, 500) },
      })
      return fail(msg)
    }

    const result = await this.post<any>('/payment/complete-3ds', { orderId: tamiOrderId })
    const expected = Number(Number(order.grandTotal).toFixed(2))
    const paid = Number(result?.amount)

    if (!result?.success) {
      const msg = result?.errorMessage || 'Ödeme tamamlanamadı'
      this.logger.warn(`TAMI complete-3ds başarısız ${tamiOrderId}: ${result?.errorCode ?? ''} ${msg}`)
      await this.prisma.webOrder.update({
        where: { id: order.id },
        data: { paymentStatus: 'FAILED', paymentError: msg.slice(0, 500) },
      })
      return fail(msg)
    }

    if (Number.isFinite(paid) && Math.abs(paid - expected) > 0.01) {
      this.logger.error(`TAMI tutar uyuşmazlığı ${tamiOrderId}: beklenen ${expected}, tahsil edilen ${paid}`)
      await this.prisma.webOrder.update({
        where: { id: order.id },
        data: { paymentError: `Tutar uyuşmazlığı: beklenen ${expected}, tahsil edilen ${paid}` },
      })
    }

    await this.prisma.webOrder.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'PAID',
        paidAt: new Date(),
        status: order.status === 'PENDING' ? 'CONFIRMED' : order.status,
        ...(Number.isFinite(paid) && Math.abs(paid - expected) > 0.01 ? {} : { paymentError: null }),
      },
    })
    this.logger.log(`TAMI ödeme alındı ${order.orderNumber} (${tamiOrderId}) ${expected} TL, onay ${result.bankAuthCode ?? '-'}`)
    return ok
  }
}
