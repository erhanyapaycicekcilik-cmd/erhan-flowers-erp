import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma-client';
import { PrismaService } from '../prisma/prisma.service';

type ProductPayload = {
  productName?: string;
  modelCode?: string;
  categoryId?: number;
  stockQuantity?: number;
  criticalStockLevel?: number;
  status?: 'ACTIVE' | 'PASSIVE';
  description?: string;
};

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.product.findMany({
      include: { category: true, mediaFiles: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(payload: unknown) {
    const data = this.normalize(payload);
    if (!data.productName || !data.modelCode || !data.categoryId) {
      throw new BadRequestException('Ürün adı, model kodu ve kategori zorunludur.');
    }

    try {
      return await this.prisma.product.create({
        data: {
          productName: data.productName,
          modelCode: data.modelCode,
          categoryId: data.categoryId,
          stockQuantity: data.stockQuantity ?? 0,
          criticalStockLevel: data.criticalStockLevel ?? 0,
          status: data.status ?? 'ACTIVE',
          description: data.description,
        },
        include: { category: true },
      });
    } catch (error) {
      this.handleUniqueError(error);
    }
  }

  async update(id: number, payload: unknown) {
    const data = this.normalize(payload);
    try {
      return await this.prisma.product.update({
        where: { id },
        data: {
          productName: data.productName,
          modelCode: data.modelCode,
          categoryId: data.categoryId,
          stockQuantity: data.stockQuantity,
          criticalStockLevel: data.criticalStockLevel,
          status: data.status,
          description: data.description,
        },
        include: { category: true },
      });
    } catch (error) {
      this.handleUniqueError(error);
    }
  }

  passive(id: number) {
    return this.prisma.product.update({
      where: { id },
      data: { status: 'PASSIVE' },
    });
  }

  private normalize(payload: unknown): ProductPayload {
    const body = (payload ?? {}) as Record<string, unknown>;
    const categoryId = Number(body.categoryId ?? body.category_id);

    return {
      productName: String(body.productName ?? body.product_name ?? '').trim(),
      modelCode: String(body.modelCode ?? body.model_code ?? '').trim().toUpperCase(),
      categoryId: Number.isFinite(categoryId) ? categoryId : undefined,
      stockQuantity: this.toInt(body.stockQuantity ?? body.stock_quantity, 0),
      criticalStockLevel: this.toInt(body.criticalStockLevel ?? body.critical_stock_level, 0),
      status: body.status === 'PASSIVE' ? 'PASSIVE' : 'ACTIVE',
      description: body.description ? String(body.description) : undefined,
    };
  }

  private toInt(value: unknown, fallback: number) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private handleUniqueError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new BadRequestException('Model kodu veya barkod zaten kullanılıyor.');
    }
    throw error;
  }
}
