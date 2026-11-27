import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { revalidateSite } from '../common/site-revalidate';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import PDFDocument = require('pdfkit');
import * as QRCode from 'qrcode';
import { cleanMojibakeDeep } from '../common/mojibake';
import { Prisma } from '../generated/prisma-client';
import { PrismaService } from '../prisma/prisma.service';
import { ProductionCostsService } from '../production-costs/production-costs.service';
import { IntegrationCenterService } from '../integrations/services/integration-center.service';
import { TrendyolAdapter } from '../integrations/adapters/trendyol.adapter';
import { resolveGeminiModel } from '../common/gemini-model';
import { STORE_DEFAULT_BRAND, normalizeStoreCode, storeFilter, withFloraPrefix } from '../common/store';

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
  n11SalePrice?: unknown;
  hepsiburadaSalePrice?: unknown;
  commissionPercent?: unknown;
  images?: unknown;
  status?: unknown;
  storeCode?: unknown;
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
  marketplaceSalePrice?: unknown;
  description?: unknown;
  initialStockQuantity?: unknown;
  mainImageUrl?: unknown;
  storeCode?: unknown;
  imageUrls?: unknown;
  marketPrice?: unknown;
};

@Injectable()
export class ProductCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productionCosts: ProductionCostsService,
    private readonly integrationCenter: IntegrationCenterService,
    private readonly config: ConfigService,
  ) {}

  async listEntries(search?: string, store?: string) {
    // Liste en son güncellenen 1000 kayıtla sınırlı; arama verilirse TÜM kayıtlarda aranır (eski ürünler de bulunur)
    const term = search?.trim();
    const storeCode = storeFilter(store);
    const searchWhere = term
      ? {
          OR: [
            { productName: { contains: term, mode: 'insensitive' as const } },
            { barcode: { contains: term } },
            { currentModelCode: { contains: term, mode: 'insensitive' as const } },
            { supplierStockCode: { contains: term, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const where = storeCode ? { ...searchWhere, storeCode } : searchWhere;
    const variants = await this.prisma.trendyolProductVariant.findMany({
      where,
      include: {
        product: { include: { category: true, mediaFiles: true } },
        family: true,
        sizeOption: true,
        potOption: true,
        productCostDraft: { include: { items: true, pots: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: term ? 200 : 1000,
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
    const n11SalePrice = this.optionalNumber(payload.n11SalePrice) ?? 0;
    const hepsiburadaSalePrice = this.optionalNumber(payload.hepsiburadaSalePrice) ?? 0;
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
      // Mağaza: kayıtlı üründe değişmez (Erhan ürünü sonradan Flora'ya taşınmaz), yeni üründe seçilen mağaza
      const storeCode = existingVariant ? normalizeStoreCode((existingVariant as any).storeCode) : normalizeStoreCode(payload.storeCode);
      const sizeVariant = this.text(payload.colorVariant) || productName;
      let modelCode = (this.text(payload.modelCode)?.toUpperCase()
        || existingVariant?.currentModelCode
        || existingVariant?.proposedModelCode
        || existingVariant?.product?.modelCode
        || await this.nextModelCode(tx, category)).toUpperCase();
      if (storeCode === 'FLORA' && !existingVariant) modelCode = withFloraPrefix(modelCode);
      const defaultBrand = STORE_DEFAULT_BRAND[storeCode];
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
        brand: this.text(payload.brand) || defaultBrand,
        storeCode,
        colorVariant: this.text(payload.colorVariant),
        description: this.text(payload.description),
        stockQuantity: this.optionalInt(payload.stockQuantity) ?? 0,
        status,
        catalogCategory: this.text((payload as any).catalogCategory) || undefined,
      });

      const data: any = {
        productId: product.id,
        barcode,
        productName,
        currentModelCode: modelCode,
        proposedModelCode: modelCode,
        supplierStockCode: stockCode,
        brand: this.text(payload.brand) || defaultBrand,
        storeCode,
        trendyolCategoryName: this.text(payload.channelCategoryName),
        productColor: this.text(payload.colorVariant),
        productDescription: this.text(payload.description),
        stockQuantity: this.optionalInt(payload.stockQuantity) ?? 0,
        images,
        shopCategoryId: this.optionalInt((payload as any).shopCategoryId),
        familyId: this.optionalInt(payload.familyId),
        sizeOptionId: this.optionalInt(payload.sizeOptionId),
        potOptionId: this.optionalInt(payload.potOptionId),
        templateId: this.optionalInt(payload.templateId),
        trendyolSalePrice: new Prisma.Decimal(salePrice),
        n11SalePrice: new Prisma.Decimal(n11SalePrice || salePrice),
        hepsiburadaSalePrice: new Prisma.Decimal(hepsiburadaSalePrice || salePrice),
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

      // Maliyet taslağı yoksa otomatik oluştur — "Maliyet Girilmedi" göstermemek için
      const existingDraft = await tx.productCostDraft.findUnique({ where: { variantId: variant.id } });
      if (!existingDraft) {
        await tx.productCostDraft.create({
          data: {
            variantId: variant.id,
            salePrice: new Prisma.Decimal(salePrice),
            profitMarginPercent: new Prisma.Decimal(45),
            vatPercent: new Prisma.Decimal(20),
            marketplaceMarkupPercent: new Prisma.Decimal(25),
            campaignBufferPercent: new Prisma.Decimal(10),
            shippingCost: new Prisma.Decimal(0),
            desi: new Prisma.Decimal(1),
            status: 'DRAFT',
          },
        });
      }

      const result = { ok: true, entry: await this.findEntry(tx, variant.id) };
      // sitePrice > 0 ise site cache'ini anında sıfırla
      void revalidateSite();
      return result;
    });
  }

  async generateEntryIdentity(payload: EntryPayload) {
    const categoryId = this.requiredInt(payload.categoryId, 'Kategori zorunludur.');
    const productName = this.text(payload.productName) || 'Urun';
    const sizeVariant = this.text(payload.colorVariant) || productName;

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('LOCK TABLE "products", "trendyol_product_variants", "stock_cards", "barcode_logs" IN SHARE ROW EXCLUSIVE MODE');
      const category = await tx.category.findUnique({ where: { id: categoryId } });
      if (!category) throw new BadRequestException('Kategori bulunamadi.');
      const modelCode = await this.nextModelCode(tx, category);
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
    // Pazaryeri satış fiyatı doğrudan verilirse (Flora sayfası) dükkan/site fiyatı zorunlu değil
    const marketPriceInput = this.optionalNumber(payload.marketPrice) ?? this.optionalNumber(payload.marketplaceSalePrice) ?? 0;
    const shopPrice = marketPriceInput > 0 && !(this.optionalNumber(payload.shopPrice) ?? 0)
      ? marketPriceInput
      : this.requiredPositiveNumber(payload.shopPrice, 'Dukkan satis fiyati zorunludur.');
    const sitePrice = marketPriceInput > 0 && !(this.optionalNumber(payload.sitePrice) ?? 0)
      ? marketPriceInput
      : this.requiredPositiveNumber(payload.sitePrice, 'Site satis fiyati zorunludur.');
    const channelPrice = marketPriceInput > 0 ? Math.round(marketPriceInput) : Math.round(sitePrice * 1.25);
    const quickDescription = this.text(payload.description) || undefined;
    const extraImages = this.stringArray((payload as any).extraImages);
    const initialStockQuantity = this.requiredNonNegativeNumber(payload.initialStockQuantity, 'Baslangic stok miktari zorunludur.');
    const mainImageUrl = this.requiredText(payload.mainImageUrl, 'Ana urun gorseli zorunludur.');
    const variantId = this.optionalInt(payload.variantId);
    const productId = this.optionalInt(payload.productId);

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('LOCK TABLE "products", "trendyol_product_variants", "stock_cards", "barcode_logs" IN SHARE ROW EXCLUSIVE MODE');

      const category = await tx.category.findUnique({ where: { id: categoryId } });
      if (!category) throw new BadRequestException('Ana kategori bulunamadi.');

      const existing = await this.findExistingQuickEntry(tx, productId, variantId);
      const storeCode = existing.variantId || existing.productId ? existing.storeCode : normalizeStoreCode(payload.storeCode);
      const brand = STORE_DEFAULT_BRAND[storeCode];
      const modelCode = existing.modelCode || (storeCode === 'FLORA' ? withFloraPrefix(await this.nextModelCode(tx, category)) : await this.nextModelCode(tx, category));
      const stockCode = existing.stockCode || await this.nextStockCode(tx, modelCode, sizeVariant);
      const barcode = existing.barcode || await this.nextEan13Barcode(tx);
      const images = Array.from(new Set([mainImageUrl, ...extraImages].filter(Boolean)));

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
        brand,
        storeCode,
        ...(quickDescription ? { description: quickDescription } : {}),
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

      // Tüm kanallarda fiyat eşit olsun
      const variantData = {
        productId: product.id,
        barcode,
        productName,
        currentModelCode: modelCode,
        proposedModelCode: modelCode,
        supplierStockCode: stockCode,
        brand,
        storeCode,
        trendyolCategoryName: category.name,
        productColor: sizeVariant,
        stockQuantity: Math.trunc(initialStockQuantity),
        images,
        ...(quickDescription ? { productDescription: quickDescription } : {}),
        trendyolSalePrice: new Prisma.Decimal(channelPrice),
        n11SalePrice: new Prisma.Decimal(channelPrice),
        hepsiburadaSalePrice: new Prisma.Decimal(channelPrice),
        commissionPercent: new Prisma.Decimal(20),
        status: 'ACTIVE' as const,
      };

      const variant = existing.variantId
        ? await tx.trendyolProductVariant.update({ where: { id: existing.variantId }, data: variantData })
        : await tx.trendyolProductVariant.create({ data: variantData });

      // Maliyet taslağı yoksa otomatik oluştur — "Maliyet Girilmedi" sorununu çözer
      const existingDraft = await tx.productCostDraft.findUnique({ where: { variantId: variant.id } });
      if (!existingDraft) {
        await tx.productCostDraft.create({
          data: {
            variantId: variant.id,
            profitMarginPercent: new Prisma.Decimal(45),
            vatPercent: new Prisma.Decimal(20),
            marketplaceMarkupPercent: new Prisma.Decimal(25),
            campaignBufferPercent: new Prisma.Decimal(10),
            shippingCost: new Prisma.Decimal(0),
            desi: new Prisma.Decimal(1),
            status: 'DRAFT',
          },
        });
      }

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
      const result = {
        ok: true,
        entry,
        productId: product.id,
        variantId: variant.id,
        stockCardId: null,
        productName,
        storeCode,
        modelCode,
        stockCode,
        barcode,
        initialStockQuantity,
        shopPrice,
        sitePrice,
      };
      // sitePrice > 0 ise siteyi anında güncelle
      if (sitePrice > 0 && storeCode === 'ERHAN') void revalidateSite();
      return result;
    });
  }

  // Ürün Merkezi'ne henüz bağlanmamış (productId boş) Trendyol kayıtlarını
  // düzenlenebilir bir Excel şablonu olarak dışa aktarır. Kullanıcı kategori/
  // stok bilgilerini doldurup aynı dosyayı tekrar yükleyince importExcel bu
  // kayıtları gerçek Ürün Merkezi kaydına (ve stok takibine) bağlar.
  async exportUnlinkedExcel() {
    const [variants, categories] = await Promise.all([
      this.prisma.trendyolProductVariant.findMany({
        where: { productId: null },
        orderBy: { updatedAt: 'desc' },
        take: 2000,
      }),
      this.prisma.category.findMany({ orderBy: { name: 'asc' } }),
    ]);

    const header = ['Varyant ID', 'Barkod', 'Ürün Adı', 'Kategori', 'Model Kodu', 'Stok Miktarı', 'Satış Fiyatı', 'Açıklama'];
    const data = variants.map((variant) => [
      variant.id,
      variant.barcode,
      variant.productName,
      this.guessCategoryName(variant.productName, variant.trendyolCategoryName, categories),
      variant.currentModelCode ?? variant.proposedModelCode ?? '',
      variant.stockQuantity,
      Number(variant.trendyolSalePrice ?? 0),
      variant.productDescription ?? '',
    ]);
    const sheet = XLSX.utils.aoa_to_sheet([header, ...data]);
    sheet['!cols'] = [{ wch: 10 }, { wch: 16 }, { wch: 45 }, { wch: 26 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 45 }];
    const categorySheet = XLSX.utils.aoa_to_sheet([['Geçerli Kategori Adları (Kategori sütununa aynen bu şekilde yazılmalı)'], ...categories.map((category) => [category.name])]);
    categorySheet['!cols'] = [{ wch: 40 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Bağlanmamış Ürünler');
    XLSX.utils.book_append_sheet(workbook, categorySheet, 'Kategori Listesi');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const date = new Date().toISOString().slice(0, 10);
    return {
      fileName: `Urun-Merkezi-Baglanmamis-${date}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      contentBase64: buffer.toString('base64'),
      total: variants.length,
    };
  }

  async importExcel(file: Express.Multer.File | undefined) {
    if (!file?.buffer?.length) throw new BadRequestException('Excel dosyası seçilmedi.');

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new BadRequestException('Excel sayfası okunamadı.');
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });

    const categories = await this.prisma.category.findMany();
    const categoryByName = new Map(categories.map((category) => [this.normalizeText(category.name), category]));

    let created = 0;
    let updated = 0;
    const errors: Array<{ row: number; message: string }> = [];

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNumber = index + 2; // 1. satır başlık
      try {
        const variantId = this.optionalInt(row['Varyant ID']);
        const barcode = this.text(row['Barkod']);
        if (!variantId && !barcode) {
          errors.push({ row: rowNumber, message: 'Varyant ID veya Barkod zorunludur.' });
          continue;
        }

        const existingVariant = variantId
          ? await this.prisma.trendyolProductVariant.findUnique({ where: { id: variantId } })
          : await this.prisma.trendyolProductVariant.findUnique({ where: { barcode } });
        if (!existingVariant) {
          errors.push({ row: rowNumber, message: 'Eşleşen ürün bulunamadı (Varyant ID / Barkod hatalı).' });
          continue;
        }

        const categoryName = this.text(row['Kategori']);
        const category = categoryByName.get(this.normalizeText(categoryName));
        if (!category) {
          errors.push({ row: rowNumber, message: `Kategori bulunamadı: "${categoryName || '-'}".` });
          continue;
        }

        const productName = this.text(row['Ürün Adı']) || existingVariant.productName;
        const wasUnlinked = !existingVariant.productId;

        await this.upsertEntry({
          variantId: existingVariant.id,
          productId: existingVariant.productId ?? undefined,
          productName,
          categoryId: category.id,
          barcode: this.text(row['Barkod']) || existingVariant.barcode,
          modelCode: this.text(row['Model Kodu']) || existingVariant.currentModelCode || existingVariant.proposedModelCode || undefined,
          images: Array.isArray(existingVariant.images) ? existingVariant.images : [],
          salePrice: this.optionalNumber(row['Satış Fiyatı']) ?? Number(existingVariant.trendyolSalePrice ?? 0),
          stockQuantity: this.optionalInt(row['Stok Miktarı']) ?? existingVariant.stockQuantity,
          description: this.text(row['Açıklama']) || existingVariant.productDescription || undefined,
          channelCategoryName: existingVariant.trendyolCategoryName || undefined,
        });

        if (wasUnlinked) created++;
        else updated++;
      } catch (error) {
        errors.push({ row: rowNumber, message: error instanceof Error ? error.message : 'Bilinmeyen hata.' });
      }
    }

    return { ok: errors.length === 0, total: rows.length, created, updated, errors };
  }

  private normalizeText(value: string) {
    return value.trim().toLocaleLowerCase('tr-TR');
  }

  // Ürün adına bakarak en olası kategoriyi tahmin eder. Kesin bir eşleşme değildir;
  // Excel'e "kontrol edilmesi gereken" bir başlangıç değeri olarak yazılır.
  private guessCategoryName(productName: string, trendyolCategoryName: string | null, categories: Array<{ id: number; name: string }>) {
    const text = this.normalizeText(`${productName} ${trendyolCategoryName ?? ''}`);
    const rules: Array<{ pattern: RegExp; categoryName: string }> = [
      { pattern: /dikey bah[cç]e/, categoryName: 'Dikey Bahçe' },
      { pattern: /saks[iı](?!l[iı])/, categoryName: 'Saksılar' },
      { pattern: /bambu.*(tek|gövde|govde)|tek.*bambu/, categoryName: 'Bambu Tekli' },
      { pattern: /bambu/, categoryName: 'Bambu Saksılı' },
      { pattern: /a[gğ]a[cç]|palmiye|ficus|benjamin|areka|zeytin|limon a[gğ]ac/, categoryName: 'Ağaçlar' },
      { pattern: /[cç]i[cç]ek|demet|buket|orkide|lale|g[uü]l\b/, categoryName: 'Çiçekler' },
    ];
    const match = rules.find((rule) => rule.pattern.test(text));
    if (!match) return '';
    const found = categories.find((category) => this.normalizeText(category.name) === this.normalizeText(match.categoryName));
    return found?.name ?? '';
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
    catalogCategory?: string;
    storeCode?: string;
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
      catalogCategory: data.catalogCategory ?? undefined,
      storeCode: data.storeCode ?? 'ERHAN',
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
      storeCode: normalizeStoreCode(variant.storeCode),
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
      n11SalePrice: Number(variant.n11SalePrice ?? variant.trendyolSalePrice ?? 0),
      hepsiburadaSalePrice: Number(variant.hepsiburadaSalePrice ?? variant.trendyolSalePrice ?? 0),
      commissionPercent: Number(variant.commissionPercent ?? 20),
      images,
      costStatus: draft?.status === 'APPROVED' ? 'Tamamlandi' : draft ? 'Taslak' : 'Maliyet Girilmedi',
      totalCost: Number(draft?.totalCost ?? 0),
      seoApprovalStatus: variant.seoApprovalStatus,
      status: variant.status,
      updatedAt: variant.updatedAt,
      catalogCategory: product?.catalogCategory ?? null,
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
      storeCode: normalizeStoreCode(variant?.storeCode ?? product?.storeCode),
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

  // Model kodu prensibi: ERH-XXXX, kategori bazinda ayrilmis numara serisi
  // (orn. Agaclar 1000'ler, Bambu Saksili 2000'ler). Kategori.startCode/currentCode
  // serinin sinirini ve son kullanilan numarayi tutar.
  private async nextModelCode(tx: Prisma.TransactionClient, category: { id: number; codePrefix: string; startCode: number; currentCode: number }) {
    const prefix = category.codePrefix || 'ERH';
    let next = Math.max(category.currentCode + 1, category.startCode);

    for (let attempt = 0; attempt < 10000; attempt += 1) {
      const modelCode = `${prefix}-${next}`;
      const duplicate = await tx.product.findFirst({ where: { modelCode }, select: { id: true } })
        || await tx.trendyolProductVariant.findFirst({ where: { OR: [{ currentModelCode: modelCode }, { proposedModelCode: modelCode }] }, select: { id: true } })
        || await tx.stockCard.findFirst({ where: { OR: [{ sku: modelCode }, { model: modelCode }] }, select: { id: true } });
      if (!duplicate) {
        await tx.category.update({ where: { id: category.id }, data: { currentCode: next } });
        return modelCode;
      }
      next += 1;
    }
    throw new BadRequestException('Benzersiz model kodu uretilemedi.');
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

  async trendyolPublish(variantId: number, body: unknown, companyCode = 'ERHAN') {
    const entry = await this.prisma.trendyolProductVariant.findUnique({ where: { id: variantId } });
    if (!entry) throw new NotFoundException('Ürün merkezi kaydı bulunamadı.');

    const data = (body ?? {}) as Record<string, unknown>;

    const barcode = String(data.barcode ?? entry.barcode ?? '').trim();
    if (!barcode) throw new BadRequestException('Trendyol gönderimi için barkod zorunludur.');

    const categoryId = Number(data.categoryId);
    if (!categoryId) throw new BadRequestException('Trendyol kategori ID zorunludur.');

    const salePrice = Number(data.salePrice ?? 0);
    if (!salePrice) throw new BadRequestException('Satış fiyatı sıfır olamaz.');

    const baseUrl = (process.env.PUBLIC_BASE_URL ?? 'https://api.florayapaycicek.com').replace(/\/+$/, '');
    const images = (entry.images as Array<{ filePath: string; isMain: boolean }> ?? [])
      .sort((a, b) => Number(b.isMain) - Number(a.isMain))
      .map((img) => img.filePath.startsWith('http') ? img.filePath : `${baseUrl}/uploads/${img.filePath.replace(/^\//, '')}`);

    const modelCode = String(data.modelCode ?? entry.currentModelCode ?? barcode).trim();

    const payload = {
      barcode,
      productName: String(data.productName ?? entry.productName ?? '').trim(),
      modelCode,
      categoryId,
      stockQuantity: Number(entry.stockQuantity ?? 0),
      salePrice,
      listPrice: Number(data.listPrice ?? salePrice),
      description: String(data.description ?? entry.productDescription ?? '').trim(),
      color: String(data.color ?? 'Çok Renkli').trim(),
      flowerType: String(data.flowerType ?? '').trim(),
      vatRate: Number(data.vatRate ?? 20),
      desi: Number(data.desi ?? 1),
      images,
    };

    // Barkod veya model kodu kaydedilmemişse veritabanına yaz
    const needsUpdate = !entry.barcode || !entry.currentModelCode;
    if (needsUpdate) {
      await this.prisma.trendyolProductVariant.update({
        where: { id: variantId },
        data: {
          ...(entry.barcode ? {} : { barcode }),
          ...(entry.currentModelCode ? {} : { currentModelCode: modelCode }),
        },
      });
    }

    // Ürün her zaman kendi mağazasının hesabına gider (Flora ürünü Erhan'a, Erhan ürünü Flora'ya gitmez)
    const store = normalizeStoreCode((entry as any).storeCode);
    if (companyCode && normalizeStoreCode(companyCode) !== store) {
      throw new BadRequestException(`Bu ürün ${store} mağazasına ait; ${companyCode.toUpperCase()} hesabına gönderilmez.`);
    }
    const credentials = await this.integrationCenter.storeCredentials('TRENDYOL', store);
    const adapter = new TrendyolAdapter(credentials);
    return adapter.pushProduct(payload);
  }

  async trendyolCategories() {
    const credentials = await this.integrationCenter.runtimeCredentials('TRENDYOL');
    const adapter = new TrendyolAdapter(credentials);
    return adapter.fetchCategories();
  }

  async checkTrendyolBatch(batchId: string) {
    const credentials = await this.integrationCenter.runtimeCredentials('TRENDYOL');
    const adapter = new TrendyolAdapter(credentials);
    return adapter.checkBatchStatus(batchId);
  }

  // Ürün düzenleme: açıklama, görseller, model kodu, barkod, kategori → tüm platformlara broadcast
  async editVariant(id: number, body: {
    productName?: string;
    productDescription?: string;
    images?: string[];
    currentModelCode?: string;
    supplierStockCode?: string;
    barcode?: string;
    shopCategoryId?: number | null;
    // Fiziksel özellikler — bağlı Product tablosuna yazılır
    potSize?: string | null;
    potType?: string | null;
    productHeight?: string | null;
    leafCount?: number | null;
    stemCount?: number | null;
    branchCount?: number | null;
    leavesPerBranch?: number | null;
    catalogCategory?: string | null;
    catalogSubCategory?: string | null;
    videoUrl?: string | null;
  }) {
    const variantData: any = {}
    if (body.productName !== undefined) variantData.productName = body.productName
    if (body.productDescription !== undefined) variantData.productDescription = body.productDescription
    if (body.images !== undefined) variantData.images = body.images
    if (body.currentModelCode !== undefined) variantData.currentModelCode = body.currentModelCode
    if (body.supplierStockCode !== undefined) variantData.supplierStockCode = body.supplierStockCode
    if (body.barcode !== undefined) variantData.barcode = body.barcode
    if (body.shopCategoryId !== undefined) variantData.shopCategoryId = body.shopCategoryId
    if (body.videoUrl !== undefined) variantData.videoUrl = body.videoUrl
    if (body.catalogCategory !== undefined) variantData.catalogCategory = body.catalogCategory
    if (body.catalogSubCategory !== undefined) variantData.catalogSubCategory = body.catalogSubCategory

    const variantSelect = { id: true, productId: true, productName: true, barcode: true, currentModelCode: true,
                supplierStockCode: true, productDescription: true, images: true, shopCategoryId: true,
                trendyolSalePrice: true, stockQuantity: true, status: true,
                shopCategory: { select: { id: true, name: true } } }
    const variant = Object.keys(variantData).length > 0
      ? await this.prisma.trendyolProductVariant.update({ where: { id }, data: variantData, select: variantSelect })
      : await this.prisma.trendyolProductVariant.findUniqueOrThrow({ where: { id }, select: variantSelect })

    // Fiziksel özellikleri bağlı Product'a yaz
    const physicalFields: any = {}
    if (body.potSize !== undefined) physicalFields.potSize = body.potSize
    if (body.potType !== undefined) physicalFields.potType = body.potType
    if (body.productHeight !== undefined) physicalFields.productHeight = body.productHeight
    if (body.leafCount !== undefined) physicalFields.leafCount = body.leafCount
    if (body.stemCount !== undefined) physicalFields.stemCount = body.stemCount
    if (body.branchCount !== undefined) physicalFields.branchCount = body.branchCount
    if (body.leavesPerBranch !== undefined) physicalFields.leavesPerBranch = body.leavesPerBranch
    if (body.productName !== undefined) physicalFields.productName = body.productName
    if (body.currentModelCode !== undefined) physicalFields.modelCode = body.currentModelCode
    if (body.catalogCategory !== undefined) physicalFields.catalogCategory = body.catalogCategory
    if (body.catalogSubCategory !== undefined) physicalFields.catalogSubCategory = body.catalogSubCategory

    if (variant.productId && Object.keys(physicalFields).length > 0) {
      await this.prisma.product.update({ where: { id: variant.productId }, data: physicalFields }).catch(() => undefined)
    }

    void revalidateSite()
    return variant
  }

  async bulkUpdateCategory(items: { id: number; catalogCategory: string; catalogSubCategory?: string | null }[]): Promise<{ updated: number; errors: number }> {
    let updated = 0, errors = 0;
    for (const item of items) {
      try {
        const variant = await this.prisma.trendyolProductVariant.update({
          where: { id: item.id },
          data: { catalogCategory: item.catalogCategory, catalogSubCategory: item.catalogSubCategory ?? null },
          select: { id: true, productId: true },
        });
        if (variant.productId) {
          await this.prisma.product.update({
            where: { id: variant.productId },
            data: { catalogCategory: item.catalogCategory, catalogSubCategory: item.catalogSubCategory ?? null },
          }).catch(() => undefined);
        }
        updated++;
      } catch { errors++; }
    }
    void revalidateSite();
    return { updated, errors };
  }

  // Türkçe kategori adından kısa kod türetir: "Yeşil Ağaçlar" → "YA", "Benjamin" → "BEN"
  private shopCategoryCode(name: string): string {
    const norm = name.toUpperCase()
      .replace(/Ş/g, 'S').replace(/Ç/g, 'C').replace(/Ğ/g, 'G')
      .replace(/İ/g, 'I').replace(/Ö/g, 'O').replace(/Ü/g, 'U')
      .replace(/[^A-Z0-9 ]/g, '').trim();
    const words = norm.split(/\s+/).filter(Boolean);
    if (words.length === 1) return words[0].slice(0, 3);
    return words.map(w => w[0]).join('').slice(0, 3);
  }

  private static readonly CATALOG_CATEGORY_PREFIXES: Record<string, string> = {
    'Bambular > Bambu Ağaçlar': 'BA',
    'Bambular > Bambu Seperatör': 'BS',
    'Bambular > Bambu Tekli': 'BT',
    'Bitkiler > Mini Masa Bitkileri': 'BMB',
    'Bitkiler > Renkli Bitkiler': 'BRB',
    'Bitkiler > Yeşil Bitkiler': 'BYB',
    'Demet Çiçekler': 'DC',
    'Dikey Bahçe & Panel > Çiçekli Panel': 'DCP',
    'Dikey Bahçe & Panel > Yeşil Panel': 'DYP',
    'Duvar Dekorları > Çiçekli Duvar Paneli': 'DDP',
    'Kuru Çiçek & Doğal > Pamuk Dalları': 'KPD',
    'Saksı Aranjmanları': 'SA',
    'Saksılar & Vazolar > Dekoratif Vazolar': 'SDV',
    'Saksılar & Vazolar > MDF Saksı': 'SMS',
    'Saksılar & Vazolar > Metal Saksı': 'SMT',
    'Saksılar & Vazolar > Plastik Saksı': 'SPS',
    'Yapay Ağaçlar > Ficus Ağaçlar': 'YFA',
    'Yapay Ağaçlar > Hazır Gövde Ağaçlar': 'YHG',
    'Yapay Ağaçlar > Palmiye Ağaçlar': 'YPA',
    'Yapay Ağaçlar > Renkli Ağaçlar': 'YRA',
    'Yapay Ağaçlar > Yeşil Ağaçlar': 'YYA',
    'Yapay Ağaçlar > Zeytin & Meyve Ağaçları': 'YZM',
    'Yapay Çiçekler > Güller': 'YCG',
    'Yapay Çiçekler > Karma Çiçekler': 'YCK',
    'Yapay Çiçekler > Orkideler': 'YCO',
    'Yapay Çiçekler > Papatyalar': 'YCP',
    'Yapay Dal & Yaprak > Tek Dal Çiçekler': 'YDT',
    'Yapay Dal & Yaprak > Yapraklı Dallar': 'YDY',
    'Yapay Sarmaşıklar > Renkli Sarmaşık': 'YSR',
    'Yapay Sarmaşıklar > Yeşil Sarmaşık': 'YSY',
  };

  async previewNextModelCode(shopCategoryId?: number, catalogCategory?: string): Promise<{ modelCode: string; prefix: string }> {
    let prefix = 'ERH';
    if (catalogCategory && ProductCenterService.CATALOG_CATEGORY_PREFIXES[catalogCategory]) {
      prefix = `ERH-${ProductCenterService.CATALOG_CATEGORY_PREFIXES[catalogCategory]}`;
    } else if (shopCategoryId) {
      const cat = await this.prisma.shopCategory.findUnique({
        where: { id: shopCategoryId },
        include: { parent: true },
      });
      if (cat) {
        const parentCode = cat.parent ? this.shopCategoryCode(cat.parent.name) : null;
        const childCode = this.shopCategoryCode(cat.name);
        prefix = parentCode ? `ERH-${parentCode}-${childCode}` : `ERH-${childCode}`;
      }
    }

    // Mevcut model kodlarından bu prefix ile başlayanların max numarasını bul
    const pattern = `${prefix}-%`;
    const [variantRows, productRows] = await Promise.all([
      this.prisma.$queryRaw<{ code: string }[]>`
        SELECT current_model_code AS code FROM trendyol_product_variants
        WHERE current_model_code ILIKE ${pattern}`,
      this.prisma.$queryRaw<{ code: string }[]>`
        SELECT model_code AS code FROM products
        WHERE model_code ILIKE ${pattern}`,
    ]);

    const allCodes = [...variantRows, ...productRows].map(r => r.code);
    let maxNum = 0;
    for (const code of allCodes) {
      const parts = code.split('-');
      const num = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
    const next = String(maxNum + 1).padStart(3, '0');
    return { modelCode: `${prefix}-${next}`, prefix };
  }

  async getVariantForEdit(id: number) {
    const v = await this.prisma.trendyolProductVariant.findUnique({
      where: { id },
      select: {
        id: true, productName: true, barcode: true, currentModelCode: true,
        supplierStockCode: true, productDescription: true, images: true,
        shopCategoryId: true, shopCategory: { select: { id: true, name: true, parent: { select: { id: true, name: true } } } },
        trendyolSalePrice: true, stockQuantity: true, status: true, videoUrl: true,
        productCostDraft: { select: { salePrice: true, marketplaceSalePrice: true } },
        product: {
          select: {
            potSize: true, potType: true, productHeight: true,
            leafCount: true, stemCount: true, branchCount: true, leavesPerBranch: true,
            catalogCategory: true, catalogSubCategory: true,
          }
        },
      },
    });
    if (!v) throw new NotFoundException('Varyant bulunamadı');
    return v;
  }

  async suggestProductName(current: string, description: string, category: string): Promise<{ suggestions: string[] }> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY')?.trim();
    if (!apiKey) return { suggestions: [] };
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Sen bir e-ticaret SEO uzmanısın. Türk yapay çiçek/bitki satıcısı için Trendyol, N11 ve Hepsiburada'da arama sıralamasını yükseltecek ürün adları öner.

Mevcut ad: "${current}"
Kategori: "${category}"
Açıklama: "${description}"

3 farklı SEO uyumlu ürün adı öner. Kurallar:
- Türkçe, doğal, aranabilir anahtar kelimeler içersin
- 60-80 karakter arası
- Boyut/özellik varsa içersin (örn: 180 cm, 14'lük saksı)
- Her öneri yeni satırda, sadece ürün adı, başka açıklama yok

Sadece 3 satır ürün adı yaz, başka hiçbir şey yazma.`;
      const resp = await ai.models.generateContent({ model: resolveGeminiModel(this.config.get<string>('GEMINI_MODEL')), contents: [{ role: 'user', parts: [{ text: prompt }] }] });
      const lines = (resp.text ?? '').split('\n').map(s => s.replace(/^\d+[\.\)]\s*/, '').trim()).filter(Boolean).slice(0, 3);
      return { suggestions: lines };
    } catch { return { suggestions: [] }; }
  }

  async listVariantsForEdit(search?: string) {
    const where: any = { status: 'ACTIVE' }
    if (search) {
      where.OR = [
        { productName: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search } },
        { currentModelCode: { contains: search, mode: 'insensitive' } },
        { supplierStockCode: { contains: search, mode: 'insensitive' } },
      ]
    }
    return this.prisma.trendyolProductVariant.findMany({
      where,
      select: {
        id: true,
        productName: true,
        barcode: true,
        currentModelCode: true,
        supplierStockCode: true,
        productDescription: true,
        images: true,
        shopCategoryId: true,
        shopCategory: { select: { id: true, name: true } },
        trendyolSalePrice: true,
        stockQuantity: true,
        status: true,
        catalogCategory: true,
        catalogSubCategory: true,
        productCostDraft: { select: { salePrice: true, marketplaceSalePrice: true } },
        product: {
          select: {
            potSize: true, potType: true, productHeight: true,
            leafCount: true, stemCount: true, branchCount: true, leavesPerBranch: true,
            catalogCategory: true, catalogSubCategory: true,
          }
        },
      },
      orderBy: { productName: 'asc' },
      take: 5000,
    })
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
  // ─── Boy serisi: bir ürünü farklı boylarda AYRI ürün (ayrı ilan) olarak kopyalar ───
  // Örn. ERH-BS2105 (150 cm) → ERH-BS2105-100 … ERH-BS2105-200. Her boyun kendi
  // model kodu ve barkodu olur; pazaryerlerinde productMainId = model kodu olduğundan
  // her biri ayrı ilan açılır. Görseller, açıklama ve kategori kaynaktan kopyalanır;
  // fiyat her `stepCm` için `priceStep` TL artar/azalır. Trendyol ilan linki (contentId)
  // ve Trendyol barkodu KOPYALANMAZ — yoksa kaynak ilan güncellenirdi.
  async sizeSeries(body: unknown, apply: boolean) {
    const input = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
    const sourceCode = this.requiredText(input.modelCode, 'Kaynak model kodu veya barkod zorunludur.');
    const start = Math.trunc(Number(input.startCm ?? 100));
    const end = Math.trunc(Number(input.endCm ?? 200));
    const stepCm = Math.trunc(Number(input.stepCm ?? 10));
    const priceStep = Number(input.priceStep ?? 100);
    const nameFrom = String(input.nameFrom ?? '').trim();
    const nameTo = String(input.nameTo ?? '').trim();
    if (!(start > 0 && end >= start && stepCm > 0)) throw new BadRequestException('Boy aralığı geçersiz.');
    if ((end - start) / stepCm > 40) throw new BadRequestException('En fazla 40 boy oluşturulabilir.');
    if (!Number.isFinite(priceStep)) throw new BadRequestException('Fiyat artışı geçersiz.');

    const source = await this.findSizeSeriesSource(sourceCode);
    if (!source) {
      throw new NotFoundException(`"${sourceCode}" ile eşleşen ürün bulunamadı. Ürünler sayfasında ürünü açıp barkodunu buraya yazmayı deneyin.`);
    }

    // Yeni model kodları kullanıcının yazdığı koddan türetilir (ERH-BS2105 → ERH-BS2105-100);
    // barkod yazıldıysa ürünün kendi model/stok kodu kullanılır.
    const enteredIsBarcode = /^\d{8,14}$/.test(sourceCode);
    const baseModelCode = (enteredIsBarcode
      ? (source.product?.modelCode || source.proposedModelCode || source.currentModelCode || source.supplierStockCode || sourceCode)
      : sourceCode.toUpperCase()).trim();
    const sourceName = source.seoManualProductName ?? source.seoProductName ?? source.productName;
    const sizeMatch = sourceName.match(/(\d{2,3})\s*cm/i) ?? source.productName.match(/(\d{2,3})\s*cm/i);
    if (!sizeMatch) throw new BadRequestException('Kaynak ürün adında boy bulunamadı (örn. "150 Cm").');
    const baseSize = Number(sizeMatch[1]);

    const rename = (value: string | null | undefined, size: number) => {
      if (value == null) return value ?? null;
      let text = value.replace(new RegExp(`\\b${baseSize}\\s*cm\\b`, 'gi'), `${size} Cm`);
      if (nameFrom) text = text.replace(new RegExp(nameFrom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), nameTo);
      return text;
    };
    const shift = (value: unknown, delta: number) => {
      const number = Number(value ?? 0);
      return number > 0 ? Math.max(1, Math.round((number + delta) * 100) / 100) : number;
    };

    const sizes: number[] = [];
    for (let size = start; size <= end; size += stepCm) if (size !== baseSize) sizes.push(size);

    const plan = sizes.map((size) => {
      const delta = ((size - baseSize) / stepCm) * priceStep;
      return {
        size,
        delta,
        modelCode: `${baseModelCode}-${size}`,
        productName: rename(source.productName, size) as string,
        trendyolSalePrice: shift(source.trendyolSalePrice, delta),
        n11SalePrice: shift(source.n11SalePrice, delta),
        hepsiburadaSalePrice: shift(source.hepsiburadaSalePrice, delta),
        shopPrice: shift(source.product?.shopPrice, delta),
      };
    });

    const existingRows = await this.prisma.trendyolProductVariant.findMany({
      where: { OR: [
        { currentModelCode: { in: plan.map((row) => row.modelCode) } },
        { proposedModelCode: { in: plan.map((row) => row.modelCode) } },
        { product: { modelCode: { in: plan.map((row) => row.modelCode) } } },
      ] },
      select: { id: true, barcode: true, currentModelCode: true, proposedModelCode: true, product: { select: { modelCode: true } } },
    });
    const existingByCode = new Map<string, { id: number; barcode: string }>();
    for (const row of existingRows) {
      for (const code of [row.currentModelCode, row.proposedModelCode, row.product?.modelCode]) {
        if (code) existingByCode.set(code, { id: row.id, barcode: row.barcode });
      }
    }

    const sourceSummary = {
      variantId: source.id,
      productId: source.productId,
      modelCode: baseModelCode,
      productName: source.productName,
      baseSize,
      trendyolSalePrice: Number(source.trendyolSalePrice),
      stockQuantity: source.stockQuantity,
      imageCount: Array.isArray(source.images) ? source.images.length : 0,
    };

    if (!apply) {
      return {
        source: sourceSummary,
        items: plan.map((row) => ({ ...row, exists: existingByCode.has(row.modelCode), variantId: existingByCode.get(row.modelCode)?.id ?? null })),
      };
    }

    const created = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('LOCK TABLE "products", "trendyol_product_variants", "stock_cards", "barcode_logs" IN SHARE ROW EXCLUSIVE MODE');
      const results: Array<{ size: number; modelCode: string; productName: string; barcode: string; variantId: number; productId: number | null; created: boolean; trendyolSalePrice: number }> = [];

      for (const row of plan) {
        const existing = existingByCode.get(row.modelCode);
        if (existing) {
          results.push({ size: row.size, modelCode: row.modelCode, productName: row.productName, barcode: existing.barcode, variantId: existing.id, productId: null, created: false, trendyolSalePrice: row.trendyolSalePrice });
          continue;
        }
        const barcode = await this.nextEan13Barcode(tx);

        let productId: number | null = null;
        if (source.product) {
          const { id: _id, createdAt: _c, updatedAt: _u, mediaFiles, ...productRest } = source.product as any;
          const product = await tx.product.create({
            data: {
              ...productRest,
              productName: row.productName,
              modelCode: row.modelCode,
              barcode,
              trendyolBarcode: null,
              description: rename(source.product.description, row.size),
              productHeight: `${row.size} cm`,
              shopPrice: row.shopPrice,
              sitePrice: shift(source.product.sitePrice, row.delta),
              marketPrice: shift(source.product.marketPrice, row.delta),
              listPrice: shift(source.product.listPrice, row.delta),
              imageUrls: (source.product.imageUrls ?? []) as Prisma.InputJsonValue,
              status: 'ACTIVE',
            },
          });
          productId = product.id;
          for (const file of (mediaFiles ?? []) as Array<{ fileName: string; filePath: string; fileType: string }>) {
            await tx.mediaFile.create({ data: { productId, fileName: file.fileName, filePath: file.filePath, folderName: row.modelCode, fileType: file.fileType } });
          }
        }

        const json = (value: unknown) => (value == null ? Prisma.JsonNull : (value as Prisma.InputJsonValue));
        const variant = await tx.trendyolProductVariant.create({
          data: {
            productId,
            barcode,
            productName: row.productName,
            currentModelCode: row.modelCode,
            proposedModelCode: row.modelCode,
            supplierStockCode: row.modelCode,
            brand: source.brand,
            storeCode: (source as any).storeCode ?? 'ERHAN',
            trendyolCategoryName: source.trendyolCategoryName,
            productColor: source.productColor,
            productDescription: rename(source.productDescription, row.size),
            stockQuantity: source.stockQuantity,
            images: json(source.images),
            videoUrl: source.videoUrl,
            suggestedFamilyName: source.suggestedFamilyName,
            detectedSize: `${row.size} cm`,
            detectedPot: rename(source.detectedPot, row.size),
            seoProductName: rename(source.seoProductName, row.size),
            seoManualProductName: rename(source.seoManualProductName, row.size),
            seoDistinctiveFeature: rename(source.seoDistinctiveFeature, row.size),
            seoMarketTitle: rename(source.seoMarketTitle, row.size),
            seoWebTitle: rename(source.seoWebTitle, row.size),
            seoShortDescription: rename(source.seoShortDescription, row.size),
            seoLongDescription: rename(source.seoLongDescription, row.size),
            seoMetaTitle: rename(source.seoMetaTitle, row.size),
            seoMetaDescription: rename(source.seoMetaDescription, row.size),
            seoKeywords: source.seoKeywords,
            seoImageAltText: rename(source.seoImageAltText, row.size),
            seoProperties: json(source.seoProperties),
            seoApprovalStatus: source.seoApprovalStatus,
            importSource: 'SIZE_SERIES',
            importedAt: new Date(),
            familyId: source.familyId,
            potOptionId: source.potOptionId,
            templateId: source.templateId,
            shopCategoryId: source.shopCategoryId,
            catalogCategory: source.catalogCategory,
            catalogSubCategory: source.catalogSubCategory,
            trendyolSalePrice: new Prisma.Decimal(row.trendyolSalePrice),
            n11SalePrice: new Prisma.Decimal(row.n11SalePrice),
            hepsiburadaSalePrice: new Prisma.Decimal(row.hepsiburadaSalePrice),
            commissionPercent: source.commissionPercent,
            status: 'ACTIVE',
          },
        });

        const draft = source.productCostDraft;
        await tx.productCostDraft.create({
          data: {
            variantId: variant.id,
            salePrice: new Prisma.Decimal(shift(draft?.salePrice, row.delta)),
            marketplaceSalePrice: new Prisma.Decimal(shift(draft?.marketplaceSalePrice, row.delta)),
            profitMarginPercent: draft?.profitMarginPercent ?? new Prisma.Decimal(45),
            commissionPercent: draft?.commissionPercent ?? new Prisma.Decimal(21),
            vatPercent: draft?.vatPercent ?? new Prisma.Decimal(20),
            shippingCost: draft?.shippingCost ?? new Prisma.Decimal(0),
            desi: draft?.desi ?? new Prisma.Decimal(1),
            marketplaceMarkupPercent: draft?.marketplaceMarkupPercent ?? new Prisma.Decimal(25),
            campaignBufferPercent: draft?.campaignBufferPercent ?? new Prisma.Decimal(10),
            status: 'DRAFT',
          },
        });

        results.push({ size: row.size, modelCode: row.modelCode, productName: row.productName, barcode, variantId: variant.id, productId, created: true, trendyolSalePrice: row.trendyolSalePrice });
      }
      return results;
    }, { timeout: 60000 });

    void revalidateSite();
    return { source: sourceSummary, items: created };
  }
  // Kaynak ürünü model kodu / stok kodu / barkod ile (büyük-küçük harf duyarsız) bulur.
  // Önce tam eşleşme, sonra "içerir" araması. Aktif ve ürün kartına bağlı kayıt tercih edilir.
  private async findSizeSeriesSource(code: string) {
    const include = { product: { include: { mediaFiles: true } }, productCostDraft: true } as const;
    const exact = (value: string) => ({ equals: value, mode: 'insensitive' as const });
    const contains = (value: string) => ({ contains: value, mode: 'insensitive' as const });
    const pick = <T extends { status: string; productId: number | null }>(rows: T[]) =>
      rows.sort((a, b) => Number(b.status === 'ACTIVE') - Number(a.status === 'ACTIVE') || Number(!!b.productId) - Number(!!a.productId))[0] ?? null;

    const exactRows = await this.prisma.trendyolProductVariant.findMany({
      where: { OR: [
        { currentModelCode: exact(code) },
        { proposedModelCode: exact(code) },
        { supplierStockCode: exact(code) },
        { barcode: code },
        { product: { modelCode: exact(code) } },
        { product: { barcode: code } },
        { product: { trendyolBarcode: code } },
      ] },
      include,
      take: 20,
    });
    if (exactRows.length) return pick(exactRows);

    const looseRows = await this.prisma.trendyolProductVariant.findMany({
      where: { OR: [
        { currentModelCode: contains(code) },
        { proposedModelCode: contains(code) },
        { supplierStockCode: contains(code) },
        { product: { modelCode: contains(code) } },
      ] },
      include,
      take: 20,
    });
    // "ERH-BS2105" araması daha önce açılmış "ERH-BS2105-100" gibi seri ürünlerini de bulur; onları ele.
    const seriesPattern = new RegExp(`${code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-\\d{2,3}$`, 'i');
    const notSeries = looseRows.filter((row) => ![row.currentModelCode, row.proposedModelCode, row.product?.modelCode].some((value) => value && seriesPattern.test(value)));
    return pick(notSeries);
  }
}
