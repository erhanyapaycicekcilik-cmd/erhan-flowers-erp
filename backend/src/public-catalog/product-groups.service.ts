import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function slugify(v: string) {
  return v
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class ProductGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Public API ───────────────────────────────────────────────────────────

  async listGroups(category?: string, subCategory?: string) {
    // Site kategori filtresini slug ile gönderir ("saksilar"); grupta ad tutulur ("Saksılar")
    const groupsAll = await this.prisma.productGroup.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true, name: true, slug: true, mainImage: true,
        category: true, subCategory: true,
        variants: {
          where: { isActive: true },
          select: {
            id: true, sizeLabel: true, potLabel: true,
            priceOverride: true, productId: true, trendyolVariantId: true,
          },
          orderBy: [{ sortOrder: 'asc' }],
        },
      },
    });

    const matches = (value: string | null, wanted: string) => !!value && (value === wanted || slugify(value) === slugify(wanted));
    const wanted = category?.trim();
    const wantedSub = subCategory?.trim();
    const groups = groupsAll.filter(
      (g) => (!wanted || matches(g.category, wanted)) && (!wantedSub || matches(g.subCategory, wantedSub)),
    );

    // Her varyant için fiyatı çek (priceOverride yoksa ürün fiyatı)
    return Promise.all(
      groups.map(async (g) => ({
        ...g,
        variants: await Promise.all(
          g.variants.map(async (v) => {
            let price = v.priceOverride ? Number(v.priceOverride) : 0;
            if (!price && v.productId) {
              const p = await this.prisma.product.findFirst({
                where: { id: v.productId },
                select: { sitePrice: true, marketPrice: true },
              });
              price = Number(p?.sitePrice) || Number(p?.marketPrice) || 0;
            } else if (!price && v.trendyolVariantId) {
              const tv = await this.prisma.trendyolProductVariant.findFirst({
                where: { id: v.trendyolVariantId },
                select: { trendyolSalePrice: true },
              });
              price = Number(tv?.trendyolSalePrice) || 0;
            }
            return { ...v, price };
          }),
        ),
      })),
    );
  }

  async getGroupBySlug(slug: string) {
    const group = await this.prisma.productGroup.findFirst({
      where: { slug, isActive: true },
      include: {
        variants: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { sizeLabel: 'asc' }],
        },
      },
    });
    if (!group) return null;

    // Her varyant için fiyat ve görsel bilgilerini çek
    const enriched = await Promise.all(
      group.variants.map(async (v) => {
        let price = v.priceOverride ? Number(v.priceOverride) : 0;
        let images: string[] = [];
        let productName = '';

        if (v.productId) {
          const p = await this.prisma.product.findFirst({
            where: { id: v.productId },
            select: { sitePrice: true, imageUrls: true, productName: true, marketPrice: true },
          });
          if (p) {
            if (!price) price = Number(p.sitePrice) || Number(p.marketPrice) || 0;
            images = this.parseImages(p.imageUrls);
            productName = p.productName;
          }
        } else if (v.trendyolVariantId) {
          const tv = await this.prisma.trendyolProductVariant.findFirst({
            where: { id: v.trendyolVariantId },
            select: { trendyolSalePrice: true, images: true, productName: true },
          });
          if (tv) {
            if (!price) price = Number(tv.trendyolSalePrice) || 0;
            images = this.parseImages(tv.images);
            productName = tv.productName;
          }
        }

        return {
          id: v.id,
          sizeLabel: v.sizeLabel,
          potLabel: v.potLabel,
          potImage: v.potImage,
          price,
          images,
          productName,
          productId: v.productId,
          trendyolVariantId: v.trendyolVariantId,
        };
      }),
    );

    return {
      id: group.id,
      name: group.name,
      slug: group.slug,
      description: group.description,
      mainImage: group.mainImage,
      videoUrl: group.videoUrl,
      category: group.category,
      subCategory: group.subCategory,
      variants: enriched,
    };
  }

  // ─── Admin API ────────────────────────────────────────────────────────────

  async adminListGroups() {
    return this.prisma.productGroup.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { variants: { orderBy: [{ sortOrder: 'asc' }] } },
    });
  }

  async adminGetGroup(id: number) {
    return this.prisma.productGroup.findFirst({
      where: { id },
      include: { variants: { orderBy: [{ sortOrder: 'asc' }] } },
    });
  }

  async createGroup(data: {
    name: string;
    description?: string;
    mainImage?: string;
    videoUrl?: string;
    category?: string;
    subCategory?: string;
    sortOrder?: number;
  }) {
    const slug = slugify(data.name) + '-' + Date.now().toString(36);
    return this.prisma.productGroup.create({
      data: {
        name: data.name,
        slug,
        description: data.description ?? null,
        mainImage: data.mainImage ?? null,
        videoUrl: data.videoUrl ?? null,
        category: data.category ?? null,
        subCategory: data.subCategory ?? null,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async updateGroup(id: number, data: {
    name?: string;
    description?: string | null;
    mainImage?: string | null;
    videoUrl?: string | null;
    category?: string | null;
    subCategory?: string | null;
    isActive?: boolean;
    sortOrder?: number;
  }) {
    return this.prisma.productGroup.update({ where: { id }, data });
  }

  async deleteGroup(id: number) {
    await this.prisma.productGroup.delete({ where: { id } });
    return { ok: true };
  }

  async addVariant(groupId: number, data: {
    sizeLabel?: string;
    potLabel?: string;
    potImage?: string;
    productId?: number | null;
    trendyolVariantId?: number | null;
    priceOverride?: number | null;
    sortOrder?: number;
  }) {
    return this.prisma.productGroupVariant.create({
      data: {
        groupId,
        sizeLabel: data.sizeLabel ?? null,
        potLabel: data.potLabel ?? null,
        potImage: data.potImage ?? null,
        productId: data.productId ?? null,
        trendyolVariantId: data.trendyolVariantId ?? null,
        priceOverride: data.priceOverride ?? null,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async updateVariant(variantId: number, data: {
    sizeLabel?: string | null;
    potLabel?: string | null;
    potImage?: string | null;
    productId?: number | null;
    trendyolVariantId?: number | null;
    priceOverride?: number | null;
    isActive?: boolean;
    sortOrder?: number;
  }) {
    return this.prisma.productGroupVariant.update({ where: { id: variantId }, data });
  }

  async deleteVariant(variantId: number) {
    await this.prisma.productGroupVariant.delete({ where: { id: variantId } });
    return { ok: true };
  }

  // Ürün ara (admin paneli için — productId veya modelCode ile)
  async searchProductsForGroup(q: string) {
    const term = q.trim();
    const [products, variants] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { productName: { contains: term, mode: 'insensitive' } },
            { modelCode: { contains: term, mode: 'insensitive' } },
            { barcode: { contains: term, mode: 'insensitive' } },
          ],
        },
        select: { id: true, productName: true, modelCode: true, sitePrice: true, imageUrls: true },
        take: 10,
      }),
      this.prisma.trendyolProductVariant.findMany({
        where: {
          OR: [
            { productName: { contains: term, mode: 'insensitive' } },
            { currentModelCode: { contains: term, mode: 'insensitive' } },
          ],
        },
        select: { id: true, productName: true, currentModelCode: true, trendyolSalePrice: true, images: true },
        take: 10,
      }),
    ]);

    return {
      products: products.map(p => ({
        type: 'product' as const,
        id: p.id,
        name: p.productName,
        modelCode: p.modelCode,
        price: Number(p.sitePrice),
        image: this.parseImages(p.imageUrls)[0] ?? null,
      })),
      variants: variants.map(v => ({
        type: 'variant' as const,
        id: v.id,
        name: v.productName,
        modelCode: v.currentModelCode,
        price: Number(v.trendyolSalePrice),
        image: this.parseImages(v.images)[0] ?? null,
      })),
    };
  }

  private parseImages(raw: unknown): string[] {
    if (!raw) return [];
    try {
      const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(arr)) return arr.filter(Boolean).map(String);
    } catch {}
    return [];
  }
}
