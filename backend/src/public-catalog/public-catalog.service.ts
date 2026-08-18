import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Yalnızca müşteriye gösterilebilecek alanlar seçilir; maliyet alanları
// (purchasePrice, manualUnitCost, automaticUnitCost, supplierName vb.) burada
// kesinlikle YER ALMAZ çünkü bu servis auth'suz (public) bir controller'dan çağrılır.
const SAFE_SELECT = {
  id: true,
  name: true,
  sku: true,
  category: true,
  shortDescription: true,
  description: true,
  technicalSpecs: true,
  salePrice: true,
  stockQuantity: true,
  images: {
    select: { filePath: true, isMain: true },
    orderBy: { isMain: 'desc' as const },
  },
};

function slugify(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class PublicCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  private async trendyolListedBarcodes(): Promise<string[]> {
    const rows = await this.prisma.trendyolProductVariant.findMany({
      where: { barcode: { not: '' } },
      select: { barcode: true },
    });
    return rows.map((row) => row.barcode);
  }

  async listCategories() {
    const barcodes = await this.trendyolListedBarcodes();
    const cards = await this.prisma.stockCard.findMany({
      where: { status: 'ACTIVE', stockQuantity: { gt: 0 }, barcode: { in: barcodes } },
      select: { category: true },
    });
    const counts = new Map<string, number>();
    for (const card of cards) {
      const name = card.category?.trim();
      if (!name) continue;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([name, count]) => ({ name, slug: slugify(name), count }));
  }

  async listProducts(categorySlug?: string) {
    const barcodes = await this.trendyolListedBarcodes();
    const cards = await this.prisma.stockCard.findMany({
      where: { status: 'ACTIVE', stockQuantity: { gt: 0 }, barcode: { in: barcodes } },
      select: SAFE_SELECT,
      orderBy: { updatedAt: 'desc' },
    });
    const filtered = categorySlug
      ? cards.filter((card) => card.category && slugify(card.category) === categorySlug)
      : cards;
    return filtered.map((card) => this.toPublicProduct(card));
  }

  async getProduct(id: number) {
    const barcodes = await this.trendyolListedBarcodes();
    const card = await this.prisma.stockCard.findFirst({
      where: { id, status: 'ACTIVE', stockQuantity: { gt: 0 }, barcode: { in: barcodes } },
      select: SAFE_SELECT,
    });
    return card ? this.toPublicProduct(card) : null;
  }

  private toPublicProduct(card: {
    id: number;
    name: string;
    sku: string | null;
    category: string | null;
    shortDescription: string | null;
    description: string | null;
    technicalSpecs: string | null;
    salePrice: unknown;
    stockQuantity: unknown;
    images: Array<{ filePath: string; isMain: boolean }>;
  }) {
    return {
      id: card.id,
      name: card.name,
      sku: card.sku,
      category: card.category,
      categorySlug: card.category ? slugify(card.category) : null,
      shortDescription: card.shortDescription,
      description: card.description,
      technicalSpecs: card.technicalSpecs,
      salePrice: Number(card.salePrice),
      inStock: Number(card.stockQuantity) > 0,
      images: card.images.map((image) => image.filePath),
    };
  }
}
