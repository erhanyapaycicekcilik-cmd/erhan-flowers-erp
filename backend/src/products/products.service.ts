import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { cleanMojibakeDeep } from '../common/mojibake';
import { Prisma } from '../generated/prisma-client';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationsService } from '../integrations/integrations.service';

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
      WHERE status = 'CONNECTED' AND platform IN ('TRENDYOL', 'N11', 'HEPSIBURADA')
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
          sitePrice: data.sitePrice ?? 0,
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
    if (hasKey('categoryId') || hasKey('category_id')) patch['categoryId'] = data.categoryId;
    if (hasKey('stockQuantity') || hasKey('stock_quantity')) patch['stockQuantity'] = data.stockQuantity;
    if (hasKey('criticalStockLevel') || hasKey('critical_stock_level')) patch['criticalStockLevel'] = data.criticalStockLevel;
    if (hasKey('costPrice') || hasKey('cost_price')) patch['costPrice'] = data.costPrice;
    if (hasKey('desi')) patch['desi'] = data.desi;
    if (hasKey('shippingCost') || hasKey('shipping_cost')) patch['shippingCost'] = data.shippingCost;
    if (hasKey('shopPrice') || hasKey('shop_price')) patch['shopPrice'] = data.shopPrice;
    if (hasKey('sitePrice') || hasKey('site_price')) patch['sitePrice'] = data.sitePrice;
    if (hasKey('marketPrice') || hasKey('market_price')) patch['marketPrice'] = data.marketPrice;
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
      return product;
    } catch (error) {
      this.handleUniqueError(error);
    }
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
      if (variants.length > 0) {
        for (const variant of variants) {
          const salePrice = Number(variant.trendyolSalePrice ?? variant.productCostDraft?.salePrice ?? 0);
          await this.broadcastPriceStock({ barcode: variant.barcode, modelCode: variant.currentModelCode, marketPrice: salePrice, stockQuantity: Number(card.stockQuantity) }).catch(() => undefined);
        }
      } else {
        const salePrice = Number(Number(card.salePrice) > 0 ? card.salePrice : card.purchasePrice ?? 0);
        await this.broadcastPriceStock({ barcode: card.barcode, modelCode: card.sku ?? card.oldModelCode, marketPrice: salePrice, stockQuantity: Number(card.stockQuantity) }).catch(() => undefined);
      }
    }
  }

  // Ürün kaydedilince tüm aktif platform entegrasyonlarına fiyat/stok gönderir.
  // Arka planda çalışır — hata olursa ürün kaydını etkilemez.
  private async broadcastPriceStock(product: {
    barcode?: string | null;
    modelCode?: string | null;
    marketPrice?: unknown;
    listPrice?: unknown;
    shopPrice?: unknown;
    stockQuantity?: unknown;
  }): Promise<void> {
    if (!product.barcode && !product.modelCode) return;

    // Tüm platformlara aynı fiyat gider (kullanıcı tercihi: tek fiyat politikası)
    // marketPrice = platform satış fiyatı, listPrice = KDV dahil liste fiyatı
    const salePrice = Number(product.marketPrice ?? product.shopPrice ?? 0);
    if (!salePrice) return;
    const rawListPrice = Number(product.listPrice ?? product.marketPrice ?? 0);
    // listPrice her zaman salePrice'dan büyük olmalı (platform kuralı)
    const listPrice = rawListPrice > salePrice ? rawListPrice : Math.ceil(salePrice * 1.1);

    const payload = {
      barcode: product.barcode ?? product.modelCode ?? '',
      modelCode: product.modelCode ?? product.barcode ?? '',
      salePrice,
      listPrice,
      stockQuantity: Number(product.stockQuantity ?? 0),
    };

    // Cache'den bağlı platformları al (5dk TTL, DB sorgusu atmaz)
    const platforms = await this.getConnectedPlatforms();
    if (!platforms.length) return;

    await Promise.allSettled(
      platforms.map((platform) =>
        this.integrations.pushPrice(platform, payload).then((result) => {
          if (!result.ok) this.logger.warn(`${platform} fiyat/stok yayını başarısız: ${result.message}`);
          else this.logger.log(`${platform} fiyat/stok yayını tamam: ${payload.barcode || payload.modelCode}`);
        }),
      ),
    );
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

  async broadcastAll(): Promise<{ total: number; sent: number; skipped: number; errors: number }> {
    this.invalidatePlatformCache();
    const platformNames = await this.getConnectedPlatforms();
    const connections = platformNames.map((platform) => ({ platform }));

    type Payload = { barcode: string; modelCode: string; salePrice: number; listPrice: number; stockQuantity: number };
    const payloadMap = new Map<string, Payload>(); // barcode/modelCode → payload (tekrar eklemeyi önle)
    let skipped = 0;

    // 1) Trendyol varyantları — bunlar ana katalog (425 aktif ürün)
    const variants = await this.prisma.trendyolProductVariant.findMany({
      where: { status: 'ACTIVE' },
      include: { productCostDraft: true },
    });

    for (const v of variants) {
      const key = v.barcode ?? v.currentModelCode ?? v.supplierStockCode;
      if (!key) { skipped++; continue; }
      const salePrice = Number(v.productCostDraft?.salePrice ?? v.trendyolSalePrice ?? 0);
      if (!salePrice) { skipped++; continue; }
      const stockQuantity = Number(v.stockQuantity ?? 0);
      const listPrice = Math.ceil(salePrice * 1.1);
      payloadMap.set(key, { barcode: v.barcode ?? key, modelCode: v.currentModelCode ?? key, salePrice, listPrice, stockQuantity });
    }

    // 2) Ürünler tablosu — Trendyol'da olmayan ürünleri de kapsa
    const products = await this.prisma.product.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, barcode: true, modelCode: true, marketPrice: true, listPrice: true, shopPrice: true, stockQuantity: true },
    });

    for (const product of products) {
      const key = product.barcode ?? product.modelCode;
      if (!key || payloadMap.has(key)) continue; // Trendyol varyantında varsa zaten eklendi
      const salePrice = Number(product.marketPrice ?? product.shopPrice ?? 0);
      if (!salePrice) { skipped++; continue; }
      payloadMap.set(key, {
        barcode: product.barcode ?? product.modelCode ?? '',
        modelCode: product.modelCode ?? product.barcode ?? '',
        salePrice,
        listPrice: Number(product.listPrice ?? product.marketPrice ?? 0),
        stockQuantity: Number(product.stockQuantity ?? 0),
      });
    }

    const payloads = Array.from(payloadMap.values());
    const total = payloads.length + skipped;

    if (connections.length === 0) return { total, sent: 0, skipped: total, errors: 0 };

    let sent = 0; let errors = 0;
    const BATCH = 10;

    for (let i = 0; i < payloads.length; i += BATCH) {
      const batch = payloads.slice(i, i + BATCH);
      const batchResults = await Promise.allSettled(
        batch.flatMap((payload) =>
          connections.map(({ platform }) => this.integrations.pushPrice(platform, payload)),
        ),
      );

      for (let j = 0; j < batch.length; j++) {
        const platformResults = batchResults.slice(j * connections.length, (j + 1) * connections.length);
        const anyOk = platformResults.some((r) => r.status === 'fulfilled' && r.value.ok);
        const failCount = platformResults.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok)).length;
        if (anyOk) sent++;
        errors += failCount;
      }

      if (i + BATCH < payloads.length) await new Promise((res) => setTimeout(res, 500));
    }

    return { total, sent, skipped, errors };
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
      .replace(/[\u0300-\u036f]/g, '')
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
      .replace(/[\u0300-\u036f]/g, '')
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
}
