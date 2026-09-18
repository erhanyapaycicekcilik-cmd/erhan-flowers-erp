import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateWebOrderDto } from './dto/create-web-order.dto'

@Injectable()
export class WebOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateWebOrderDto) {
    const subtotal = dto.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
    const grandTotal = dto.paymentMethod === 'EFT' ? subtotal * 0.97 : subtotal
    const orderNumber = 'WEB-' + Date.now().toString(36).toUpperCase()

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
        note: dto.note,
        subtotal,
        grandTotal,
        items: {
          create: dto.items.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            productSlug: i.productSlug,
            productImage: i.productImage,
            unitPrice: i.unitPrice,
            quantity: i.quantity,
            lineTotal: i.unitPrice * i.quantity,
          })),
        },
      },
      include: { items: true },
    })

    return { success: true, orderNumber: order.orderNumber, id: order.id }
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
}
