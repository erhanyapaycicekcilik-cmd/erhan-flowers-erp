import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { cleanMojibakeDeep } from '../common/mojibake';
import { Prisma } from '../generated/prisma-client';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { calcPlatformPrice } from '../integrations/platform-fees.config';

type ProductPayload = {
  productName?: string;
  modelCode?: string;
  barcode?: string;
  categoryId?: number;
  stockQuantity?: number;
  criticalStockLevel?: number;
  costPrice?: number;
  desi?: number;
  shippingCost?: number;
  shopPrice?: number;
  sitePrice?: number;
  marketPrice?: number;
  listPrice?: number;
  imageUrls?: string[];
  brand?: string;
  vatRate?: number;
  origin?: string;
  colorVariant?: string;
  material?: string;
  packageDimensions?: string;
  warrantyMonths?: number;
  warrantyType?: string;
  productHeight?: string;
  potType?: string;
  potSize?: string;
  stemCount?: number;
  branchCount?: number;
  leavesPerBranch?: number;
  leafCount?: number;
  status?: 'ACTIVE' | 'PASSIVE';
  description?: string;
};

type BarcodePayload = {
  categoryId?: number;
  modelCode?: string;
  productName?: string;
  potSize?: string;
};

type IdentityCheckPayload = {
  modelCode?: string;
  barcode?: string;
  excludeProductId?: number;
};

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  // Bağlı platform listesi 5 dakika cache'lenir — her ürün kaydında DB sorgusu atmamak için
  private connectedPlatformsCache: { platforms: string[]; expiresAt: number } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrations: IntegrationsService,
  ) {}

  private async getConnectedPlatforms(): Promise<string[]> {
    const now = Date.now();
    if (this.connectedPlatformsCache && this.connectedPlatformsCache.expiresAt > now) {
      return this.connectedPlatformsCache.platforms;
    }
    const rows = await this.prisma.$queryRaw<Array<{ platform: string }>>`
      SELECT platform FROM integration_connections
      WHERE status = 'CONNECTED' AND platform IN ('TRENDYOL', 'N11', 'HEPSIBURADA', 'TRENDRUM', 'PAZARAMA')
    `.catch(() => [] as Array<{ platform: string }>);
    const platforms = rows.map((r) => r.platform);
    this.connectedPlatformsCache = { platforms, expiresAt: now + 5 * 60 * 1000 };
    return platforms;
  }

  // Bağlantı değiştiğinde cache'i temizle (bağlantı ekle/sil işlemlerinde çağrılabilir)
  invalidatePlatformCache() {
    this.connectedPlatformsCache = null;
  }

  async list() {
    const products = await this.prisma.product.findMany({
      include: { category: true, mediaFiles: true },
      orderBy: { createdAt: 'desc' },
    });
    return products.map((product) => this.withPublishingStatus(product));
  }

  async create(payload: unknown) {
    const data = this.normalize(payload);
    if (!data.productName || !data.modelCode || !data.categoryId) {
      throw new BadRequestException('Ürün adı, model kodu ve kategori zorunludur.');
    }

    try {
      await this.ensureUniqueProductIdentity(data);
      const product = await this.prisma.product.create({
        data: {
          productName: data.productName,
          modelCode: data.modelCode,
          barcode: data.barcode,
          categoryId: data.categoryId,
          stockQuantity: data.stockQuantity ?? 0,
          criticalStockLevel: data.criticalStockLevel ?? 0,
          costPrice: data.costPrice ?? 0,
          desi: data.desi ?? 1,
          shippingCost: data.shippingCost ?? 5,
          shopPrice: data.shopPrice ?? 0,
          sitePrice: data.sitePrice && data.sitePrice > 0
            ? data.sitePrice
            : data.marketPrice && data.marketPrice > 0
              ? Math.round(data.marketPrice * 0.80)
              : data.shopPrice && data.shopPrice > 0
                ? Math.round(data.shopPrice * 0.80)
                : 0,
          marketPrice: data.marketPrice ?? 0,
          listPrice: data.listPrice ?? 0,
          imageUrls: data.imageUrls ?? [],
          brand: data.brand ?? 'Erhan Flowers',
          vatRate: data.vatRate ?? 20,
          origin: data.origin ?? 'Türkiye',
          colorVariant: data.colorVariant,
          material: data.material,
          packageDimensions: data.packageDimensions,
          warrantyMonths: data.warrantyMonths ?? 0,
          warrantyType: data.warrantyType,
          productHeight: data.productHeight,
          potType: data.potType,
          potSize: data.potSize,
          stemCount: data.stemCount,
          branchCount: data.branchCount,
          leavesPerBranch: data.leavesPerBranch,
          leafCount: data.leafCount,
          status: data.status ?? 'ACTIVE',
          description: data.description,
        },
        include: { category: true },
      });

      // Barkod varsa TrendyolProductVariant + ProductCostDraft otomatik oluştur
      if (data.barcode) {
        try {
          const existingVariant = await this.prisma.trendyolProductVariant.findUnique({ where: { barcode: data.barcode } });
          if (!existingVariant) {
            const salePrice = new Prisma.Decimal(data.marketPrice ?? data.shopPrice ?? 0);
            const variant = await this.prisma.trendyolProductVariant.create({
              data: {
                productId: product.id,
                barcode: data.barcode,
                productName: data.productName!,
                currentModelCode: data.modelCode,
                proposedModelCode: data.modelCode,
                brand: data.brand ?? 'Erhan Flowers',
                stockQuantity: data.stockQuantity ?? 0,
                trendyolSalePrice: salePrice,
                n11SalePrice: salePrice,
                hepsiburadaSalePrice: salePrice,
                commissionPercent: new Prisma.Decimal(20),
                status: 'ACTIVE',
              },
            });
            await this.prisma.productCostDraft.create({
              data: {
                variantId: variant.id,
                profitMarginPercent: new Prisma.Decimal(45),
                vatPercent: new Prisma.Decimal(20),
                marketplaceMarkupPercent: new Prisma.Decimal(25),
                campaignBufferPercent: new Prisma.Decimal(10),
                shippingCost: new Prisma.Decimal(data.shippingCost ?? 0),
                desi: new Prisma.Decimal(data.desi ?? 1),
                status: 'DRAFT',
              },
            });
          } else if (!existingVariant.productId) {
            await this.prisma.trendyolProductVariant.update({ where: { id: existingVariant.id }, data: { productId: product.id } });
            const hasDraft = await this.prisma.productCostDraft.findUnique({ where: { variantId: existingVariant.id } });
            if (!hasDraft) {
              await this.prisma.productCostDraft.create({
                data: {
                  variantId: existingVariant.id,
                  profitMarginPercent: new Prisma.Decimal(45),
                  vatPercent: new Prisma.Decimal(20),
                  marketplaceMarkupPercent: new Prisma.Decimal(25),
                  campaignBufferPercent: new Prisma.Decimal(10),
                  shippingCost: new Prisma.Decimal(data.shippingCost ?? 0),
                  desi: new Prisma.Decimal(data.desi ?? 1),
                  status: 'DRAFT',
                },
              });
            }
          }
        } catch (err) {
          this.logger.warn(`Maliyet taslağı oluşturma hatası: ${String(err)}`);
        }
      }

      this.broadcastPriceStock(product).catch((err) =>
        this.logger.warn(`Platform yayını hatası (create): ${String(err)}`),
      );
      return product;
    } catch (error) {
      this.handleUniqueError(error);
    }
  }

  async update(id: number, payload: unknown) {
    const body = (payload ?? {}) as Record<string, unknown>;
    const hasKey = (k: string) => Object.prototype.hasOwnProperty.call(body, k);

    // Only normalize and update fields that were actually sent in the payload
    const data = this.normalize(payload);
    const patch: Record<string, unknown> = {};
    if (hasKey('productName') || hasKey('product_name')) patch['productName'] = data.productName;
    if (hasKey('modelCode') || hasKey('model_code')) patch['modelCode'] = data.modelCode;
    if (hasKey('barcode')) patch['barcode'] = data.barcode;
    if (hasKey('trendyolBarcode') || hasKey('trendyol_barcode')) patch['trendyolBarcode'] = (body['trendyolBarcode'] ?? body['trendyol_barcode'] ?? null) as string | null;
    if (hasKey('categoryId') || hasKey('category_id')) patch['categoryId'] = data.categoryId;
    if (hasKey('stockQuantity') || hasKey('stock_quantity')) patch['stockQuantity'] = data.stockQuantity;
    if (hasKey('criticalStockLevel') || hasKey('critical_stock_level')) patch['criticalStockLevel'] = data.criticalStockLevel;
    if (hasKey('costPrice') || hasKey('cost_price')) patch['costPrice'] = data.costPrice;
    if (hasKey('desi')) patch['desi'] = data.desi;
    if (hasKey('shippingCost') || hasKey('shipping_cost')) patch['shippingCost'] = data.shippingCost;
    if (hasKey('shopPrice') || hasKey('shop_price')) patch['shopPrice'] = data.shopPrice;
    if (hasKey('sitePrice') || hasKey('site_price')) patch['sitePrice'] = data.sitePrice;
    if (hasKey('marketPrice') || hasKey('market_price')) {
      patch['marketPrice'] = data.marketPrice;
      // marketPrice geldi ama sitePrice gönderilmediyse, mevcut sitePrice=0 ise otomatik hesapla
      if (!hasKey('sitePrice') && !hasKey('site_price') && data.marketPrice && data.marketPrice > 0) {
        const existing = await this.prisma.product.findUnique({ where: { id }, select: { sitePrice: true } });
        if (!existing || Number(existing.sitePrice) === 0) {
          patch['sitePrice'] = Math.round(data.marketPrice * 0.80);
        }
      }
    }
    if (hasKey('listPrice') || hasKey('list_price')) patch['listPrice'] = data.listPrice;
    if (hasKey('imageUrls') || hasKey('image_urls')) patch['imageUrls'] = data.imageUrls;
    if (hasKey('brand')) patch['brand'] = data.brand;
    if (hasKey('vatRate') || hasKey('vat_rate')) patch['vatRate'] = data.vatRate;
    if (hasKey('origin')) patch['origin'] = data.origin;
    if (hasKey('colorVariant') || hasKey('color_variant')) patch['colorVariant'] = data.colorVariant;
    if (hasKey('material')) patch['material'] = data.material;
    if (hasKey('packageDimensions') || hasKey('package_dimensions')) patch['packageDimensions'] = data.packageDimensions;
    if (hasKey('warrantyMonths') || hasKey('warranty_months')) patch['warrantyMonths'] = data.warrantyMonths;
    if (hasKey('warrantyType') || hasKey('warranty_type')) patch['warrantyType'] = data.warrantyType;
    if (hasKey('productHeight') || hasKey('product_height')) patch['productHeight'] = data.productHeight;
    if (hasKey('potType') || hasKey('pot_type')) patch['potType'] = data.potType;
    if (hasKey('potSize') || hasKey('pot_size')) patch['potSize'] = data.potSize;
    if (hasKey('stemCount') || hasKey('stem_count')) patch['stemCount'] = data.stemCount;
    if (hasKey('branchCount') || hasKey('branch_count')) patch['branchCount'] = data.branchCount;
    if (hasKey('leavesPerBranch') || hasKey('leaves_per_branch')) patch['leavesPerBranch'] = data.leavesPerBranch;
    if (hasKey('leafCount') || hasKey('leaf_count')) patch['leafCount'] = data.leafCount;
    if (hasKey('status')) patch['status'] = data.status;
    if (hasKey('description')) patch['description'] = data.description;

    const partialData: ProductPayload = {
      ...(patch['productName'] !== undefined ? { productName: patch['productName'] as string } : {}),
      ...(patch['modelCode'] !== undefined ? { modelCode: patch['modelCode'] as string } : {}),
      ...(patch['barcode'] !== undefined ? { barcode: patch['barcode'] as string } : {}),
      ...(patch['categoryId'] !== undefined ? { categoryId: patch['categoryId'] as number } : {}),
    };

    try {
      await this.ensureUniqueProductIdentity(partialData, id);
      const product = await this.prisma.product.update({
        where: { id },
        data: patch as Prisma.ProductUpdateInput,
        include: { category: true },
      });
      // Fiyat veya stok değiştiyse tüm platformlara yayınla
      const priceOrStockChanged = ['salePrice', 'marketPrice', 'shopPrice', 'sitePrice', 'listPrice', 'stockQuantity'].some((k) => patch[k] !== undefined);
      if (priceOrStockChanged) {
        this.broadcastPriceStock(product).catch((err) =>
          this.logger.warn(`Platform yayını hatası (update): ${String(err)}`),
        );
      }
      // Görsel veya açıklama değiştiyse tüm platformlara gönder
      if (patch['imageUrls'] !== undefined || patch['description'] !== undefined) {
        this.broadcastImages(id).catch((err) =>
          this.logger.warn(`Görsel/açıklama platform yayını hatası (update): ${String(err)}`),
        );
      }
      return product;
    } catch (error) {
      this.handleUniqueError(error);
    }
  }

  // Tek bir varyantı platformlara yayınlar — ürün düzenleme sonrası çağrılır.
  async broadcastVariantById(variantId: number): Promise<void> {
    const variant = await this.prisma.trendyolProductVariant.findUnique({
      where: { id: variantId },
      include: { productCostDraft: true },
    });
    if (!variant) return;
    const draft = variant.productCostDraft as any;
    const salePrice = Number(
      draft?.marketplaceSalePrice > 0
        ? draft.marketplaceSalePrice
        : variant.trendyolSalePrice ?? draft?.salePrice ?? 0,
    );
    if (!salePrice) return;
    // sitePrice sıfırsa otomatik hesapla, sitede görünmesi için
    const productForVariant = await this.prisma.product.findFirst({
      where: { OR: [{ barcode: variant.barcode ?? undefined }, { modelCode: variant.currentModelCode ?? undefined }] },
      select: { id: true, sitePrice: true },
    });
    if (productForVariant && Number(productForVariant.sitePrice) === 0) {
      await this.prisma.product.update({ where: { id: productForVariant.id }, data: { sitePrice: Math.round(salePrice * 0.80) } });
    }
    await this.broadcastPriceStock({
      barcode: variant.barcode,
      modelCode: variant.currentModelCode,
      marketPrice: salePrice,
      sitePrice: productForVariant && Number(productForVariant.sitePrice) === 0 ? Math.round(salePrice * 0.80) : undefined,
      stockQuantity: Number(variant.stockQuantity ?? 0),
    }).catch(() => undefined);
  }

  // Satış sonrası stok kartına bağlı ürün/varyantları platformlara gönderir.
  async broadcastStockCardUpdate(stockCardIds: number[]): Promise<void> {
    if (!stockCardIds.length) return;
    const cards = await this.prisma.stockCard.findMany({
      where: { id: { in: stockCardIds } },
      select: { id: true, barcode: true, sku: true, oldModelCode: true, stockQuantity: true, salePrice: true, purchasePrice: true },
    });
    for (const card of cards) {
      const lookupValues = [card.barcode, card.sku, card.oldModelCode].filter(Boolean) as string[];
      if (!lookupValues.length) continue;
      const variants = await this.prisma.trendyolProductVariant.findMany({
        where: { OR: [{ barcode: { in: lookupValues } }, { currentModelCode: { in: lookupValues } }, { supplierStockCode: { in: lookupValues } }] },
        include: { productCostDraft: true },
        take: 5,
      });
      const cardFallbackPrice = Number(Number(card.salePrice) > 0 ? card.salePrice : card.purchasePrice ?? 0);
      if (variants.length > 0) {
        for (const variant of variants) {
          const salePrice = Number(
            (variant.productCostDraft as any)?.marketplaceSalePrice > 0
              ? (variant.productCostDraft as any).marketplaceSalePrice
              : variant.trendyolSalePrice ?? variant.productCostDraft?.salePrice ?? 0
          ) || cardFallbackPrice;
          // sitePrice sıfırsa otomatik hesapla
          const prod = await this.prisma.product.findFirst({
            where: { OR: [{ barcode: variant.barcode ?? undefined }, { modelCode: variant.currentModelCode ?? undefined }] },
            select: { id: true, sitePrice: true },
          });
          let sitePriceArg: number | undefined;
          if (prod && Number(prod.sitePrice) === 0 && salePrice > 0) {
            sitePriceArg = Math.round(salePrice * 0.80);
            await this.prisma.product.update({ where: { id: prod.id }, data: { sitePrice: sitePriceArg } });
          }
          await this.broadcastPriceStock({ barcode: variant.barcode, modelCode: variant.currentModelCode, marketPrice: salePrice, sitePrice: sitePriceArg, stockQuantity: Number(card.stockQuantity) }).catch(() => undefined);
        }
      } else {
        await this.broadcastPriceStock({ barcode: card.barcode, modelCode: card.sku ?? card.oldModelCode, marketPrice: cardFallbackPrice, stockQuantity: Number(card.stockQuantity) }).catch(() => undefined);
      }
    }
  }

  // Ürün kaydedilince tüm aktif platform entegrasyonlarına fiyat/stok gönderir.
  // Arka planda çalışır — hata olursa ürün kaydını etkilemez.
  async broadcastPriceStockPublic(product: {
    barcode?: string | null;
    modelCode?: string | null;
    marketPrice?: unknown;
    shopPrice?: unknown;
    sitePrice?: unknown;
    stockQuantity?: unknown;
  }): Promise<void> {
    return this.broadcastPriceStock(product);
  }

  private async broadcastPriceStock(product: {
    barcode?: string | null;
    trendyolBarcode?: string | null;
    modelCode?: string | null;
    marketPrice?: unknown;
    listPrice?: unknown;
    shopPrice?: unknown;
    sitePrice?: unknown;
    stockQuantity?: unknown;
  }): Promise<void> {
    if (!product.barcode && !product.modelCode && !product.trendyolBarcode) return;

    // Platform fiyatı = sitePrice × 1.25 (kendi sitemizin fiyatı baz alınır)
    // sitePrice = 0 ise marketPrice fallback olarak kullanılır
    const sitePriceRaw = Number(product.sitePrice ?? 0);
    const salePrice = sitePriceRaw > 0
      ? Math.round(sitePriceRaw * 1.25)
      : Math.round(Number(product.marketPrice ?? product.shopPrice ?? 0));
    const stockQuantity = Number(product.stockQuantity ?? 0);
    if (!salePrice) return;
    // listPrice her zaman salePrice'dan büyük olmalı (platform kuralı)
    const listPrice = Math.ceil(salePrice * 1.1);

    const barcode = product.barcode ?? product.trendyolBarcode ?? undefined;
    const modelCode = product.modelCode ?? undefined;

    // Katalog stratejisi ekranından satışa kapatılan (PASSIVE) ürün, ürün kaydı
    // sırasında stokla tekrar satışa açılmasın.
    if (barcode) {
      const closed = await this.prisma.trendyolProductVariant.findFirst({ where: { barcode, status: 'PASSIVE' }, select: { id: true } });
      if (closed) return;
    }

    // Tam ürün verisini çek (pushProduct için isim+görsel gerekli)
    let productName: string | undefined;
    let images: unknown;
    let brand: string | undefined;
    let description: string | undefined;

    const trendyolVariant = barcode
      ? await this.prisma.trendyolProductVariant.findFirst({ where: { barcode }, select: { productName: true, images: true, brand: true, productDescription: true } })
      : modelCode
        ? await this.prisma.trendyolProductVariant.findFirst({ where: { currentModelCode: modelCode }, select: { productName: true, images: true, brand: true, productDescription: true } })
        : null;

    if (trendyolVariant) {
      productName = trendyolVariant.productName;
      images = trendyolVariant.images;
      brand = trendyolVariant.brand ?? undefined;
      description = trendyolVariant.productDescription ?? undefined;
    } else if (barcode || modelCode) {
      const dbProduct = await this.prisma.product.findFirst({
        where: barcode ? { barcode } : { modelCode: modelCode! },
        select: { productName: true, imageUrls: true, brand: true },
      });
      if (dbProduct) {
        productName = dbProduct.productName;
        images = dbProduct.imageUrls;
        brand = dbProduct.brand;
      }
    }

    const payload = {
      trendyolBarcode: product.trendyolBarcode ?? null,
      barcode: barcode ?? modelCode ?? '',
      modelCode: modelCode ?? barcode ?? '',
      salePrice,
      listPrice,
      stockQuantity,
      productName,
      images,
      brand,
      description,
    };

    // Cache'den bağlı platformları al (5dk TTL, DB sorgusu atmaz)
    const platforms = await this.getConnectedPlatforms();
    if (!platforms.length) return;

    await Promise.allSettled(
      platforms.map((platform) => {
        const platformPrice = calcPlatformPrice(salePrice, platform);
        const platformListPrice = platformPrice > listPrice ? Math.ceil(platformPrice * 1.1) : listPrice;
        const platformPayload = { ...payload, salePrice: platformPrice, listPrice: platformListPrice };
        return this.integrations.pushProduct(platform, platformPayload).then((result) => {
          if (!result.ok) this.logger.warn(`${platform} yayın başarısız: ${result.message}`);
          else this.logger.log(`${platform} yayın tamam: ${payload.barcode || payload.modelCode} (${salePrice}₺ → ${platformPrice}₺)`);
        });
      }),
    );
  }

  // Tek ürünün görsellerini tüm bağlı platformlara gönderir.
  async broadcastImages(productId: number): Promise<{ ok: boolean; results: Record<string, string> }> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { category: true, mediaFiles: true },
    });
    if (!product) return { ok: false, results: { error: 'Ürün bulunamadı.' } };

    const imageUrls = [
      ...(Array.isArray(product.imageUrls) ? (product.imageUrls as string[]) : []),
      ...product.mediaFiles.map((f) => f.filePath).filter(Boolean) as string[],
    ];
    if (!imageUrls.length) return { ok: false, results: { error: 'Üründe görsel yok.' } };

    const platforms = await this.getConnectedPlatforms();
    if (!platforms.length) return { ok: false, results: { error: 'Bağlı platform yok.' } };

    const payload = {
      barcode: product.barcode ?? product.modelCode ?? '',
      modelCode: product.modelCode ?? product.barcode ?? '',
      trendyolBarcode: (product as any).trendyolBarcode ?? null,
      productName: product.productName,
      description: (product as any).description ?? product.productName,
      salePrice: Number(product.marketPrice ?? product.shopPrice ?? 0),
      listPrice: Number(product.listPrice ?? product.marketPrice ?? 0),
      stockQuantity: Number(product.stockQuantity ?? 0),
      imageUrls,
      brand: product.brand ?? 'Erhan Flowers',
      categoryName: (product.category as any)?.name ?? '',
    };

    const results: Record<string, string> = {};
    await Promise.allSettled(
      platforms.map(async (platform) => {
        const res = await this.integrations.pushProduct(platform, payload);
        results[platform] = res.ok ? 'OK' : res.message;
      }),
    );
    const ok = Object.values(results).some((v) => v === 'OK');
    return { ok, results };
  }

  // Tüm aktif ürünlerin görsellerini platformlara toplu gönderir.
  async broadcastImagesAll(): Promise<{ sent: number; errors: number }> {
    const products = await this.prisma.product.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, barcode: true, modelCode: true, imageUrls: true },
    });
    let sent = 0;
    let errors = 0;
    for (const p of products) {
      const imgs = Array.isArray(p.imageUrls) ? p.imageUrls as string[] : [];
      if (!imgs.length) continue;
      const res = await this.broadcastImages(p.id).catch(() => null);
      if (res?.ok) sent++; else errors++;
      await new Promise((r) => setTimeout(r, 200));
    }
    return { sent, errors };
  }

  // Tüm aktif ürünleri tüm bağlı platformlara toplu yayınlar.
  // 10'lu batch'ler halinde paralel gönderir — batch arası 500ms bekler.
  async backfillCostDrafts(): Promise<{ checked: number; created: number; skipped: number }> {
    const products = await this.prisma.product.findMany({
      where: { barcode: { not: null }, status: 'ACTIVE' },
      select: { id: true, barcode: true, productName: true, modelCode: true, marketPrice: true, shopPrice: true, desi: true, shippingCost: true },
    });

    let created = 0;
    let skipped = 0;

    for (const product of products) {
      if (!product.barcode) { skipped++; continue; }
      try {
        const variant = await this.prisma.trendyolProductVariant.findUnique({ where: { barcode: product.barcode } });
        if (!variant) {
          const salePrice = new Prisma.Decimal(Number(product.marketPrice ?? product.shopPrice ?? 0));
          const newVariant = await this.prisma.trendyolProductVariant.create({
            data: {
              productId: product.id,
              barcode: product.barcode,
              productName: product.productName,
              currentModelCode: product.modelCode,
              proposedModelCode: product.modelCode,
              brand: 'Erhan Flowers',
              trendyolSalePrice: salePrice,
              n11SalePrice: salePrice,
              hepsiburadaSalePrice: salePrice,
              commissionPercent: new Prisma.Decimal(20),
              status: 'ACTIVE',
            },
          });
          await this.prisma.productCostDraft.create({
            data: {
              variantId: newVariant.id,
              profitMarginPercent: new Prisma.Decimal(45),
              vatPercent: new Prisma.Decimal(20),
              marketplaceMarkupPercent: new Prisma.Decimal(25),
              campaignBufferPercent: new Prisma.Decimal(10),
              shippingCost: new Prisma.Decimal(Number(product.shippingCost ?? 0)),
              desi: new Prisma.Decimal(Number(product.desi ?? 1)),
              status: 'DRAFT',
            },
          });
          created++;
        } else {
          if (!variant.productId) {
            await this.prisma.trendyolProductVariant.update({ where: { id: variant.id }, data: { productId: product.id } });
          }
          const hasDraft = await this.prisma.productCostDraft.findUnique({ where: { variantId: variant.id } });
          if (!hasDraft) {
            await this.prisma.productCostDraft.create({
              data: {
                variantId: variant.id,
                profitMarginPercent: new Prisma.Decimal(45),
                vatPercent: new Prisma.Decimal(20),
                marketplaceMarkupPercent: new Prisma.Decimal(25),
                campaignBufferPercent: new Prisma.Decimal(10),
                shippingCost: new Prisma.Decimal(Number(product.shippingCost ?? 0)),
                desi: new Prisma.Decimal(Number(product.desi ?? 1)),
                status: 'DRAFT',
              },
            });
            created++;
          } else {
            skipped++;
          }
        }
      } catch (err) {
        this.logger.warn(`Backfill hatası (${product.barcode}): ${String(err)}`);
        skipped++;
      }
    }

    this.logger.log(`Maliyet taslağı backfill: ${created} oluşturuldu, ${skipped} atlandı`);
    return { checked: products.length, created, skipped };
  }

  /** sitePrice = marketPrice × 0.80 yapar, ardından tüm platformlara fiyat yayınlar */
  async backfillSitePrice(): Promise<{ updated: number; skipped: number }> {
    const products = await this.prisma.product.findMany({
      where: { status: 'ACTIVE', marketPrice: { gt: 0 } },
      select: { id: true, barcode: true, modelCode: true, marketPrice: true, sitePrice: true, stockQuantity: true },
    });
    let updated = 0; let skipped = 0;
    const tobroadcast: typeof products = [];
    for (const p of products) {
      const market = Number(p.marketPrice);
      const site = Number(p.sitePrice);
      const target = Math.round(market * 0.80);
      // Zaten doğru hesaplanmışsa atla (±1₺ tolerans)
      if (Math.abs(site - target) <= 1) { skipped++; continue; }
      await this.prisma.product.update({ where: { id: p.id }, data: { sitePrice: target } });
      tobroadcast.push({ ...p, sitePrice: target });
      updated++;
    }
    this.logger.log(`sitePrice backfill: ${updated} güncellendi, ${skipped} atlandı`);
    // DB güncellenen ürünleri platformlara yayınla (arka planda)
    if (tobroadcast.length > 0) {
      setImmediate(async () => {
        for (const p of tobroadcast) {
          await this.broadcastPriceStock({
            barcode: p.barcode,
            modelCode: p.modelCode,
            marketPrice: Number(p.marketPrice),
            sitePrice: Number(p.sitePrice),
            stockQuantity: Number(p.stockQuantity ?? 0),
          }).catch(() => undefined);
        }
        this.logger.log(`sitePrice backfill broadcast tamamlandı: ${tobroadcast.length} ürün`);
      });
    }
    return { updated, skipped };
  }

  async bulkSetModelCodes(items: { barcode: string; modelCode: string }[]): Promise<{ updated: number; notFound: string[]; conflict: string[] }> {
    let updated = 0;
    const notFound: string[] = [];
    const conflict: string[] = [];

    for (const item of items) {
      const existing = await this.prisma.product.findFirst({ where: { modelCode: item.modelCode } });
      if (existing) {
        const byBarcode = await this.prisma.product.findFirst({ where: { barcode: item.barcode } });
        if (byBarcode && byBarcode.id === existing.id) { updated++; continue; }
        conflict.push(`${item.modelCode} → başka üründe`);
        continue;
      }
      const product = await this.prisma.product.findFirst({
        where: { OR: [{ barcode: item.barcode }, { trendyolBarcode: item.barcode }] },
      });
      if (!product) { notFound.push(item.barcode); continue; }
      await this.prisma.product.update({ where: { id: product.id }, data: { modelCode: item.modelCode } });
      updated++;
    }
    return { updated, notFound, conflict };
  }

  async broadcastAll(): Promise<{ total: number; sent: number; skipped: number; errors: number; platformErrors: number }> {
    this.invalidatePlatformCache();
    const platformNames = await this.getConnectedPlatforms();
    const connections = platformNames.map((platform) => ({ platform }));

    type Payload = {
      barcode: string; modelCode: string; salePrice: number; listPrice: number; stockQuantity: number;
      productName?: string; images?: unknown; description?: string; brand?: string;
    };
    const payloadMap = new Map<string, Payload>(); // barcode/modelCode → payload (tekrar eklemeyi önle)
    let skipped = 0;

    // 1) Trendyol varyantları — bunlar ana katalog
    const variants = await this.prisma.trendyolProductVariant.findMany({
      where: { status: 'ACTIVE' },
      include: { productCostDraft: true },
    });

    for (const v of variants) {
      const key = v.barcode ?? v.currentModelCode ?? v.supplierStockCode;
      if (!key) { skipped++; continue; }
      const draft = v.productCostDraft as any;
      const salePrice = Number(
        draft?.marketplaceSalePrice > 0
          ? draft.marketplaceSalePrice
          : draft?.salePrice ?? v.trendyolSalePrice ?? 0,
      );
      if (!salePrice) { skipped++; continue; }
      const stockQuantity = Number(v.stockQuantity ?? 0);
      const listPrice = Math.ceil(salePrice * 1.1);
      payloadMap.set(key, {
        barcode: v.barcode ?? key,
        modelCode: v.currentModelCode ?? key,
        salePrice,
        listPrice,
        stockQuantity,
        productName: v.productName,
        images: v.images,
        description: v.productDescription ?? undefined,
        brand: v.brand ?? undefined,
      });
    }

    // 2) Ürünler tablosu — Trendyol'da olmayan ürünleri de kapsa
    const products = await this.prisma.product.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, barcode: true, modelCode: true, productName: true, marketPrice: true, listPrice: true, shopPrice: true, sitePrice: true, stockQuantity: true, imageUrls: true, brand: true },
    });

    for (const product of products) {
      const key = product.barcode ?? product.modelCode;
      if (!key || payloadMap.has(key)) continue; // Trendyol varyantında varsa zaten eklendi
      const sitePriceVal = Number(product.sitePrice ?? 0);
      const salePrice = sitePriceVal > 0
        ? Math.round(sitePriceVal * 1.25)
        : Math.round(Number(product.marketPrice ?? product.shopPrice ?? 0));
      if (!salePrice) { skipped++; continue; }
      payloadMap.set(key, {
        barcode: product.barcode ?? product.modelCode ?? '',
        modelCode: product.modelCode ?? product.barcode ?? '',
        salePrice,
        listPrice: Math.ceil(salePrice * 1.1),
        stockQuantity: Number(product.stockQuantity ?? 0),
        productName: product.productName ?? undefined,
        images: product.imageUrls ?? undefined,
        brand: product.brand ?? undefined,
      });
    }

    const payloads = Array.from(payloadMap.values());
    const total = payloads.length + skipped;

    if (connections.length === 0) return { total, sent: 0, skipped: total, errors: 0, platformErrors: 0 };

    let sent = 0; let errors = 0; let platformErrors = 0;
    const BATCH = 10;

    for (let i = 0; i < payloads.length; i += BATCH) {
      const batch = payloads.slice(i, i + BATCH);
      const batchResults = await Promise.allSettled(
        batch.flatMap((payload) =>
          connections.map(({ platform }) => {
            const platformPrice = calcPlatformPrice(payload.salePrice, platform);
            const platformListPrice = platformPrice > payload.listPrice ? Math.ceil(platformPrice * 1.1) : payload.listPrice;
            return this.integrations.pushProduct(platform, { ...payload, salePrice: platformPrice, listPrice: platformListPrice });
          }),
        ),
      );

      for (let j = 0; j < batch.length; j++) {
        const platformResults = batchResults.slice(j * connections.length, (j + 1) * connections.length);
        const anyOk = platformResults.some((r) => r.status === 'fulfilled' && r.value.ok);
        const failCount = platformResults.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok)).length;
        if (anyOk) sent++;
        else errors++;
        platformErrors += failCount;
      }

      if (i + BATCH < payloads.length) await new Promise((res) => setTimeout(res, 500));
    }

    return { total, sent, skipped, errors, platformErrors };
  }

  async syncFromTrendyol(): Promise<{ updated: number; notFound: number; total: number; error?: string }> {
    let trendyolProducts: Array<Record<string, unknown>>;
    try {
      trendyolProducts = await this.integrations.fetchTrendyolProducts();
    } catch (err: unknown) {
      return { updated: 0, notFound: 0, total: 0, error: err instanceof Error ? err.message : String(err) };
    }
    let updated = 0;
    let notFound = 0;

    for (const tp of trendyolProducts) {
      const barcode = String(tp.barcode ?? tp.stockCode ?? '');
      const name = String(tp.title ?? tp.productName ?? tp.name ?? '');
      const rawImages = Array.isArray(tp.images) ? tp.images as Record<string, unknown>[] : [];
      const imageUrls = rawImages.map((img) => String(img.url ?? img)).filter(Boolean);

      if (!barcode || !name) continue;

      // ERP'de barkodla eşleşen varyantı bul
      const variant = await this.prisma.trendyolProductVariant.findFirst({
        where: { barcode },
        select: { id: true, productId: true },
      });

      if (!variant) {
        // modelCode ile de dene
        const variantByModel = await this.prisma.trendyolProductVariant.findFirst({
          where: { currentModelCode: barcode },
          select: { id: true, productId: true },
        });
        if (!variantByModel) { notFound++; continue; }
        await this.applyTrendyolSync(variantByModel.id, variantByModel.productId, name, imageUrls);
      } else {
        await this.applyTrendyolSync(variant.id, variant.productId, name, imageUrls);
      }
      updated++;
    }

    return { updated, notFound, total: trendyolProducts.length };
  }

  private async applyTrendyolSync(variantId: number, productId: number | null, name: string, imageUrls: string[]) {
    if (imageUrls.length > 0) {
      await this.prisma.trendyolProductVariant.update({
        where: { id: variantId },
        data: { productName: name, images: imageUrls },
      });
    } else {
      await this.prisma.trendyolProductVariant.update({
        where: { id: variantId },
        data: { productName: name },
      });
    }
    if (productId && imageUrls.length > 0) {
      await this.prisma.product.update({
        where: { id: productId },
        data: { productName: name, imageUrls },
      });
    } else if (productId) {
      await this.prisma.product.update({
        where: { id: productId },
        data: { productName: name },
      });
    }
    // Değişen ürünü diğer platformlara yay
    if (productId) {
      this.broadcastImages(productId).catch(() => null);
    }
  }

  passive(id: number) {
    return this.prisma.product.update({
      where: { id },
      data: { status: 'PASSIVE' },
    });
  }

  async generateBarcode(payload: unknown) {
    const data = this.normalizeBarcodePayload(payload);
    if (!data.categoryId) throw new BadRequestException('Barkod icin kategori secilmelidir.');

    const category = await this.prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) throw new BadRequestException('Kategori bulunamadi.');

    const companyCode = this.eanCompanyCode(category.codePrefix || category.name);
    const serialLength = 12 - 3 - companyCode.length;
    const highestSerial = await this.highestEanSerial(companyCode, serialLength);
    let nextSerial = highestSerial + 1;

    for (let attempt = 0; attempt < 10000; attempt += 1) {
      const serial = String(nextSerial).padStart(serialLength, '0').slice(-serialLength);
      const barcode = this.ean13(`869${companyCode}${serial}`);
      if (await this.isBarcodeUnique(barcode)) return { barcode };
      nextSerial += 1;
    }

    throw new BadRequestException('Benzersiz barkod uretilemedi. Lutfen tekrar deneyin.');
  }

  async checkIdentity(payload: unknown) {
    const data = this.normalizeIdentityCheckPayload(payload);
    const [isBarcodeUnique, isModelCodeUnique] = await Promise.all([
      data.barcode ? this.isBarcodeUnique(data.barcode, data.excludeProductId) : Promise.resolve(true),
      data.modelCode ? this.isModelCodeUnique(data.modelCode, data.excludeProductId) : Promise.resolve(true),
    ]);

    return {
      isBarcodeUnique,
      isModelCodeUnique,
      modelCodeMessage: isModelCodeUnique ? null : 'Bu Model Kodu mevcut bir urunde tanimli!',
      barcodeMessage: isBarcodeUnique ? null : 'Bu Barkod mevcut urun, stok veya varyant kayitlarinda tanimli!',
    };
  }

  private normalize(payload: unknown): ProductPayload {
    const body = (payload ?? {}) as Record<string, unknown>;
    const categoryId = Number(body.categoryId ?? body.category_id);

    return {
      productName: String(body.productName ?? body.product_name ?? '').trim(),
      modelCode: String(body.modelCode ?? body.model_code ?? '').trim().toUpperCase(),
      barcode: this.text(body.barcode),
      categoryId: Number.isFinite(categoryId) ? categoryId : undefined,
      stockQuantity: this.toInt(body.stockQuantity ?? body.stock_quantity, 0),
      criticalStockLevel: this.toInt(body.criticalStockLevel ?? body.critical_stock_level, 0),
      costPrice: this.toNumber(body.costPrice ?? body.cost_price, 0),
      desi: this.toNumber(body.desi, 1),
      shippingCost: this.toNumber(body.shippingCost ?? body.shipping_cost, 5),
      shopPrice: this.toNumber(body.shopPrice ?? body.shop_price, 0),
      sitePrice: this.toNumber(body.sitePrice ?? body.site_price, 0),
      marketPrice: this.toNumber(body.marketPrice ?? body.market_price, 0),
      listPrice: this.toNumber(body.listPrice ?? body.list_price, 0),
      imageUrls: this.stringArray(body.imageUrls ?? body.image_urls),
      brand: this.text(body.brand) ?? 'Erhan Flowers',
      vatRate: this.toInt(body.vatRate ?? body.vat_rate, 20),
      origin: this.text(body.origin) ?? 'Türkiye',
      colorVariant: this.text(body.colorVariant ?? body.color_variant),
      material: this.text(body.material),
      packageDimensions: this.text(body.packageDimensions ?? body.package_dimensions),
      warrantyMonths: this.toInt(body.warrantyMonths ?? body.warranty_months, 0),
      warrantyType: this.text(body.warrantyType ?? body.warranty_type),
      productHeight: this.text(body.productHeight ?? body.product_height),
      potType: this.text(body.potType ?? body.pot_type),
      potSize: this.text(body.potSize ?? body.pot_size),
      stemCount: body.stemCount != null || body.stem_count != null ? this.toInt(body.stemCount ?? body.stem_count, 0) || undefined : undefined,
      branchCount: body.branchCount != null || body.branch_count != null ? this.toInt(body.branchCount ?? body.branch_count, 0) || undefined : undefined,
      leavesPerBranch: body.leavesPerBranch != null || body.leaves_per_branch != null ? this.toInt(body.leavesPerBranch ?? body.leaves_per_branch, 0) || undefined : undefined,
      leafCount: body.leafCount != null || body.leaf_count != null ? this.toInt(body.leafCount ?? body.leaf_count, 0) || undefined : undefined,
      status: body.status === 'PASSIVE' ? 'PASSIVE' : 'ACTIVE',
      description: body.description ? String(body.description) : undefined,
    };
  }

  private normalizeBarcodePayload(payload: unknown): BarcodePayload {
    const body = (payload ?? {}) as Record<string, unknown>;
    const categoryId = Number(body.categoryId ?? body.category_id);
    return {
      categoryId: Number.isFinite(categoryId) ? categoryId : undefined,
      modelCode: this.text(body.modelCode ?? body.model_code),
      productName: this.text(body.productName ?? body.product_name),
      potSize: this.text(body.potSize ?? body.pot_size),
    };
  }

  private normalizeIdentityCheckPayload(payload: unknown): IdentityCheckPayload {
    const body = (payload ?? {}) as Record<string, unknown>;
    const excludeProductId = Number(body.excludeProductId ?? body.exclude_product_id);
    return {
      modelCode: this.text(body.modelCode ?? body.model_code)?.toUpperCase(),
      barcode: this.text(body.barcode),
      excludeProductId: Number.isFinite(excludeProductId) && excludeProductId > 0 ? excludeProductId : undefined,
    };
  }

  private toInt(value: unknown, fallback: number) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private toNumber(value: unknown, fallback: number) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private text(value: unknown) {
    const normalized = String(value ?? '').trim();
    return normalized || undefined;
  }

  private stringArray(value: unknown) {
    if (!Array.isArray(value)) return [];
    return value.map((item) => String(item ?? '').trim()).filter(Boolean);
  }

  private barcodePart(value: string, maxLength: number) {
    const normalized = value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/ı/g, 'i')
      .replace(/İ/g, 'I')
      .replace(/ğ/g, 'g')
      .replace(/Ğ/g, 'G')
      .replace(/ü/g, 'u')
      .replace(/Ü/g, 'U')
      .replace(/ş/g, 's')
      .replace(/Ş/g, 'S')
      .replace(/ö/g, 'o')
      .replace(/Ö/g, 'O')
      .replace(/ç/g, 'c')
      .replace(/Ç/g, 'C')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    return (normalized || 'URUN').slice(0, maxLength);
  }

  private async ensureUniqueBarcode(barcode?: string, excludeProductId?: number) {
    if (!barcode) return;
    const existingProduct = await this.prisma.product.findFirst({
      where: {
        barcode,
        ...(excludeProductId ? { id: { not: excludeProductId } } : {}),
      },
      select: { id: true },
    });
    if (existingProduct) throw new BadRequestException('Barkod zaten baska bir urunde kullaniliyor.');

  }

  private async barcodeExists(barcode: string) {
    const [product, stockCard] = await Promise.all([
      this.prisma.product.findFirst({ where: { barcode }, select: { id: true } }),
      this.prisma.stockCard.findFirst({ where: { barcode }, select: { id: true } }),
    ]);
    return Boolean(product || stockCard);
  }

  private normalizeCodeText(value: string) {
    return value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
  }

  private eanCompanyCode(value: string) {
    const configured = this.digitsOnly(process.env.EAN_COMPANY_CODE || process.env.ERHAN_EAN_COMPANY_CODE || '');
    if (configured.length > 0) return configured.slice(0, 6);

    const digits = this.digitsOnly(this.normalizeCodeText(value));
    return (digits || '0001').slice(0, 6).padStart(4, '0');
  }

  private ean13(base12: string) {
    if (!/^\d{12}$/.test(base12)) {
      throw new BadRequestException('EAN-13 barkod tabani 12 haneli olmalidir.');
    }

    const sum = base12
      .split('')
      .reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
    const checksum = (10 - (sum % 10)) % 10;
    return `${base12}${checksum}`;
  }

  private digitsOnly(value: string) {
    return String(value ?? '').replace(/\D/g, '');
  }

  private async ensureUniqueProductIdentity(data: ProductPayload, excludeProductId?: number) {
    const [isBarcodeUnique, isModelCodeUnique] = await Promise.all([
      this.isBarcodeUnique(data.barcode, excludeProductId),
      this.isModelCodeUnique(data.modelCode, excludeProductId),
    ]);

    if (!isModelCodeUnique) {
      throw new BadRequestException('Bu Model Kodu mevcut bir urunde tanimli!');
    }
    if (!isBarcodeUnique) {
      throw new BadRequestException('Barkod mevcut urun, stok veya varyant kayitlarinda kullaniliyor.');
    }
  }

  private async isBarcodeUnique(barcode?: string, excludeProductId?: number) {
    if (!barcode) return true;
    const [product, stockCard, variant, log] = await Promise.all([
      this.prisma.product.findFirst({
        where: {
          barcode,
          ...(excludeProductId ? { id: { not: excludeProductId } } : {}),
        },
        select: { id: true },
      }),
      this.prisma.stockCard.findFirst({ where: { barcode }, select: { id: true } }),
      this.prisma.trendyolProductVariant.findFirst({ where: { barcode }, select: { id: true } }),
      this.prisma.barcodeLog.findFirst({ where: { barcode }, select: { id: true } }),
    ]);
    return !product && !stockCard && !variant && !log;
  }

  private async isModelCodeUnique(modelCode?: string, excludeProductId?: number) {
    if (!modelCode) return true;
    const code = modelCode.trim().toUpperCase();
    const [product, stockCard, variant] = await Promise.all([
      this.prisma.product.findFirst({
        where: {
          modelCode: code,
          ...(excludeProductId ? { id: { not: excludeProductId } } : {}),
        },
        select: { id: true },
      }),
      this.prisma.stockCard.findFirst({
        where: {
          OR: [
            { sku: { equals: code, mode: 'insensitive' } },
            { model: { equals: code, mode: 'insensitive' } },
            { oldModelCode: { equals: code, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      }),
      this.prisma.trendyolProductVariant.findFirst({
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

  private async highestEanSerial(companyCode: string, serialLength: number) {
    const prefix = `869${companyCode}`;
    const allBarcodeRows = await Promise.all([
      this.prisma.product.findMany({ where: { barcode: { startsWith: prefix } }, select: { barcode: true } }),
      this.prisma.stockCard.findMany({ where: { barcode: { startsWith: prefix } }, select: { barcode: true } }),
      this.prisma.trendyolProductVariant.findMany({ where: { barcode: { startsWith: prefix } }, select: { barcode: true } }),
      this.prisma.barcodeLog.findMany({ where: { barcode: { startsWith: prefix } }, select: { barcode: true } }),
    ]);

    return allBarcodeRows.flat().reduce((highest, item) => {
      const barcode = item.barcode;
      if (!barcode || !/^\d{13}$/.test(barcode) || !barcode.startsWith(prefix)) return highest;
      const serial = Number(barcode.slice(prefix.length, prefix.length + serialLength));
      return Number.isFinite(serial) ? Math.max(highest, serial) : highest;
    }, 0);
  }

  private withPublishingStatus(product: Record<string, any>) {
    const imageUrls = Array.isArray(product.imageUrls) ? product.imageUrls : [];
    const mediaUrls = Array.isArray(product.mediaFiles)
      ? product.mediaFiles.map((file: { filePath?: string | null }) => file.filePath).filter(Boolean)
      : [];
    const allImages = [...imageUrls, ...mediaUrls];
    const commonMissing = this.missingFields(product, [
      ['productName', 'Ürün adı'],
      ['modelCode', 'Model kodu'],
      ['barcode', 'Barkod'],
      ['brand', 'Marka'],
      ['description', 'Açıklama'],
      ['vatRate', 'KDV'],
      ['origin', 'Menşei'],
      ['colorVariant', 'Renk / Çeşit'],
      ['material', 'Materyal'],
      ['packageDimensions', 'Paket ölçüleri'],
    ]);
    if (allImages.length === 0) commonMissing.push('Ürün görseli');

    const marketplaceMissing = [...commonMissing];
    if (!product.warrantyMonths) marketplaceMissing.push('Garanti süresi');
    if (!product.warrantyType) marketplaceMissing.push('Garanti tipi');

    return cleanMojibakeDeep({
      ...product,
      imageUrls,
      publishingStatus: {
        trendyol: { ready: marketplaceMissing.length === 0, missingFields: marketplaceMissing },
        hepsiburada: { ready: marketplaceMissing.length === 0, missingFields: marketplaceMissing },
        ciceksepeti: { ready: commonMissing.length === 0, missingFields: commonMissing },
        ticimax: { ready: commonMissing.length === 0, missingFields: commonMissing },
      },
    });
  }

  private missingFields(product: Record<string, any>, fields: Array<[string, string]>) {
    return fields
      .filter(([key]) => {
        const value = product[key];
        return value === null || value === undefined || String(value).trim() === '';
      })
      .map(([, label]) => label);
  }

  private handleUniqueError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new BadRequestException('Model kodu veya barkod zaten kullanılıyor.');
    }
    throw error;
  }

  async getVariantsWithoutDriveFolder() {
    return this.prisma.trendyolProductVariant.findMany({
      where: { status: 'ACTIVE', driveFolderId: null },
      select: {
        id: true,
        productName: true,
        currentModelCode: true,
        proposedModelCode: true,
        barcode: true,
        images: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
  }

  async setDriveFolderId(variantId: number, folderId: string) {
    return this.prisma.trendyolProductVariant.update({
      where: { id: variantId },
      data: { driveFolderId: folderId },
      select: { id: true, driveFolderId: true },
    });
  }

  async sendToPazarama(): Promise<{ total: number; sent: number; errors: number; details: Record<string, string> }> {
    const products = await (this.prisma.product as any).findMany({
      where: { status: 'ACTIVE' },
      include: { category: true, mediaFiles: true, productCostDraft: true },
    }) as any[];

    let sent = 0;
    let errors = 0;
    const details: Record<string, string> = {};
    const BATCH = 5;

    for (let i = 0; i < products.length; i += BATCH) {
      const batch = products.slice(i, i + BATCH);
      await Promise.allSettled(
        batch.map(async (product: any) => {
          const key = product.barcode ?? product.modelCode;
          const imageUrls = [
            ...(Array.isArray(product.imageUrls) ? (product.imageUrls as string[]) : []),
            ...((product.mediaFiles ?? []) as any[]).map((f: any) => f.filePath).filter(Boolean),
          ];
          const draft = product.productCostDraft;
          const salePrice = Number(
            draft?.marketplaceSalePrice > 0 ? draft.marketplaceSalePrice
            : draft?.salePrice ?? product.marketPrice ?? product.shopPrice ?? 0,
          );
          const platformPrice = calcPlatformPrice(salePrice, 'PAZARAMA');
          const rawListPrice = Number(product.listPrice ?? salePrice);
          const payload = {
            barcode: product.barcode ?? product.modelCode,
            modelCode: product.modelCode,
            productName: product.productName,
            description: product.productName,
            salePrice: platformPrice,
            listPrice: platformPrice > rawListPrice ? Math.ceil(platformPrice * 1.1) : rawListPrice,
            stockQuantity: Number(product.stockQuantity ?? 0),
            imageUrls,
            brand: product.brand ?? 'Erhan Flowers',
            categoryName: product.category?.name ?? '',
          };
          try {
            const res = await this.integrations.pushProduct('PAZARAMA', payload);
            if (res.ok) { sent++; details[key] = 'OK'; }
            else { errors++; details[key] = res.message; }
          } catch (err: unknown) {
            errors++;
            details[key] = err instanceof Error ? err.message : String(err);
          }
        }),
      );
      await new Promise((r) => setTimeout(r, 300));
    }

    return { total: products.length, sent, errors, details };
  }

  /** Trendyol Excel'inden fiyat aktarımı: sitePrice = trendyolFiyatı × 0.80, marketPrice = trendyolFiyatı */
  async importPricesFromExcel(buffer: Buffer): Promise<{ updated: number; skipped: number; notFound: number; errors: string[] }> {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(ws);

    let updated = 0, skipped = 0, notFound = 0;
    const errors: string[] = [];

    for (const row of rows) {
      const barcode = row['Barkod'] ? String(row['Barkod']).trim() : null;
      const modelCode = row['Model Kodu'] ? String(row['Model Kodu']).trim() : null;
      const rawPrice = row['Trendyolda Satılacak Fiyat (KDV Dahil)'] ?? row['Piyasa Satış Fiyatı (KDV Dahil)'];
      const trendyolPrice = rawPrice ? Math.round(Number(String(rawPrice).replace(',', '.'))) : 0;

      if (!trendyolPrice || trendyolPrice <= 0) { skipped++; continue; }
      if (!barcode && !modelCode) { skipped++; continue; }

      try {
        const where = barcode
          ? { barcode }
          : { modelCode: modelCode! };

        const product = await this.prisma.product.findFirst({ where, select: { id: true } });
        if (!product) {
          // barcode ile bulunamazsa modelCode ile dene
          const byModel = modelCode ? await this.prisma.product.findFirst({ where: { modelCode }, select: { id: true } }) : null;
          if (!byModel) { notFound++; continue; }
          await this.prisma.product.update({
            where: { id: byModel.id },
            data: { marketPrice: trendyolPrice, sitePrice: Math.round(trendyolPrice * 0.80) },
          });
        } else {
          await this.prisma.product.update({
            where: { id: product.id },
            data: { marketPrice: trendyolPrice, sitePrice: Math.round(trendyolPrice * 0.80) },
          });
        }
        updated++;
      } catch (err) {
        errors.push(`${barcode ?? modelCode}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    this.logger.log(`Excel fiyat aktarımı: ${updated} güncellendi, ${skipped} atlandı, ${notFound} bulunamadı`);
    return { updated, skipped, notFound, errors };
  }

  /** Trendyol Excel'ini otomatik kategorilere ayırarak ERP'ye aktarır */
  async importTrendyolExcel(buffer: Buffer): Promise<{ created: number; updated: number; skipped: number; errors: string[] }> {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(ws);

    // ERP kategori adı → otomatik atama kuralları
    const RULES: Array<{ erpCat: string; keywords: string[] }> = [
      { erpCat: 'Bambu',           keywords: ['bambu'] },
      { erpCat: 'Aranjman',        keywords: ['aranjman', 'arajman'] },
      { erpCat: 'Demet Çiçek',     keywords: ['demet', 'buket'] },
      { erpCat: 'Yapay Sarmaşık',  keywords: ['sarmaşık', 'sarmasik', 'sarkan', 'sarkıt', 'asılı'] },
      { erpCat: 'Dikey Bahçe',     keywords: ['dikey', 'panel', 'yosun', 'moss'] },
      { erpCat: 'Yapay Bitki',     keywords: ['kaladyum', 'caladium', 'difenbahya', 'areka', 'sukulent', 'kaktü', 'lavanta', 'papatya', 'gerbera', 'lale', 'orkide', 'saksılı', 'saksida', 'mini', 'bitki', 'çiçeği', 'çiçegi'] },
      { erpCat: 'Yapay Ağaç',      keywords: ['ağaç', 'agac', 'benjamin', 'söğüt', 'sogut', 'palmiye', 'zeytin', 'bonsai', 'bonzai', 'ficus', 'schefflera', 'yuka', 'yucca', 'kauçuk', 'kafur', 'dracaena', 'limon'] },
      { erpCat: 'Saksı & Vazo',    keywords: ['saksı', 'saksi', 'vazo'] },
    ];

    function guessCat(name: string): string {
      const n = name.toLocaleLowerCase('tr-TR');
      for (const r of RULES) {
        if (r.keywords.some(k => n.includes(k))) return r.erpCat;
      }
      return 'Yapay Bitki';
    }

    const allCats = await this.prisma.category.findMany({ select: { id: true, name: true } });
    const catMap = new Map(allCats.map(c => [c.name.toLocaleLowerCase('tr-TR'), c.id]));

    let created = 0, updated = 0, skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const productName = String(row['Ürün Adı'] ?? '').trim();
      const barcode = String(row['Barkod'] ?? '').trim() || null;
      const modelCode = String(row['Model Kodu'] ?? row['Tedarikçi Stok Kodu'] ?? '').trim() || null;
      const rawPrice = row['Trendyolda Satılacak Fiyat (KDV Dahil)'] ?? row['Piyasa Satış Fiyatı (KDV Dahil)'] ?? 0;
      const trendyolPrice = Math.round(Number(String(rawPrice).replace(',', '.')) || 0);
      const stock = Math.round(Number(row['Ürün Stok Adedi'] ?? 0) || 0);

      if (!productName && !barcode) { skipped++; continue; }

      const catName = guessCat(productName);
      const categoryId = catMap.get(catName.toLocaleLowerCase('tr-TR'));
      if (!categoryId) { errors.push(`Kategori bulunamadı: ${catName} (satır ${i + 1})`); skipped++; continue; }

      try {
        const existing = barcode
          ? await this.prisma.product.findFirst({ where: { barcode }, select: { id: true } })
          : modelCode
          ? await this.prisma.product.findFirst({ where: { modelCode }, select: { id: true } })
          : null;

        const data = {
          categoryId,
          ...(trendyolPrice > 0 && { marketPrice: trendyolPrice, sitePrice: Math.round(trendyolPrice * 0.80) }),
          stockQuantity: stock,
        };

        if (existing) {
          await this.prisma.product.update({ where: { id: existing.id }, data });
          updated++;
        } else {
          await this.prisma.product.create({
            data: {
              productName: productName || (barcode ?? modelCode ?? `Ürün-${i}`),
              ...(barcode && { barcode }),
              modelCode: modelCode || barcode || `URUN-${i}`,
              categoryId,
              marketPrice: trendyolPrice,
              sitePrice: Math.round(trendyolPrice * 0.80),
              stockQuantity: stock,
              status: 'ACTIVE',
            },
          });
          created++;
        }
      } catch (err) {
        errors.push(`Satır ${i + 1} (${productName.slice(0, 30)}): ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    this.logger.log(`Trendyol Excel aktarımı: ${created} yeni, ${updated} güncellendi, ${skipped} atlandı`);
    return { created, updated, skipped, errors };
  }

  /** Excel'i parse edip önizleme için satırları döndürür — kaydetmez */
  async parseExcelPreview(buffer: Buffer): Promise<{ rows: Array<{ rowIndex: number; productName: string; barcode: string; modelCode: string; price: number; stock: number; imageUrl: string }> }> {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<Record<string, string | number>>(ws);

    const rows = raw.slice(0, 500).map((row, i) => {
      const productName = String(row['Ürün Adı'] ?? row['Urun Adi'] ?? row['productName'] ?? row['Product Name'] ?? '').trim();
      const barcode = String(row['Barkod'] ?? row['Barcode'] ?? row['barcode'] ?? '').trim();
      const modelCode = String(row['Model Kodu'] ?? row['Model No'] ?? row['modelCode'] ?? '').trim();
      const rawPrice = row['Trendyolda Satılacak Fiyat (KDV Dahil)'] ?? row['Satış Fiyatı'] ?? row['Fiyat'] ?? row['Price'] ?? row['salePrice'] ?? 0;
      const price = Math.round(Number(String(rawPrice).replace(',', '.')) || 0);
      const stock = Math.round(Number(row['Stok'] ?? row['Miktar'] ?? row['Stock'] ?? row['stockQuantity'] ?? 0) || 0);
      const imageUrl = String(row['Görsel'] ?? row['Image'] ?? row['Resim'] ?? row['imageUrl'] ?? '').trim();
      return { rowIndex: i, productName, barcode, modelCode, price, stock, imageUrl };
    }).filter(r => r.productName || r.barcode || r.modelCode);

    return { rows };
  }

  /** Excel satırlarını kategori atamasıyla ERP'ye aktarır */
  async importFromExcelWithCategories(
    buffer: Buffer,
    assignments: Array<{ rowIndex: number; categoryId: number }>,
  ): Promise<{ created: number; updated: number; skipped: number; errors: string[] }> {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<Record<string, string | number>>(ws);

    const assignMap = new Map(assignments.map(a => [a.rowIndex, a.categoryId]));
    let created = 0, updated = 0, skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < raw.length && i < 500; i++) {
      const row = raw[i];
      const categoryId = assignMap.get(i);
      if (!categoryId) { skipped++; continue; }

      const productName = String(row['Ürün Adı'] ?? row['Urun Adi'] ?? row['productName'] ?? row['Product Name'] ?? '').trim();
      const barcode = String(row['Barkod'] ?? row['Barcode'] ?? row['barcode'] ?? '').trim() || null;
      const modelCode = String(row['Model Kodu'] ?? row['Model No'] ?? row['modelCode'] ?? '').trim() || null;
      const rawPrice = row['Trendyolda Satılacak Fiyat (KDV Dahil)'] ?? row['Satış Fiyatı'] ?? row['Fiyat'] ?? row['Price'] ?? row['salePrice'] ?? 0;
      const price = Math.round(Number(String(rawPrice).replace(',', '.')) || 0);
      const stock = Math.round(Number(row['Stok'] ?? row['Miktar'] ?? row['Stock'] ?? row['stockQuantity'] ?? 0) || 0);

      if (!productName && !barcode && !modelCode) { skipped++; continue; }

      try {
        const existing = barcode
          ? await this.prisma.product.findFirst({ where: { barcode }, select: { id: true } })
          : modelCode
          ? await this.prisma.product.findFirst({ where: { modelCode }, select: { id: true } })
          : null;

        const data: Record<string, unknown> = {
          categoryId,
          ...(productName && { productName }),
          ...(barcode && { barcode }),
          ...(modelCode && { modelCode }),
          ...(price > 0 && { marketPrice: price, sitePrice: Math.round(price * 0.80) }),
          ...(stock > 0 && { stockQuantity: stock }),
        };

        if (existing) {
          await this.prisma.product.update({ where: { id: existing.id }, data });
          updated++;
        } else {
          await this.prisma.product.create({
            data: {
              productName: productName || (barcode ?? modelCode ?? `Ürün-${i}`),
              ...(barcode && { barcode }),
              modelCode: modelCode || barcode || `URUN-${i}`,
              categoryId,
              marketPrice: price,
              sitePrice: Math.round(price * 0.80),
              stockQuantity: stock,
              status: 'ACTIVE',
            },
          });
          created++;
        }
      } catch (err) {
        errors.push(`Satır ${i + 1}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    this.logger.log(`Excel kategori aktarımı: ${created} yeni, ${updated} güncellendi, ${skipped} atlandı`);
    return { created, updated, skipped, errors };
  }

  async exportExcel(platform: string): Promise<Buffer> {
    const products = await this.prisma.product.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        productName: true,
        modelCode: true,
        barcode: true,
        trendyolBarcode: true,
        stockQuantity: true,
        marketPrice: true,
        shopPrice: true,
        sitePrice: true,
        brand: true,
        colorVariant: true,
        desi: true,
        vatRate: true,
        description: true,
        imageUrls: true,
        category: { select: { name: true } },
        productCenterVariant: {
          select: {
            trendyolSalePrice: true,
            n11SalePrice: true,
            hepsiburadaSalePrice: true,
            status: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    const p = platform.toUpperCase();
    let rows: Record<string, string | number>[] = [];

    for (const product of products) {
      const sku = product.barcode ?? product.modelCode;
      const variant = product.productCenterVariant;
      const variantActive = variant?.status === 'ACTIVE';

      // Platform fiyatı = sitePrice × 1.25 (kendi sitemiz baz fiyat, tüm platformlar eşit)
      const sitePriceVal = Number(product.sitePrice ?? 0);
      const price = sitePriceVal > 0
        ? Math.round(sitePriceVal * 1.25)
        : Math.round(Number(product.marketPrice || product.shopPrice || 0));

      if (price <= 0) continue;

      const stock = product.stockQuantity ?? 0;
      const imageList = Array.isArray(product.imageUrls) ? (product.imageUrls as string[]) : [];

      if (p === 'TRENDYOL') {
        const barcode = product.trendyolBarcode ?? product.barcode ?? product.modelCode;
        rows.push({
          'Barkod': barcode ?? '',
          'Miktar': stock,
          'Satış Fiyatı': price,
          'Piyasa Fiyatı': Math.round(price * 1.1),
        });
      } else if (p === 'N11') {
        rows.push({
          'Ürün Kodu': product.modelCode ?? '',
          'Barkod': product.barcode ?? '',
          'Ürün Adı': product.productName ?? '',
          'Marka': product.brand ?? 'Erhan Flowers',
          'Kategori': product.category?.name ?? '',
          'Fiyat': price,
          'Stok': stock,
          'Kargo Süresi': 1,
          'Görsel 1': imageList[0] ?? '',
          'Görsel 2': imageList[1] ?? '',
        });
      } else if (p === 'HEPSIBURADA' || p === 'HB') {
        rows.push({
          'Satıcı Stok Kodu': sku ?? '',
          'Fiyat': price,
          'Stok': stock,
        });
      } else if (p === 'PAZARAMA') {
        rows.push({
          'stockCode': sku ?? '',
          'price': price,
          'quantity': stock,
          'imageUrl': imageList[0] ?? '',
          'title': product.productName ?? '',
          'brand': product.brand ?? 'Erhan Flowers',
          'category': product.category?.name ?? '',
        });
      } else if (p === 'IDEAFIX') {
        rows.push({
          'Ürün Kodu': product.modelCode ?? '',
          'Barkod': product.barcode ?? '',
          'Ürün Adı': product.productName ?? '',
          'Marka': product.brand ?? 'Erhan Flowers',
          'Fiyat': price,
          'Stok': stock,
          'KDV': product.vatRate ?? 20,
          'Görsel': imageList[0] ?? '',
        });
      } else {
        // Genel — tüm alanlar
        rows.push({
          'Model Kodu': product.modelCode ?? '',
          'Barkod': product.barcode ?? '',
          'Ürün Adı': product.productName ?? '',
          'Marka': product.brand ?? '',
          'Kategori': product.category?.name ?? '',
          'Fiyat': price,
          'Stok': stock,
          'Desi': product.desi ?? 1,
          'Renk': product.colorVariant ?? '',
          'Görsel': imageList[0] ?? '',
        });
      }
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, platform.toUpperCase());
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  async exportExcelByCategory(): Promise<Buffer> {
    const SITE_CATEGORIES: { label: string; erpNames: string[] }[] = [
      { label: 'Yapay Agaclar',   erpNames: ['Yapay Ağaç', 'Zeytin Ağacı', 'Bonsai'] },
      { label: 'Demet Cicekler',  erpNames: ['Demet Çiçek', 'Aranjman', 'Buket'] },
      { label: 'Bambular',        erpNames: ['Bambu'] },
      { label: 'Yapay Bitkiler',  erpNames: ['Yapay Bitki', 'Mini Saksili Bitki'] },
      { label: 'Yapay Sarmasiklar', erpNames: ['Yapay Sarmaşık'] },
      { label: 'Dikey Bahce',     erpNames: ['Dikey Bahçe'] },
      { label: 'Saksilar',        erpNames: ['Saksı & Vazo', 'Mini Saksılı Bitki'] },
      { label: 'Diger',           erpNames: [] },
    ];

    const products = await this.prisma.product.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        productName: true,
        modelCode: true,
        barcode: true,
        trendyolBarcode: true,
        stockQuantity: true,
        marketPrice: true,
        shopPrice: true,
        sitePrice: true,
        brand: true,
        colorVariant: true,
        desi: true,
        vatRate: true,
        imageUrls: true,
        category: { select: { name: true } },
        productCenterVariant: { select: { trendyolSalePrice: true, n11SalePrice: true, hepsiburadaSalePrice: true, status: true } },
      },
      orderBy: { productName: 'asc' },
    });

    const toRow = (product: (typeof products)[0]) => {
      const sitePriceVal = Number(product.sitePrice ?? 0);
      const price = sitePriceVal > 0
        ? Math.round(sitePriceVal * 1.25)
        : Math.round(Number(product.marketPrice || product.shopPrice || 0));
      const imageList = Array.isArray(product.imageUrls) ? (product.imageUrls as string[]) : [];
      return {
        'Model Kodu': product.modelCode ?? '',
        'Barkod': product.barcode ?? '',
        'Ürün Adı': product.productName ?? '',
        'Marka': product.brand ?? '',
        'ERP Kategorisi': product.category?.name ?? '',
        'Fiyat (TL)': price,
        'Stok': product.stockQuantity ?? 0,
        'Desi': product.desi ?? 1,
        'Renk': product.colorVariant ?? '',
        'Görsel': imageList[0] ?? '',
      };
    };

    const wb = XLSX.utils.book_new();
    const assignedIds = new Set<number>();

    for (const cat of SITE_CATEGORIES) {
      if (cat.erpNames.length === 0) continue;
      const lower = cat.erpNames.map((n) => n.toLocaleLowerCase('tr-TR'));
      const catProducts = products.filter((p) => {
        const catName = (p.category?.name ?? '').toLocaleLowerCase('tr-TR');
        return lower.some((n) => catName === n);
      });
      catProducts.forEach((p) => assignedIds.add(p.id));
      const rows = catProducts.map(toRow);
      const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
      XLSX.utils.book_append_sheet(wb, ws, cat.label);
    }

    // Diğer: hiçbir kategoriye girmeyen ürünler
    const digerProducts = products.filter((p) => !assignedIds.has(p.id));
    const digerWs = XLSX.utils.json_to_sheet(digerProducts.length ? digerProducts.map(toRow) : [{}]);
    XLSX.utils.book_append_sheet(wb, digerWs, 'Diger');

    // Tüm ürünler özet sheet
    const allRows = products.map(toRow);
    const allWs = XLSX.utils.json_to_sheet(allRows.length ? allRows : [{}]);
    XLSX.utils.book_append_sheet(wb, allWs, 'Tum Urunler');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
}
