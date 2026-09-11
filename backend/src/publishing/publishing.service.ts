import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { PublishingActionType, PublishingStatus } from '../generated/prisma-client';
import { IntegrationAdapter, IntegrationPlatform } from '../integrations/adapters/integration-adapter.interface';
import { HepsiburadaAdapter } from '../integrations/adapters/hepsiburada.adapter';
import { N11Adapter } from '../integrations/adapters/n11.adapter';
import { TicimaxAdapter } from '../integrations/adapters/ticimax.adapter';
import { TrendyolAdapter } from '../integrations/adapters/trendyol.adapter';
import { IntegrationCenterService } from '../integrations/services/integration-center.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PublishingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly trendyolAdapter: TrendyolAdapter,
    private readonly hepsiburadaAdapter: HepsiburadaAdapter,
    private readonly n11Adapter: N11Adapter,
    private readonly ticimaxAdapter: TicimaxAdapter,
    private readonly integrationCenter: IntegrationCenterService,
  ) {}

  async listProducts() {
    const variants = await this.prisma.trendyolProductVariant.findMany({
      include: { family: true, sizeOption: true, potOption: true, product: true, productCostDraft: true },
      orderBy: { updatedAt: 'desc' },
      take: 300,
    });

    return variants.map((variant) => {
      const payload = this.buildPayload(variant);
      const missingFields = this.missingFields(variant, payload);
      return {
        id: variant.id,
        barcode: variant.barcode,
        productName: variant.seoManualProductName ?? variant.seoProductName ?? variant.productName,
        modelCode: variant.currentModelCode,
        category: variant.trendyolCategoryName,
        familyName: variant.family?.familyName ?? variant.suggestedFamilyName,
        salePrice: Number(variant.trendyolSalePrice),
        stockQuantity: variant.stockQuantity,
        seoApprovalStatus: variant.seoApprovalStatus,
        trendyolProductUrl: variant.trendyolProductUrl,
        imageCount: this.imageUrls(variant.images).length,
        ready: missingFields.length === 0,
        missingFields,
        updatedAt: variant.updatedAt,
      };
    });
  }

  async preview(variantId: number, userId: number) {
    const variant = await this.getVariant(variantId);
    const payload = this.buildPayload(variant);
    const missingFields = this.missingFields(variant, payload);
    const status: PublishingStatus = missingFields.length === 0 ? 'READY' : 'BLOCKED';
    await this.createLog(variant.id, userId, 'PREVIEW', status, payload, null, missingFields);

    return {
      ready: missingFields.length === 0,
      missingFields,
      payload,
    };
  }

  async testUpdate(variantId: number, userId: number) {
    const variant = await this.getVariant(variantId);
    const payload = this.buildPayload(variant);
    const missingFields = this.missingFields(variant, payload);
    if (missingFields.length > 0) {
      const log = await this.createLog(variant.id, userId, 'TEST_UPDATE', 'BLOCKED', payload, null, missingFields, 'Eksik alanlar tamamlanmadan test güncellemesi yapılamaz.');
      return { ok: false, missingFields, log };
    }

    return this.sendToTrendyol(variant.id, userId, 'TEST_UPDATE', payload, missingFields);
  }

  async send(variantIds: number[], userId: number, options: { allowIncomplete?: boolean; platforms?: IntegrationPlatform[] } = {}) {
    const ids = Array.from(new Set(variantIds.map(Number).filter((id) => Number.isFinite(id))));
    const platforms = this.cleanPlatforms(options.platforms);
    const allowIncomplete = options.allowIncomplete === true;
    if (ids.length === 0) throw new BadRequestException('Gönderilecek ürün seçilmelidir.');

    const results = [];
    for (const id of ids) {
      const variant = await this.getVariant(id);
      const payload = this.buildPayload(variant);
      const missingFields = this.missingFields(variant, payload);
      if (missingFields.length > 0 && !allowIncomplete) {
        const log = await this.createLog(variant.id, userId, 'LIVE_SEND', 'BLOCKED', payload, null, missingFields, 'Eksik alanlar var.');
        results.push({ id, ok: false, missingFields, logId: log.id });
        continue;
      }
      for (const platform of platforms) {
        const result = await this.sendToPlatform(platform, variant.id, userId, 'LIVE_SEND', payload, missingFields, allowIncomplete);
        results.push({ id, platform, ...result });
      }
    }

    return {
      total: ids.length * platforms.length,
      success: results.filter((item) => item.ok).length,
      failed: results.filter((item) => !item.ok).length,
      results,
    };
  }

  async exportExcel(variantIds: number[], userId: number, platform?: IntegrationPlatform) {
    const ids = Array.from(new Set(variantIds.map(Number).filter((id) => Number.isFinite(id))));
    if (ids.length === 0) throw new BadRequestException('Excel icin urun secilmelidir.');
    const selectedPlatform = this.cleanPlatforms(platform ? [platform] : undefined)[0];
    const template = this.excelTemplate(selectedPlatform);
    if (!fs.existsSync(template.path)) {
      throw new BadRequestException(`${template.label} Excel sablonu bulunamadi: ${template.path}`);
    }

    const workbook = XLSX.readFile(template.path, { cellStyles: true, cellFormula: true });
    const sheet = workbook.Sheets[template.sheetName];
    if (!sheet) throw new BadRequestException(`${template.label} Excel sayfasi bulunamadi: ${template.sheetName}`);

    const matrix = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, blankrows: false, defval: '' });
    const headerRow = this.excelHeadersForPlatform(selectedPlatform, matrix[template.headerRow] ?? []);
    const sampleRow = matrix[template.dataStartRow] ?? [];
    const rows = [];
    const missingByProduct = [];

    for (const id of ids) {
      const variant = await this.getVariantForExport(id);
      const payload = this.buildPayload(variant);
      const missingFields = this.missingFields(variant, payload);
      missingByProduct.push({ id, productName: payload.productName, missingFields });
      rows.push(headerRow.map((header, index) => this.excelValueForHeader(String(header ?? ''), selectedPlatform, variant, payload, sampleRow[index])));
      await this.createLog(variant.id, userId, 'PREVIEW', missingFields.length === 0 ? 'READY' : 'BLOCKED', { platform: selectedPlatform, exportType: 'EXCEL', payload }, null, missingFields);
    }

    this.clearSheetData(sheet, template.dataStartRow);
    XLSX.utils.sheet_add_aoa(sheet, rows, { origin: { r: template.dataStartRow, c: 0 } });
    this.deleteBlankDataCells(sheet, template.dataStartRow, rows.length, headerRow.length);
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
    range.e.r = Math.max(range.e.r, template.dataStartRow + rows.length - 1);
    range.e.c = Math.max(range.e.c, headerRow.length - 1);
    sheet['!ref'] = XLSX.utils.encode_range(range);

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', cellStyles: true });
    const date = new Date().toISOString().slice(0, 10);
    return {
      fileName: `Erhan-Flowers-${template.label}-${date}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      contentBase64: buffer.toString('base64'),
      total: rows.length,
      missingByProduct,
    };
  }

  history() {
    return this.prisma.publishingLog.findMany({
      include: {
        variant: { select: { barcode: true, productName: true, currentModelCode: true } },
        createdBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  private async sendToTrendyol(variantId: number, userId: number, actionType: PublishingActionType, payload: Record<string, unknown>, missingFields: string[]) {
    const apiUrl = this.config.get<string>('TRENDYOL_API_URL');
    const supplierId = this.config.get<string>('TRENDYOL_SUPPLIER_ID');
    const apiKey = this.config.get<string>('TRENDYOL_API_KEY');
    const apiSecret = this.config.get<string>('TRENDYOL_API_SECRET');

    if (!apiUrl || !supplierId || !apiKey || !apiSecret) {
      const message = 'Trendyol API bağlantısı kurulmamış. Ayarlar/.env üzerinden TRENDYOL_API_URL, TRENDYOL_SUPPLIER_ID, TRENDYOL_API_KEY ve TRENDYOL_API_SECRET bilgilerini tamamlayın.';
      const log = await this.createLog(variantId, userId, actionType, 'FAILED', payload, null, missingFields, message);
      return { ok: false, missingFields, errorMessage: message, logId: log.id };
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`,
          'x-supplier-id': supplierId,
        },
        body: JSON.stringify(payload),
      });
      const responseBody = await response.json().catch(async () => ({ raw: await response.text().catch(() => '') }));
      const ok = response.ok;
      const log = await this.createLog(variantId, userId, actionType, ok ? 'SUCCESS' : 'FAILED', payload, responseBody, missingFields, ok ? null : this.extractError(responseBody));
      return { ok, missingFields, responseBody, errorMessage: ok ? null : log.errorMessage, logId: log.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Trendyol gönderimi tamamlanamadı.';
      const log = await this.createLog(variantId, userId, actionType, 'FAILED', payload, null, missingFields, message);
      return { ok: false, missingFields, errorMessage: message, logId: log.id };
    }
  }

  private async sendToPlatform(platform: IntegrationPlatform, variantId: number, userId: number, actionType: PublishingActionType, payload: Record<string, unknown>, missingFields: string[], allowIncomplete: boolean) {
    const platformPrice = platform === 'N11' ? (payload.n11SalePrice ?? payload.salePrice)
      : platform === 'HEPSIBURADA' ? (payload.hepsiburadaSalePrice ?? payload.salePrice)
      : payload.salePrice;
    const platformPayload = { ...payload, salePrice: platformPrice, listPrice: platformPrice, platform, allowIncomplete };
    if (platform === 'TRENDYOL' && this.useLegacyTrendyolPublisher()) {
      return this.sendToTrendyol(variantId, userId, actionType, platformPayload, missingFields);
    }

    const adapter = await this.adapter(platform);
    const result = await adapter.pushProduct(platformPayload);
    const log = await this.createLog(
      variantId,
      userId,
      actionType,
      result.ok ? 'SUCCESS' : 'FAILED',
      platformPayload,
      { platform, status: result.status, message: result.message, missingKeys: result.missingKeys ?? [], batchRequestId: result.batchRequestId ?? null, listingUploadId: result.listingUploadId ?? null },
      missingFields,
      result.ok ? null : result.message,
    );
    return {
      ok: result.ok,
      missingFields,
      errorMessage: result.ok ? null : result.message,
      successMessage: result.ok ? result.message : null,
      logId: log.id,
      batchRequestId: result.batchRequestId ?? null,
    };
  }

  private async adapter(platform: IntegrationPlatform): Promise<IntegrationAdapter> {
    if (platform === 'TRENDYOL') return new TrendyolAdapter(await this.integrationCenter.runtimeCredentials(platform));
    if (platform === 'HEPSIBURADA') return new HepsiburadaAdapter(await this.integrationCenter.runtimeCredentials(platform));
    if (platform === 'N11') return new N11Adapter(await this.integrationCenter.runtimeCredentials(platform));
    if (platform === 'TICIMAX') return new TicimaxAdapter(await this.integrationCenter.ticimaxRuntimeCredentials());
    throw new BadRequestException(`${platform} urun gonderimi desteklenmiyor.`);
  }

  private cleanPlatforms(value?: IntegrationPlatform[]): IntegrationPlatform[] {
    const allowed: IntegrationPlatform[] = ['TRENDYOL', 'HEPSIBURADA', 'N11', 'TICIMAX'];
    const selected = Array.isArray(value) ? value.filter((item): item is IntegrationPlatform => allowed.includes(item as IntegrationPlatform)) : [];
    return selected.length > 0 ? Array.from(new Set(selected)) : ['TRENDYOL'];
  }

  private useLegacyTrendyolPublisher() {
    return this.config.get<string>('TRENDYOL_USE_LEGACY_PUBLISHER') === 'true';
  }

  private async createLog(
    variantId: number,
    userId: number,
    actionType: PublishingActionType,
    status: PublishingStatus,
    requestPayload: unknown,
    responseBody: unknown,
    missingFields: string[] = [],
    errorMessage?: string | null,
  ) {
    return this.prisma.publishingLog.create({
      data: {
        variantId,
        createdById: userId,
        actionType,
        status,
        requestPayload: requestPayload as any,
        responseBody: responseBody as any,
        missingFields,
        errorMessage,
      },
    });
  }

  private async getVariant(id: number) {
    const variant = await this.prisma.trendyolProductVariant.findUnique({
      where: { id },
      include: { family: { include: { category: true } }, sizeOption: true, potOption: true, product: { include: { category: true, mediaFiles: true } }, productCostDraft: true },
    });
    if (!variant) throw new NotFoundException('Ürün bulunamadı.');
    return variant;
  }

  private async getVariantForExport(id: number) {
    const variant = await this.prisma.trendyolProductVariant.findUnique({
      where: { id },
      include: { family: { include: { category: true } }, sizeOption: true, potOption: true, product: { include: { category: true, mediaFiles: true } }, productCostDraft: true },
    });
    if (!variant) throw new NotFoundException('Urun bulunamadi.');
    return variant;
  }

  private buildPayload(variant: any) {
    const productName = variant.seoManualProductName ?? variant.seoProductName ?? variant.productName;
    const imageSlug = this.productNameSlug(productName);
    const images = this.marketplaceImageUrls(this.collectVariantImages(variant), imageSlug);
    const color = this.acceptedColor(variant.productColor || this.extractColor(productName) || 'Çok Renkli');
    const trendyolPrice = Number(variant.trendyolSalePrice);
    return {
      barcode: variant.barcode,
      contentId: this.extractContentId(variant.trendyolProductUrl),
      modelCode: variant.currentModelCode,
      productName,
      description: variant.seoLongDescription ?? variant.productDescription,
      shortDescription: variant.seoShortDescription,
      categoryName: variant.trendyolCategoryName,
      categoryId: variant.product?.category?.trendyolCategoryId ?? variant.family?.category?.trendyolCategoryId ?? null,
      brand: variant.brand,
      color,
      flowerType: this.extractFlowerType(productName),
      origin: variant.product?.origin || 'Türkiye',
      salePrice: trendyolPrice,
      listPrice: trendyolPrice,
      n11SalePrice: Number(variant.n11SalePrice) || trendyolPrice,
      hepsiburadaSalePrice: Number(variant.hepsiburadaSalePrice) || trendyolPrice,
      stockQuantity: variant.stockQuantity,
      desi: variant.productCostDraft?.desi ? Number(variant.productCostDraft.desi) : 1,
      vatRate: Number(variant.productCostDraft?.vatPercent ?? variant.product?.vatRate ?? 20),
      images,
      productUrl: variant.trendyolProductUrl,
      seo: {
        metaTitle: variant.seoMetaTitle,
        metaDescription: variant.seoMetaDescription,
        keywords: variant.seoKeywords,
        imageAltText: variant.seoImageAltText,
      },
    };
  }

  // Trendyol urun linki "...-p-<contentId>?..." formatindadir. Onayli/canli
  // urunlerde icerik guncellemesi barkod yerine bu contentId ile yapilir.
  private extractContentId(productUrl: string | null | undefined): string | null {
    const match = String(productUrl ?? '').match(/-p-(\d+)/);
    return match ? match[1] : null;
  }

  private excelTemplate(platform: IntegrationPlatform) {
    const baseCandidates = [
      path.resolve(process.cwd(), 'templates', 'marketplace-excel'),
      path.resolve(process.cwd(), 'backend', 'templates', 'marketplace-excel'),
    ];
    const base = baseCandidates.find((item) => fs.existsSync(item)) ?? baseCandidates[0];
    if (platform === 'N11') return { label: 'N11', path: path.join(base, 'n11-yapay-cicek.xlsx'), sheetName: 'Toplu Ürün Ekle', headerRow: 0, dataStartRow: 1 };
    if (platform === 'HEPSIBURADA') return { label: 'Hepsiburada', path: path.join(base, 'hepsiburada-yapay-cicek.xlsx'), sheetName: 'Yapay Çiçekler', headerRow: 2, dataStartRow: 3 };
    if (platform === 'TICIMAX') return { label: 'Ticimax', path: path.join(base, 'ticimax-ornek-urun.xlsx'), sheetName: 'Worksheet', headerRow: 0, dataStartRow: 1 };
    return { label: 'Trendyol', path: path.join(base, 'trendyol-yapay-kuru-cicek.xlsx'), sheetName: 'Ürünlerinizi Burada Listeleyin', headerRow: 0, dataStartRow: 1 };
  }

  private excelHeadersForPlatform(platform: IntegrationPlatform, headers: unknown[]) {
    if (platform !== 'TICIMAX') return headers;
    const hasImageColumn = headers.some((header) => {
      const key = this.normalizeHeader(String(header ?? ''));
      return key.startsWith('resim') || key.startsWith('gorsel') || key.startsWith('image');
    });
    if (hasImageColumn) return headers;
    return [...headers, 'RESIM1', 'RESIM2', 'RESIM3', 'RESIM4', 'RESIM5', 'RESIM6'];
  }

  private clearSheetData(sheet: XLSX.WorkSheet, startRow: number) {
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
    for (let row = startRow; row <= range.e.r; row += 1) {
      for (let col = 0; col <= range.e.c; col += 1) {
        const address = XLSX.utils.encode_cell({ r: row, c: col });
        if (sheet[address]) delete sheet[address];
      }
    }
  }

  private deleteBlankDataCells(sheet: XLSX.WorkSheet, startRow: number, rowCount: number, colCount: number) {
    for (let row = startRow; row < startRow + rowCount; row += 1) {
      for (let col = 0; col < colCount; col += 1) {
        const address = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = sheet[address];
        if (!cell) continue;
        const value = cell.v;
        if (value === '' || value === null || value === undefined) {
          delete sheet[address];
        }
      }
    }
  }

  private excelValueForHeader(header: string, platform: IntegrationPlatform, variant: any, payload: Record<string, any>, sampleValue: unknown) {
    const key = this.normalizeHeader(header);
    const images = this.imageUrls(payload.images);
    const stockCode = variant.supplierStockCode || payload.modelCode || payload.barcode || '';
    const modelCode = payload.modelCode || stockCode;
    const salePrice = Number(payload.salePrice || 0);
    const listPrice = Math.max(Number(payload.listPrice || 0), salePrice);
    const vat = Number(variant.productCostDraft?.vatPercent ?? variant.product?.vatRate ?? 20);
    const desi = Number(payload.desi || 1);
    const color = this.acceptedColor(payload.color || this.extractColor(payload.productName) || 'Çok Renkli');
    const height = this.extractHeight(payload.productName) || this.extractHeight(payload.description) || '';
    const description = payload.description || `${payload.productName} dekoratif yapay çiçek ürünüdür.`;

    if (key === 'barkod' || key === 'barcode' || key.includes('gtinean')) return payload.barcode || '';
    if (key === 'modelkodu' || key === 'varyantgrupid') return modelCode;
    if (key === 'stokkodu' || key === 'saticistokkodu' || key === 'merchantsku') return stockCode;
    if (key === 'varyasyonkodu') return stockCode;
    if (key === 'marka') return payload.brand || 'Erhan Flowers';
    if (key === 'urunadi' || key === 'ürünadi') return payload.productName || '';
    if (key === 'urunaciklamasi' || key === 'ürünaciklamasi' || key === 'aciklama') return description;
    if (key === 'onyazi') return payload.shortDescription || description.slice(0, 240);
    if (key === 'indirimlifiyat') return salePrice;
    if (key.includes('piyasasatisfiyati') || key === 'satisfiyati' || key === 'fiyat') return listPrice || salePrice;
    if (key.includes('trendyoldasatilacakfiyat') || key.includes('n11satisfiyati')) return salePrice;
    if (key === 'stok' || key === 'urunstokadedi' || key === 'stokadedi') return Number(payload.stockQuantity || 0);
    if (key === 'kdv' || key === 'kdvorani') return vat;
    if (key === 'otvorani') return 0;
    if (key.includes('parti') || key.includes('lot') || key.includes('skt') || key.includes('sonkullanma')) return '';
    if (key === 'desi' || key === 'kg' || key === 'kargoagirligi' || key === 'kargoagirligiyurtdisi') return desi;
    if (key === 'parabirimi') return platform === 'TRENDYOL' || platform === 'N11' ? 'TRY' : 'TL';
    if (key === 'kategori' || key === 'breadcrumbkat' || key === 'kategoriler') {
      return platform === 'TICIMAX' ? this.ticimaxCategoryPath(payload.productName, payload.categoryName) : sampleValue || payload.categoryName || '';
    }
    if (key === 'renk' || key === 'webcolor') return color;
    if (key === 'yukseklik' || key === 'boy') return height || sampleValue || '';
    if (key === 'cicekturu' || key === 'turu' || key === 'tipi') return this.extractFlowerType(payload.productName) || sampleValue || 'Yapay Çiçek';
    if (key === 'mensei') return 'TR';
    if (key === 'sevkiyattipi') return platform === 'TRENDYOL' ? '' : sampleValue || '';
    if (key === 'sevkiyatsuresi' || key === 'hazirliksuresi') return 2;
    if (key === 'teslimatsablonuismi') return this.deliveryTemplateName(platform, sampleValue);
    if (key === 'maksimumsatisadedi') return '';
    if (key === 'garantisuresiay') return 0;
    if (key === 'satisbirimi') return 'ADET';
    if (key === 'kdvdahil' || key === 'urunaktif' || key === 'vitrin' || key === 'yeniurun') return 1;
    if (key === 'ucretsizkargo' || key === 'firsaturunu' || key === 'fbstoregoster') return 0;
    if (key === 'parabirimikur' || key === 'kur') return 1;
    if (key.startsWith('gorsel') || key.startsWith('görsel') || key.startsWith('image') || key.startsWith('resim') || key.startsWith('foto')) {
      const index = Number(key.replace(/[^0-9]/g, '')) || 1;
      return images[index - 1] || '';
    }
    if (key === 'seo_sayfabaslik') return payload.seo?.metaTitle || payload.productName || '';
    if (key === 'seo_anahtarkelime') return payload.seo?.keywords || this.extractFlowerType(payload.productName) || '';
    if (key === 'seo_sayfaaciklama') return payload.seo?.metaDescription || description.slice(0, 155);
    if (key === 'varyasyon') return color ? `Renk;${color}` : '';
    if (key === 'olcu') return height;
    if (key === 'paketicerigi') return '1 adet';
    if (key === 'bakimtalimatlarigenel') return 'Nemli bez ile temizleyiniz.';
    if (key === 'materyal') return 'Plastik';
    if (key === 'ozellik') return 'Dekoratif';
    return sampleValue ?? '';
  }

  private normalizeHeader(value: string) {
    return String(value || '')
      .toLocaleLowerCase('tr-TR')
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_]/g, '');
  }

  private extractHeight(...values: unknown[]) {
    const text = values.map((value) => String(value ?? '')).join(' ');
    return text.match(/\b\d{2,3}\s*cm\b/i)?.[0] ?? '';
  }

  private ticimaxCategoryPath(productName: unknown, categoryName: unknown) {
    const text = `${productName ?? ''} ${categoryName ?? ''}`.toLocaleLowerCase('tr-TR');
    if (/saksi|saksı/.test(text) && !/saksili|saksılı/.test(text)) return 'Saksılar';
    if (/bambu/.test(text)) return 'Bambular';
    if (/sarmaşik|sarmaşık/.test(text)) return 'Yapay Sarmaşıklar';
    if (/dikey|bahce|bahçe|panel/.test(text)) return 'Dikey Bahçe';
    if (/demet|buket|gül|gul|çiçek|cicek/.test(text)) return 'Demet Çiçekler';
    if (/agac|ağaç|starliçe|starlice|muz|ficus|palmiye|areka|zeytin|limon|dracena/.test(text)) return 'Yapay Ağaçlar';
    if (/bitki/.test(text)) return 'Yapay Bitkiler';
    return 'Yapay Ağaçlar';
  }

  private extractColor(value: unknown) {
    const text = String(value ?? '').toLocaleLowerCase('tr-TR');
    const colors = ['beyaz', 'siyah', 'kırmızı', 'kirmizi', 'sarı', 'sari', 'mavi', 'yeşil', 'yesil', 'mor', 'pembe', 'turuncu', 'bordo', 'bej', 'gri', 'altın', 'altin'];
    const found = colors.find((color) => text.includes(color));
    return found ? found.charAt(0).toLocaleUpperCase('tr-TR') + found.slice(1) : '';
  }

  private acceptedColor(value: unknown) {
    const text = String(value ?? '').trim().toLocaleLowerCase('tr-TR');
    const colors: Record<string, string> = {
      altin: 'Altın',
      'altın': 'Altın',
      bej: 'Bej',
      beyaz: 'Beyaz',
      bordo: 'Bordo',
      gri: 'Gri',
      gumus: 'Gümüş',
      'gümüş': 'Gümüş',
      kahverengi: 'Kahverengi',
      kirmizi: 'Kırmızı',
      'kırmızı': 'Kırmızı',
      pembe: 'Pembe',
      siyah: 'Siyah',
      yesil: 'Yeşil',
      'yeşil': 'Yeşil',
    };
    return colors[text] ?? 'Çok Renkli';
  }

  private extractFlowerType(value: unknown) {
    const text = String(value ?? '').toLocaleLowerCase('tr-TR');
    if (/bambu|agac|ağaç|ficus|benjamin|areka|palmiye|zeytin|limon/.test(text)) return 'Ağaç';
    const types = ['sarmaşık', 'menekşe', 'limon', 'gül', 'orkide', 'lavanta', 'lale', 'kokina', 'papatya', 'demet', 'buket', 'ağaç'];
    const found = types.find((type) => text.includes(type));
    return found ? found.charAt(0).toLocaleUpperCase('tr-TR') + found.slice(1) : 'Ağaç';
  }

  private missingFields(variant: any, payload: Record<string, any>) {
    const missing: string[] = [];
    if (!payload.barcode) missing.push('Barkod');
    if (!payload.modelCode) missing.push('Model kodu');
    if (!payload.productName) missing.push('Ürün adı');
    if (!payload.description) missing.push('Uzun açıklama');
    if (!payload.contentId) {
      if (!payload.categoryName) missing.push('Trendyol kategori adı');
      if (!payload.categoryId) missing.push('Trendyol kategori eşlemesi (kategori ayarlarından Trendyol ID girilmeli)');
    }
    if (!payload.salePrice || payload.salePrice <= 0) missing.push('Satış fiyatı');
    if (!Array.isArray(payload.images) || payload.images.length === 0) missing.push('Ürün görseli');
    return missing;
  }

  private imageUrls(images: unknown) {
    if (!Array.isArray(images)) return [];
    return images
      .map((image) => {
        if (typeof image === 'string') return image;
        if (image && typeof image === 'object') return String((image as any).url ?? (image as any).filePath ?? '');
        return '';
      })
      .map((image) => image.trim())
      .map((image) => this.toPublicImageUrl(image))
      .filter((image) => /^https?:\/\//i.test(image));
  }

  private collectVariantImages(variant: any) {
    const imageSources = [
      variant.images,
      variant.product?.imageUrls,
      variant.product?.mediaFiles?.map((file: any) => file.filePath),
    ];
    const images = imageSources.flatMap((source) => this.rawImageValues(source));
    return Array.from(new Set(images));
  }

  private rawImageValues(images: unknown) {
    if (!Array.isArray(images)) return [];
    return images
      .map((image) => {
        if (typeof image === 'string') return image;
        if (image && typeof image === 'object') return String((image as any).url ?? (image as any).filePath ?? '');
        return '';
      })
      .map((image) => image.trim())
      .filter(Boolean);
  }

  private marketplaceImageUrls(images: unknown, productSlug?: string) {
    const urls = this.imageUrls(images)
      .map((url) => productSlug ? this.namedImageUrl(url, productSlug) : url)
      .slice(0, 6);
    if (urls.length === 1) return Array.from({ length: 6 }, () => urls[0]);
    return urls;
  }

  private namedImageUrl(url: string, _slug: string) {
    // /img/ paths are not served by the backend — return original /uploads/ URL as-is
    return url;
  }

  private productNameSlug(name: string) {
    return String(name ?? '')
      .toLocaleLowerCase('tr-TR')
      .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
      .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      .slice(0, 80);
  }

  private toPublicImageUrl(image: string) {
    if (!image) return '';
    if (/^https?:\/\//i.test(image)) return image;

    const publicBase = this.publicFileBaseUrl();
    if (!publicBase) return '';

    const normalized = image.replace(/\\/g, '/').trim();
    const webPath = this.toServedImagePath(normalized);
    if (!webPath) return '';

    const pathWithSlash = webPath.startsWith('/') ? webPath : `/${webPath}`;
    return `${publicBase}${encodeURI(pathWithSlash).replace(/%2F/g, '/')}`;
  }

  private publicFileBaseUrl() {
    const value =
      this.config.get<string>('PUBLIC_FILE_BASE_URL') ||
      this.config.get<string>('PUBLIC_IMAGE_BASE_URL') ||
      this.config.get<string>('BACKEND_PUBLIC_URL') ||
      this.publicFileBaseUrlFromFile();
    return String(value || '').trim().replace(/\/+$/, '');
  }

  private publicFileBaseUrlFromFile() {
    const candidates = [
      path.resolve(process.cwd(), 'work', 'public-file-base-url.txt'),
      path.resolve(process.cwd(), '..', 'work', 'public-file-base-url.txt'),
    ];
    const filePath = candidates.find((candidate) => fs.existsSync(candidate));
    if (!filePath) return '';
    return fs.readFileSync(filePath, 'utf8').trim();
  }

  private deliveryTemplateName(platform: IntegrationPlatform, sampleValue: unknown) {
    const configured =
      platform === 'N11'
        ? this.config.get<string>('N11_DELIVERY_TEMPLATE_NAME')
        : this.config.get<string>(`${platform}_DELIVERY_TEMPLATE_NAME`);
    const value = String(configured || sampleValue || '').trim();
    if (value) return value;
    return platform === 'N11' ? 'Standart Teslimat' : '';
  }

  private toServedImagePath(image: string) {
    const lower = image.toLocaleLowerCase('tr-TR');
    const uploadsIndex = lower.lastIndexOf('/uploads/');
    if (uploadsIndex >= 0) return image.slice(uploadsIndex);

    const stockImagesIndex = lower.lastIndexOf('/stock-images/');
    if (stockImagesIndex >= 0) return image.slice(stockImagesIndex);

    if (image.startsWith('/uploads/') || image.startsWith('/stock-images/')) return image;
    if (image.startsWith('uploads/') || image.startsWith('stock-images/')) return `/${image}`;
    return '';
  }

  private extractError(responseBody: unknown) {
    if (!responseBody || typeof responseBody !== 'object') return 'Trendyol güncellemesi başarısız.';
    const data = responseBody as Record<string, any>;
    if (Array.isArray(data.errors)) return data.errors.map((item) => item.message ?? JSON.stringify(item)).join(' ');
    return data.message ?? data.error ?? 'Trendyol güncellemesi başarısız.';
  }
}
