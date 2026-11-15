import { BadRequestException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { createHmac, timingSafeEqual } from 'crypto'
import { PrismaService } from '../prisma/prisma.service'
import { MailService } from '../mail/mail.service'
import { CreateWebOrderDto } from './dto/create-web-order.dto'
import { PublicCatalogService } from '../public-catalog/public-catalog.service'
import { ProductGroupsService } from '../public-catalog/product-groups.service'

const MAX_LINES = 50
const MAX_QTY = 999
const EFT_FACTOR = 0.97
const round2 = (n: number) => Math.round(n * 100) / 100

/** Site sunucusu ↔ ERP ortak anahtarı. Ayrı anahtar yoksa TAMI_SECRET_KEY kullanılır (ikisinde de tanımlı). */
export function siteInternalKey(): string {
  return (process.env.SITE_INTERNAL_KEY || process.env.TAMI_SECRET_KEY || '').trim()
}

export function isValidSiteKey(given: string | undefined): boolean {
  const key = siteInternalKey()
  if (!key || !given) return false
  const a = Buffer.from(String(given))
  const b = Buffer.from(key)
  return a.length === b.length && timingSafeEqual(a, b)
}

@Injectable()
export class WebOrdersService {
  private readonly logger = new Logger(WebOrdersService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly catalog: PublicCatalogService,
    private readonly groups: ProductGroupsService,
  ) {}

  /** Ürün grubu sayfasından eklenen kalem: grubun o varyant için gösterdiği fiyat (priceOverride dahil) */
  private async groupPrice(slug: unknown, id: number): Promise<number | null> {
    if (typeof slug !== 'string' || !slug.trim()) return null
    const g = await this.groups.getGroupBySlug(slug.trim()).catch(() => null)
    const v = g?.variants.find((x) => (id > 0 && x.productId === id) || (id < 0 && x.trendyolVariantId === -id))
    return v && Number(v.price) > 0 ? Number(v.price) : null
  }

  /**
   * Sepet kalemlerini sunucuda yeniden fiyatlar. Tarayıcıdan gelen fiyat/isim KULLANILMAZ:
   * fiyat sitede gösterilen kuralla (Trendyol −%25 vb.) katalogdan okunur.
   */
  private async priceItems(items: CreateWebOrderDto['items']) {
    if (!Array.isArray(items) || items.length === 0 || items.length > MAX_LINES) {
      throw new BadRequestException('Sepet geçersiz.')
    }
    const lines = []
    for (const i of items) {
      const quantity = Number(i?.quantity)
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY) {
        throw new BadRequestException('Geçersiz ürün adedi.')
      }
      // Ürün kimliği: Product için pozitif sayı, Trendyol ürünü için negatif sayı veya grup sayfasından "v123"
      const rawId = String(i?.productId ?? '').trim()
      const id = /^v\d+$/i.test(rawId) ? -Number(rawId.slice(1)) : Number(rawId)
      if (!Number.isInteger(id) || id === 0) throw new BadRequestException('Geçersiz ürün.')
      if (id < 0) {
        // Trendyol ürünü: sadece Trendyol'da satışta olan sipariş edilebilir
        const v = await this.prisma.trendyolProductVariant.findUnique({ where: { id: -id }, select: { status: true } })
        if (!v || v.status !== 'ACTIVE') throw new BadRequestException(`"${String(i?.productName ?? 'Ürün').slice(0, 80)}" şu an satışta değil.`)
      }
      const p = await this.catalog.getProductById(id)
      const fromGroup = await this.groupPrice(i?.productSlug, id)
      const catalogPrice = p && !('priceOnRequest' in p && p.priceOnRequest) ? Number(p.sitePrice) : 0
      const price = fromGroup ?? catalogPrice
      if (p && 'inStock' in p && p.inStock === false) {
        throw new BadRequestException(`"${String(i?.productName ?? p.name).slice(0, 80)}" şu an satışta değil.`)
      }
      if (!p || !(price > 0)) {
        // Fiyatı olmayan ("fiyat için iletişime geçin") veya satıştan kalkmış ürün siteden sipariş edilemez
        throw new BadRequestException(`"${String(i?.productName ?? 'Ürün').slice(0, 80)}" için fiyat bilgisi yok veya ürün satışta değil. Lütfen bizimle iletişime geçin.`)
      }
      const unitPrice = round2(price)
      lines.push({
        productId: rawId,
        // Grup kaleminde boy/renk bilgisi isimde kalsın (fiyat yine sunucudan)
        productName: fromGroup ? String(i?.productName ?? p.name).slice(0, 200) : p.name,
        productSlug: fromGroup ? String(i.productSlug).slice(0, 200) : p.slug,
        productImage: p.mainImage ?? (typeof i.productImage === 'string' ? i.productImage.slice(0, 500) : undefined),
        unitPrice,
        quantity,
        lineTotal: round2(unitPrice * quantity),
      })
    }
    return lines
  }

  /** Promosyon sadece site sunucusu doğruladıysa (x-site-key) uygulanır; doğrudan API çağrısında yok sayılır. */
  private trustedPromo(dto: CreateWebOrderDto, siteKey?: string) {
    const promo = dto.promo
    if (!promo) return null
    if (!isValidSiteKey(siteKey)) {
      this.logger.warn('Web sipariş: imzasız promosyon yok sayıldı')
      return null
    }
    const value = Number(promo.value)
    if (promo.type === 'percent' && value > 0 && value <= 100) return { code: String(promo.code).slice(0, 40), type: 'percent' as const, value }
    if (promo.type === 'fixed' && value > 0) return { code: String(promo.code).slice(0, 40), type: 'fixed' as const, value }
    return null
  }

  async create(dto: CreateWebOrderDto, siteKey?: string) {
    if (!['WHATSAPP', 'EFT', 'ONLINE'].includes(dto?.paymentMethod)) throw new BadRequestException('Geçersiz ödeme yöntemi.')
    if (!dto.customerName?.trim() || !dto.customerPhone?.trim() || !dto.address?.trim() || !dto.city?.trim()) {
      throw new BadRequestException('Ad, telefon, şehir ve adres zorunludur.')
    }
    const lines = await this.priceItems(dto.items)
    const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0))
    const afterEft = dto.paymentMethod === 'EFT' ? subtotal * EFT_FACTOR : subtotal
    const promo = this.trustedPromo(dto, siteKey)
    const promoDiscount = promo
      ? Math.min(afterEft, promo.type === 'percent' ? Math.round(subtotal * promo.value / 100) : promo.value)
      : 0
    const grandTotal = round2(Math.max(0, afterEft - promoDiscount))
    const orderNumber = 'WEB-' + Date.now().toString(36).toUpperCase()
    const note = [dto.note?.slice(0, 2000), promo ? `Promosyon: ${promo.code} (−${round2(promoDiscount)} TL)` : null]
      .filter(Boolean).join('\n') || undefined

    const order = await this.prisma.webOrder.create({
      data: {
        orderNumber,
        paymentMethod: dto.paymentMethod,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerEmail: dto.customerEmail,
        city: dto.city,
        district: dto.district,
        address: dto.address,
        postalCode: dto.postalCode,
        note,
        tcKimlik: dto.tcKimlik?.trim() || null,
        invoiceCorporate: !!dto.faturaKurumsal,
        companyTitle: dto.faturaKurumsal ? dto.firmaUnvan?.trim() || null : null,
        taxNumber: dto.faturaKurumsal ? dto.vergiNo?.trim() || null : null,
        taxOffice: dto.faturaKurumsal ? dto.vergiDairesi?.trim() || null : null,
        subtotal,
        grandTotal,
        ...(dto.customerId ? { customerId: dto.customerId } : {}),
        items: { create: lines },
      },
      include: { items: true },
    })

    this.mail.sendOwnerOrderNotification({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      grandTotal: Number(order.grandTotal),
      paymentMethod: order.paymentMethod,
      items: order.items.map((i) => ({
        productName: i.productName,
        quantity: i.quantity,
        lineTotal: Number(i.lineTotal),
      })),
      address: order.address,
      district: order.district,
      city: order.city,
      note: order.note,
    }).catch(() => null)


    if (dto.customerEmail && order.customerEmail) {
      this.mail.sendWebOrderConfirmation({
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        grandTotal: Number(order.grandTotal),
        paymentMethod: order.paymentMethod,
        items: order.items.map((i) => ({
          productName: i.productName,
          quantity: i.quantity,
          lineTotal: Number(i.lineTotal),
        })),
        address: order.address,
        city: order.city,
        note: order.note,
      }).catch(() => null)
    }

    return {
      success: true,
      orderNumber: order.orderNumber,
      id: order.id,
      subtotal: Number(order.subtotal),
      grandTotal: Number(order.grandTotal),
      items: order.items.map((i) => ({ productId: i.productId, productName: i.productName, unitPrice: Number(i.unitPrice), quantity: i.quantity })),
    }
  }

  /** Kartla ödeme başlatılırken site sunucusu tahsil edilecek tutarı buradan alır (tarayıcıdan değil). */
  async payable(orderNumber: string, siteKey?: string) {
    if (!isValidSiteKey(siteKey)) throw new UnauthorizedException('Yetkisiz')
    const order = await this.prisma.webOrder.findUnique({
      where: { orderNumber },
      select: { orderNumber: true, grandTotal: true, paidAt: true, paymentMethod: true, status: true },
    })
    if (!order) throw new NotFoundException('Sipariş bulunamadı')
    return {
      orderNumber: order.orderNumber,
      grandTotal: Number(order.grandTotal),
      paid: !!order.paidAt,
      paymentMethod: order.paymentMethod,
      cancelled: order.status === 'CANCELLED',
    }
  }

  async findAll(params: { status?: string; page: number; limit: number }) {
    const where = params.status ? { status: params.status as any } : {}
    const skip = (params.page - 1) * params.limit

    const [orders, total] = await Promise.all([
      this.prisma.webOrder.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: params.limit,
      }),
      this.prisma.webOrder.count({ where }),
    ])

    return { orders, total, page: params.page, limit: params.limit }
  }

  async findOne(id: number) {
    return this.prisma.webOrder.findUnique({
      where: { id },
      include: { items: true },
    })
  }

  async updateStatus(id: number, status: string) {
    return this.prisma.webOrder.update({
      where: { id },
      data: { status: status as any },
    })
  }

  async confirmPayment(orderNumber: string, signature: string, body: { bankAuthCode?: string; amount?: number }) {
    const secret = (process.env.TAMI_SECRET_KEY ?? '').trim()
    const expected = createHmac('sha256', secret).update(orderNumber).digest('hex')
    const given = Buffer.from(String(signature ?? ''))
    if (!secret || given.length !== expected.length || !timingSafeEqual(given, Buffer.from(expected))) {
      throw new UnauthorizedException('Geçersiz imza')
    }

    const order = await this.prisma.webOrder.findUnique({ where: { orderNumber } })
    if (!order) throw new NotFoundException('Sipariş bulunamadı')
    if (order.paidAt) return { success: true, alreadyPaid: true }

    const paid = Number(body.amount)
    const total = Number(order.grandTotal)
    const mismatch = Number.isFinite(paid) && paid > 0 && Math.abs(paid - total) > 1
    if (mismatch) this.logger.error(`Web sipariş ${orderNumber}: tutar uyuşmazlığı, beklenen ${total}, tahsil edilen ${paid}`)

    if (mismatch) {
      // Tutar tutmuyorsa sipariş otomatik onaylanmaz; personel kontrol etsin
      await this.prisma.webOrder.update({
        where: { id: order.id },
        data: {
          paymentRef: body.bankAuthCode ? String(body.bankAuthCode).slice(0, 100) : null,
          note: [order.note, `⚠️ TUTAR UYUŞMAZLIĞI: tahsil edilen ${paid} TL, sipariş ${total} TL — onaylamadan önce kontrol edin`].filter(Boolean).join('\n'),
        },
      })
      return { success: false, mismatch: true }
    }
    await this.prisma.webOrder.update({
      where: { id: order.id },
      data: {
        paidAt: new Date(),
        paymentRef: body.bankAuthCode ? String(body.bankAuthCode).slice(0, 100) : null,
        status: order.status === 'PENDING' ? 'CONFIRMED' : order.status,
      },
    })
    this.logger.log(`Web sipariş ${orderNumber} kartla ödendi (onay ${body.bankAuthCode ?? '-'})`)
    return { success: true }
  }
}
