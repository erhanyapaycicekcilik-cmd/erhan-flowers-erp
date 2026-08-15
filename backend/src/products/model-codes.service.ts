import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma-client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ModelCodesService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(categoryId: number) {
    if (!categoryId) {
      throw new BadRequestException('Kategori seçilmelidir.');
    }

    return this.prisma.$transaction(async (tx) => {
      const category = await tx.category.findUnique({ where: { id: categoryId } });
      if (!category || category.status !== 'ACTIVE') {
        throw new BadRequestException('Kategori bulunamadı.');
      }

      let nextCode = Math.max(category.currentCode + 1, category.startCode);
      let modelCode = `${category.codePrefix}-${nextCode}`;

      while (!(await this.isModelCodeUnique(modelCode, tx))) {
        nextCode += 1;
        modelCode = `${category.codePrefix}-${nextCode}`;
      }

      await tx.category.update({
        where: { id: category.id },
        data: { currentCode: nextCode },
      });

      return { modelCode, categoryId: category.id };
    });
  }

  private async isModelCodeUnique(modelCode: string, tx: Prisma.TransactionClient | PrismaService = this.prisma) {
    const code = modelCode.trim().toUpperCase();
    const [product, stockCard, variant] = await Promise.all([
      tx.product.findFirst({ where: { modelCode: code }, select: { id: true } }),
      tx.stockCard.findFirst({
        where: {
          OR: [
            { sku: { equals: code, mode: 'insensitive' } },
            { model: { equals: code, mode: 'insensitive' } },
            { oldModelCode: { equals: code, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      }),
      tx.trendyolProductVariant.findFirst({
        where: {
          OR: [
            { currentModelCode: { equals: code, mode: 'insensitive' } },
            { proposedModelCode: { equals: code, mode: 'insensitive' } },
            { supplierStockCode: { equals: code, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      }),
    ]);

    return !product && !stockCard && !variant;
  }
}
