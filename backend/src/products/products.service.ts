import { BadRequestException, Injectable } from '@nestjs/common';
import { cleanMojibakeDeep } from '../common/mojibake';
import { Prisma } from '../generated/prisma-client';
import { PrismaService } from '../prisma/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

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
      return await this.prisma.product.create({
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
          status: data.status ?? 'ACTIVE',
          description: data.description,
        },
        include: { category: true },
      });
    } catch (error) {
      this.handleUniqueError(error);
    }
  }

  async update(id: number, payload: unknown) {
    const data = this.normalize(payload);
    try {
      await this.ensureUniqueProductIdentity(data, id);
      return await this.prisma.product.update({
        where: { id },
        data: {
          productName: data.productName,
          modelCode: data.modelCode,
          barcode: data.barcode,
          categoryId: data.categoryId,
          stockQuantity: data.stockQuantity,
          criticalStockLevel: data.criticalStockLevel,
          costPrice: data.costPrice,
          desi: data.desi,
          shippingCost: data.shippingCost,
          shopPrice: data.shopPrice,
          sitePrice: data.sitePrice,
          marketPrice: data.marketPrice,
          listPrice: data.listPrice,
          imageUrls: data.imageUrls,
          brand: data.brand,
          vatRate: data.vatRate,
          origin: data.origin,
          colorVariant: data.colorVariant,
          material: data.material,
          packageDimensions: data.packageDimensions,
          warrantyMonths: data.warrantyMonths,
          warrantyType: data.warrantyType,
          status: data.status,
          description: data.description,
        },
        include: { category: true },
      });
    } catch (error) {
      this.handleUniqueError(error);
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
