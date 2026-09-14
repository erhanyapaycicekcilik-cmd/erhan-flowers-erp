import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  calculateChangePriorityScore,
  calculateOverallVisualScore,
  determineRecommendation,
  detectMissingMedia,
  priorityClass,
} from './product-media-audit-engine';
import { erhanFlowersStandardMediaSet, marketplaceRules } from './product-media-audit.config';
import {
  AuditBatch,
  MediaRequirementStatus,
  MediaRequirementType,
  ProductMediaAudit,
  ProductMediaAuditChannel,
  ProductMediaAuditFilters,
  ProductMediaAuditStatus,
  ProductMediaIssueSeverity,
  ProductMediaPublishState,
  ProductMediaRecommendation,
  SalesSignals,
  VisualScoreInput,
} from './product-media-audit.types';

const DEFAULT_COMPANY_ID = 1;

@Injectable()
export class ProductMediaAuditService {
  private readonly audits: ProductMediaAudit[] = seedAudits();
  private readonly batches = new Map<string, AuditBatch>();
  private catalogHydrated = false;

  constructor(private readonly prisma?: PrismaService) {}

  async list(filters: ProductMediaAuditFilters) {
    await this.hydrateFromCatalog();
    const companyId = filters.companyId ?? DEFAULT_COMPANY_ID;
    const companyRows = this.audits.filter((audit) => audit.companyId === companyId);
    const rows = this.applyFilters(companyRows, filters);
    return {
      items: rows,
      total: rows.length,
      summary: this.summaryFromRows(rows),
      filters: {
        channels: Object.values(ProductMediaAuditChannel),
        recommendations: Object.values(ProductMediaRecommendation),
        statuses: Object.values(ProductMediaAuditStatus),
        missingMediaTypes: Object.values(MediaRequirementType),
        categories: unique(this.audits.filter((audit) => audit.companyId === companyId).map((audit) => audit.category)),
        brands: unique(this.audits.filter((audit) => audit.companyId === companyId).map((audit) => audit.brand)),
      },
    };
  }

  async getSummary(companyId = DEFAULT_COMPANY_ID) {
    await this.hydrateFromCatalog();
    return this.summary(companyId);
  }

  async getById(id: string, companyId = DEFAULT_COMPANY_ID) {
    await this.hydrateFromCatalog();
    const audit = this.audits.find((item) => item.id === id && item.companyId === companyId);
    if (!audit) throw new Error('Görsel denetim kaydı bulunamadı.');
    return audit;
  }

  async getHistory(productId: string, channel?: ProductMediaAuditChannel, companyId = DEFAULT_COMPANY_ID) {
    await this.hydrateFromCatalog();
    return this.audits
      .filter((audit) => audit.companyId === companyId && audit.productId === productId && (!channel || audit.channel === channel))
      .flatMap((audit) => audit.history.map((item) => ({ ...item, auditId: audit.id, channel: audit.channel })))
      .sort((a, b) => new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime());
  }

  async startProductAudit(id: string, companyId = DEFAULT_COMPANY_ID) {
    const audit = await this.getById(id, companyId);
    audit.status = ProductMediaAuditStatus.PROCESSING;
    audit.updatedAt = new Date().toISOString();
    return this.completeAudit(audit);
  }

  async startBulkAudit(channel = ProductMediaAuditChannel.GLOBAL, companyId = DEFAULT_COMPANY_ID) {
    await this.hydrateFromCatalog();
    const targets = this.audits.filter((audit) => audit.companyId === companyId && (channel === ProductMediaAuditChannel.GLOBAL || audit.channel === channel));
    const batch: AuditBatch = {
      id: randomUUID(),
      companyId,
      channel,
      status: ProductMediaAuditStatus.PROCESSING,
      total: targets.length,
      completed: 0,
      failed: 0,
      queued: targets.length,
      startedAt: new Date().toISOString(),
      completedAt: null,
    };

    for (const audit of targets) {
      audit.status = ProductMediaAuditStatus.PROCESSING;
      this.completeAudit(audit);
      batch.completed += 1;
      batch.queued = Math.max(0, batch.queued - 1);
    }

    batch.status = ProductMediaAuditStatus.COMPLETED;
    batch.completedAt = new Date().toISOString();
    this.batches.set(batch.id, batch);
    return batch;
  }

  getBatch(id: string, companyId = DEFAULT_COMPANY_ID) {
    const batch = this.batches.get(id);
    if (!batch || batch.companyId !== companyId) throw new Error('Audit batch bulunamadı.');
    return batch;
  }

  getRules() {
    return {
      erhanFlowersStandardMediaSet,
      marketplaceRules,
    };
  }

  private async hydrateFromCatalog() {
    if (this.catalogHydrated || !this.prisma) return;
    this.catalogHydrated = true;

    const [products, variants] = await Promise.all([
      this.prisma.product.findMany({
        where: { status: 'ACTIVE' },
        include: { category: true, mediaFiles: true, productCenterVariant: true },
        orderBy: { updatedAt: 'desc' },
        take: 300,
      }),
      this.prisma.trendyolProductVariant.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    if (products.length > 0 || variants.length > 0) {
      for (let index = this.audits.length - 1; index >= 0; index -= 1) {
        if (this.audits[index].id.startsWith('audit-')) this.audits.splice(index, 1);
      }
    }

    for (const product of products) {
      const imageUrls = [...stringArray(product.imageUrls), ...product.mediaFiles.map((file) => file.filePath).filter(Boolean)];
      this.upsertCatalogAudit(catalogAudit({
        id: `product-${product.id}-global`,
        productId: `product-${product.id}`,
        productName: product.productName,
        sku: product.modelCode,
        barcode: product.barcode ?? '',
        category: product.category?.name ?? 'Kategorisiz',
        brand: product.brand ?? 'Erhan Flowers',
        channel: ProductMediaAuditChannel.GLOBAL,
        erpDetailUrl: product.productCenterVariant ? `/products?variantId=${product.productCenterVariant.id}` : `/products`,
        salesPageUrl: null,
        stockQuantity: Number(product.stockQuantity ?? 0),
        price: numberValue(product.marketPrice) || numberValue(product.sitePrice) || numberValue(product.listPrice),
        imageUrls,
        salesSignals: { stockQuantity: Number(product.stockQuantity ?? 0), revenue: null, salesQuantity: null, views: null, conversionRate: null, ratingAverage: null, ratingCount: null },
      }));
    }

    for (const variant of variants) {
      const imageUrls = stringArray(variant.images);
      this.upsertCatalogAudit(catalogAudit({
        id: `trendyol-variant-${variant.id}`,
        productId: `trendyol-variant-${variant.id}`,
        productName: variant.productName,
        sku: variant.currentModelCode ?? variant.supplierStockCode ?? `TY-${variant.id}`,
        barcode: variant.barcode,
        category: variant.trendyolCategoryName ?? 'Trendyol',
        brand: variant.brand ?? 'Erhan Flowers',
        channel: ProductMediaAuditChannel.TRENDYOL,
        erpDetailUrl: `/production-costs/products/${variant.id}`,
        salesPageUrl: variant.trendyolProductUrl ?? null,
        stockQuantity: Number(variant.stockQuantity ?? 0),
        price: numberValue(variant.trendyolSalePrice),
        imageUrls,
        salesSignals: {
          stockQuantity: Number(variant.stockQuantity ?? 0),
          ratingAverage: numberValue(variant.trendyolRatingAverage),
          ratingCount: Number(variant.trendyolRatingCount ?? 0),
          views: Number(variant.trendyolFavoriteCount ?? 0) * 20,
          salesQuantity: null,
          revenue: null,
          conversionRate: null,
        },
      }));
    }
  }

  private upsertCatalogAudit(audit: ProductMediaAudit) {
    if (this.audits.some((item) => item.id === audit.id)) return;
    this.audits.push(audit);
  }

  private completeAudit(audit: ProductMediaAudit) {
    const recalculated = buildAudit({
      ...audit,
      status: ProductMediaAuditStatus.COMPLETED,
      analyzedAt: new Date().toISOString(),
      history: [
        ...audit.history,
        {
          analyzedAt: new Date().toISOString(),
          overallVisualScore: audit.overallVisualScore,
          changePriorityScore: audit.changePriorityScore,
          recommendation: audit.recommendation,
        },
      ].slice(-5),
    });
    Object.assign(audit, recalculated);
    return audit;
  }

  private summary(companyId: number) {
    return this.summaryFromRows(this.audits.filter((audit) => audit.companyId === companyId));
  }

  private summaryFromRows(rows: ProductMediaAudit[]) {
    const completed = rows.filter((audit) => audit.status === ProductMediaAuditStatus.COMPLETED);
    const health = completed.length ? Math.round((completed.reduce((sum, audit) => sum + audit.overallVisualScore, 0) / completed.length) * 10) : 0;
    return {
      visualHealth: health,
      urgentChange: rows.filter((audit) => audit.recommendation === ProductMediaRecommendation.REBUILD).length,
      shouldImprove: rows.filter((audit) => audit.recommendation === ProductMediaRecommendation.IMPROVE).length,
      goodCondition: rows.filter((audit) => audit.recommendation === ProductMediaRecommendation.KEEP).length,
      waitingAnalysis: rows.filter((audit) => audit.status === ProductMediaAuditStatus.QUEUED).length,
      total: rows.length,
    };
  }

  private applyFilters(rows: ProductMediaAudit[], filters: ProductMediaAuditFilters) {
    let result = rows;
    if (filters.channel) result = result.filter((audit) => audit.channel === filters.channel);
    if (filters.recommendation) result = result.filter((audit) => audit.recommendation === filters.recommendation);
    if (filters.priority) result = result.filter((audit) => audit.priorityClass === filters.priority);
    if (filters.category) result = result.filter((audit) => audit.category === filters.category);
    if (filters.brand) result = result.filter((audit) => audit.brand === filters.brand);
    if (filters.status) result = result.filter((audit) => audit.status === filters.status);
    if (filters.missingMediaType) result = result.filter((audit) => audit.missingMediaTypes.includes(filters.missingMediaType as MediaRequirementType));
    if (filters.minScore != null) result = result.filter((audit) => audit.overallVisualScore >= Number(filters.minScore));
    if (filters.maxScore != null) result = result.filter((audit) => audit.overallVisualScore <= Number(filters.maxScore));
    if (filters.search) {
      const needle = filters.search.toLocaleLowerCase('tr-TR');
      result = result.filter((audit) => [audit.productName, audit.sku, audit.barcode].some((value) => value.toLocaleLowerCase('tr-TR').includes(needle)));
    }

    return [...result].sort((a, b) => {
      switch (filters.sort) {
        case 'score_asc':
          return a.overallVisualScore - b.overallVisualScore;
        case 'sales_desc':
          return (b.salesSignals.salesQuantity ?? 0) - (a.salesSignals.salesQuantity ?? 0);
        case 'revenue_desc':
          return (b.salesSignals.revenue ?? 0) - (a.salesSignals.revenue ?? 0);
        case 'newest':
          return dateValue(b.analyzedAt) - dateValue(a.analyzedAt);
        case 'oldest':
          return dateValue(a.analyzedAt) - dateValue(b.analyzedAt);
        case 'priority_desc':
        default:
          return b.changePriorityScore - a.changePriorityScore;
      }
    });
  }
}

function buildAudit(input: Omit<ProductMediaAudit, 'overallVisualScore' | 'changePriorityScore' | 'priorityClass' | 'recommendation' | 'missingMediaTypes'> & Partial<Pick<ProductMediaAudit, 'overallVisualScore' | 'changePriorityScore' | 'priorityClass' | 'recommendation' | 'missingMediaTypes'>>) {
  const scores = pickScores(input);
  const overallVisualScore = calculateOverallVisualScore(scores);
  const missingMediaTypes = detectMissingMedia(input.requirements.filter((item) => item.status === MediaRequirementStatus.PRESENT).map((item) => item.mediaType));
  const issues = input.issues;
  const recommendation = determineRecommendation(overallVisualScore, issues);
  const changePriorityScore = calculateChangePriorityScore(overallVisualScore, input.salesSignals);
  return {
    ...input,
    overallVisualScore,
    changePriorityScore,
    priorityClass: priorityClass(changePriorityScore),
    recommendation,
    missingMediaTypes,
    updatedAt: new Date().toISOString(),
  } as ProductMediaAudit;
}

function seedAudits() {
  const now = new Date('2026-08-19T09:00:00.000Z').toISOString();
  const rows = [
    mockAudit('audit-benjamin-180', 'p-benjamin-180', 'Benjamin 180 cm Yapay Ağaç', 'EF-BEN-180', '8680000001801', 'Ağaçlar', ProductMediaAuditChannel.TRENDYOL, 1, {
      mainImageScore: 4.8,
      realismScore: 5.5,
      lifestyleScore: 6.2,
      detailScore: 3.2,
      measurementScore: 0,
      consistencyScore: 5.1,
      commercialScore: 5.8,
    }, { salesQuantity: 112, revenue: 132500, views: 5200, conversionRate: 0.064, ratingAverage: 4.4, ratingCount: 88, stockQuantity: 34 }, [MediaRequirementType.MAIN_PRODUCT, MediaRequirementType.HOME_LIFESTYLE, MediaRequirementType.OFFICE_LIFESTYLE], ProductMediaIssueSeverity.CRITICAL, now),
    mockAudit('audit-areka-150', 'p-areka-150', 'Areka 150 cm Dekoratif Saksılı', 'EF-ARE-150', '8680000001504', 'Ağaçlar', ProductMediaAuditChannel.TRENDYOL, 1, {
      mainImageScore: 7.4,
      realismScore: 7.1,
      lifestyleScore: 7.8,
      detailScore: 6.4,
      measurementScore: 5.2,
      consistencyScore: 7.2,
      commercialScore: 7.5,
    }, { salesQuantity: 73, revenue: 86200, views: 4100, conversionRate: 0.071, ratingAverage: 4.7, ratingCount: 54, stockQuantity: 48 }, [MediaRequirementType.MAIN_PRODUCT, MediaRequirementType.HOME_LIFESTYLE, MediaRequirementType.OFFICE_LIFESTYLE, MediaRequirementType.CLOSE_UP, MediaRequirementType.MEASUREMENT], ProductMediaIssueSeverity.MEDIUM, now),
    mockAudit('audit-ficus-105', 'p-ficus-105', 'Ficus 105 cm Mini Ağaç', 'EF-FIC-105', '8680000001052', 'Ağaçlar', ProductMediaAuditChannel.ERHANFLOWERS_COM, 1, {
      mainImageScore: 6.7,
      realismScore: 6.3,
      lifestyleScore: 6.8,
      detailScore: 5.2,
      measurementScore: 4.2,
      consistencyScore: 6.5,
      commercialScore: 6.2,
    }, { salesQuantity: 42, revenue: 31800, views: 2200, conversionRate: 0.045, ratingAverage: 4.1, ratingCount: 28, stockQuantity: 19 }, [MediaRequirementType.MAIN_PRODUCT, MediaRequirementType.HOME_LIFESTYLE, MediaRequirementType.CLOSE_UP], ProductMediaIssueSeverity.MEDIUM, now),
    mockAudit('audit-bahar-dali', 'p-bahar-dali', 'Bahar Dalı Pembe Aranjman', 'EF-BAH-PNK', '8680000002204', 'Çiçekler', ProductMediaAuditChannel.TRENDYOL, 1, {
      mainImageScore: 8.6,
      realismScore: 8.1,
      lifestyleScore: 8.4,
      detailScore: 7.8,
      measurementScore: 7.2,
      consistencyScore: 8.8,
      commercialScore: 8.5,
    }, { salesQuantity: 36, revenue: 24400, views: 1800, conversionRate: 0.083, ratingAverage: 4.8, ratingCount: 41, stockQuantity: 73 }, erhanFlowersStandardMediaSet, ProductMediaIssueSeverity.LOW, now),
    mockAudit('audit-gul-agaci', 'p-gul-agaci', 'Gül Ağacı Kırmızı Büyük Boy', 'EF-GUL-RED', '8680000003102', 'Çiçekler', ProductMediaAuditChannel.FLORAYAPAYCICEK_COM, 1, {
      mainImageScore: 5.9,
      realismScore: 5.8,
      lifestyleScore: 4.6,
      detailScore: 4.8,
      measurementScore: 0,
      consistencyScore: 5.7,
      commercialScore: 6.1,
    }, { salesQuantity: 81, revenue: 91500, views: 3700, conversionRate: 0.052, ratingAverage: 4.3, ratingCount: 36, stockQuantity: 27 }, [MediaRequirementType.MAIN_PRODUCT, MediaRequirementType.HOME_LIFESTYLE, MediaRequirementType.CLOSE_UP], ProductMediaIssueSeverity.HIGH, now),
    mockAudit('audit-bambu-tekli', 'p-bambu-tekli', 'Bambu Tekli 210 cm', 'EF-BAM-210', '8680000002105', 'Bambu Tekli', ProductMediaAuditChannel.TRENDYOL, 1, {
      mainImageScore: 7.9,
      realismScore: 7.4,
      lifestyleScore: 6.8,
      detailScore: 6.1,
      measurementScore: 6.9,
      consistencyScore: 7.6,
      commercialScore: 7.2,
    }, { salesQuantity: 65, revenue: 104000, views: 3400, conversionRate: 0.061, ratingAverage: 4.5, ratingCount: 63, stockQuantity: 12 }, [MediaRequirementType.MAIN_PRODUCT, MediaRequirementType.HOME_LIFESTYLE, MediaRequirementType.OFFICE_LIFESTYLE, MediaRequirementType.CLOSE_UP, MediaRequirementType.MEASUREMENT], ProductMediaIssueSeverity.MEDIUM, now),
    mockAudit('audit-bambu-saksili', 'p-bambu-saksili', 'Bambu Saksılı 170 cm', 'EF-BAM-SAK-170', '8680000001702', 'Bambu Saksılı', ProductMediaAuditChannel.GLOBAL, 1, {
      mainImageScore: 8.2,
      realismScore: 7.9,
      lifestyleScore: 8,
      detailScore: 7.5,
      measurementScore: 8.1,
      consistencyScore: 8.4,
      commercialScore: 8.2,
    }, { salesQuantity: 31, revenue: 50500, views: 1900, conversionRate: 0.068, ratingAverage: 4.6, ratingCount: 25, stockQuantity: 44 }, erhanFlowersStandardMediaSet, ProductMediaIssueSeverity.INFO, now),
    mockAudit('audit-orkide', 'p-orkide', 'Beyaz Orkide Saksılı', 'EF-ORK-WHT', '8680000004109', 'Çiçekler', ProductMediaAuditChannel.ERHANFLOWERS_COM, 1, {
      mainImageScore: 6.2,
      realismScore: 6,
      lifestyleScore: 5.1,
      detailScore: 5.4,
      measurementScore: 3.3,
      consistencyScore: 5.8,
      commercialScore: 6.7,
    }, { salesQuantity: 24, revenue: 19800, views: 1600, conversionRate: 0.039, ratingAverage: 4.2, ratingCount: 14, stockQuantity: 55 }, [MediaRequirementType.MAIN_PRODUCT, MediaRequirementType.CLOSE_UP, MediaRequirementType.TOP_VIEW], ProductMediaIssueSeverity.MEDIUM, now),
    mockAudit('audit-zeytin', 'p-zeytin', 'Zeytin Ağacı 160 cm', 'EF-ZEY-160', '8680000001603', 'Ağaçlar', ProductMediaAuditChannel.TRENDYOL, 1, {
      mainImageScore: 4.4,
      realismScore: 4.9,
      lifestyleScore: 3.8,
      detailScore: 3.1,
      measurementScore: 0,
      consistencyScore: 4.2,
      commercialScore: 4.9,
    }, { salesQuantity: 95, revenue: 118000, views: 4800, conversionRate: 0.049, ratingAverage: 3.9, ratingCount: 47, stockQuantity: 8 }, [MediaRequirementType.HOME_LIFESTYLE], ProductMediaIssueSeverity.CRITICAL, now),
    mockAudit('audit-lavanta', 'p-lavanta', 'Lavanta Demeti Mor', 'EF-LAV-MOR', '8680000005106', 'Çiçekler', ProductMediaAuditChannel.GLOBAL, 1, {
      mainImageScore: 0,
      realismScore: 0,
      lifestyleScore: 0,
      detailScore: 0,
      measurementScore: 0,
      consistencyScore: 0,
      commercialScore: 0,
    }, { salesQuantity: null, revenue: null, views: null, conversionRate: null, ratingAverage: null, ratingCount: null, stockQuantity: 66 }, [], ProductMediaIssueSeverity.INFO, now, ProductMediaAuditStatus.QUEUED),
  ];
  return rows.map(buildAudit);
}

function mockAudit(id: string, productId: string, productName: string, sku: string, barcode: string, category: string, channel: ProductMediaAuditChannel, companyId: number, scores: VisualScoreInput, salesSignals: SalesSignals, presentMediaTypes: MediaRequirementType[], severity: ProductMediaIssueSeverity, now: string, status = ProductMediaAuditStatus.COMPLETED): ProductMediaAudit {
  const auditId = id;
  const requirements = erhanFlowersStandardMediaSet.concat(MediaRequirementType.VIDEO).map((type) => ({
    id: `${auditId}-req-${type}`,
    auditId,
    mediaType: type,
    status: presentMediaTypes.includes(type) ? MediaRequirementStatus.PRESENT : type === MediaRequirementType.VIDEO ? MediaRequirementStatus.NEEDS_IMPROVEMENT : MediaRequirementStatus.MISSING,
  }));
  const imageTypes = presentMediaTypes.length ? presentMediaTypes : [MediaRequirementType.MAIN_PRODUCT];
  const issues = severity === ProductMediaIssueSeverity.INFO
    ? []
    : [{
        id: `${auditId}-issue-1`,
        auditId,
        issueType: severity === ProductMediaIssueSeverity.CRITICAL ? 'MAIN_IMAGE_MISSING' : 'MISSING_SUPPORTING_VISUALS',
        severity,
        title: severity === ProductMediaIssueSeverity.CRITICAL ? 'Kritik ana görsel sorunu' : 'Destekleyici görseller eksik',
        description: severity === ProductMediaIssueSeverity.CRITICAL ? 'Ürün ana görseli veya ürün tutarlılığı kritik seviyede sorunlu.' : 'Standart görsel setinde tamamlanması gereken eksikler var.',
        imageUrl: null,
        createdAt: now,
      }];

  return {
    id,
    companyId,
    productId,
    productName,
    sku,
    barcode,
    category,
    brand: 'Erhan Flowers',
    erpDetailUrl: null,
    salesPageUrl: null,
    channel,
    status,
    imageCount: presentMediaTypes.length,
    ...scores,
    overallVisualScore: 0,
    changePriorityScore: 0,
    priorityClass: 'Orta',
    recommendation: ProductMediaRecommendation.IMPROVE,
    publishState: ProductMediaPublishState.DRAFT,
    mainImageStatus: presentMediaTypes.includes(MediaRequirementType.MAIN_PRODUCT) ? MediaRequirementStatus.PRESENT : MediaRequirementStatus.MISSING,
    lifestyleStatus: presentMediaTypes.some((type) => [MediaRequirementType.HOME_LIFESTYLE, MediaRequirementType.OFFICE_LIFESTYLE, MediaRequirementType.CAFE_LIFESTYLE].includes(type)) ? MediaRequirementStatus.PRESENT : MediaRequirementStatus.MISSING,
    measurementStatus: presentMediaTypes.includes(MediaRequirementType.MEASUREMENT) ? MediaRequirementStatus.PRESENT : MediaRequirementStatus.MISSING,
    closeUpStatus: presentMediaTypes.includes(MediaRequirementType.CLOSE_UP) ? MediaRequirementStatus.PRESENT : MediaRequirementStatus.MISSING,
    salesSignals,
    stockQuantity: Number(salesSignals.stockQuantity ?? 0),
    price: Math.round(Number(salesSignals.revenue ?? 0) / Math.max(1, Number(salesSignals.salesQuantity ?? 1))),
    aiSummary: 'Mock analiz: Görsel seti kalite, gerçeklik, lifestyle, detay, ölçü ve ticari sunum kriterlerine göre puanlandı.',
    aiIssues: issues.map((issue) => issue.title),
    aiRecommendation: severity === ProductMediaIssueSeverity.CRITICAL ? 'Ürün görsellerinin yeniden hazırlanması önerilir.' : 'Eksik destek görselleri tamamlanarak set güçlendirilmeli.',
    recommendedSet: ['Ana ürün', 'Ev', 'Ofis', 'Kafe', 'Yakın çekim', 'Üstten', 'Ölçü'],
    missingMediaTypes: [],
    issues,
    requirements,
    images: imageTypes.map((type, index) => ({
      id: `${auditId}-img-${index + 1}`,
      auditId,
      productImageId: null,
      imageUrl: `https://placehold.co/240x300/e8efe9/1f5132?text=${encodeURIComponent(productName.split(' ')[0])}`,
      sortOrder: index + 1,
      imageType: type,
      score: scores.mainImageScore,
      analysisData: { mock: true, channel },
      createdAt: now,
    })),
    history: [
      { analyzedAt: '2026-08-12T09:00:00.000Z', overallVisualScore: Math.max(1, calculateOverallVisualScore(scores) - 0.7), changePriorityScore: 70, recommendation: ProductMediaRecommendation.IMPROVE },
    ],
    beforeAfterPlan: {
      previousImages: [],
      newImages: [],
      changeDate: null,
      previousConversion: null,
      nextConversion: null,
      previousSales: null,
      nextSales: null,
      performanceDelta: null,
    },
    analyzedAt: status === ProductMediaAuditStatus.COMPLETED ? now : null,
    createdAt: now,
    updatedAt: now,
  };
}

function catalogAudit(input: {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  barcode: string;
  category: string;
  brand: string;
  channel: ProductMediaAuditChannel;
  erpDetailUrl: string | null;
  salesPageUrl: string | null;
  stockQuantity: number;
  price: number;
  imageUrls: string[];
  salesSignals: SalesSignals;
}) {
  const now = new Date().toISOString();
  const presentMediaTypes = inferMediaTypes(input.imageUrls.length);
  const scores = scoreFromCatalog(input.imageUrls.length);
  const severity = input.imageUrls.length === 0
    ? ProductMediaIssueSeverity.CRITICAL
    : input.imageUrls.length < 4
      ? ProductMediaIssueSeverity.MEDIUM
      : ProductMediaIssueSeverity.INFO;
  const audit = mockAudit(
    input.id,
    input.productId,
    input.productName,
    input.sku,
    input.barcode,
    input.category,
    input.channel,
    DEFAULT_COMPANY_ID,
    scores,
    input.salesSignals,
    presentMediaTypes,
    severity,
    now,
    ProductMediaAuditStatus.COMPLETED,
  );

  audit.brand = input.brand;
  audit.erpDetailUrl = input.erpDetailUrl;
  audit.salesPageUrl = input.salesPageUrl;
  audit.stockQuantity = input.stockQuantity;
  audit.price = input.price;
  audit.imageCount = input.imageUrls.length;
  audit.images = (input.imageUrls.length ? input.imageUrls : audit.images.map((image) => image.imageUrl)).map((imageUrl, index) => ({
    id: `${input.id}-img-${index + 1}`,
    auditId: input.id,
    productImageId: null,
    imageUrl,
    sortOrder: index + 1,
    imageType: presentMediaTypes[index] ?? MediaRequirementType.MAIN_PRODUCT,
    score: scores.mainImageScore,
    analysisData: { source: 'ERP_PRODUCT_API', channel: input.channel },
    createdAt: now,
  }));
  audit.aiSummary = 'ERP ürün API kaydından okunan görsel seti mock denetim motoruyla analiz edildi.';
  audit.aiRecommendation = input.imageUrls.length >= 7 ? 'Standart görsel seti büyük ölçüde tamam.' : 'Ürün API kaydındaki görsel seti Erhan Flowers standart setine göre tamamlanmalı.';
  return buildAudit(audit);
}

function scoreFromCatalog(imageCount: number): VisualScoreInput {
  if (imageCount <= 0) {
    return {
      mainImageScore: 0,
      realismScore: 0,
      lifestyleScore: 0,
      detailScore: 0,
      measurementScore: 0,
      consistencyScore: 0,
      commercialScore: 0,
    };
  }

  const base = Math.min(8.8, 4.6 + imageCount * 0.55);
  return {
    mainImageScore: clamp(base + (imageCount >= 1 ? 0.4 : -2)),
    realismScore: clamp(base - 0.2),
    lifestyleScore: clamp(imageCount >= 2 ? base : 2.5),
    detailScore: clamp(imageCount >= 5 ? base - 0.3 : 3.5),
    measurementScore: clamp(imageCount >= 7 ? base - 0.1 : 0),
    consistencyScore: clamp(imageCount >= 3 ? base - 0.1 : 4),
    commercialScore: clamp(base),
  };
}

function inferMediaTypes(imageCount: number) {
  const ordered = [
    MediaRequirementType.MAIN_PRODUCT,
    MediaRequirementType.HOME_LIFESTYLE,
    MediaRequirementType.OFFICE_LIFESTYLE,
    MediaRequirementType.CAFE_LIFESTYLE,
    MediaRequirementType.CLOSE_UP,
    MediaRequirementType.TOP_VIEW,
    MediaRequirementType.MEASUREMENT,
    MediaRequirementType.VIDEO,
  ];
  return ordered.slice(0, Math.min(imageCount, ordered.length));
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? '').trim()).filter(Boolean);
}

function numberValue(value: unknown) {
  if (value == null) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clamp(value: number) {
  return Math.max(0, Math.min(10, Math.round(value * 10) / 10));
}

function pickScores(input: VisualScoreInput): VisualScoreInput {
  return {
    mainImageScore: input.mainImageScore,
    realismScore: input.realismScore,
    lifestyleScore: input.lifestyleScore,
    detailScore: input.detailScore,
    measurementScore: input.measurementScore,
    consistencyScore: input.consistencyScore,
    commercialScore: input.commercialScore,
  };
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr-TR'));
}

function dateValue(value: string | null) {
  return value ? new Date(value).getTime() : 0;
}
