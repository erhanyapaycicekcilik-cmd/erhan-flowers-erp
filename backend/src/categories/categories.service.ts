import { Injectable } from '@nestjs/common';
import { cleanMojibakeDeep } from '../common/mojibake';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async update(id: number, data: { trendyolCategoryId?: number | null }) {
    return this.prisma.category.update({ where: { id }, data });
  }

  async list() {
    const categories = await this.prisma.category.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { startCode: 'asc' },
    });

    if (categories.length > 0) return cleanMojibakeDeep(categories);

    await this.prisma.category.createMany({
      data: [
        { name: 'Yapay Cicek', codePrefix: 'YC', startCode: 1000, currentCode: 999 },
        { name: 'Yapay Agac', codePrefix: 'YA', startCode: 2000, currentCode: 1999 },
        { name: 'Saksi & Dekorasyon', codePrefix: 'SD', startCode: 3000, currentCode: 2999 },
      ],
      skipDuplicates: true,
    });

    return cleanMojibakeDeep(await this.prisma.category.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { startCode: 'asc' },
    }));
  }
}
