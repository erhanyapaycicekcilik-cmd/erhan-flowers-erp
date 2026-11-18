import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { IntegrationsService } from '../integrations/integrations.service'
import * as fs from 'fs'
import { basename, extname, join } from 'path'

/** Platformların iade/teslim edilemedi durum adları (büyük-küçük harf farklı gelebiliyor) */
const RETURN_STATUSES = ['RETURNED', 'Returned', 'returned', 'RETURNING', 'Returning', 'UnDelivered', 'UNDELIVERED', 'Undelivered', 'ReturnRequested', 'RETURN_REQUESTED', 'Claimed', 'CLAIMED']
const RETURN_PROCESS = ['WAITING', 'REJECT_REQUESTED', 'REJECTED', 'ACCEPTED', 'CLOSED']

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
          OR: [
            { status: { in: RETURN_STATUSES } },
            { returnStatus: { not: null } },
            { claimId: { not: null } },
            { returnVideos: { some: {} } },
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
    return { items, total, page, limit }
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
