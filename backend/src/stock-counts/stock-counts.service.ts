import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma-client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StockCountsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const sessions = await this.prisma.stockCountSession.findMany({
      include: {
        createdBy: { select: { name: true, email: true } },
        approvedBy: { select: { name: true, email: true } },
        items: { select: { id: true, difference: true, countedQuantity: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map((session) => ({
      id: session.id,
      title: session.title,
      note: session.note,
      status: session.status,
      createdAt: session.createdAt,
      approvedAt: session.approvedAt,
      createdBy: session.createdBy,
      approvedBy: session.approvedBy,
      itemCount: session.items.length,
      countedItemCount: session.items.filter((item) => item.countedQuantity !== null).length,
      differenceCount: session.items.filter((item) => Number(item.difference) !== 0).length,
    }));
  }

  async create(payload: unknown, userId: number) {
    const body = (payload ?? {}) as Record<string, unknown>;
    const title = this.text(body.title) ?? `Stok Sayımı - ${new Date().toLocaleDateString('tr-TR')}`;
    const note = this.text(body.note);
    const stockCards = await this.prisma.stockCard.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    if (stockCards.length === 0) {
      throw new BadRequestException('Sayım başlatmak için önce stok kartı oluşturulmalıdır.');
    }

    const session = await this.prisma.stockCountSession.create({
      data: {
        title,
        note,
        createdById: userId,
        items: {
          create: stockCards.map((stockCard) => ({
            stockCardId: stockCard.id,
            snapshotQuantity: stockCard.stockQuantity,
            difference: 0,
          })),
        },
      },
    });

    return this.get(session.id);
  }

  async get(id: number) {
    const session = await this.prisma.stockCountSession.findUnique({
      where: { id },
      include: {
        createdBy: { select: { name: true, email: true } },
        approvedBy: { select: { name: true, email: true } },
        items: {
          include: { stockCard: true },
          orderBy: [{ stockCard: { category: 'asc' } }, { stockCard: { name: 'asc' } }],
        },
      },
    });

    if (!session) throw new NotFoundException('Stok sayımı bulunamadı.');

    return {
      id: session.id,
      title: session.title,
      note: session.note,
      status: session.status,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      approvedAt: session.approvedAt,
      createdBy: session.createdBy,
      approvedBy: session.approvedBy,
      items: session.items.map((item) => ({
        id: item.id,
        stockCardId: item.stockCardId,
        stockName: item.stockCard.name,
        sku: item.stockCard.sku,
        category: item.stockCard.category,
        unit: item.stockCard.unit,
        snapshotQuantity: Number(item.snapshotQuantity),
        countedQuantity: item.countedQuantity === null ? null : Number(item.countedQuantity),
        difference: Number(item.difference),
        note: item.note,
      })),
    };
  }

  async updateItems(id: number, payload: unknown) {
    const session = await this.prisma.stockCountSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Stok sayımı bulunamadı.');
    if (session.status !== 'DRAFT') throw new BadRequestException('Onaylanmış sayım değiştirilemez.');

    const body = (payload ?? {}) as Record<string, unknown>;
    const items = Array.isArray(body.items) ? body.items : [];

    for (const item of items) {
      const row = item as Record<string, unknown>;
      const itemId = this.number(row.id);
      if (!itemId) continue;
      const existing = await this.prisma.stockCountItem.findFirst({ where: { id: itemId, sessionId: id } });
      if (!existing) continue;
      const countedQuantity = this.nullableNumber(row.countedQuantity);
      const difference = countedQuantity === null ? 0 : countedQuantity - Number(existing.snapshotQuantity);
      await this.prisma.stockCountItem.update({
        where: { id: itemId },
        data: {
          countedQuantity,
          difference,
          note: this.text(row.note),
        },
      });
    }

    return this.get(id);
  }

  async approve(id: number, userId: number) {
    const session = await this.prisma.stockCountSession.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!session) throw new NotFoundException('Stok sayımı bulunamadı.');
    if (session.status !== 'DRAFT') throw new BadRequestException('Bu sayım zaten kapatılmış.');

    const countedItems = session.items.filter((item) => item.countedQuantity !== null);
    if (countedItems.length === 0) throw new BadRequestException('Onaylamak için en az bir stok sayımı girilmelidir.');

    await this.prisma.$transaction(async (tx) => {
      for (const item of countedItems) {
        await tx.stockCard.update({
          where: { id: item.stockCardId },
          data: { stockQuantity: item.countedQuantity as Prisma.Decimal },
        });
      }

      await tx.stockCountSession.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedById: userId,
          approvedAt: new Date(),
        },
      });
    });

    return this.get(id);
  }

  async remove(id: number) {
    const session = await this.prisma.stockCountSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Stok sayımı bulunamadı.');
    if (session.status === 'APPROVED') {
      throw new BadRequestException('Onaylanmış sayım silinemez. Stok geçmişini korumak için sadece taslak sayımlar silinir.');
    }

    await this.prisma.stockCountSession.delete({ where: { id } });
    return { ok: true };
  }

  private text(value: unknown) {
    if (value === undefined || value === null) return undefined;
    const text = String(value).trim();
    return text || undefined;
  }

  private number(value: unknown) {
    if (value === undefined || value === null || value === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private nullableNumber(value: unknown) {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
