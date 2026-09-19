import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class ProjectReferencesService {
  constructor(private readonly prisma: PrismaService) {}

  listPublic() {
    return this.prisma.projectReference.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      select: { id: true, title: true, description: true, location: true, imageUrls: true },
    })
  }

  listAdmin() {
    return this.prisma.projectReference.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })
  }

  create(body: any) {
    return this.prisma.projectReference.create({
      data: {
        title: String(body.title ?? '').trim(),
        description: body.description ? String(body.description).trim() : null,
        location: body.location ? String(body.location).trim() : null,
        imageUrls: Array.isArray(body.imageUrls) ? body.imageUrls.map(String).filter(Boolean) : [],
        sortOrder: Number(body.sortOrder ?? 0),
      },
    })
  }

  update(id: number, body: any) {
    const data: any = {}
    if (body.title !== undefined) data.title = String(body.title).trim()
    if (body.description !== undefined) data.description = body.description ? String(body.description).trim() : null
    if (body.location !== undefined) data.location = body.location ? String(body.location).trim() : null
    if (body.imageUrls !== undefined) data.imageUrls = Array.isArray(body.imageUrls) ? body.imageUrls.map(String).filter(Boolean) : []
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder)
    if (body.status !== undefined) data.status = body.status
    return this.prisma.projectReference.update({ where: { id }, data })
  }

  remove(id: number) {
    return this.prisma.projectReference.delete({ where: { id } })
  }
}
