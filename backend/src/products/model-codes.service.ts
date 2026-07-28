import { BadRequestException, Injectable } from '@nestjs/common';
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
      let existing = await tx.product.findUnique({ where: { modelCode } });

      while (existing) {
        nextCode += 1;
        modelCode = `${category.codePrefix}-${nextCode}`;
        existing = await tx.product.findUnique({ where: { modelCode } });
      }

      await tx.category.update({
        where: { id: category.id },
        data: { currentCode: nextCode },
      });

      return { modelCode, categoryId: category.id };
    });
  }
}

