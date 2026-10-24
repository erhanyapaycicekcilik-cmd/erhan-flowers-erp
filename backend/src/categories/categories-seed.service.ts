import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_CATEGORIES = [
  { name: 'Yapay Ağaç',         codePrefix: 'YA', startCode: 1, currentCode: 1 },
  { name: 'Demet Çiçek',        codePrefix: 'DC', startCode: 1, currentCode: 1 },
  { name: 'Bambu',               codePrefix: 'BM', startCode: 1, currentCode: 1 },
  { name: 'Yapay Bitki',         codePrefix: 'YB', startCode: 1, currentCode: 1 },
  { name: 'Yapay Sarmaşık',      codePrefix: 'YS', startCode: 1, currentCode: 1 },
  { name: 'Dikey Bahçe',         codePrefix: 'DB', startCode: 1, currentCode: 1 },
  { name: 'Saksı & Vazo',        codePrefix: 'SV', startCode: 1, currentCode: 1 },
  { name: 'Aranjman',            codePrefix: 'AR', startCode: 1, currentCode: 1 },
  { name: 'Bonsai',              codePrefix: 'BN', startCode: 1, currentCode: 1 },
  { name: 'Zeytin Ağacı',        codePrefix: 'ZA', startCode: 1, currentCode: 1 },
  { name: 'Mini Saksılı Bitki',  codePrefix: 'MS', startCode: 1, currentCode: 1 },
];

@Injectable()
export class CategoriesSeedService implements OnModuleInit {
  private readonly logger = new Logger(CategoriesSeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.prisma.category.createMany({
        data: DEFAULT_CATEGORIES,
        skipDuplicates: true,
      });
    } catch (err) {
      this.logger.warn('Category seed failed (non-fatal): ' + err?.message);
    }
  }
}
