import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SITE_ONLY_MODEL_PREFIX } from '../common/site-only';
import { BOSTANN_SERIES } from './bostann-pots.data';
import { FIBER_POTS } from './fiber-pots.data';
import { CACTUS_REEDS } from './cactus-reeds.data';
import { METAL_POTS } from './metal-pots.data';
import { DECOR_POT_GROUPS } from './decor-pots.data';
import type { SiteOnlyGroup, SiteOnlySeries, SiteOnlySimpleProduct } from './site-only-catalog.types';

function slugify(v: string) {
  return v
    .toLocaleLowerCase('tr')
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const CATEGORY_NAME = 'Saksı';
const CATALOG_CATEGORY = 'Saksılar';
const DEFAULT_STOCK = 100;
// Bu adresle başlayan görseller bu servisin koyduğu görsellerdir; ERP'den elle değiştirilmediyse güncellenebilir
const MANAGED_IMAGE_BASES = [
  'https://www.erhanflowers.com/bostann/',
  'https://www.erhanflowers.com/fiber-saksi/',
  'https://www.erhanflowers.com/kaktus-sazlik/',
  'https://www.erhanflowers.com/metal-saksi/',
  'https://www.erhanflowers.com/dekoratif-saksi/',
];

function isManagedImage(url: unknown): boolean {
  return typeof url === 'string' && MANAGED_IMAGE_BASES.some((base) => url.startsWith(base));
}

function sameList(a: unknown, b: string[]): boolean {
  return Array.isArray(a) && a.length === b.length && a.every((v, i) => v === b[i]);
}

/**
 * Sadece kendi sitemizde satılan ürün serilerini ERP'ye ekler (pazaryerlerine gitmez).
 *
 * - Her boyut × renk ayrı ERP ürünü olur (model kodu WEB-BST-…), böylece sipariş hangi
 *   boyut/renk olduğu bilgisiyle gelir.
 * - Her seri sitede bir ürün grubudur: müşteri boyutu ve rengi seçer.
 * - Var olan kayıtların fiyat/stok/ad/açıklamasına DOKUNMAZ (ERP'den değiştirilirse ezilmez).
 *   Sadece görseller hâlâ bu servisin koyduğu görsellerse (MANAGED_IMAGE_BASES) güncel listeye çekilir.
 * - Hata verirse sadece log yazar; backend'in açılmasını engellemez.
 */
@Injectable()
export class SiteOnlyCatalogService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SiteOnlyCatalogService.name);

  constructor(private readonly prisma: PrismaService) {}

  onApplicationBootstrap() {
    if (process.env.SITE_ONLY_CATALOG_SEED === 'false') return;
    // Açılışı bekletmemek için arka planda çalıştır
    void (async () => {
      await this.seed(BOSTANN_SERIES);
      await this.seedSimple(FIBER_POTS);
      await this.seedSimple(CACTUS_REEDS);
      await this.seedSimple(METAL_POTS);
      await this.seedGroups(DECOR_POT_GROUPS);
      await this.seedTreeGroups();
    })().catch((err: unknown) => {
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
    let imagesUpdated = 0;

    for (const series of seriesList) {
      let group = await this.prisma.productGroup.findUnique({ where: { slug: series.slug } });
      const firstImage = series.cover ?? series.sizes[0]?.colors[0]?.images[0] ?? null;
      if (group && firstImage && group.mainImage !== firstImage && (!group.mainImage || isManagedImage(group.mainImage))) {
        group = await this.prisma.productGroup.update({ where: { id: group.id }, data: { mainImage: firstImage } });
        imagesUpdated++;
      }
      if (!group) {
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

          let product = await this.prisma.product.findUnique({ where: { modelCode }, select: { id: true, imageUrls: true } });
          if (product) {
            const current = product.imageUrls;
            const managed = Array.isArray(current) && current.length > 0 && current.every(isManagedImage);
            if (managed && !sameList(current, color.images)) {
              await this.prisma.product.update({ where: { id: product.id }, data: { imageUrls: color.images } });
              imagesUpdated++;
            }
          }
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
              select: { id: true, imageUrls: true },
            });
            productsCreated++;
          }

          const existingVariant = await this.prisma.productGroupVariant.findFirst({
            where: { groupId: group.id, productId: product.id },
            select: { id: true, potImage: true },
          });
          const potImage = color.images[0] ?? null;
          if (existingVariant && potImage && existingVariant.potImage !== potImage && (!existingVariant.potImage || isManagedImage(existingVariant.potImage))) {
            await this.prisma.productGroupVariant.update({ where: { id: existingVariant.id }, data: { potImage } });
            imagesUpdated++;
          }
          if (!existingVariant) {
            await this.prisma.productGroupVariant.create({
              data: {
                groupId: group.id,
                productId: product.id,
                sizeLabel: `${size.code} · ${size.top} cm · ${size.volume}`,
                potLabel: color.name,
                potImage,
                isActive: true,
                sortOrder: sizeIndex * 10 + colorIndex,
              },
            });
            variantsCreated++;
          }
        }
      }
    }

    if (productsCreated || groupsCreated || variantsCreated || imagesUpdated) {
      this.logger.log(
        `Site ürünleri: ${productsCreated} ürün, ${groupsCreated} grup, ${variantsCreated} varyant eklendi; ${imagesUpdated} görsel güncellendi`,
      );
    }
    return { productsCreated, groupsCreated, variantsCreated, imagesUpdated };
  }

  /** Tekil site ürünlerini ekler; var olanın sadece (bizim koyduğumuz) görsellerini günceller */
  async seedSimple(products: SiteOnlySimpleProduct[]) {
    let created = 0;
    let imagesUpdated = 0;
    let moved = 0;
    let retired = 0;
    const categoryIds = new Map<string, number>();

    for (const item of products) {
      if (!item.modelCode.startsWith(SITE_ONLY_MODEL_PREFIX)) {
        this.logger.warn(`Atlandı, WEB- ön eki yok: ${item.modelCode}`);
        continue;
      }
      const existing = await this.prisma.product.findUnique({
        where: { modelCode: item.modelCode },
        select: { id: true, imageUrls: true, catalogCategory: true, catalogSubCategory: true },
      });
      if (item.retired) {
        // Kaldırılan ürün: yeni açılmaz; açıksa ve görselleri hâlâ bizim koyduğumuzsa pasife alınır
        if (existing) {
          const cur = existing.imageUrls;
          const ours = Array.isArray(cur) && cur.length > 0 && cur.every(isManagedImage);
          if (ours) {
            const r = await this.prisma.product.updateMany({ where: { id: existing.id, status: 'ACTIVE' }, data: { status: 'PASSIVE' } });
            if (r.count) retired++;
          }
        }
        continue;
      }
      if (existing) {
        const prev = item.previousCatalog;
        if (
          prev &&
          existing.catalogCategory === prev.catalogCategory &&
          (existing.catalogSubCategory ?? null) === prev.catalogSubCategory
        ) {
          await this.prisma.product.update({
            where: { id: existing.id },
            data: { catalogCategory: item.catalogCategory, catalogSubCategory: item.catalogSubCategory ?? null },
          });
          moved++;
        }
        const current = existing.imageUrls;
        const managed = Array.isArray(current) && current.length > 0 && current.every(isManagedImage);
        if (managed && !sameList(current, item.images)) {
          await this.prisma.product.update({ where: { id: existing.id }, data: { imageUrls: item.images } });
          imagesUpdated++;
        }
        continue;
      }

      let categoryId = categoryIds.get(item.categoryName);
      if (!categoryId) {
        const category =
          (await this.prisma.category.findUnique({ where: { name: item.categoryName } })) ??
          (await this.prisma.category.create({
            data: { name: item.categoryName, codePrefix: item.categoryCodePrefix ?? 'SKS', startCode: 1, currentCode: 1 },
          }));
        categoryId = category.id;
        categoryIds.set(item.categoryName, categoryId);
      }

      await this.prisma.product.create({
        data: {
          productName: item.name,
          modelCode: item.modelCode,
          categoryId,
          stockQuantity: DEFAULT_STOCK,
          sitePrice: item.sitePrice,
          marketPrice: 0,
          listPrice: 0,
          shopPrice: 0,
          costPrice: 0,
          imageUrls: item.images,
          brand: item.brand ?? 'Erhan Flowers',
          vatRate: 20,
          productHeight: item.productHeight ?? null,
          potSize: item.potSize ?? null,
          catalogCategory: item.catalogCategory,
          catalogSubCategory: item.catalogSubCategory ?? null,
          status: 'ACTIVE',
          description: item.description,
        },
      });
      created++;
    }

    if (created || imagesUpdated || moved || retired) {
      this.logger.log(`Tekil site ürünleri: ${created} eklendi, ${imagesUpdated} görsel güncellendi, ${moved} kategorisi taşındı, ${retired} kaldırıldı`);
    }
    return { created, imagesUpdated, moved, retired };
  }

  /**
   * Genel ürün grupları (boy × renk). Her varyant ayrı ürün; sitede grup sayfasında Boy + Renk seçilir,
   * seçilen rengin görselleri gösterilir. Var olan kayıtların fiyat/stok/adına dokunmaz; sadece
   * bizim koyduğumuz görselleri günceller.
   */
  async seedGroups(groupsList: SiteOnlyGroup[]) {
    let productsCreated = 0;
    let groupsCreated = 0;
    let variantsCreated = 0;
    let imagesUpdated = 0;
    const categoryIds = new Map<string, number>();

    for (const def of groupsList) {
      let categoryId = categoryIds.get(def.categoryName);
      if (!categoryId) {
        const category =
          (await this.prisma.category.findUnique({ where: { name: def.categoryName } })) ??
          (await this.prisma.category.create({
            data: { name: def.categoryName, codePrefix: def.categoryCodePrefix ?? 'SKS', startCode: 1, currentCode: 1 },
          }));
        categoryId = category.id;
        categoryIds.set(def.categoryName, categoryId);
      }

      let group = await this.prisma.productGroup.findUnique({ where: { slug: def.slug } });
      if (group && group.mainImage !== def.mainImage && (!group.mainImage || isManagedImage(group.mainImage))) {
        group = await this.prisma.productGroup.update({ where: { id: group.id }, data: { mainImage: def.mainImage } });
        imagesUpdated++;
      }
      if (!group) {
        group = await this.prisma.productGroup.create({
          data: {
            name: def.name,
            slug: def.slug,
            description: def.description,
            mainImage: def.mainImage,
            category: def.catalogCategory,
            subCategory: def.groupSubCategory,
            isActive: true,
            sortOrder: def.sortOrder,
          },
        });
        groupsCreated++;
      }

      for (const [index, v] of def.variants.entries()) {
        if (!v.modelCode.startsWith(SITE_ONLY_MODEL_PREFIX)) {
          this.logger.warn(`Atlandı, WEB- ön eki yok: ${v.modelCode}`);
          continue;
        }
        let product = await this.prisma.product.findUnique({ where: { modelCode: v.modelCode }, select: { id: true, imageUrls: true } });
        if (product) {
          const current = product.imageUrls;
          const managed = Array.isArray(current) && current.length > 0 && current.every(isManagedImage);
          if (managed && !sameList(current, v.images)) {
            await this.prisma.product.update({ where: { id: product.id }, data: { imageUrls: v.images } });
            imagesUpdated++;
          }
        } else {
          product = await this.prisma.product.create({
            data: {
              productName: v.productName,
              modelCode: v.modelCode,
              categoryId,
              stockQuantity: DEFAULT_STOCK,
              sitePrice: v.sitePrice,
              // Pazaryeri fiyatları bilerek 0: bu ürünler sadece sitede satılır
              marketPrice: 0,
              listPrice: 0,
              shopPrice: 0,
              costPrice: 0,
              imageUrls: v.images,
              brand: def.brand ?? 'Erhan Flowers',
              vatRate: 20,
              colorVariant: v.colorLabel,
              productHeight: v.productHeight ?? null,
              potSize: v.potSize ?? null,
              catalogCategory: def.catalogCategory,
              status: 'ACTIVE',
              description: v.description,
            },
            select: { id: true, imageUrls: true },
          });
          productsCreated++;
        }

        const potImage = v.images[0] ?? null;
        const existingVariant = await this.prisma.productGroupVariant.findFirst({
          where: { groupId: group.id, productId: product.id },
          select: { id: true, potImage: true },
        });
        if (existingVariant) {
          if (potImage && existingVariant.potImage !== potImage && (!existingVariant.potImage || isManagedImage(existingVariant.potImage))) {
            await this.prisma.productGroupVariant.update({ where: { id: existingVariant.id }, data: { potImage } });
            imagesUpdated++;
          }
        } else {
          await this.prisma.productGroupVariant.create({
            data: {
              groupId: group.id,
              productId: product.id,
              sizeLabel: v.sizeLabel,
              potLabel: v.colorLabel,
              potImage,
              isActive: true,
              sortOrder: index,
            },
          });
          variantsCreated++;
        }
      }
    }

    if (productsCreated || groupsCreated || variantsCreated || imagesUpdated) {
      this.logger.log(
        `Site ürün grupları: ${productsCreated} ürün, ${groupsCreated} grup, ${variantsCreated} varyant eklendi; ${imagesUpdated} görsel güncellendi`,
      );
    }
    return { productsCreated, groupsCreated, variantsCreated, imagesUpdated };
  }

  /**
   * Ağaçlar kategorisindeki (Bambu hariç) tüm ACTIVE ürünler için ProductGroup oluşturur.
   * - Her ürün → 1 grup, 1 varyant ("Saksı ile" — mevcut ürün + mevcut görseller)
   * - Grup zaten varsa atlar (idempotent)
   * - Saksısız varyant sonradan admin panelden eklenir (görseller hazır olunca)
   */
  async seedTreeGroups() {
    const products = await this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        catalogCategory: 'Ağaçlar',
        // WEB- ön ekli site-only ürünleri değil, gerçek ERP ürünleri
        modelCode: { not: { startsWith: 'WEB-' } },
      },
      select: {
        id: true,
        productName: true,
        modelCode: true,
        imageUrls: true,
        productHeight: true,
        catalogSubCategory: true,
      },
      orderBy: [{ catalogSubCategory: 'asc' }, { productName: 'asc' }],
    });

    // Bambu içeren alt kategorileri atla
    const BAMBU_KEYWORDS = ['bambu', 'bamboo'];
    const treeProducts = products.filter((p) => {
      const sub = (p.catalogSubCategory ?? '').toLowerCase();
      const name = p.productName.toLowerCase();
      return !BAMBU_KEYWORDS.some((k) => sub.includes(k) || name.startsWith(k));
    });

    let groupsCreated = 0;
    let variantsCreated = 0;

    for (const product of treeProducts) {
      const baseSlug = slugify(product.productName);
      const slug = `agac-${baseSlug}`;

      // Grup zaten varsa atla
      const existing = await this.prisma.productGroup.findUnique({ where: { slug } });
      if (existing) continue;

      const firstImage = Array.isArray(product.imageUrls) && product.imageUrls.length > 0
        ? (product.imageUrls[0] as string)
        : null;

      const group = await this.prisma.productGroup.create({
        data: {
          name: product.productName,
          slug,
          category: 'Ağaçlar',
          subCategory: product.catalogSubCategory ?? null,
          mainImage: firstImage,
          isActive: true,
          sortOrder: 0,
        },
      });
      groupsCreated++;

      // "Saksısız" varyantı — görsel henüz yok, fiyat ERP'den gelecek (priceOverride girilince aktif olur)
      await this.prisma.productGroupVariant.create({
        data: {
          groupId: group.id,
          productId: product.id,
          sizeLabel: product.productHeight ?? null,
          potLabel: 'Saksısız',
          potImage: null, // Saksısız fotoğraf çekilince admin panelden güncellenir
          isActive: false, // Görsel + fiyat hazır olunca aktif et
          sortOrder: 0,
        },
      });

      // "Saksı ile" varyantı — mevcut ürün, mevcut fiyat
      await this.prisma.productGroupVariant.create({
        data: {
          groupId: group.id,
          productId: product.id,
          sizeLabel: product.productHeight ?? null,
          potLabel: 'Saksı ile',
          potImage: firstImage,
          isActive: true,
          sortOrder: 1,
        },
      });
      variantsCreated++;
    }

    if (groupsCreated || variantsCreated) {
      this.logger.log(`Ağaç grupları: ${groupsCreated} grup, ${variantsCreated} varyant eklendi`);
    }
    return { groupsCreated, variantsCreated, total: treeProducts.length };
  }
}
