import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PublishingActionType, PublishingStatus } from '../generated/prisma-client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PublishingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async listProducts() {
    const variants = await this.prisma.trendyolProductVariant.findMany({
      include: { family: true, sizeOption: true, potOption: true },
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

  async send(variantIds: number[], userId: number) {
    const ids = Array.from(new Set(variantIds.map(Number).filter((id) => Number.isFinite(id))));
    if (ids.length === 0) throw new BadRequestException('Gönderilecek ürün seçilmelidir.');

    const results = [];
    for (const id of ids) {
      const variant = await this.getVariant(id);
      const payload = this.buildPayload(variant);
      const missingFields = this.missingFields(variant, payload);
      if (missingFields.length > 0) {
        const log = await this.createLog(variant.id, userId, 'LIVE_SEND', 'BLOCKED', payload, null, missingFields, 'Eksik alanlar var.');
        results.push({ id, ok: false, missingFields, logId: log.id });
        continue;
      }
      const result = await this.sendToTrendyol(variant.id, userId, 'LIVE_SEND', payload, missingFields);
      results.push({ id, ...result });
    }

    return {
      total: ids.length,
      success: results.filter((item) => item.ok).length,
      failed: results.filter((item) => !item.ok).length,
      results,
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
      include: { family: true, sizeOption: true, potOption: true },
    });
    if (!variant) throw new NotFoundException('Ürün bulunamadı.');
    return variant;
  }

  private buildPayload(variant: any) {
    const images = this.imageUrls(variant.images);
    return {
      barcode: variant.barcode,
      modelCode: variant.currentModelCode,
      productName: variant.seoManualProductName ?? variant.seoProductName ?? variant.productName,
      description: variant.seoLongDescription ?? variant.productDescription,
      shortDescription: variant.seoShortDescription,
      categoryName: variant.trendyolCategoryName,
      brand: variant.brand,
      color: variant.productColor,
      salePrice: Number(variant.trendyolSalePrice),
      stockQuantity: variant.stockQuantity,
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

  private missingFields(variant: any, payload: Record<string, any>) {
    const missing: string[] = [];
    if (!payload.barcode) missing.push('Barkod');
    if (!payload.modelCode) missing.push('Model kodu');
    if (!payload.productName) missing.push('Ürün adı');
    if (!payload.description) missing.push('Uzun açıklama');
    if (!payload.categoryName) missing.push('Trendyol kategori adı');
    if (!payload.salePrice || payload.salePrice <= 0) missing.push('Satış fiyatı');
    if (!Array.isArray(payload.images) || payload.images.length === 0) missing.push('Ürün görseli');
    if (variant.seoApprovalStatus !== 'Hazır Onay') missing.push('SEO onayı');
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
      .filter(Boolean);
  }

  private extractError(responseBody: unknown) {
    if (!responseBody || typeof responseBody !== 'object') return 'Trendyol güncellemesi başarısız.';
    const data = responseBody as Record<string, any>;
    if (Array.isArray(data.errors)) return data.errors.map((item) => item.message ?? JSON.stringify(item)).join(' ');
    return data.message ?? data.error ?? 'Trendyol güncellemesi başarısız.';
  }
}
