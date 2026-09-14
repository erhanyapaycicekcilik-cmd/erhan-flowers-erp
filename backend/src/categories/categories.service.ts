import { Injectable } from '@nestjs/common';
import { cleanMojibakeDeep } from '../common/mojibake';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const categories = await this.prisma.category.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ sortOrder: 'asc' }, { startCode: 'asc' }],
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
      orderBy: [{ sortOrder: 'asc' }, { startCode: 'asc' }],
    }));
  }

  async create(data: {
    name: string;
    codePrefix: string;
    startCode: number;
    description?: string;
    platforms?: string[];
    hasBanner?: boolean;
    sortOrder?: number;
  }) {
    return this.prisma.category.create({
      data: {
        name: data.name,
        codePrefix: data.codePrefix.toUpperCase(),
        startCode: data.startCode,
        currentCode: data.startCode - 1,
        description: data.description,
        platforms: data.platforms ?? [],
        hasBanner: data.hasBanner ?? false,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async update(
    id: number,
    data: {
      trendyolCategoryId?: number | null;
      platforms?: string[];
      hasBanner?: boolean;
      sortOrder?: number;
      description?: string;
    },
  ) {
    return this.prisma.category.update({ where: { id }, data });
  }

  async remove(id: number) {
    return this.prisma.category.update({
      where: { id },
      data: { status: 'PASSIVE' },
    });
  }
}
