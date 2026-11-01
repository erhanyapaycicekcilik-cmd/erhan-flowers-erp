import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import * as fs from 'fs'
import { join } from 'path'

@Injectable()
export class ReturnsService {
  constructor(private readonly prisma: PrismaService) {}

  async listReturns(page = 1, limit = 50) {
    const skip = (page - 1) * limit
    const [items, total] = await Promise.all([
      this.prisma.marketplaceOrder.findMany({
        where: { status: 'RETURNED' },
        include: {
          items: true,
          returnVideos: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.marketplaceOrder.count({ where: { status: 'RETURNED' } }),
    ])
    return { items, total, page, limit }
  }

  async getReturn(id: number) {
    return this.prisma.marketplaceOrder.findUniqueOrThrow({
      where: { id },
      include: {
        items: true,
        returnVideos: { orderBy: { createdAt: 'desc' } },
      },
    })
  }

  async updateReturnNote(id: number, note: string) {
    return this.prisma.marketplaceOrder.update({
      where: { id },
      data: { returnNote: note },
    })
  }

  async addVideo(orderId: number, file: Express.Multer.File, note?: string) {
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
    return join(process.cwd(), 'uploads', 'return-videos', filename)
  }
}
