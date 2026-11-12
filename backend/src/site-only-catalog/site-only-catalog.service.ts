import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SITE_ONLY_MODEL_PREFIX } from '../common/site-only';
import { BOSTANN_SERIES } from './bostann-pots.data';
import type { SiteOnlySeries } from './site-only-catalog.types';

const CATEGORY_NAME = 'Saksı';
const CATALOG_CATEGORY = 'Saksılar';
const DEFAULT_STOCK = 100;

/**
 * Sadece kendi sitemizde satılan ürün serilerini ERP'ye ekler (pazaryerlerine gitmez).
 *
 * - Her boyut × renk ayrı ERP ürünü olur (model kodu WEB-BST-…), böylece sipariş hangi
 *   boyut/renk olduğu bilgisiyle gelir.
 * - Her seri sitede bir ürün grubudur: müşteri boyutu ve rengi seçer.
 * - Var olan kayıtlara DOKUNMAZ: fiyat/stok/görsel ERP'den değiştirilirse sonraki açılışta ezilmez.
 * - Hata verirse sadece log yazar; backend'in açılmasını engellemez.
 */
@Injectable()
export class SiteOnlyCatalogService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SiteOnlyCatalogService.name);

  constructor(private readonly prisma: PrismaService) {}

  onApplicationBootstrap() {
    if (process.env.SITE_ONLY_CATALOG_SEED === 'false') return;
    // Açılışı bekletmemek için arka planda çalıştır
    void this.seed(BOSTANN_SERIES).catch((err: unknown) => {
      this.logger.error(`Site ürünleri eklenemedi: ${err instanceof Error ? err.message : String(err)}`);
    });
  }

  async seed(seriesList: SiteOnlySeries[]) {
    let category = await this.prisma.category.findUnique({ where: { name: CATEGORY_NAME } });
    if (!category) {
      category = await this.prisma.category.create({
        data: { name: CATEGORY_NAME, codePrefix: 'SKS', startCode: 1, currentCode: 1 },
      });
    }

    let productsCreated = 0;
    let groupsCreated = 0;
    let variantsCreated = 0;

    for (const series of seriesList) {
      let group = await this.prisma.productGroup.findUnique({ where: { slug: series.slug } });
      if (!group) {
        const firstImage = series.sizes[0]?.colors[0]?.images[0] ?? null;
        group = await this.prisma.productGroup.create({
          data: {
            name: `Bostann ${series.name} Serisi Dekoratif Saksı`,
            slug: series.slug,
            description: series.description,
            mainImage: firstImage,
            category: CATALOG_CATEGORY,
            subCategory: `${series.name} Serisi`,
            isActive: true,
            sortOrder: series.sortOrder,
          },
        });
        groupsCreated++;
      }

      for (const [sizeIndex, size] of series.sizes.entries()) {
        const number = size.code.split(' ').pop() ?? size.code;
        for (const [colorIndex, color] of size.colors.entries()) {
          const modelCode = `${SITE_ONLY_MODEL_PREFIX}BST-${size.key}-${color.key}`;

          let product = await this.prisma.product.findUnique({ where: { modelCode }, select: { id: true } });
          if (!product) {
            product = await this.prisma.product.create({
              data: {
                productName: `Bostann ${series.name} ${number} Dekoratif Saksı ${size.top} cm ${size.volume} ${color.name}`,
                modelCode,
                categoryId: category.id,
                stockQuantity: DEFAULT_STOCK,
                sitePrice: size.price,
                // Pazaryeri fiyatları bilerek 0: bu ürünler sadece sitede satılır
                marketPrice: 0,
                listPrice: 0,
                shopPrice: 0,
                costPrice: 0,
                imageUrls: color.images,
                brand: 'Bostann',
                vatRate: 20,
                colorVariant: color.name,
                productHeight: `${size.height} cm`,
                potSize: `${size.top} cm`,
                catalogCategory: CATALOG_CATEGORY,
                // Alt kategori verilmez: ürünler düz listede gizli, alt kategori sekmesi boş sonuç gösterirdi
                status: 'ACTIVE',
                description:
                  `Bostann ${size.code} dekoratif saksı, ${color.name} renk. ${size.description}\n\n` +
                  `Ölçüler: üst ${size.top} cm, iç ${size.inner} cm, taban ${size.base} cm, yükseklik ${size.height} cm. ` +
                  `İç hacim: ${size.volume}.\nİç ve dış mekânda, salon, balkon ve bahçede kullanıma uygundur.`,
              },
              select: { id: true },
            });
            productsCreated++;
          }

          const existingVariant = await this.prisma.productGroupVariant.findFirst({
            where: { groupId: group.id, productId: product.id },
            select: { id: true },
          });
          if (!existingVariant) {
            await this.prisma.productGroupVariant.create({
              data: {
                groupId: group.id,
                productId: product.id,
                sizeLabel: `${size.code} · ${size.top} cm · ${size.volume}`,
                potLabel: color.name,
                potImage: color.images[0] ?? null,
                isActive: true,
                sortOrder: sizeIndex * 10 + colorIndex,
              },
            });
            variantsCreated++;
          }
        }
      }
    }

    if (productsCreated || groupsCreated || variantsCreated) {
      this.logger.log(`Site ürünleri eklendi: ${productsCreated} ürün, ${groupsCreated} grup, ${variantsCreated} varyant`);
    }
    return { productsCreated, groupsCreated, variantsCreated };
  }
}
