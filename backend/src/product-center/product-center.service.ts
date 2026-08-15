import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument = require('pdfkit');
import * as QRCode from 'qrcode';
import { cleanMojibakeDeep } from '../common/mojibake';
import { Prisma } from '../generated/prisma-client';
import { PrismaService } from '../prisma/prisma.service';
import { ProductionCostsService } from '../production-costs/production-costs.service';

type EntryPayload = {
  variantId?: unknown;
  productId?: unknown;
  productName?: unknown;
  barcode?: unknown;
  modelCode?: unknown;
  stockCode?: unknown;
  categoryId?: unknown;
  familyId?: unknown;
  sizeOptionId?: unknown;
  potOptionId?: unknown;
  templateId?: unknown;
  brand?: unknown;
  channelCategoryName?: unknown;
  colorVariant?: unknown;
  description?: unknown;
  stockQuantity?: unknown;
  salePrice?: unknown;
  commissionPercent?: unknown;
  images?: unknown;
  status?: unknown;
};

type QuickEntryPayload = {
  variantId?: unknown;
  productId?: unknown;
  productName?: unknown;
  categoryId?: unknown;
  productType?: unknown;
  sizeVariant?: unknown;
  shopPrice?: unknown;
  sitePrice?: unknown;
  initialStockQuantity?: unknown;
  mainImageUrl?: unknown;
};

@Injectable()
export class ProductCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productionCosts: ProductionCostsService,
  ) {}

  async listEntries() {
    const variants = await this.prisma.trendyolProductVariant.findMany({
      include: {
        product: { include: { category: true, mediaFiles: true } },
        family: true,
        sizeOption: true,
        potOption: true,
        productCostDraft: { include: { items: true, pots: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 1000,
    });

    return variants.map((variant) => this.entrySummary(variant));
  }

  async getEntry(id: number) {
    const variant = await this.prisma.trendyolProductVariant.findUnique({
      where: { id },
      include: {
        product: { include: { category: true, mediaFiles: true } },
        family: true,
        sizeOption: true,
        potOption: true,
        productCostDraft: {
          include: {
            items: { include: { stockCard: true }, orderBy: { id: 'asc' } },
            pots: { include: { stockCard: true }, orderBy: { id: 'asc' } },
          },
        },
      },
    });
    if (!variant) throw new NotFoundException('Urun merkezi kaydi bulunamadi.');
    return this.entrySummary(variant);
  }

  async upsertEntry(payload: EntryPayload) {
    const productName = this.requiredText(payload.productName, 'Urun adi zorunludur.');
    const categoryId = this.requiredInt(payload.categoryId, 'Kategori zorunludur.');
    const variantId = this.optionalInt(payload.variantId);
    const productId = this.optionalInt(payload.productId);
    const images = this.stringArray(payload.images);
    const salePrice = this.optionalNumber(payload.salePrice) ?? 0;
    const shippingCost = this.optionalNumber((payload as any).shippingCost) ?? 0;
    const marketPrice = salePrice > 0 ? salePrice : 0;
    const status = payload.status === 'PASSIVE' ? 'PASSIVE' as const : 'ACTIVE' as const;

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('LOCK TABLE "products", "trendyol_product_variants", "stock_cards", "barcode_logs" IN SHARE ROW EXCLUSIVE MODE');

      const [category, existingVariant] = await Promise.all([
        tx.category.findUnique({ where: { id: categoryId } }),
        variantId
          ? tx.trendyolProductVariant.findUnique({
              where: { id: variantId },
              include: { product: true },
            })
          : Promise.resolve(null),
      ]);
      if (!category) throw new BadRequestException('Kategori bulunamadi.');

      const effectiveProductId = productId || existingVariant?.productId || undefined;
      const productType = this.text((payload as any).productType) || this.text(payload.channelCategoryName) || this.text(payload.colorVariant) || productName;
      const sizeVariant = this.text(payload.colorVariant) || productName;
      const modelCode = (this.text(payload.modelCode)?.toUpperCase()
        || existingVariant?.currentModelCode
        || existingVariant?.proposedModelCode
        || existingVariant?.product?.modelCode
        || await this.nextModelCode(tx, category, productType)).toUpperCase();
      const stockCode = this.text(payload.stockCode)
        || existingVariant?.supplierStockCode
        || await this.nextStockCode(tx, modelCode, sizeVariant);
      const barcode = this.text(payload.barcode)
        || existingVariant?.barcode
        || existingVariant?.product?.barcode
        || await this.nextEan13Barcode(tx);

      await this.ensureProductIdentityIsAvailable({ modelCode, stockCode, barcode, productId: effectiveProductId, variantId }, tx);

      const product = await this.upsertProduct(tx, {
        productId: effectiveProductId,
        productName,
        barcode,
        modelCode,
        categoryId,
        images,
        salePrice,
        shippingCost,
        marketPrice,
        brand: this.text(payload.brand) || 'Erhan Flowers',
        colorVariant: this.text(payload.colorVariant),
        description: this.text(payload.description),
        stockQuantity: this.optionalInt(payload.stockQuantity) ?? 0,
        status,
      });

      const data = {
        productId: product.id,
        barcode,
        productName,
        currentModelCode: modelCode,
        proposedModelCode: modelCode,
        supplierStockCode: stockCode,
        brand: this.text(payload.brand) || 'Erhan Flowers',
        trendyolCategoryName: this.text(payload.channelCategoryName),
        productColor: this.text(payload.colorVariant),
        productDescription: this.text(payload.description),
        stockQuantity: this.optionalInt(payload.stockQuantity) ?? 0,
        images,
        familyId: this.optionalInt(payload.familyId),
        sizeOptionId: this.optionalInt(payload.sizeOptionId),
        potOptionId: this.optionalInt(payload.potOptionId),
        templateId: this.optionalInt(payload.templateId),
        trendyolSalePrice: new Prisma.Decimal(salePrice),
        commissionPercent: new Prisma.Decimal(this.optionalNumber(payload.commissionPercent) ?? 20),
        status,
      };

      const variant = variantId
        ? await tx.trendyolProductVariant.update({ where: { id: variantId }, data })
        : await tx.trendyolProductVariant.upsert({
            where: { barcode },
            update: data,
            create: data,
          });

      return { ok: true, entry: await this.findEntry(tx, variant.id) };
    });
  }

  async generateEntryIdentity(payload: EntryPayload) {
    const categoryId = this.requiredInt(payload.categoryId, 'Kategori zorunludur.');
    const productName = this.text(payload.productName) || 'Urun';
    const productType = this.text((payload as any).productType) || this.text(payload.channelCategoryName) || productName;
    const sizeVariant = this.text(payload.colorVariant) || productName;

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('LOCK TABLE "products", "trendyol_product_variants", "stock_cards", "barcode_logs" IN SHARE ROW EXCLUSIVE MODE');
      const category = await tx.category.findUnique({ where: { id: categoryId } });
      if (!category) throw new BadRequestException('Kategori bulunamadi.');
      const modelCode = await this.nextModelCode(tx, category, productType);
      const stockCode = await this.nextStockCode(tx, modelCode, sizeVariant);
      const barcode = await this.nextEan13Barcode(tx);
      return { modelCode, stockCode, barcode };
    });
  }

  async passiveEntry(id: number) {
    if (!Number.isFinite(id) || id <= 0) throw new BadRequestException('Gecersiz urun merkezi kaydi.');

    const variant = await this.prisma.trendyolProductVariant.findUnique({
      where: { id },
      select: { id: true, productId: true },
    });
    if (!variant) throw new NotFoundException('Urun merkezi kaydi bulunamadi.');

    await this.prisma.$transaction(async (tx) => {
      await tx.trendyolProductVariant.update({
        where: { id },
        data: { status: 'PASSIVE' },
      });

      if (variant.productId) {
        await tx.product.update({
          where: { id: variant.productId },
          data: { status: 'PASSIVE' },
        });
      }
    });

    return { ok: true, variantId: id, productId: variant.productId, status: 'PASSIVE' };
  }

  async quickSaveEntry(payload: QuickEntryPayload) {
    const productName = this.requiredText(payload.productName, 'Urun adi zorunludur.');
    const categoryId = this.requiredInt(payload.categoryId, 'Ana kategori zorunludur.');
    const productType = this.requiredText(payload.productType, 'Urun turu zorunludur.');
    const sizeVariant = this.requiredText(payload.sizeVariant, 'Olcu veya varyant zorunludur.');
    const shopPrice = this.requiredPositiveNumber(payload.shopPrice, 'Dukkan satis fiyati zorunludur.');
    const sitePrice = this.requiredPositiveNumber(payload.sitePrice, 'Site satis fiyati zorunludur.');
    const initialStockQuantity = this.requiredNonNegativeNumber(payload.initialStockQuantity, 'Baslangic stok miktari zorunludur.');
    const mainImageUrl = this.requiredText(payload.mainImageUrl, 'Ana urun gorseli zorunludur.');
    const variantId = this.optionalInt(payload.variantId);
    const productId = this.optionalInt(payload.productId);

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('LOCK TABLE "products", "trendyol_product_variants", "stock_cards", "barcode_logs" IN SHARE ROW EXCLUSIVE MODE');

      const category = await tx.category.findUnique({ where: { id: categoryId } });
      if (!category) throw new BadRequestException('Ana kategori bulunamadi.');

      const existing = await this.findExistingQuickEntry(tx, productId, variantId);
      const modelCode = existing.modelCode || await this.nextModelCode(tx, category, productType);
      const stockCode = existing.stockCode || await this.nextStockCode(tx, modelCode, sizeVariant);
      const barcode = existing.barcode || await this.nextEan13Barcode(tx);
      const images = [mainImageUrl];

      if (!existing.productId) {
        await this.ensureQuickIdentityIsAvailable(tx, { modelCode, stockCode, barcode });
      }

      const productData = {
        productName,
        modelCode,
        barcode,
        categoryId,
        stockQuantity: Math.trunc(initialStockQuantity),
        criticalStockLevel: 0,
        costPrice: 0,
        desi: 1,
        shippingCost: 0,
        shopPrice,
        sitePrice,
        marketPrice: sitePrice,
        listPrice: sitePrice,
        imageUrls: images,
        brand: 'Erhan Flowers',
        vatRate: 20,
        origin: 'Turkiye',
        colorVariant: sizeVariant,
        warrantyMonths: 0,
        warrantyType: 'Uretici',
        status: 'ACTIVE' as const,
      };

      const product = existing.productId
        ? await tx.product.update({ where: { id: existing.productId }, data: productData })
        : await tx.product.create({ data: productData });

      const variantData = {
        productId: product.id,
        barcode,
        productName,
        currentModelCode: modelCode,
        proposedModelCode: modelCode,
        supplierStockCode: stockCode,
        brand: 'Erhan Flowers',
        trendyolCategoryName: category.name,
        productColor: sizeVariant,
        stockQuantity: Math.trunc(initialStockQuantity),
        images,
        trendyolSalePrice: new Prisma.Decimal(sitePrice),
        commissionPercent: new Prisma.Decimal(20),
        status: 'ACTIVE' as const,
      };

      const variant = existing.variantId
        ? await tx.trendyolProductVariant.update({ where: { id: existing.variantId }, data: variantData })
        : await tx.trendyolProductVariant.create({ data: variantData });

      const fileName = this.fileNameFromPath(mainImageUrl);
      await tx.mediaFile.create({
        data: {
          productId: product.id,
          fileName,
          filePath: mainImageUrl,
          folderName: modelCode,
          fileType: this.fileTypeFromName(fileName),
        },
      });

      const entry = await this.findEntry(tx, variant.id);
      return {
        ok: true,
        entry,
        productId: product.id,
        variantId: variant.id,
        stockCardId: null,
        productName,
        modelCode,
        stockCode,
        barcode,
        initialStockQuantity,
        shopPrice,
        sitePrice,
      };
    });
  }

  copyRecipe(variantId: number, payload: unknown, userRole: string, userId: number) {
    return this.productionCosts.copyVariantCostDraft(variantId, payload, userRole, userId);
  }

  async listAutoCreatedStockCardCandidates() {
    const variants = await this.prisma.trendyolProductVariant.findMany({
      include: { product: { include: { category: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 1000,
    });

    const seen = new Set<number>();
    const candidates = [];
    for (const variant of variants) {
      const modelCode = variant.currentModelCode ?? variant.proposedModelCode ?? variant.product?.modelCode ?? '';
      const stockCode = variant.supplierStockCode || modelCode;
      const barcode = variant.barcode || variant.product?.barcode || '';
      const stockCards = await this.prisma.stockCard.findMany({
        where: {
          OR: [
            stockCode ? { sku: stockCode } : undefined,
            modelCode ? { model: modelCode } : undefined,
            barcode ? { barcode } : undefined,
          ].filter(Boolean) as Prisma.StockCardWhereInput[],
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      for (const stockCard of stockCards) {
        if (seen.has(stockCard.id)) continue;
        const candidate = await this.describeAutoStockCardCandidate(stockCard, {
          productName: variant.productName,
          modelCode,
          barcode,
          stockCode,
        });
        if (!candidate.isCandidate) continue;
        seen.add(stockCard.id);
        candidates.push(candidate);
      }
    }

    return cleanMojibakeDeep(candidates);
  }

  async cleanupAutoCreatedStockCard(id: number, payload: unknown) {
    const body = (payload ?? {}) as Record<string, unknown>;
    const action = String(body.action ?? 'passive');
    const stockCard = await this.prisma.stockCard.findUnique({ where: { id } });
    if (!stockCard) throw new NotFoundException('Stok karti bulunamadi.');

    const candidate = await this.describeAutoStockCardCandidate(stockCard);
    if (!candidate.isCandidate) {
      throw new BadRequestException('Bu stok karti Urun Merkezi otomatik deneme karti olarak tespit edilemedi.');
    }

    if (action === 'hard-delete') {
      if (!candidate.hardDeleteAllowed) {
        throw new BadRequestException('Bu stok kartinda hareket, baglanti veya stok miktari var. Kalici silme yerine pasife alinabilir.');
      }
      await this.prisma.$transaction(async (tx) => {
        await tx.stockCardImage.deleteMany({ where: { stockCardId: id } });
        await tx.stockCard.delete({ where: { id } });
      });
      return { ok: true, deleted: true, passive: false };
    }

    const updated = await this.prisma.stockCard.update({
      where: { id },
      data: { status: 'PASSIVE' },
    });
    return { ok: true, deleted: false, passive: true, stockCardId: updated.id };
  }

  async generateShopCard(variantId: number) {
    const variant = await this.prisma.trendyolProductVariant.findUnique({
      where: { id: variantId },
      include: {
        product: { include: { category: true } },
        productCostDraft: true,
      },
    });
    if (!variant) throw new NotFoundException('Urun merkezi kaydi bulunamadi.');

    const summary = this.entrySummary(variant);
    const modelCode = this.safePathPart(summary.modelCode || variant.barcode || `urun-${variant.id}`);
    const cardDir = path.join(process.cwd(), 'uploads', 'products', modelCode, 'cards');
    fs.mkdirSync(cardDir, { recursive: true });

    const fileName = `${modelCode}-dukkan-karti.pdf`;
    const absolutePath = path.join(cardDir, fileName);
    await this.writeShopCardPdf(absolutePath, summary);

    const pdfPath = `/uploads/products/${modelCode}/cards/${fileName}`;
    if (summary.productId) {
      await this.prisma.mediaFile.create({
        data: {
          productId: summary.productId,
          fileName,
          filePath: pdfPath,
          folderName: `${modelCode} / cards`,
          fileType: 'application/pdf',
        },
      });
    }

    return { ok: true, pdfPath };
  }

  private async upsertProduct(tx: Prisma.TransactionClient, data: {
    productId?: number;
    productName: string;
    barcode: string;
    modelCode: string;
    categoryId: number;
    images: string[];
    salePrice: number;
    shippingCost: number;
    marketPrice: number;
    brand: string;
    colorVariant?: string;
    description?: string;
    stockQuantity: number;
    status: 'ACTIVE' | 'PASSIVE';
  }) {
    const payload = {
      productName: data.productName,
      modelCode: data.modelCode,
      barcode: data.barcode,
      categoryId: data.categoryId,
      stockQuantity: data.stockQuantity,
      criticalStockLevel: 0,
      costPrice: 0,
      desi: 1,
      shippingCost: data.shippingCost,
      shopPrice: data.salePrice,
      sitePrice: data.salePrice + data.shippingCost,
      marketPrice: data.marketPrice,
      listPrice: data.marketPrice,
      imageUrls: data.images,
      brand: data.brand,
      vatRate: 20,
      origin: 'Turkiye',
      colorVariant: data.colorVariant,
      material: undefined,
      packageDimensions: undefined,
      warrantyMonths: 0,
      warrantyType: 'Uretici',
      status: data.status,
      description: data.description,
    };

    if (data.productId) return tx.product.update({ where: { id: data.productId }, data: payload });

    const existing = await tx.product.findFirst({
      where: { OR: [{ modelCode: data.modelCode }, { barcode: data.barcode }] },
      orderBy: { id: 'asc' },
    });
    if (existing) return tx.product.update({ where: { id: existing.id }, data: payload });
    return tx.product.create({ data: payload });
  }

  private async findEntry(tx: Prisma.TransactionClient, id: number) {
    const variant = await tx.trendyolProductVariant.findUnique({
      where: { id },
      include: { product: { include: { category: true, mediaFiles: true } }, family: true, sizeOption: true, potOption: true, productCostDraft: true },
    });
    return variant ? this.entrySummary(variant) : null;
  }

  private entrySummary(variant: any) {
    const draft = variant.productCostDraft;
    const product = variant.product;
    const images = this.stringArray(variant.images).length ? this.stringArray(variant.images) : this.stringArray(product?.imageUrls);
    return cleanMojibakeDeep({
      id: variant.id,
      variantId: variant.id,
      productId: product?.id ?? null,
      productName: variant.productName,
      barcode: variant.barcode,
      modelCode: variant.currentModelCode ?? variant.proposedModelCode ?? product?.modelCode ?? '',
      stockCode: variant.supplierStockCode ?? variant.currentModelCode ?? variant.proposedModelCode ?? product?.modelCode ?? '',
      categoryId: product?.categoryId ?? null,
      categoryName: product?.category?.name ?? variant.trendyolCategoryName ?? null,
      familyId: variant.familyId,
      familyName: variant.family?.familyName ?? variant.suggestedFamilyName ?? null,
      sizeOptionId: variant.sizeOptionId,
      potOptionId: variant.potOptionId,
      templateId: variant.templateId,
      brand: variant.brand ?? product?.brand ?? 'Erhan Flowers',
      channelCategoryName: variant.trendyolCategoryName ?? product?.category?.name ?? '',
      trendyolProductUrl: variant.trendyolProductUrl ?? '',
      colorVariant: variant.productColor ?? product?.colorVariant ?? '',
      description: variant.productDescription ?? product?.description ?? '',
      stockQuantity: variant.stockQuantity,
      salePrice: Number(variant.trendyolSalePrice ?? product?.marketPrice ?? 0),
      commissionPercent: Number(variant.commissionPercent ?? 20),
      images,
      costStatus: draft?.status === 'APPROVED' ? 'Tamamlandi' : draft ? 'Taslak' : 'Maliyet Girilmedi',
      totalCost: Number(draft?.totalCost ?? 0),
      seoApprovalStatus: variant.seoApprovalStatus,
      status: variant.status,
      updatedAt: variant.updatedAt,
    });
  }

  private async ensureProductIdentityIsAvailable(
    params: { modelCode: string; stockCode?: string; barcode: string; productId?: number; variantId?: number },
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const stockCode = params.stockCode || params.modelCode;
    const [product, stockCard, variant, barcodeLog] = await Promise.all([
      tx.product.findFirst({
        where: {
          OR: [{ modelCode: params.modelCode }, { barcode: params.barcode }],
          id: params.productId ? { not: params.productId } : undefined,
        },
      }),
      tx.stockCard.findFirst({
        where: {
          OR: [{ sku: stockCode }, { model: params.modelCode }, { barcode: params.barcode }],
        },
        select: { id: true },
      }),
      tx.trendyolProductVariant.findFirst({
        where: {
          OR: [{ barcode: params.barcode }, { currentModelCode: params.modelCode }, { proposedModelCode: params.modelCode }, { supplierStockCode: stockCode }],
          id: params.variantId ? { not: params.variantId } : undefined,
        },
      }),
      tx.barcodeLog.findFirst({ where: { barcode: params.barcode }, select: { id: true } }),
    ]);
    if (product || stockCard || variant || barcodeLog) throw new BadRequestException('Barkod, model kodu veya stok kodu baska bir kayitta kullaniliyor.');
  }

  private requiredText(value: unknown, message: string) {
    const text = this.text(value);
    if (!text) throw new BadRequestException(message);
    return text;
  }

  private requiredInt(value: unknown, message: string) {
    const parsed = this.optionalInt(value);
    if (!parsed) throw new BadRequestException(message);
    return parsed;
  }

  private requiredPositiveNumber(value: unknown, message: string) {
    const parsed = this.optionalNumber(value);
    if (parsed === undefined || parsed <= 0) throw new BadRequestException(message);
    return parsed;
  }

  private requiredNonNegativeNumber(value: unknown, message: string) {
    const parsed = this.optionalNumber(value);
    if (parsed === undefined || parsed < 0) throw new BadRequestException(message);
    return parsed;
  }

  private optionalInt(value: unknown) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : undefined;
  }

  private optionalNumber(value: unknown) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private text(value: unknown) {
    return String(value ?? '').trim();
  }

  private stringArray(value: unknown) {
    if (!Array.isArray(value)) return [];
    return value.map((item) => String(item ?? '').trim()).filter(Boolean);
  }

  private async findExistingQuickEntry(tx: Prisma.TransactionClient, productId?: number, variantId?: number) {
    const variant = variantId
      ? await tx.trendyolProductVariant.findUnique({ where: { id: variantId } })
      : null;
    const product = productId
      ? await tx.product.findUnique({ where: { id: productId } })
      : variant?.productId
        ? await tx.product.findUnique({ where: { id: variant.productId } })
        : null;
    const modelCode = product?.modelCode ?? variant?.currentModelCode ?? variant?.proposedModelCode ?? '';
    const barcode = product?.barcode ?? variant?.barcode ?? '';
    const stockCode = variant?.supplierStockCode || modelCode;

    return {
      productId: product?.id,
      variantId: variant?.id,
      modelCode,
      stockCode,
      barcode,
    };
  }

  private async ensureQuickIdentityIsAvailable(tx: Prisma.TransactionClient, params: { modelCode: string; stockCode: string; barcode: string }) {
    const [product, stockCard, variant, barcodeLog] = await Promise.all([
      tx.product.findFirst({ where: { OR: [{ modelCode: params.modelCode }, { barcode: params.barcode }] }, select: { id: true } }),
      tx.stockCard.findFirst({ where: { OR: [{ sku: params.stockCode }, { model: params.modelCode }, { barcode: params.barcode }] }, select: { id: true } }),
      tx.trendyolProductVariant.findFirst({
        where: {
          OR: [
            { barcode: params.barcode },
            { currentModelCode: params.modelCode },
            { proposedModelCode: params.modelCode },
            { supplierStockCode: params.stockCode },
          ],
        },
        select: { id: true },
      }),
      tx.barcodeLog.findFirst({ where: { barcode: params.barcode }, select: { id: true } }),
    ]);
    if (product || stockCard || variant || barcodeLog) throw new BadRequestException('Otomatik kodlar baska bir kayitla cakisti. Lutfen tekrar deneyin.');
  }

  private async describeAutoStockCardCandidate(stockCard: any, match?: { productName?: string; modelCode?: string; barcode?: string; stockCode?: string }) {
    const [movementCount, stockCountItemCount, stockUsageLogCount, productCostItemCount, productPotItemCount, recipeItemCount, productionPotOptionCount, productionTemplateComponentCount] = await Promise.all([
      this.prisma.stockMovement.count({ where: { stockCardId: stockCard.id } }),
      this.prisma.stockCountItem.count({ where: { stockCardId: stockCard.id } }),
      this.prisma.stockUsageLog.count({ where: { stockCardId: stockCard.id } }),
      this.prisma.productCostItem.count({ where: { stockCardId: stockCard.id } }),
      this.prisma.productPotItem.count({ where: { stockCardId: stockCard.id } }),
      this.prisma.recipeItem.count({ where: { stockCardId: stockCard.id } }),
      this.prisma.productionPotOption.count({ where: { stockCardId: stockCard.id } }),
      this.prisma.productionTemplateComponent.count({ where: { stockCardId: stockCard.id } }),
    ]);
    const linkedRecipeCount = productCostItemCount + productPotItemCount + recipeItemCount + productionPotOptionCount + productionTemplateComponentCount;
    const stockQuantity = Number(stockCard.stockQuantity ?? 0);
    const purchasePrice = Number(stockCard.purchasePrice ?? 0);
    const automaticUnitCost = Number(stockCard.automaticUnitCost ?? 0);
    const productMatch = match ?? await this.findProductMatchForStockCard(stockCard);
    const identityMatch = Boolean(productMatch?.barcode && productMatch.barcode === stockCard.barcode)
      || Boolean(productMatch?.modelCode && productMatch.modelCode === stockCard.model)
      || Boolean(productMatch?.stockCode && productMatch.stockCode === stockCard.sku);
    const zeroCostSalesProductShape = purchasePrice === 0 && automaticUnitCost === 0 && String(stockCard.purchaseUnit ?? stockCard.unit ?? '') === 'Adet';
    const isCandidate = identityMatch && zeroCostSalesProductShape;
    const hardDeleteAllowed = isCandidate
      && movementCount === 0
      && stockCountItemCount === 0
      && stockUsageLogCount === 0
      && linkedRecipeCount === 0
      && stockQuantity === 0;

    return {
      id: stockCard.id,
      name: stockCard.name,
      sku: stockCard.sku,
      model: stockCard.model,
      barcode: stockCard.barcode,
      category: stockCard.category,
      status: stockCard.status,
      createdAt: stockCard.createdAt,
      stockQuantity,
      movementCount,
      stockCountItemCount,
      stockUsageLogCount,
      linkedRecipeCount,
      productCostItemCount,
      productPotItemCount,
      recipeItemCount,
      productName: productMatch?.productName ?? null,
      isCandidate,
      hardDeleteAllowed,
      recommendedAction: hardDeleteAllowed ? 'hard-delete' : 'passive',
      warning: hardDeleteAllowed ? null : 'Hareket, stok miktari veya recete/maliyet baglantisi oldugu icin sadece pasife alinmali.',
    };
  }

  private async findProductMatchForStockCard(stockCard: any) {
    const variant = await this.prisma.trendyolProductVariant.findFirst({
      where: {
        OR: [
          stockCard.barcode ? { barcode: stockCard.barcode } : undefined,
          stockCard.model ? { currentModelCode: stockCard.model } : undefined,
          stockCard.model ? { proposedModelCode: stockCard.model } : undefined,
          stockCard.sku ? { supplierStockCode: stockCard.sku } : undefined,
        ].filter(Boolean) as Prisma.TrendyolProductVariantWhereInput[],
      },
      include: { product: true },
    });
    if (!variant) return null;
    return {
      productName: variant.productName,
      modelCode: variant.currentModelCode ?? variant.proposedModelCode ?? variant.product?.modelCode ?? '',
      stockCode: variant.supplierStockCode || variant.currentModelCode || variant.proposedModelCode || '',
      barcode: variant.barcode || variant.product?.barcode || '',
    };
  }

  private async nextModelCode(tx: Prisma.TransactionClient, category: { name: string; codePrefix: string }, productType: string) {
    const categoryCode = this.businessCode(category.codePrefix && category.codePrefix !== 'ERH' ? category.codePrefix : category.name);
    const typeCode = this.businessCode(productType);
    const prefix = `${categoryCode}-${typeCode}`;
    const codes = await Promise.all([
      tx.product.findMany({ where: { modelCode: { startsWith: `${prefix}-` } }, select: { modelCode: true } }),
      tx.trendyolProductVariant.findMany({
        where: { OR: [{ currentModelCode: { startsWith: `${prefix}-` } }, { proposedModelCode: { startsWith: `${prefix}-` } }] },
        select: { currentModelCode: true, proposedModelCode: true },
      }),
      tx.stockCard.findMany({ where: { OR: [{ sku: { startsWith: `${prefix}-` } }, { model: { startsWith: `${prefix}-` } }] }, select: { sku: true, model: true } }),
    ]);
    const max = codes.flatMap((items) => items as any[]).reduce((highest, item) => {
      return Math.max(highest, ...[item.modelCode, item.currentModelCode, item.proposedModelCode, item.sku, item.model].map((code) => this.sequenceFromCode(prefix, code)));
    }, 0);
    return `${prefix}-${String(max + 1).padStart(4, '0')}`;
  }

  private async nextStockCode(tx: Prisma.TransactionClient, modelCode: string, sizeVariant: string) {
    const suffix = this.variantSuffix(sizeVariant);
    const candidate = suffix ? `${modelCode}-${suffix}` : modelCode;
    const exists = await tx.stockCard.findFirst({ where: { sku: candidate }, select: { id: true } });
    return exists ? modelCode : candidate;
  }

  private async nextEan13Barcode(tx: Prisma.TransactionClient) {
    const prefix = '869';
    const rows = await Promise.all([
      tx.product.findMany({ where: { barcode: { startsWith: prefix } }, select: { barcode: true } }),
      tx.stockCard.findMany({ where: { barcode: { startsWith: prefix } }, select: { barcode: true } }),
      tx.trendyolProductVariant.findMany({ where: { barcode: { startsWith: prefix } }, select: { barcode: true } }),
      tx.barcodeLog.findMany({ where: { barcode: { startsWith: prefix } }, select: { barcode: true } }),
    ]);
    let next = rows.flat().reduce((highest, item) => {
      const value = String(item.barcode ?? '');
      if (!/^\d{13}$/.test(value) || !this.hasValidEan13Checksum(value)) return highest;
      return Math.max(highest, Number(value.slice(3, 12)));
    }, 100000) + 1;

    for (let attempt = 0; attempt < 10000; attempt += 1) {
      const barcode = this.ean13(`${prefix}${String(next).padStart(9, '0')}`);
      const duplicate = await tx.product.findFirst({ where: { barcode }, select: { id: true } })
        || await tx.stockCard.findFirst({ where: { barcode }, select: { id: true } })
        || await tx.trendyolProductVariant.findFirst({ where: { barcode }, select: { id: true } })
        || await tx.barcodeLog.findFirst({ where: { barcode }, select: { id: true } });
      if (!duplicate) return barcode;
      next += 1;
    }
    throw new BadRequestException('Benzersiz barkod uretilemedi.');
  }

  private ean13(base12: string) {
    const sum = base12.split('').reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
    const checksum = (10 - (sum % 10)) % 10;
    return `${base12}${checksum}`;
  }

  private hasValidEan13Checksum(value: string) {
    return /^\d{13}$/.test(value) && this.ean13(value.slice(0, 12)) === value;
  }

  private sequenceFromCode(prefix: string, value?: string | null) {
    const match = String(value ?? '').match(new RegExp(`^${prefix}-(\\d{4,})$`));
    return match ? Number(match[1]) : 0;
  }

  private businessCode(value: string) {
    const normalized = this.asciiUpper(value);
    if (normalized.includes('AGAC')) return 'AGC';
    if (normalized.includes('CICEK')) return 'CIC';
    if (normalized.includes('SAKSI')) return 'SAK';
    if (normalized.includes('DEMET')) return 'DEM';
    if (normalized.includes('BAMBU')) return 'BAM';
    const words = normalized.split(/[^A-Z0-9]+/).filter(Boolean);
    const source = words.length > 1 ? words.map((word) => word[0]).join('') + words.join('') : words.join('');
    return (source || 'URN').replace(/[^A-Z0-9]/g, '').slice(0, 3).padEnd(3, 'X');
  }

  private variantSuffix(value: string) {
    const code = this.businessCode(value);
    return code === 'URN' ? '' : code;
  }

  private asciiUpper(value: string) {
    return String(value ?? '')
      .replaceAll('\u0130', 'I')
      .replaceAll('\u0131', 'I')
      .replaceAll('\u011e', 'G')
      .replaceAll('\u011f', 'G')
      .replaceAll('\u00dc', 'U')
      .replaceAll('\u00fc', 'U')
      .replaceAll('\u015e', 'S')
      .replaceAll('\u015f', 'S')
      .replaceAll('\u00d6', 'O')
      .replaceAll('\u00f6', 'O')
      .replaceAll('\u00c7', 'C')
      .replaceAll('\u00e7', 'C')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
  }

  private fileNameFromPath(value: string) {
    const clean = String(value).split('?')[0].replace(/\\/g, '/');
    return clean.split('/').filter(Boolean).pop() || 'urun-gorseli.jpg';
  }

  private fileTypeFromName(value: string) {
    const extension = value.toLowerCase().split('.').pop();
    if (extension === 'png') return 'image/png';
    if (extension === 'webp') return 'image/webp';
    return 'image/jpeg';
  }

  private safePathPart(value: string) {
    return value
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80) || 'urun';
  }

  private async writeShopCardPdf(filePath: string, entry: ReturnType<ProductCenterService['entrySummary']>) {
    const readableText = entry.trendyolProductUrl || entry.barcode || entry.modelCode || '';
    const qrBuffer = readableText ? await QRCode.toBuffer(readableText, { margin: 1, width: 180 }) : null;
    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A6', margin: 18 });
      const stream = fs.createWriteStream(filePath);
      stream.on('finish', resolve);
      stream.on('error', reject);
      doc.on('error', reject);
      doc.pipe(stream);

      const regularFont = 'C:/Windows/Fonts/arial.ttf';
      const boldFont = 'C:/Windows/Fonts/arialbd.ttf';
      if (fs.existsSync(regularFont)) doc.registerFont('CardRegular', regularFont);
      if (fs.existsSync(boldFont)) doc.registerFont('CardBold', boldFont);
      const regular = fs.existsSync(regularFont) ? 'CardRegular' : 'Helvetica';
      const bold = fs.existsSync(boldFont) ? 'CardBold' : 'Helvetica-Bold';
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 18;
      const innerWidth = pageWidth - margin * 2;

      doc.roundedRect(8, 8, pageWidth - 16, pageHeight - 16, 8).lineWidth(1.5).stroke('#111827');

      doc.fontSize(15).font(bold).fillColor('#111827').text('Erhan Flowers', margin, 18, { width: innerWidth, align: 'center' });
      doc.fontSize(8).font(regular).fillColor('#475569').text('Dükkan Ürün Kartı', margin, 35, { width: innerWidth, align: 'center' });
      doc.moveTo(margin, 49).lineTo(pageWidth - margin, 49).lineWidth(0.8).stroke('#CBD5E1');

      doc.fontSize(10.5).font(bold).fillColor('#111827').text(entry.productName || 'Ürün', margin, 56, {
        width: innerWidth,
        align: 'center',
        height: 42,
        ellipsis: true,
      });

      const imagePath = this.localUploadPath(entry.images?.[0]);
      if (imagePath && fs.existsSync(imagePath)) {
        doc.roundedRect(30, 102, pageWidth - 60, 118, 6).stroke('#CBD5E1');
        doc.image(imagePath, 34, 106, { fit: [pageWidth - 68, 110], align: 'center', valign: 'center' });
      } else {
        doc.roundedRect(30, 102, pageWidth - 60, 118, 6).stroke('#CBD5E1');
        doc.fontSize(10).font(regular).fillColor('#64748B').text('Görsel yok', 34, 154, { width: pageWidth - 68, align: 'center' });
      }

      const rows: Array<[string, string]> = [
        ['Barkod', entry.barcode || '-'],
        ['Model', entry.modelCode || '-'],
        ['Satış', this.money(entry.salePrice)],
        ['Stok', String(entry.stockQuantity ?? 0)],
      ];

      let y = 232;
      for (const [label, value] of rows) {
        doc.roundedRect(margin, y, innerWidth, 23, 4).fillAndStroke('#F8FAFC', '#E2E8F0');
        doc.fontSize(8).font(bold).fillColor('#475569').text(label, margin + 7, y + 7, { width: 42 });
        doc.fontSize(label === 'Barkod' ? 11 : 10).font(bold).fillColor('#111827').text(value, margin + 52, y + 5, {
          width: innerWidth - 58,
          align: 'right',
          ellipsis: true,
        });
        y += 27;
      }

      if (readableText) {
        const qrBox = 54;
        doc.roundedRect(margin, y + 3, innerWidth, 60, 5).stroke('#111827');
        if (qrBuffer) doc.image(qrBuffer, margin + 4, y + 6, { fit: [qrBox, qrBox] });
        doc.fontSize(8).font(bold).fillColor('#475569').text(entry.trendyolProductUrl ? 'Telefon için QR / link' : 'Telefon için QR / kod', margin + qrBox + 12, y + 11, { width: innerWidth - qrBox - 20 });
        doc.fontSize(entry.trendyolProductUrl ? 6.8 : 14).font(bold).fillColor('#111827').text(readableText, margin + qrBox + 12, y + 25, {
          width: innerWidth - qrBox - 20,
          height: 28,
          ellipsis: true,
        });
      }

      doc.end();
    });
  }

  private localUploadPath(value?: string) {
    if (!value || /^https?:\/\//i.test(value)) return null;
    const relative = value.replace(/^\/?uploads[\\/]/, '').replace(/\\/g, path.sep);
    const absolute = path.normalize(path.join(process.cwd(), 'uploads', relative));
    const uploadRoot = path.normalize(path.join(process.cwd(), 'uploads'));
    return absolute.startsWith(uploadRoot) ? absolute : null;
  }

  private money(value: unknown) {
    return `${Number(value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
  }
}
