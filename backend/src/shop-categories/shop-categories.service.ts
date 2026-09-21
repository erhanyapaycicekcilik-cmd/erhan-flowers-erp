import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class ShopCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const rows = await this.prisma.shopCategory.findMany({
      orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        category: { select: { id: true, name: true, codePrefix: true, startCode: true } },
        children: {
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: { category: { select: { id: true, name: true, codePrefix: true, startCode: true } } },
        },
      },
    })
    // Sadece ana kategorileri döndür, alt kategoriler children içinde
    return rows.filter((r) => r.parentId === null)
  }

  async create(body: any) {
    const slug = this.toSlug(body.name)
    return this.prisma.shopCategory.create({
      data: {
        name: String(body.name),
        slug,
        parentId: body.parentId ? Number(body.parentId) : null,
        coverImageUrl: body.coverImageUrl ?? null,
        sortOrder: Number(body.sortOrder ?? 0),
        categoryId: body.categoryId ? Number(body.categoryId) : null,
      },
    })
  }

  async update(id: number, body: any) {
    const data: any = {}
    if (body.name !== undefined) { data.name = String(body.name); data.slug = this.toSlug(body.name) }
    if (body.parentId !== undefined) data.parentId = body.parentId ? Number(body.parentId) : null
    if (body.coverImageUrl !== undefined) data.coverImageUrl = body.coverImageUrl
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder)
    if (body.status !== undefined) data.status = body.status
    if (body.categoryId !== undefined) data.categoryId = body.categoryId ? Number(body.categoryId) : null
    return this.prisma.shopCategory.update({ where: { id }, data })
  }

  async remove(id: number) {
    // Alt kategorileri ve ürün bağlantılarını kaldır
    await this.prisma.shopCategory.updateMany({ where: { parentId: id }, data: { parentId: null } })
    await this.prisma.trendyolProductVariant.updateMany({ where: { shopCategoryId: id }, data: { shopCategoryId: null } })
    return this.prisma.shopCategory.delete({ where: { id } })
  }

  private toSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
      .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }
}
