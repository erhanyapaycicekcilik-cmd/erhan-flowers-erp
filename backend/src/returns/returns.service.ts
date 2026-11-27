import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { IntegrationsService } from '../integrations/integrations.service'
import * as fs from 'fs'
import { basename, extname, join } from 'path'

const RETURN_PROCESS = ['WAITING', 'REJECT_REQUESTED', 'REJECTED', 'ACCEPTED', 'CANCELLED', 'CLOSED']

@Injectable()
export class ReturnsService {
  constructor(private readonly prisma: PrismaService, private readonly integrations: IntegrationsService) {}

  /** Platformlardan (şimdilik Trendyol Erhan + Flora) iade taleplerini hemen çek */
  syncFromPlatforms(days = 30) {
    return this.integrations.syncReturnClaims(days)
  }

  private readonly include = {
    items: { include: { stockCard: { select: { imagePath: true } } } },
    returnVideos: { orderBy: { createdAt: 'desc' as const } },
  }

  /**
   * q yoksa: iade durumundaki siparişler + ERP'de iade süreci başlatılmış / videosu olanlar.
   * q varsa: tüm pazaryeri siparişlerinde arama (sipariş no, paket no, müşteri, kargo kodu, barkod, stok kodu, ürün adı).
   */
  async listReturns(page = 1, limit = 50, q = '') {
    const skip = (page - 1) * limit
    const term = q.trim()
    const where = term
      ? {
          OR: [
            { orderNumber: { contains: term, mode: 'insensitive' as const } },
            { externalOrderId: { contains: term, mode: 'insensitive' as const } },
            { customerName: { contains: term, mode: 'insensitive' as const } },
            { cargoTrackingNumber: { contains: term, mode: 'insensitive' as const } },
            { items: { some: { OR: [
              { barcode: { contains: term, mode: 'insensitive' as const } },
              { sku: { contains: term, mode: 'insensitive' as const } },
              { productName: { contains: term, mode: 'insensitive' as const } },
            ] } } },
          ],
        }
      : {
          // Sadece açık iadeler: platformda "talep oluşturuldu" / "bize ulaştı" olanlar
          // + platform talebi olmayan, elle iade sürecine alınmış (ör. n11, videosu çekilen) bekleyenler
          OR: [
            { claimStatus: { in: ['Talep oluşturuldu', 'Bize ulaştı'] } },
            { claimId: null, returnStatus: 'WAITING' },
          ],
        }
    const [items, total] = await Promise.all([
      this.prisma.marketplaceOrder.findMany({
        where,
        include: this.include,
        orderBy: term ? { orderDate: 'desc' } : [{ claimDate: { sort: 'desc', nulls: 'last' } }, { updatedAt: 'desc' }],
        skip,
        take: term ? Math.min(limit, 50) : limit,
      }),
      this.prisma.marketplaceOrder.count({ where }),
    ])
    await this.fillItemImages(items)
    return { items, total, page, limit }
  }

  /** İade kayıtlarında görsel gelmez: barkod / stok kodundan Trendyol ürün görseli veya ERP ürün görseli */
  private async fillItemImages(orders: Array<{ items: Array<{ barcode: string | null; sku: string | null; productImageUrl: string | null; stockCard?: { imagePath: string | null } | null }> }>) {
    const missing = orders.flatMap((o) => o.items).filter((i) => !i.productImageUrl && !i.stockCard?.imagePath)
    const codes = Array.from(new Set(missing.flatMap((i) => [i.barcode, i.sku]).filter((x): x is string => !!x)))
    if (!codes.length) return
    const rows = await this.prisma.$queryRaw<Array<{ code: string; url: string }>>`
      SELECT DISTINCT ON (code) code, url FROM (
        SELECT v.barcode AS code, img->>'url' AS url FROM trendyol_product_variants v,
          jsonb_array_elements(CASE WHEN jsonb_typeof(v.images) = 'array' THEN v.images ELSE '[]'::jsonb END) AS img
        WHERE v.barcode = ANY(${codes}) AND img->>'url' IS NOT NULL AND img->>'url' <> ''
        UNION ALL
        SELECT v.supplier_stock_code AS code, img->>'url' AS url FROM trendyol_product_variants v,
          jsonb_array_elements(CASE WHEN jsonb_typeof(v.images) = 'array' THEN v.images ELSE '[]'::jsonb END) AS img
        WHERE v.supplier_stock_code = ANY(${codes}) AND img->>'url' IS NOT NULL AND img->>'url' <> ''
        UNION ALL
        SELECT p.barcode AS code, u AS url FROM products p,
          jsonb_array_elements_text(CASE WHEN jsonb_typeof(p.image_urls) = 'array' THEN p.image_urls ELSE '[]'::jsonb END) AS u
        WHERE p.barcode = ANY(${codes}) AND u <> ''
        UNION ALL
        SELECT p.model_code AS code, u AS url FROM products p,
          jsonb_array_elements_text(CASE WHEN jsonb_typeof(p.image_urls) = 'array' THEN p.image_urls ELSE '[]'::jsonb END) AS u
        WHERE p.model_code = ANY(${codes}) AND u <> ''
      ) x
    `.catch(() => [] as Array<{ code: string; url: string }>)
    const map = new Map(rows.map((r) => [r.code, r.url]))
    for (const i of missing) {
      const url = (i.barcode && map.get(i.barcode)) || (i.sku && map.get(i.sku)) || null
      if (url) i.productImageUrl = url
    }
  }

  async getReturn(id: number) {
    return this.prisma.marketplaceOrder.findUniqueOrThrow({ where: { id }, include: this.include })
  }

  /** İade süreci durumu (null = süreçten çıkar) */
  async setReturnStatus(id: number, status: string | null) {
    if (status !== null && !RETURN_PROCESS.includes(status)) throw new BadRequestException('Geçersiz iade durumu.')
    await this.prisma.marketplaceOrder.update({
      where: { id },
      data: { returnStatus: status, returnUpdatedAt: new Date() },
    })
    return this.getReturn(id)
  }

  async updateReturnNote(id: number, note: string) {
    return this.prisma.marketplaceOrder.update({
      where: { id },
      data: { returnNote: note },
    })
  }

  async addVideo(orderId: number, file: Express.Multer.File, note?: string) {
    if (!file) throw new BadRequestException('Dosya seçilmedi.')
    // Video eklenen sipariş iade sürecine alınır (listeden kaybolmasın)
    await this.prisma.marketplaceOrder.updateMany({
      where: { id: orderId, returnStatus: null },
      data: { returnStatus: 'WAITING', returnUpdatedAt: new Date() },
    })
    return this.prisma.returnVideo.create({
      data: {
        orderId,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeByte: file.size,
        note: note ?? null,
      },
    })
  }

  async deleteVideo(videoId: number) {
    const video = await this.prisma.returnVideo.findUniqueOrThrow({ where: { id: videoId } })
    const filePath = join(process.cwd(), 'uploads', 'return-videos', video.filename)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    await this.prisma.returnVideo.delete({ where: { id: videoId } })
    return { deleted: true }
  }

  getVideoPath(filename: string) {
    // Yol geçişini engelle (../)
    return join(process.cwd(), 'uploads', 'return-videos', basename(filename))
  }

  async videoOriginalName(filename: string) {
    const v = await this.prisma.returnVideo.findFirst({ where: { filename: basename(filename) }, include: { order: { select: { platform: true, orderNumber: true } } } })
    if (!v) return basename(filename)
    const ext = extname(v.filename)
    return `iade-${v.order.platform}-${v.order.orderNumber}-${v.id}${ext}`
  }
}
