import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma-client';
import * as fs from 'fs';
import { extname, join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { stockImageRoot } from '../stock-image-paths';

type StockCardPayload = {
  name?: string;
  sku?: string | null;
  category?: string | null;
  color?: string | null;
  model?: string | null;
  size?: string | null;
  productFamily?: string | null;
  productType?: string | null;
  height?: string | null;
  width?: string | null;
  potType?: string | null;
  potColor?: string | null;
  potSize?: string | null;
  trunkType?: string | null;
  leafFlowerType?: string | null;
  brand?: string | null;
  oldModelCode?: string | null;
  barcode?: string | null;
  salePrice?: number;
  warehouse?: string | null;
  shelfLocation?: string | null;
  shortDescription?: string | null;
  technicalSpecs?: string | null;
  seoTitle?: string | null;
  metaDescription?: string | null;
  imagePath?: string | null;
  description?: string | null;
  criticalStockLevel?: number;
  supplierName?: string | null;
  purchaseUnit?: string;
  purchaseQuantity?: number;
  unit?: string;
  packageContent?: number;
  purchasePrice?: number;
  manualUnitCostEnabled?: boolean;
  manualUnitCost?: number;
  stockQuantity?: number;
  status?: 'ACTIVE' | 'PASSIVE';
};

const stockCardListSelect = {
  id: true,
  name: true,
  sku: true,
  category: true,
  color: true,
  model: true,
  size: true,
  productFamily: true,
  productType: true,
  height: true,
  width: true,
  potType: true,
  potColor: true,
  potSize: true,
  trunkType: true,
  leafFlowerType: true,
  brand: true,
  oldModelCode: true,
  barcode: true,
  salePrice: true,
  warehouse: true,
  shelfLocation: true,
  shortDescription: true,
  technicalSpecs: true,
  seoTitle: true,
  metaDescription: true,
  imagePath: true,
  description: true,
  criticalStockLevel: true,
  supplierName: true,
  lastMovementAt: true,
  purchaseUnit: true,
  purchaseQuantity: true,
  unit: true,
  packageContent: true,
  purchasePrice: true,
  manualUnitCostEnabled: true,
  manualUnitCost: true,
  automaticUnitCost: true,
  stockQuantity: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  images: { orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }] },
  movements: {
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: {
      id: true,
      stockCardId: true,
      type: true,
      quantity: true,
      unit: true,
      previousStock: true,
      nextStock: true,
      reason: true,
      supplierName: true,
      documentNo: true,
      paymentStatus: true,
      note: true,
      createdAt: true,
    },
  },
  _count: { select: { productCostItems: true, productPotItems: true } },
} satisfies Prisma.StockCardSelect;

@Injectable()
export class StockCardsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userRole?: string) {
    const stockCards = await this.prisma.stockCard.findMany({
      select: stockCardListSelect,
      orderBy: { createdAt: 'desc' },
    });

    return stockCards.map((item) => this.serialize(item, userRole));
  }

  async create(payload: unknown) {
    const data = this.normalize(payload);

    if (!data.name || !data.unit) {
      throw new BadRequestException('Stok adı ve birim zorunludur.');
    }
    if (this.isStoneStock(data)) {
      const candidates = await this.prisma.stockCard.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { category: { not: null } },
            { productType: { not: null } },
            { name: { not: '' } },
          ],
        },
        select: { id: true, name: true, category: true, productFamily: true, productType: true },
      });
      const normalizedName = this.normalizeText(data.name);
      const duplicate = candidates.find((item) => this.isStoneText(this.normalizeText(`${item.category ?? ''} ${item.productFamily ?? ''} ${item.productType ?? ''} ${item.name ?? ''}`)) && this.normalizeText(item.name) === normalizedName);
      if (duplicate) {
        throw new BadRequestException('Bu taş stok kartı zaten var. Lütfen mevcut stok kartını seçin.');
      }
    }

    try {
      const stockCard = await this.prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('LOCK TABLE "stock_cards" IN SHARE ROW EXCLUSIVE MODE');
        const identity = await this.ensureStockIdentity(tx, data);
        const automaticUnitCost = this.calculateUnitCost(data.purchasePrice, data.packageContent, data.manualUnitCostEnabled, data.manualUnitCost);

        return tx.stockCard.create({
          data: {
            name: data.name!,
            sku: identity.sku,
            category: data.category,
            color: data.color,
            model: identity.model,
            size: data.size,
            productFamily: data.productFamily,
            productType: data.productType,
            height: data.height,
            width: data.width,
            potType: data.potType,
            potColor: data.potColor,
            potSize: data.potSize,
            trunkType: data.trunkType,
            leafFlowerType: data.leafFlowerType,
            brand: data.brand,
            oldModelCode: data.oldModelCode,
            barcode: identity.barcode,
            salePrice: data.salePrice ?? 0,
            warehouse: data.warehouse,
            shelfLocation: data.shelfLocation,
            shortDescription: data.shortDescription,
            technicalSpecs: data.technicalSpecs,
            seoTitle: data.seoTitle,
            metaDescription: data.metaDescription,
            imagePath: data.imagePath,
            description: data.description,
            criticalStockLevel: data.criticalStockLevel ?? 0,
            supplierName: data.supplierName,
            purchaseUnit: data.purchaseUnit ?? data.unit!,
            purchaseQuantity: data.purchaseQuantity ?? 1,
            unit: data.unit!,
            packageContent: data.packageContent ?? 1,
            purchasePrice: data.purchasePrice ?? 0,
            manualUnitCostEnabled: data.manualUnitCostEnabled ?? false,
            manualUnitCost: data.manualUnitCost ?? 0,
            automaticUnitCost,
            stockQuantity: data.stockQuantity ?? 0,
            status: data.status ?? 'ACTIVE',
          },
        });
      });
      this.ensureStockImageFolder(stockCard);

      return this.serialize(stockCard);
    } catch (error) {
      this.handleUniqueError(error);
    }
  }

  async update(id: number, payload: unknown) {
    const data = this.normalize(payload);
    const body = (payload ?? {}) as Record<string, unknown>;

    try {
      const existing = await this.prisma.stockCard.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Stok kartı bulunamadı.');
      const automaticUnitCost = this.calculateUnitCost(
        data.purchasePrice ?? (existing ? Number(existing.purchasePrice) : undefined),
        data.packageContent ?? (existing ? Number(existing.packageContent) : undefined),
        data.manualUnitCostEnabled ?? (existing ? Boolean(existing.manualUnitCostEnabled) : undefined),
        data.manualUnitCost ?? (existing ? Number(existing.manualUnitCost) : undefined),
      );
      const updateData: Prisma.StockCardUpdateInput = {
        ...(this.hasField(body, 'name') ? { name: data.name } : {}),
        ...(this.hasField(body, 'sku') ? { sku: data.sku } : {}),
        ...(this.hasField(body, 'category') ? { category: data.category } : {}),
        ...(this.hasField(body, 'color') ? { color: data.color } : {}),
        ...(this.hasField(body, 'model') ? { model: data.model } : {}),
        ...(this.hasField(body, 'size') ? { size: data.size } : {}),
        ...(this.hasField(body, 'productFamily', 'product_family') ? { productFamily: data.productFamily } : {}),
        ...(this.hasField(body, 'productType', 'product_type') ? { productType: data.productType } : {}),
        ...(this.hasField(body, 'height') ? { height: data.height } : {}),
        ...(this.hasField(body, 'width') ? { width: data.width } : {}),
        ...(this.hasField(body, 'potType', 'pot_type') ? { potType: data.potType } : {}),
        ...(this.hasField(body, 'potColor', 'pot_color') ? { potColor: data.potColor } : {}),
        ...(this.hasField(body, 'potSize', 'pot_size') ? { potSize: data.potSize } : {}),
        ...(this.hasField(body, 'trunkType', 'trunk_type') ? { trunkType: data.trunkType } : {}),
        ...(this.hasField(body, 'leafFlowerType', 'leaf_flower_type') ? { leafFlowerType: data.leafFlowerType } : {}),
        ...(this.hasField(body, 'brand') ? { brand: data.brand } : {}),
        ...(this.hasField(body, 'oldModelCode', 'old_model_code') ? { oldModelCode: data.oldModelCode } : {}),
        ...(this.hasField(body, 'barcode') ? { barcode: data.barcode } : {}),
        ...(this.hasField(body, 'salePrice', 'sale_price') ? { salePrice: data.salePrice } : {}),
        ...(this.hasField(body, 'warehouse') ? { warehouse: data.warehouse } : {}),
        ...(this.hasField(body, 'shelfLocation', 'shelf_location') ? { shelfLocation: data.shelfLocation } : {}),
        ...(this.hasField(body, 'shortDescription', 'short_description') ? { shortDescription: data.shortDescription } : {}),
        ...(this.hasField(body, 'technicalSpecs', 'technical_specs') ? { technicalSpecs: data.technicalSpecs } : {}),
        ...(this.hasField(body, 'seoTitle', 'seo_title') ? { seoTitle: data.seoTitle } : {}),
        ...(this.hasField(body, 'metaDescription', 'meta_description') ? { metaDescription: data.metaDescription } : {}),
        ...(this.hasField(body, 'imagePath', 'image_path') ? { imagePath: data.imagePath } : {}),
        ...(this.hasField(body, 'description') ? { description: data.description } : {}),
        ...(this.hasField(body, 'criticalStockLevel', 'critical_stock_level') ? { criticalStockLevel: data.criticalStockLevel } : {}),
        ...(this.hasField(body, 'supplierName', 'supplier_name') ? { supplierName: data.supplierName } : {}),
        ...(this.hasField(body, 'purchaseUnit', 'purchase_unit') ? { purchaseUnit: data.purchaseUnit } : {}),
        ...(this.hasField(body, 'purchaseQuantity', 'purchase_quantity') ? { purchaseQuantity: data.purchaseQuantity } : {}),
        ...(this.hasField(body, 'unit') ? { unit: data.unit } : {}),
        ...(this.hasField(body, 'packageContent', 'package_content') ? { packageContent: data.packageContent } : {}),
        ...(this.hasField(body, 'purchasePrice', 'purchase_price') ? { purchasePrice: data.purchasePrice } : {}),
        ...(this.hasField(body, 'manualUnitCostEnabled', 'manual_unit_cost_enabled') ? { manualUnitCostEnabled: data.manualUnitCostEnabled } : {}),
        ...(this.hasField(body, 'manualUnitCost', 'manual_unit_cost') ? { manualUnitCost: data.manualUnitCost } : {}),
        ...(automaticUnitCost !== undefined ? { automaticUnitCost } : {}),
        ...(this.hasField(body, 'stockQuantity', 'stock_quantity') ? { stockQuantity: data.stockQuantity } : {}),
        ...(this.hasField(body, 'status') ? { status: data.status } : {}),
      };
      const stockCard = await this.prisma.stockCard.update({
        where: { id },
        data: updateData,
      });

      return this.serialize(stockCard);
    } catch (error) {
      this.handleUniqueError(error);
    }
  }

  async uploadImage(id: number, file: Express.Multer.File | undefined, makeMain = false) {
    if (!file) throw new BadRequestException('Görsel yüklenemedi.');
    if (!file.mimetype.startsWith('image/')) throw new BadRequestException('Sadece görsel dosyası yüklenebilir.');
    const existing = await this.ensureStockCard(id);
    const folderName = this.stockImageFolderName(existing);
    const fileBaseName = this.safeLegacyPathSegment(String(existing.name ?? 'stok'));
    const extension = extname(file.originalname) || '.jpg';
    const destination = join(stockImageRoot(), folderName);
    const existingImageCount = await this.prisma.stockCardImage.count({ where: { stockCardId: id } });
    const finalFileName = `${fileBaseName}-${existingImageCount + 1}${extension.toLowerCase()}`;
    const finalPath = join(destination, finalFileName);
    fs.mkdirSync(destination, { recursive: true });
    fs.copyFileSync(file.path, finalPath);
    fs.unlinkSync(file.path);
    const publicPath = `/stock-images/${folderName}/${finalFileName}`;
    const folderLabel = destination;

    const shouldMakeMain = makeMain || (!existing.imagePath && existingImageCount === 0);
    const stockCard = await this.prisma.$transaction(async (tx) => {
      if (shouldMakeMain) {
        await tx.stockCardImage.updateMany({
          where: { stockCardId: id, isMain: true },
          data: { isMain: false },
        });
      }

      const updatedStockCard = await tx.stockCard.update({
        where: { id },
        data: {
          imagePath: shouldMakeMain ? publicPath : existing.imagePath ?? publicPath,
        },
      });

      await tx.stockCardImage.create({
        data: {
          stockCardId: id,
          fileName: finalFileName,
          filePath: publicPath,
          folderName: folderLabel,
          fileType: file.mimetype,
          isMain: shouldMakeMain,
        },
      });

      await tx.mediaFile.create({
        data: {
          productId: null,
          fileName: finalFileName,
          filePath: publicPath,
          folderName: folderLabel,
          fileType: file.mimetype,
        },
      });

      return updatedStockCard;
    });

    const updatedStockCard = await this.prisma.stockCard.findUnique({
      where: { id: stockCard.id },
      include: {
        images: { orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }] },
        movements: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { productCostItems: true, productPotItems: true } },
      },
    });

    return this.serialize(updatedStockCard ?? stockCard);
  }

  async setMainImage(id: number, imageId: number) {
    const image = await this.prisma.stockCardImage.findFirst({
      where: { id: imageId, stockCardId: id },
    });
    if (!image) throw new NotFoundException('Stok görseli bulunamadı.');

    const stockCard = await this.prisma.$transaction(async (tx) => {
      await tx.stockCardImage.updateMany({
        where: { stockCardId: id, isMain: true },
        data: { isMain: false },
      });
      await tx.stockCardImage.update({
        where: { id: imageId },
        data: { isMain: true },
      });
      return tx.stockCard.update({
        where: { id },
        data: { imagePath: image.filePath },
        include: {
          images: { orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }] },
          movements: { orderBy: { createdAt: 'desc' }, take: 1 },
          _count: { select: { productCostItems: true, productPotItems: true } },
        },
      });
    });

    return this.serialize(stockCard);
  }

  async addMovement(id: number, payload: unknown, userRole?: string) {
    const body = (payload ?? {}) as Record<string, unknown>;
    const type = this.optionalString(body.type) === 'OUT' ? 'OUT' : 'IN';
    if (userRole === 'STAFF' && type === 'OUT') {
      throw new BadRequestException('Personel sadece stok giri?i yapabilir.');
    }
    const quantity = this.roundQuantity(this.optionalNumber(body.quantity) ?? 0);
    if (quantity <= 0) throw new BadRequestException('Miktar sıfırdan büyük olmalıdır.');

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM stock_cards WHERE id = ${id} FOR UPDATE`;
      const stockCard = await tx.stockCard.findUnique({ where: { id } });
      if (!stockCard) throw new NotFoundException('Stok kart? bulunamad?.');

      const previousStock = this.roundQuantity(Number(stockCard.stockQuantity));
      const nextStock = this.roundQuantity(type === 'IN' ? previousStock + quantity : previousStock - quantity);
      if (nextStock < 0) throw new BadRequestException('Stok sıfırın altına düşemez.');

      const purchasePrice = this.optionalNumber(body.purchasePrice);
      const packageContent = Number(stockCard.packageContent) > 0 ? Number(stockCard.packageContent) : 1;
      const updateData: Prisma.StockCardUpdateInput = {
        stockQuantity: nextStock,
        lastMovementAt: new Date(),
        supplierName: this.optionalString(body.supplierName) ?? stockCard.supplierName,
      };
      if (type === 'IN' && purchasePrice !== undefined) {
        updateData.purchasePrice = purchasePrice;
        updateData.automaticUnitCost = this.calculateUnitCost(
          purchasePrice,
          packageContent,
          Boolean(stockCard.manualUnitCostEnabled),
          Number(stockCard.manualUnitCost),
        ) ?? 0;
      }

      const saved = await tx.stockCard.update({ where: { id }, data: updateData });
      await tx.stockMovement.create({
        data: {
          stockCardId: id,
          type,
          quantity,
          unit: stockCard.unit,
          previousStock,
          nextStock,
          reason: this.optionalString(body.reason),
          supplierName: this.optionalString(body.supplierName),
          documentNo: this.optionalString(body.documentNo),
          paymentStatus: this.optionalString(body.paymentStatus),
          note: this.optionalString(body.note),
        },
      });

      return saved;
    });

    return this.serialize(updated, userRole);
  }

  async listMovements(id: number, userRole?: string) {
    if (userRole !== 'OWNER') {
      throw new BadRequestException('Stok hareket geçmişini sadece sistem sahibi görebilir.');
    }
    await this.ensureStockCard(id);
    const movements = await this.prisma.stockMovement.findMany({
      where: { stockCardId: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return movements.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      previousStock: Number(item.previousStock),
      nextStock: Number(item.nextStock),
    }));
  }

  async remove(id: number, hardDelete = false) {
    const stockCard = await this.ensureStockCard(id);
    if (hardDelete) {
      if (!this.isTestStockCard(stockCard)) {
        throw new BadRequestException('Kalıcı silme sadece deneme/test stok kartları için yapılabilir. Gerçek stok kartları pasife alınır.');
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.stockMovement.deleteMany({ where: { stockCardId: id } });
        await tx.stockCountItem.deleteMany({ where: { stockCardId: id } });
        await tx.stockUsageLog.deleteMany({ where: { stockCardId: id } });
        await tx.stockCardImage.deleteMany({ where: { stockCardId: id } });
        await tx.productCostItem.updateMany({ where: { stockCardId: id }, data: { stockCardId: null } });
        await tx.productPotItem.updateMany({ where: { stockCardId: id }, data: { stockCardId: null } });
        await tx.productionPotOption.updateMany({ where: { stockCardId: id }, data: { stockCardId: null } });
        await tx.productionTemplateComponent.updateMany({ where: { stockCardId: id }, data: { stockCardId: null } });
        await tx.recipeItem.deleteMany({ where: { stockCardId: id } });
        await tx.stockCard.delete({ where: { id } });
      });

      return { ok: true, deleted: true };
    }

    return this.serialize(await this.prisma.stockCard.update({
      where: { id },
      data: { status: 'PASSIVE' },
    }));
  }

  private normalize(payload: unknown): StockCardPayload {
    const body = (payload ?? {}) as Record<string, unknown>;
    return {
      name: this.optionalString(body.name),
      sku: this.optionalString(body.sku) || null,
      category: this.optionalString(body.category) || null,
      color: this.optionalString(body.color) || null,
      model: this.optionalString(body.model) || null,
      size: this.optionalString(body.size) || null,
      productFamily: this.optionalString(body.productFamily ?? body.product_family) || null,
      productType: this.optionalString(body.productType ?? body.product_type) || null,
      height: this.optionalString(body.height) || null,
      width: this.optionalString(body.width) || null,
      potType: this.optionalString(body.potType ?? body.pot_type) || null,
      potColor: this.optionalString(body.potColor ?? body.pot_color) || null,
      potSize: this.optionalString(body.potSize ?? body.pot_size) || null,
      trunkType: this.optionalString(body.trunkType ?? body.trunk_type) || null,
      leafFlowerType: this.optionalString(body.leafFlowerType ?? body.leaf_flower_type) || null,
      brand: this.optionalString(body.brand) || null,
      oldModelCode: this.optionalString(body.oldModelCode ?? body.old_model_code) || null,
      barcode: this.optionalString(body.barcode) || null,
      salePrice: this.optionalNumber(body.salePrice ?? body.sale_price),
      warehouse: this.optionalString(body.warehouse) || null,
      shelfLocation: this.optionalString(body.shelfLocation ?? body.shelf_location) || null,
      shortDescription: this.optionalString(body.shortDescription ?? body.short_description) || null,
      technicalSpecs: this.optionalString(body.technicalSpecs ?? body.technical_specs) || null,
      seoTitle: this.optionalString(body.seoTitle ?? body.seo_title) || null,
      metaDescription: this.optionalString(body.metaDescription ?? body.meta_description) || null,
      imagePath: this.optionalString(body.imagePath ?? body.image_path) || null,
      description: this.optionalString(body.description) || null,
      criticalStockLevel: this.optionalNumber(body.criticalStockLevel ?? body.critical_stock_level),
      supplierName: this.optionalString(body.supplierName ?? body.supplier_name) || null,
      purchaseUnit: this.optionalString(body.purchaseUnit ?? body.purchase_unit),
      purchaseQuantity: this.optionalNumber(body.purchaseQuantity ?? body.purchase_quantity),
      unit: this.optionalString(body.unit),
      packageContent: this.optionalNumber(body.packageContent ?? body.package_content),
      purchasePrice: this.optionalNumber(body.purchasePrice ?? body.purchase_price),
      manualUnitCostEnabled: this.optionalBoolean(body.manualUnitCostEnabled ?? body.manual_unit_cost_enabled),
      manualUnitCost: this.optionalNumber(body.manualUnitCost ?? body.manual_unit_cost),
      stockQuantity: this.optionalNumber(body.stockQuantity ?? body.stock_quantity),
      status: body.status === 'PASSIVE' ? 'PASSIVE' : body.status === 'ACTIVE' ? 'ACTIVE' : undefined,
    };
  }

  private optionalString(value: unknown) {
    if (value === undefined || value === null) return undefined;
    return String(value).trim();
  }

  private optionalNumber(value: unknown) {
    if (value === undefined || value === null || value === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private optionalBoolean(value: unknown) {
    if (value === undefined || value === null || value === '') return undefined;
    return value === true || value === 'true' || value === '1' || value === 1;
  }

  private hasField(body: Record<string, unknown>, ...keys: string[]) {
    return keys.some((key) => Object.prototype.hasOwnProperty.call(body, key));
  }

  private async ensureStockIdentity(tx: any, data: StockCardPayload) {
    const sku = data.sku || await this.nextSku(tx, data);
    const model = data.model && !/^STOK-\d+$/i.test(data.model) ? data.model : await this.nextStockModel(tx);
    const barcode = data.barcode || await this.nextStockBarcode(tx);

    if (!sku || !model || !barcode) {
      throw new BadRequestException('Stok kodu, model kodu ve barkod olusmadan stok karti kaydedilemez.');
    }

    const duplicate = await tx.stockCard.findFirst({
      where: { OR: [{ sku }, { model }, { barcode }] },
      select: { id: true, sku: true, model: true, barcode: true },
    });
    if (duplicate) {
      throw new BadRequestException('Stok kodu, model kodu veya barkod baska bir stok kartinda kullaniliyor.');
    }

    return { sku, model, barcode };
  }

  private async nextSku(tx: any, data: StockCardPayload) {
    const prefix = this.stockCodePrefix(data);
    if (!prefix) {
      throw new BadRequestException('Bu ürün tipi için stok kodu ön eki tanımlı değil. Lütfen kategori ve ürün tipini seçin.');
    }

    const existing = await tx.stockCard.findMany({
      where: { sku: { startsWith: `${prefix}-` } },
      select: { sku: true },
    });
    const maxFromDb = existing.reduce((max: number, item: { sku: string | null }) => {
      const match = String(item.sku ?? '').match(new RegExp(`^${prefix}-(\\d{4,})$`));
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    const maxFromFolders = this.maxFolderSequence(prefix);
    const next = Math.max(maxFromDb, maxFromFolders) + 1;
    return `${prefix}-${String(next).padStart(4, '0')}`;
  }

  private async nextStockModel(tx: any) {
    const existing = await tx.stockCard.findMany({
      where: { model: { startsWith: 'STK-' } },
      select: { model: true },
    });
    const max = existing.reduce((current: number, item: { model: string | null }) => {
      const match = String(item.model ?? '').match(/^STK-(\d{6})$/);
      return match ? Math.max(current, Number(match[1])) : current;
    }, 0);
    return `STK-${String(max + 1).padStart(6, '0')}`;
  }

  private async nextStockBarcode(tx: any) {
    const existing = await tx.stockCard.findMany({
      where: { barcode: { not: null } },
      select: { barcode: true },
    });
    const maxFromDb = existing.reduce((current: number, item: { barcode: string | null }) => {
      const value = Number(item.barcode);
      return Number.isFinite(value) ? Math.max(current, value) : current;
    }, 869900000000000);
    const maxFromFolders = this.maxFolderBarcode();
    return String(Math.max(maxFromDb, maxFromFolders) + 1);
  }

  private stockCodePrefix(data: StockCardPayload) {
    const text = this.normalizeText(`${data.category ?? ''} ${data.productFamily ?? ''} ${data.productType ?? ''} ${data.name ?? ''}`);
    if (this.isStoneText(text)) return 'TAS';
    if ((text.includes('separator') || text.includes('seperator')) && text.includes('saksi')) return 'SEP';
    if (text.includes('mdf') && text.includes('saksi')) return 'MDF';
    if (text.includes('metal') && text.includes('saksi')) return 'MSK';
    if ((text.includes('plastik') || text.includes('lale') || text.includes('lotus')) && text.includes('saksi')) return 'PSK';
    if (text.includes('saksi')) return 'MSK';
    if (text.includes('bambu') && text.includes('govde')) return 'BMG';
    if (text.includes('govde')) return 'GOV';
    if (text.includes('sarmas') || text.includes('cit')) return 'SRM';
    if (text.includes('yaprak')) return 'YAP';
    if (text.includes('demet') || text.includes('cicek') || text.includes('gul') || text.includes('sakayik')) return 'DMT';
    if (text.includes('silikon') || text.includes('yardimci') || /\blif\w*/.test(text)) return 'YRD';
    return null;
  }

  private isStoneStock(data: StockCardPayload) {
    return this.isStoneText(this.normalizeText(`${data.category ?? ''} ${data.productFamily ?? ''} ${data.productType ?? ''} ${data.name ?? ''}`));
  }

  private isStoneText(text: string) {
    return (
      text.includes('tas') ||
      text.includes('dolomit') ||
      text.includes('cakil') ||
      text.includes('dere tasi') ||
      text.includes('mermer kirigi') ||
      text.includes('dekoratif tas')
    );
  }

  private maxFolderSequence(prefix: string) {
    return this.stockImageFolders().reduce((max, name) => {
      const match = name.match(new RegExp(`^${prefix}-(\\d{4,})_`));
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
  }

  private maxFolderBarcode() {
    return this.stockImageFolders().reduce((max, name) => {
      const match = name.match(/^[A-Z]{2,5}-\d{4,}_(\d{13,15})_/);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 869900000000000);
  }

  private stockImageFolders() {
    const root = stockImageRoot();
    if (!fs.existsSync(root)) return [];
    return fs.readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  }

  private normalizeText(value: string) {
    return value
      .toLocaleLowerCase('tr-TR')
      .replaceAll('\u0131', 'i')
      .replaceAll('\u011f', 'g')
      .replaceAll('\u00fc', 'u')
      .replaceAll('\u015f', 's')
      .replaceAll('\u00f6', 'o')
      .replaceAll('\u00e7', 'c')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private normalizePublicImagePath(path?: unknown) {
    const value = this.optionalString(path);
    if (!value) return value;
    if (/^https?:\/\//i.test(value)) return value;

    const stockRoot = stockImageRoot();
    const normalizedValue = value.replace(/\\/g, '/');
    const normalizedStockRoot = stockRoot.replace(/\\/g, '/').replace(/\/+$/g, '');
    if (normalizedValue.toLocaleLowerCase('tr-TR').startsWith(normalizedStockRoot.toLocaleLowerCase('tr-TR'))) {
      const relative = normalizedValue.slice(normalizedStockRoot.length).replace(/^\/+/g, '');
      return `/stock-images/${relative}`;
    }

    if (value.startsWith('/uploads/stock-cards/legacy/')) {
      const resolved = this.resolveLegacyUploadPath(value);
      if (resolved) return resolved;
    }

    return value;
  }

  private resolveLegacyUploadPath(publicPath: string) {
    const prefix = '/uploads/stock-cards/legacy/';
    const relative = publicPath.slice(prefix.length);
    const [folderName, ...fileParts] = relative.split('/');
    const fileName = fileParts.join('/');
    if (!folderName || !fileName) return null;

    const directPath = join(process.cwd(), 'uploads', 'stock-cards', 'legacy', folderName, fileName);
    if (fs.existsSync(directPath)) return publicPath;

    const skuPrefix = folderName.split('_')[0];
    if (!skuPrefix) return null;
    const legacyRoot = join(process.cwd(), 'uploads', 'stock-cards', 'legacy');
    if (!fs.existsSync(legacyRoot)) return null;

    const matchingFolder = fs
      .readdirSync(legacyRoot, { withFileTypes: true })
      .find((entry) => entry.isDirectory() && entry.name.toLocaleLowerCase('tr-TR').startsWith(`${skuPrefix.toLocaleLowerCase('tr-TR')}_`));
    if (!matchingFolder) return null;

    const matchedPath = join(legacyRoot, matchingFolder.name, fileName);
    if (!fs.existsSync(matchedPath)) return null;
    return `${prefix}${matchingFolder.name}/${fileName}`;
  }

  private stockImageFolderName(stockCard: Record<string, unknown>) {
    const parts = [stockCard.sku, stockCard.barcode, stockCard.name]
      .map((value) => this.optionalString(value))
      .filter((value, index, all): value is string => Boolean(value) && all.indexOf(value) === index);

    return this.safeLegacyPathSegment(parts.join('_') || `STOK_${stockCard.id ?? ''}`);
  }

  private ensureStockImageFolder(stockCard: Record<string, unknown>) {
    const folderName = this.stockImageFolderName(stockCard);
    const destination = join(stockImageRoot(), folderName);
    fs.mkdirSync(destination, { recursive: true });
    return destination;
  }

  private safeLegacyPathSegment(value: string) {
    const cleaned = value
      .toLocaleUpperCase('tr-TR')
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
      .replace(/[^A-Z0-9._-]+/g, '_')
      .replace(/^_+|_+$/g, '');

    return cleaned || 'STOK_KARTI';
  }

  private safePathSegment(value: string) {
    const cleaned = value
      .toLocaleLowerCase('tr-TR')
      .replaceAll('\u0131', 'i')
      .replaceAll('\u011f', 'g')
      .replaceAll('\u00fc', 'u')
      .replaceAll('\u015f', 's')
      .replaceAll('\u00f6', 'o')
      .replaceAll('\u00e7', 'c')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return cleaned || 'stok-karti';
  }

  private calculateUnitCost(purchasePrice?: number, packageContent?: number, manualEnabled?: boolean, manualUnitCost?: number) {
    if (manualEnabled) return Math.round((manualUnitCost ?? 0) * 10000) / 10000;
    if (purchasePrice === undefined && packageContent === undefined) return undefined;
    const price = purchasePrice ?? 0;
    const content = packageContent && packageContent > 0 ? packageContent : 1;
    return Math.round((price / content) * 10000) / 10000;
  }

  private roundQuantity(value: number) {
    return Math.round((Number(value) + Number.EPSILON) * 1000) / 1000;
  }

  private serialize(stockCard: {
    purchasePrice: Prisma.Decimal;
    purchaseUnit?: string;
    purchaseQuantity?: Prisma.Decimal;
    packageContent: Prisma.Decimal;
    manualUnitCostEnabled?: boolean;
    manualUnitCost?: Prisma.Decimal;
    automaticUnitCost: Prisma.Decimal;
    stockQuantity: Prisma.Decimal;
    criticalStockLevel?: Prisma.Decimal;
    salePrice?: Prisma.Decimal;
  } & Record<string, unknown>, userRole?: string) {
    const images = Array.isArray(stockCard.images)
      ? stockCard.images.map((image) => ({
          ...(image as Record<string, unknown>),
          filePath: this.normalizePublicImagePath((image as Record<string, unknown>).filePath),
        }))
      : stockCard.images;
    const imagePath = this.normalizePublicImagePath(stockCard.imagePath);

    if (userRole === 'STAFF') {
      return {
        ...stockCard,
        imagePath,
        images,
        purchasePrice: Number(stockCard.purchasePrice),
        purchaseUnit: stockCard.purchaseUnit ?? stockCard.unit,
        purchaseQuantity: Number(stockCard.purchaseQuantity ?? 1),
        packageContent: Number(stockCard.packageContent),
        manualUnitCostEnabled: Boolean(stockCard.manualUnitCostEnabled),
        manualUnitCost: Number(stockCard.manualUnitCost ?? 0),
        automaticUnitCost: Number(stockCard.automaticUnitCost),
        salePrice: Number(stockCard.salePrice ?? 0),
        stockQuantity: null,
        criticalStockLevel: null,
        lastMovementAt: null,
        movements: undefined,
      };
    }

    return {
      ...stockCard,
      imagePath,
      images,
      purchasePrice: Number(stockCard.purchasePrice),
      purchaseUnit: stockCard.purchaseUnit ?? stockCard.unit,
      purchaseQuantity: Number(stockCard.purchaseQuantity ?? 1),
      packageContent: Number(stockCard.packageContent),
      manualUnitCostEnabled: Boolean(stockCard.manualUnitCostEnabled),
      manualUnitCost: Number(stockCard.manualUnitCost ?? 0),
      automaticUnitCost: Number(stockCard.automaticUnitCost),
      salePrice: Number(stockCard.salePrice ?? 0),
      stockQuantity: Number(stockCard.stockQuantity),
      criticalStockLevel: Number(stockCard.criticalStockLevel ?? 0),
    };
  }

  private async ensureStockCard(id: number) {
    const stockCard = await this.prisma.stockCard.findUnique({ where: { id } });
    if (!stockCard) throw new NotFoundException('Stok kartı bulunamadı.');
    return stockCard;
  }

  private isTestStockCard(stockCard: { name: string; sku?: string | null; category?: string | null; description?: string | null }) {
    const text = normalize(`${stockCard.name} ${stockCard.sku ?? ''} ${stockCard.category ?? ''} ${stockCard.description ?? ''}`);
    return text.includes('test') || text.includes('deneme');
  }

  private handleUniqueError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new BadRequestException('Bu stok kodu zaten kullanılıyor.');
    }
    throw error;
  }
}

function normalize(value: string) {
  return value.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
