import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import { PhotoroomService } from '../image-processing/photoroom.service';
import { PrismaService } from '../prisma/prisma.service';

type ImageEntry = {
  url: string;
  fileName: string;
  status: 'Mevcut' | 'Yeni Sürüm' | 'PhotoRoom' | 'Arşiv' | 'Onay Bekliyor';
  isMain: boolean;
  width?: number | null;
  height?: number | null;
};

@Injectable()
export class SeoProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly photoroom: PhotoroomService,
  ) {}

  async list() {
    const variants = await this.prisma.trendyolProductVariant.findMany({
      where: {
        OR: [
          { suggestedFamilyName: { contains: 'Ficus', mode: 'insensitive' } },
          { suggestedFamilyName: { contains: 'Benjamin', mode: 'insensitive' } },
          { suggestedFamilyName: { contains: 'Areka', mode: 'insensitive' } },
          { suggestedFamilyName: { contains: 'Bambu', mode: 'insensitive' } },
          { productName: { contains: 'ficus', mode: 'insensitive' } },
          { productName: { contains: 'benjamin', mode: 'insensitive' } },
          { productName: { contains: 'areka', mode: 'insensitive' } },
          { productName: { contains: 'bambu', mode: 'insensitive' } },
        ],
      },
      include: {
        family: { include: { master: true } },
        sizeOption: true,
        potOption: true,
      },
      orderBy: [{ suggestedFamilyName: 'asc' }, { productName: 'asc' }],
    });

    return variants.map((variant) => this.serializeVariant(variant));
  }

  async detail(id: number) {
    const variant = await this.getVariant(id);
    return this.serializeVariant(variant);
  }

  async saveDraft(id: number, payload: unknown) {
    const variant = await this.getVariant(id);
    const body = (payload ?? {}) as Record<string, unknown>;
    const properties = this.normalizeProperties(body.properties ?? body);
    const manualName = this.text(body.manualProductName) ?? this.text(body.seoManualProductName);
    const suggestedName = this.text(body.seoProductName) ?? this.buildSeoNameFromProperties(properties, variant);
    const seoContent = this.normalizeSeoContent(body);

    const updated = await this.prisma.trendyolProductVariant.update({
      where: { id },
      data: {
        proposedModelCode: this.text(body.proposedModelCode) ?? variant.proposedModelCode,
        detectedSize: properties.heightCm ? `${properties.heightCm} cm` : variant.detectedSize,
        detectedPot: this.combinedPotName(properties) ?? variant.detectedPot,
        seoProductName: suggestedName,
        seoManualProductName: manualName,
        seoDistinctiveFeature: this.text(properties.extraFeatures) ?? this.text(body.distinctiveFeature) ?? variant.seoDistinctiveFeature,
        seoMarketTitle: seoContent.marketTitle,
        seoWebTitle: seoContent.webTitle,
        seoShortDescription: seoContent.shortDescription,
        seoLongDescription: seoContent.longDescription,
        seoMetaTitle: seoContent.metaTitle,
        seoMetaDescription: seoContent.metaDescription,
        seoKeywords: seoContent.keywords,
        seoImageAltText: seoContent.imageAltText,
        seoProperties: properties,
        seoApprovalStatus: 'Eksik Bilgi',
      },
      include: this.variantInclude(),
    });

    return this.serializeVariant(updated);
  }

  async generateContent(id: number, payload: unknown) {
    const variant = await this.getVariant(id);
    const body = (payload ?? {}) as Record<string, unknown>;
    const properties = this.normalizeProperties(body.properties ?? body, variant);
    const seoName = this.buildSeoNameFromProperties(properties, variant);
    const descriptionWarning = this.potMeasureWarning(properties);
    const longDescription = this.buildLongDescription(properties, variant, seoName);
    const shortDescription = this.buildShortDescription(properties, variant, seoName);
    const keywords = this.buildKeywords(properties, variant);

    return {
      properties,
      seoProductName: seoName,
      manualProductName: seoName,
      marketTitle: seoName,
      webTitle: seoName,
      shortDescription,
      longDescription,
      metaTitle: this.truncate(seoName, 58),
      metaDescription: this.truncate(shortDescription, 155),
      keywords,
      imageAltText: seoName,
      warnings: descriptionWarning ? [descriptionWarning] : [],
    };
  }

  async approveOne(id: number, payload: unknown) {
    const saved = await this.saveDraft(id, payload);
    const finalName = this.text((payload as any)?.manualProductName) ?? saved.manualProductName ?? saved.seoProductName ?? saved.oldProductName;

    const savedImages = Array.isArray(saved.images) ? saved.images.map((image: ImageEntry) => image.url).filter(Boolean) : [];
    const approvedImages = saved.properties.pendingMainImageUrl
      ? [saved.properties.pendingMainImageUrl, ...savedImages.filter((image) => image !== saved.properties.pendingMainImageUrl)]
      : undefined;

    const updated = await this.prisma.trendyolProductVariant.update({
      where: { id },
      data: {
        productName: finalName,
        currentModelCode: saved.proposedModelCode ?? saved.currentModelCode,
        ...(approvedImages ? { images: approvedImages } : {}),
        seoProperties: { ...saved.properties, pendingMainImageUrl: null },
        seoProductName: finalName,
        seoManualProductName: finalName,
        productDescription: saved.longDescription ?? saved.shortDescription ?? null,
        seoApprovalStatus: 'Hazır Onay',
        seoApprovedAt: new Date(),
        seoChangeHistory: this.appendHistory(saved.changeHistory, {
          action: 'Onaylandı',
          oldProductName: saved.oldProductName,
          newProductName: finalName,
          approvedMainImage: saved.properties.pendingMainImageUrl ?? null,
          date: new Date().toISOString(),
        }),
      },
      include: this.variantInclude(),
    });

    await this.prisma.product.updateMany({
      where: { barcode: updated.barcode },
      data: {
        productName: finalName,
        modelCode: updated.currentModelCode ?? undefined,
        description: updated.productDescription ?? undefined,
      },
    });

    return this.serializeVariant(updated);
  }

  async uploadImage(id: number, file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException('Görsel yüklenemedi.');
    if (!file.mimetype.startsWith('image/')) throw new BadRequestException('Sadece görsel dosyası yüklenebilir.');
    const variant = await this.getVariant(id);
    const modelCode = this.safeModelCode(variant.currentModelCode ?? variant.proposedModelCode ?? `BARCODE-${variant.barcode}`);
    const destination = this.variantFolder(modelCode, 'original');
    const ext = path.extname(file.originalname) || '.jpg';
    const fileName = `${modelCode}_ANA_v${Date.now()}${ext}`;
    const targetPath = path.join(destination, fileName);
    await fsPromises.rename(file.path, targetPath);

    const filePath = `/uploads/transformed-products/${modelCode}/original/${fileName}`;
    const currentImages = this.imageUrls(variant.images);
    const imageHistory = this.appendHistory(variant.seoImageHistory, {
      action: 'Yeni görsel yüklendi',
      filePath,
      originalName: file.originalname,
      date: new Date().toISOString(),
    });

    const updated = await this.prisma.trendyolProductVariant.update({
      where: { id },
      data: {
        images: [...currentImages.filter((image) => image !== filePath), filePath],
        seoProperties: { ...this.rawObject(variant.seoProperties), pendingMainImageUrl: filePath },
        seoImageHistory: imageHistory,
      },
      include: this.variantInclude(),
    });

    return this.serializeVariant(updated);
  }

  async makeMainImage(id: number, imageIndex: number) {
    const variant = await this.getVariant(id);
    const images = this.imageUrls(variant.images);
    const selected = images[imageIndex];
    if (!selected) throw new BadRequestException('Görsel bulunamadı.');
    const updated = await this.prisma.trendyolProductVariant.update({
      where: { id },
      data: {
        seoProperties: { ...this.rawObject(variant.seoProperties), pendingMainImageUrl: selected },
        seoImageHistory: this.appendHistory(variant.seoImageHistory, {
          action: 'Ana görsel seçildi, onay bekliyor',
          filePath: selected,
          date: new Date().toISOString(),
        }),
      },
      include: this.variantInclude(),
    });
    return this.serializeVariant(updated);
  }

  async archiveImage(id: number, imageIndex: number) {
    const variant = await this.getVariant(id);
    const images = this.imageUrls(variant.images);
    const selected = images[imageIndex];
    if (!selected) throw new BadRequestException('Görsel bulunamadı.');
    const updated = await this.prisma.trendyolProductVariant.update({
      where: { id },
      data: {
        images: images.filter((_, index) => index !== imageIndex),
        seoImageHistory: this.appendHistory(variant.seoImageHistory, {
          action: 'Görsel arşivlendi',
          filePath: selected,
          date: new Date().toISOString(),
        }),
      },
      include: this.variantInclude(),
    });
    return this.serializeVariant(updated);
  }

  async processImageWithPhotoroom(id: number, imageIndex: number, mode = 'Pazaryeri Ana Görseli') {
    const variant = await this.getVariant(id);
    const images = this.imageUrls(variant.images);
    const selected = images[imageIndex];
    if (!selected) throw new BadRequestException('PhotoRoom için görsel seçilmelidir.');

    const modelCode = this.safeModelCode(variant.currentModelCode ?? variant.proposedModelCode ?? `BARCODE-${variant.barcode}`);
    const sourcePath = await this.ensureLocalSource(selected, modelCode);
    const editedBuffer = await this.photoroom.editImage({
      sourcePath,
      fileType: this.fileTypeFromPath(sourcePath),
      backgroundColor: mode === 'Şeffaf PNG' ? 'transparent' : 'FFFFFF',
      padding: '0.08',
    });
    const destination = this.variantFolder(modelCode, 'working');
    const outputFileName = `${modelCode}_PHOTOROOM_v${Date.now()}.png`;
    const outputPath = path.join(destination, outputFileName);
    await fsPromises.writeFile(outputPath, editedBuffer);

    const filePath = `/uploads/transformed-products/${modelCode}/working/${outputFileName}`;
    const updated = await this.prisma.trendyolProductVariant.update({
      where: { id },
      data: {
        images: [...images.filter((image) => image !== filePath), filePath],
        seoProperties: { ...this.rawObject(variant.seoProperties), pendingMainImageUrl: filePath },
        seoImageHistory: this.appendHistory(variant.seoImageHistory, {
          action: 'PhotoRoom çıktısı oluşturuldu',
          mode,
          source: selected,
          filePath,
          date: new Date().toISOString(),
        }),
      },
      include: this.variantInclude(),
    });
    return this.serializeVariant(updated);
  }

  async assignFamily(variantIds: number[], familyId: number) {
    const ids = this.cleanIds(variantIds);
    if (!Number.isFinite(familyId)) throw new BadRequestException('Ürün ailesi seçilmelidir.');
    const family = await this.prisma.productionFamily.findUnique({ where: { id: familyId } });
    if (!family) throw new BadRequestException('Ürün ailesi bulunamadı.');

    await this.prisma.trendyolProductVariant.updateMany({
      where: { id: { in: ids } },
      data: {
        familyId,
        suggestedFamilyName: family.familyName,
        seoApprovalStatus: 'Eksik Bilgi',
      },
    });
    await this.rebuildNames(ids);
    return { updatedCount: ids.length };
  }

  async assignPot(variantIds: number[], potName?: string) {
    const ids = this.cleanIds(variantIds);
    const pot = this.text(potName);
    if (!pot) throw new BadRequestException('Saksı seçilmelidir.');

    await this.prisma.trendyolProductVariant.updateMany({
      where: { id: { in: ids } },
      data: {
        detectedPot: pot,
        seoApprovalStatus: 'Eksik Bilgi',
      },
    });
    await this.rebuildNames(ids);
    return { updatedCount: ids.length };
  }

  async rebuildNames(variantIds: number[]) {
    const ids = this.cleanIds(variantIds);
    const variants = await this.prisma.trendyolProductVariant.findMany({
      where: { id: { in: ids } },
      include: this.variantInclude(),
    });

    for (const variant of variants) {
      const properties = this.normalizeProperties(variant.seoProperties, variant);
      const seoName = this.buildSeoNameFromProperties(properties, variant);
      const status = this.resolveStatus({
        storedStatus: 'Eksik Bilgi',
        seoName,
        familyName: properties.familyName,
        size: properties.heightCm ? `${properties.heightCm} cm` : null,
        pot: this.combinedPotName(properties),
        hasLink: Boolean(variant.trendyolProductUrl),
        hasImages: this.imageUrls(variant.images).length > 0,
      });

      await this.prisma.trendyolProductVariant.update({
        where: { id: variant.id },
        data: {
          seoProductName: seoName,
          seoDistinctiveFeature: properties.extraFeatures || null,
          seoApprovalStatus: status,
        },
      });
    }

    return { updatedCount: variants.length };
  }

  async bulkGenerateAll(onlyMissing = true) {
    const where = onlyMissing ? { seoApprovalStatus: { not: 'Hazır Onay' } } : {};
    const variants = await this.prisma.trendyolProductVariant.findMany({
      where,
      select: { id: true },
    });
    const ids = variants.map((v) => v.id);
    if (ids.length === 0) return { updatedCount: 0, approvedCount: 0 };
    await this.rebuildNames(ids);
    const result = await this.approve(ids);
    return { updatedCount: ids.length, approvedCount: result.approvedCount };
  }

  async approve(variantIds: number[]) {
    const ids = this.cleanIds(variantIds);
    await this.rebuildNames(ids);
    const variants = await this.prisma.trendyolProductVariant.findMany({ where: { id: { in: ids } } });
    const ready = variants.filter((variant) => variant.seoProductName);

    for (const variant of ready) {
      await this.prisma.trendyolProductVariant.update({
        where: { id: variant.id },
        data: {
          productName: variant.seoProductName ?? variant.productName,
          seoApprovalStatus: 'Hazır Onay',
          seoApprovedAt: new Date(),
        },
      });

      await this.prisma.product.updateMany({
        where: { barcode: variant.barcode },
        data: { productName: variant.seoProductName ?? variant.productName },
      });
    }

    return { approvedCount: ready.length };
  }

  private serializeVariant(variant: any) {
    const properties = this.normalizeProperties(variant.seoProperties, variant);
    const familyName = properties.familyName || this.resolveFamilyName(variant);
    const size = properties.heightCm ? `${properties.heightCm} cm` : variant.sizeOption?.sizeLabel ?? variant.detectedSize ?? this.detectSize(variant.productName);
    const pot = this.combinedPotName(properties) ?? variant.potOption?.potName ?? variant.detectedPot ?? this.detectPot(variant.productName);
    const feature = variant.seoDistinctiveFeature ?? properties.extraFeatures ?? this.detectFeature(variant.productName, variant.productColor);
    const seoName = variant.seoProductName ?? this.buildSeoName(size, familyName, feature, pot);
    const status = this.resolveStatus({
      storedStatus: variant.seoApprovalStatus,
      seoName,
      familyName,
      size,
      pot,
      hasLink: Boolean(variant.trendyolProductUrl),
      hasImages: this.imageUrls(variant.images).length > 0,
    });

    return {
      id: variant.id,
      barcode: variant.barcode,
      currentModelCode: variant.currentModelCode,
      proposedModelCode: variant.proposedModelCode ?? variant.currentModelCode,
      supplierStockCode: variant.supplierStockCode,
      oldProductName: variant.productName,
      seoProductName: seoName,
      manualProductName: variant.seoManualProductName ?? seoName,
      marketTitle: variant.seoMarketTitle ?? seoName,
      webTitle: variant.seoWebTitle ?? seoName,
      shortDescription: variant.seoShortDescription,
      longDescription: variant.seoLongDescription ?? variant.productDescription,
      metaTitle: variant.seoMetaTitle,
      metaDescription: variant.seoMetaDescription,
      keywords: variant.seoKeywords ?? [],
      imageAltText: variant.seoImageAltText,
      mainCategory: variant.trendyolCategoryName,
      familyId: variant.familyId,
      familyName,
      size,
      pot,
      color: variant.productColor,
      distinctiveFeature: feature,
      approvalStatus: status,
      trendyolProductUrl: variant.trendyolProductUrl,
      salePrice: Number(variant.trendyolSalePrice),
      stockQuantity: variant.stockQuantity,
      images: this.imageEntries(variant.images, properties.pendingMainImageUrl),
      imageHistory: Array.isArray(variant.seoImageHistory) ? variant.seoImageHistory : [],
      changeHistory: Array.isArray(variant.seoChangeHistory) ? variant.seoChangeHistory : [],
      properties,
      modelGroup: this.modelGroup(variant.currentModelCode, variant.supplierStockCode),
    };
  }

  private variantInclude() {
    return {
      family: { include: { master: true } },
      sizeOption: true,
      potOption: true,
    };
  }

  private async getVariant(id: number) {
    const variant = await this.prisma.trendyolProductVariant.findUnique({
      where: { id },
      include: this.variantInclude(),
    });
    if (!variant) throw new NotFoundException('Ürün bulunamadı.');
    return variant;
  }

  private normalizeProperties(input: unknown, variant?: any) {
    const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
    const familyName = this.text(raw.familyName) ?? this.resolveFamilyName(variant ?? { productName: '' });
    const height = this.numberText(raw.heightCm) ?? this.sizeNumber(variant?.sizeOption?.sizeLabel ?? variant?.detectedSize ?? this.detectSize(variant?.productName ?? ''));
    const potName = this.text(raw.potType) ?? variant?.potOption?.potName ?? variant?.detectedPot ?? this.detectPot(variant?.productName ?? '');
    return {
      familyName,
      plantType: this.text(raw.plantType) ?? familyName,
      heightCm: height,
      trunkType: this.text(raw.trunkType),
      trunkCount: this.numberText(raw.trunkCount),
      leafCount: this.numberText(raw.leafCount),
      potShape: this.text(raw.potShape) ?? this.guessPotShape(potName),
      potType: potName,
      potColor: this.text(raw.potColor) ?? this.detectPotColor(potName),
      potWidthCm: this.numberText(raw.potWidthCm),
      potLengthCm: this.numberText(raw.potLengthCm),
      potHeightCm: this.numberText(raw.potHeightCm),
      potDiameterCm: this.numberText(raw.potDiameterCm),
      productColor: this.text(raw.productColor) ?? variant?.productColor ?? null,
      usageArea: this.text(raw.usageArea) ?? 'Ev, ofis, mağaza, otel ve iç mekan dekorasyonu',
      extraFeatures: this.text(raw.extraFeatures) ?? this.detectFeature(variant?.productName ?? '', variant?.productColor),
      pendingMainImageUrl: this.text(raw.pendingMainImageUrl),
    };
  }

  private normalizeSeoContent(body: Record<string, unknown>) {
    return {
      marketTitle: this.text(body.marketTitle),
      webTitle: this.text(body.webTitle),
      shortDescription: this.text(body.shortDescription),
      longDescription: this.text(body.longDescription),
      metaTitle: this.text(body.metaTitle),
      metaDescription: this.text(body.metaDescription),
      keywords: Array.isArray(body.keywords)
        ? body.keywords.map((item) => String(item).trim()).filter(Boolean)
        : String(body.keywords ?? '').split(',').map((item) => item.trim()).filter(Boolean),
      imageAltText: this.text(body.imageAltText),
    };
  }

  private buildSeoNameFromProperties(properties: any, variant: any) {
    const height = properties.heightCm ? `${properties.heightCm} cm` : null;
    const family = properties.plantType || properties.familyName || this.resolveFamilyName(variant);
    const trunk = properties.trunkCount ? `${properties.trunkCount} Gövdeli` : null;
    const pot = this.combinedPotName(properties);
    const parts = [height, 'Yapay', family, trunk, pot, 'Dekoratif Ağaç'].map((item) => this.text(item)).filter((item): item is string => Boolean(item));
    return this.fixTurkishDisplay(this.removeRepeats(parts).join(' '));
  }

  private buildShortDescription(properties: any, variant: any, seoName: string) {
    const height = properties.heightCm ? `${properties.heightCm} cm` : null;
    const pot = this.combinedPotName(properties);
    const pieces = [seoName, height ? `${height} yüksekliğinde` : null, pot ? `${pot} ile hazırlanır` : null, properties.usageArea ? `${properties.usageArea} için uygundur` : null];
    return pieces.filter(Boolean).join('. ') + '.';
  }

  private buildLongDescription(properties: any, variant: any, seoName: string) {
    const lines = [
      'Ürün Tanıtımı',
      `${seoName}, doğal görünümlü yapısı ile dekoratif kullanım için hazırlanmıştır.`,
      '',
      'Ürün Özellikleri',
      ...this.compactList([
        ['Ürün türü', properties.plantType || properties.familyName],
        ['Toplam yükseklik', properties.heightCm ? `${properties.heightCm} cm` : null],
        ['Gövde türü', properties.trunkType],
        ['Gövde sayısı', properties.trunkCount],
        ['Yaprak sayısı', properties.leafCount],
        ['Ürün rengi', properties.productColor],
        ['Saksı', this.combinedPotName(properties)],
      ]),
      '',
      'Ürün ve Saksı Ölçüleri',
      ...this.compactList([
        ['Toplam ürün yüksekliği', properties.heightCm ? `${properties.heightCm} cm` : null],
        ['Saksı ölçüsü', this.potMeasureText(properties)],
        ['Saksı çapı', properties.potDiameterCm ? `${properties.potDiameterCm} cm` : null],
        ['Saksı yüksekliği', properties.potHeightCm ? `${properties.potHeightCm} cm` : null],
      ]),
      '',
      'Kullanım Alanları',
      properties.usageArea || 'Ev, ofis, mağaza, otel ve iç mekan dekorasyonlarında kullanılabilir.',
      '',
      'Bakım ve Temizlik',
      'Nemli bezle kolayca temizlenebilir. Doğrudan yoğun ısı ve dış ortam koşullarından korunması önerilir.',
      '',
      'Paketleme ve Gönderim',
      'Ürün, taşıma sırasında zarar görmemesi için korumalı şekilde paketlenir.',
      '',
      'Önemli Bilgilendirme',
      'Ürün açıklaması mevcut ürün bilgilerine göre hazırlanmıştır. Ölçü girilmeyen alanlar açıklamaya eklenmez.',
    ];
    return lines.filter((line) => line !== null && line !== undefined).join('\n');
  }

  private compactList(rows: Array<[string, unknown]>) {
    return rows.filter(([, value]) => this.text(value)).map(([label, value]) => `- ${label}: ${value}`);
  }

  private combinedPotName(properties: any) {
    const color = this.text(properties.potColor);
    const type = this.text(properties.potType);
    if (!color && !type) return null;
    if (type && color && this.normalize(type).includes(this.normalize(color))) return type;
    return this.fixTurkishDisplay([color, type].filter(Boolean).join(' '));
  }

  private potMeasureText(properties: any) {
    if (this.normalize(properties.potShape ?? '').includes('yuvarlak')) {
      return [properties.potDiameterCm ? `Çap ${properties.potDiameterCm} cm` : null, properties.potHeightCm ? `Yükseklik ${properties.potHeightCm} cm` : null].filter(Boolean).join(', ') || null;
    }
    const parts = [properties.potWidthCm, properties.potLengthCm, properties.potHeightCm].filter(Boolean);
    return parts.length > 0 ? `${parts.join(' x ')} cm` : null;
  }

  private potMeasureWarning(properties: any) {
    const shape = this.normalize(properties.potShape ?? '');
    const hasRound = shape.includes('yuvarlak') && properties.potDiameterCm && properties.potHeightCm;
    const hasBox = !shape.includes('yuvarlak') && properties.potWidthCm && properties.potLengthCm && properties.potHeightCm;
    return hasRound || hasBox ? null : 'Saksı ölçüleri eksik. Açıklama ölçü bilgisi olmadan oluşturulacak.';
  }

  private buildKeywords(properties: any, variant: any) {
    return this.removeRepeats([
      properties.familyName,
      properties.plantType,
      'yapay ağaç',
      properties.potType,
      properties.potColor,
      properties.heightCm ? `${properties.heightCm} cm yapay bitki` : null,
      variant.trendyolCategoryName,
    ].map((item) => this.text(item)).filter(Boolean) as string[]);
  }

  private imageEntries(images: unknown, pendingMainImageUrl?: string | null): ImageEntry[] {
    return this.imageUrls(images).map((url, index) => ({
      url,
      fileName: path.basename(url.split('?')[0]) || `gorsel-${index + 1}`,
      status: pendingMainImageUrl === url ? 'Onay Bekliyor' : index === 0 ? 'Mevcut' : 'Yeni Sürüm',
      isMain: index === 0,
      width: null,
      height: null,
    }));
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

  private async ensureLocalSource(imageUrl: string, modelCode: string) {
    if (imageUrl.startsWith('/uploads/')) {
      const localPath = path.normalize(path.join(process.cwd(), imageUrl.replace(/^\//, '')));
      const uploadRoot = path.normalize(path.join(process.cwd(), 'uploads'));
      if (!localPath.startsWith(uploadRoot)) throw new BadRequestException('Geçersiz görsel yolu.');
      return localPath;
    }

    if (!/^https?:\/\//i.test(imageUrl)) throw new BadRequestException('PhotoRoom için geçerli görsel yolu bulunamadı.');
    const response = await fetch(imageUrl);
    if (!response.ok) throw new BadRequestException('Görsel indirilemedi.');
    const destination = this.variantFolder(modelCode, 'working');
    const fileName = `${modelCode}_KAYNAK_v${Date.now()}.jpg`;
    const filePath = path.join(destination, fileName);
    await fsPromises.writeFile(filePath, Buffer.from(await response.arrayBuffer()));
    return filePath;
  }

  private variantFolder(modelCode: string, folder: 'original' | 'working' | 'approved' | 'archived') {
    const destination = path.join(process.cwd(), 'uploads', 'transformed-products', modelCode, folder);
    fs.mkdirSync(destination, { recursive: true });
    return destination;
  }

  private fileTypeFromPath(filePath: string) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.png') return 'image/png';
    if (ext === '.webp') return 'image/webp';
    return 'image/jpeg';
  }

  private appendHistory(current: unknown, item: Record<string, unknown>) {
    const history = Array.isArray(current) ? current : [];
    return [item, ...history].slice(0, 100);
  }

  private rawObject(value: unknown) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  }

  private cleanIds(variantIds: number[]) {
    const ids = Array.from(new Set(variantIds.map(Number).filter((id) => Number.isFinite(id))));
    if (ids.length === 0) throw new BadRequestException('Seçili ürün bulunamadı.');
    return ids;
  }

  private resolveFamilyName(variant: any) {
    const raw = variant?.family?.master?.name ?? variant?.family?.familyName ?? variant?.suggestedFamilyName ?? this.detectFamily(variant?.productName ?? '');
    return raw?.replace(/^Yapay\s+/i, '').replace(/\s*Ağacı$/i, '').trim() || null;
  }

  private buildSeoName(size?: string | null, familyName?: string | null, feature?: string | null, pot?: string | null) {
    const parts = [size, 'Yapay', familyName, feature, pot].map((item) => this.text(item)).filter(Boolean) as string[];
    return parts.length >= 3 ? this.removeRepeats(parts).join(' ') : null;
  }

  private resolveStatus(input: { storedStatus?: string | null; seoName?: string | null; familyName?: string | null; size?: string | null; pot?: string | null; hasLink: boolean; hasImages: boolean }) {
    if (input.storedStatus === 'Hazır Onay') return 'Hazır Onay';
    if (!input.hasLink || !input.hasImages) return 'İnceleme Gerekli';
    if (!input.seoName || !input.familyName || !input.size || !input.pot) return 'Eksik Bilgi';
    return 'Hazır Onay';
  }

  private detectFamily(value: string) {
    const text = this.normalize(value);
    if (text.includes('ficus')) return 'Ficus';
    if (text.includes('benjamin')) return 'Benjamin';
    if (text.includes('areka')) return 'Areka';
    if (text.includes('bambu')) return 'Bambu';
    return null;
  }

  private detectSize(value: string) {
    const match = this.normalize(value).match(/(\d{2,3})\s*cm/);
    return match ? `${match[1]} cm` : null;
  }

  private sizeNumber(value?: string | null) {
    const match = this.text(value)?.match(/(\d{2,3})/);
    return match ? match[1] : null;
  }

  private detectPot(value: string) {
    const text = this.normalize(value);
    const potSize = text.includes('25x25') ? '25x25' : '30x30';
    const rules = [
      ['beyaz plastik', 'Beyaz Plastik Saksı'],
      ['siyah plastik', 'Siyah Plastik Saksı'],
      ['plastik', 'Plastik Saksı'],
      ['siyah gold', `Siyah Gold ${potSize}`],
      ['siyah gumus', `Siyah Gümüş ${potSize}`],
      ['beyaz gold', `Beyaz Gold ${potSize}`],
      ['beyaz gumus', `Beyaz Gümüş ${potSize}`],
      ['siyah lilyum', 'Siyah Lilyum 31x58'],
      ['beyaz lilyum', 'Beyaz Lilyum 31x58'],
      ['metal', `Metal Saksı ${potSize}`],
      ['vega', text.includes('siyah') ? 'Siyah Vega' : 'Beyaz Vega'],
      ['lilyum', text.includes('siyah') ? 'Siyah Lilyum' : 'Beyaz Lilyum'],
      ['kure', text.includes('siyah') ? 'Siyah Küre' : 'Beyaz Küre'],
      ['nergiz', 'Nergiz Saksı'],
      ['luna', 'Luna Saksı'],
    ] as const;
    return rules.find(([keyword]) => text.includes(keyword))?.[1] ?? null;
  }

  private detectPotColor(value?: string | null) {
    const text = this.normalize(value ?? '');
    if (text.includes('siyah')) return 'Siyah';
    if (text.includes('beyaz')) return 'Beyaz';
    if (text.includes('gold')) return 'Gold';
    if (text.includes('gumus')) return 'Gümüş';
    return null;
  }

  private guessPotShape(value?: string | null) {
    const text = this.normalize(value ?? '');
    if (text.includes('kure') || text.includes('yuvarlak')) return 'Yuvarlak';
    if (text.includes('30x30') || text.includes('25x25')) return 'Kare';
    return 'Dikdörtgen';
  }

  private detectFeature(productName: string, color?: string | null) {
    const text = this.normalize(productName);
    const features = [];
    const stemMatch = text.match(/(\d+)\s*(govde|govdeli|cubuk|dalli|dal)/);
    if (stemMatch) features.push(`${stemMatch[1]} Gövdeli`);
    if (text.includes('islak doku')) features.push('Islak Dokulu');
    if (text.includes('yogun yaprak')) features.push('Yoğun Yapraklı');
    if (color && !['yeşil', 'yesil', 'green'].includes(this.normalize(color))) features.push(this.titleCase(color));
    return features.join(' ') || null;
  }

  private modelGroup(modelCode?: string | null, supplierCode?: string | null) {
    const raw = modelCode || supplierCode || '';
    return raw.split(/[.\-_]/).slice(0, 2).join('.') || '-';
  }

  private safeModelCode(value: string) {
    return value
      .toLocaleUpperCase('tr-TR')
      .replace(/[^A-Z0-9-_.]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'MODEL';
  }

  private text(value: unknown) {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    return text || null;
  }

  private numberText(value: unknown) {
    const text = this.text(value);
    if (!text) return null;
    const normalized = text.replace(',', '.');
    const number = Number(normalized);
    return Number.isFinite(number) && number > 0 ? String(number).replace('.', ',') : null;
  }

  private truncate(value: string, length: number) {
    return value.length <= length ? value : `${value.slice(0, length - 1).trim()}…`;
  }

  private removeRepeats(parts: string[]) {
    const seen = new Set<string>();
    return parts.filter((part) => {
      const key = this.normalize(part);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private titleCase(value: string) {
    return value
      .toLocaleLowerCase('tr-TR')
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toLocaleUpperCase('tr-TR') + part.slice(1))
      .join(' ');
  }

  private fixTurkishDisplay(value: string) {
    return value
      .replace(/\bSaksi\b/gi, 'Saksı')
      .replace(/\bAgac\b/gi, 'Ağaç')
      .replace(/\bGovdeli\b/gi, 'Gövdeli')
      .replace(/\bGumus\b/gi, 'Gümüş')
      .replace(/\bKure\b/gi, 'Küre')
      .replace(/\bCicek\b/gi, 'Çiçek')
      .replace(/\bYogun\b/gi, 'Yoğun');
  }

  private normalize(value: string) {
    return value
      .toLocaleLowerCase('tr-TR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c');
  }
}
