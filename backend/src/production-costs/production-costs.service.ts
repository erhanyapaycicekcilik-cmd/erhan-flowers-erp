import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BambuLeafRoundingMode, Prisma, ProductionCostGroup, StockUsageEventType, TemplateComponentScope } from '../generated/prisma-client';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service';
import { PublishingService } from '../publishing/publishing.service';
import { IntegrationPlatform } from '../integrations/adapters/integration-adapter.interface';

const costGroupLabels: Record<ProductionCostGroup, string> = {
  LEAF: 'Yaprak maliyeti',
  TRUNK: 'Gövde maliyeti',
  POT: 'Saksı maliyeti',
  CONSUMABLE: 'Sarf maliyeti',
  LABOR: 'İşçilik maliyeti',
  ELECTRICITY: 'Elektrik/genel gider',
  PACKAGING: 'Paketleme',
  OTHER: 'Diğer giderler',
};

@Injectable()
export class ProductionCostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publishing: PublishingService,
  ) {}

  async listFamilies() {
    const families = await this.prisma.productionFamily.findMany({
      include: {
        master: true,
        category: true,
        variants: true,
        sizeOptions: { orderBy: { sortOrder: 'asc' } },
        potOptions: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return families.map((family) => ({
      ...family,
      trendyolProductCount: family.variants.length,
    }));
  }

  async getFamily(id: number) {
    const family = await this.prisma.productionFamily.findUnique({
      where: { id },
      include: {
        master: true,
        category: true,
        variants: true,
        sizeOptions: { orderBy: { sortOrder: 'asc' } },
        potOptions: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!family) throw new NotFoundException('Ürün ailesi bulunamadı.');

    return {
      ...family,
      trendyolProductCount: family.variants.length,
    };
  }

  async listFamilyMasters() {
    const masters = await this.prisma.productFamilyMaster.findMany({
      where: { status: 'ACTIVE' },
      include: {
        families: {
          select: { id: true, familyName: true },
          orderBy: { id: 'asc' },
          take: 1,
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { categoryName: 'asc' }, { name: 'asc' }],
    });

    return masters.map((master) => ({
      id: master.id,
      name: master.name,
      categoryName: master.categoryName,
      familyCode: master.familyCode,
      description: master.description,
      defaultKeywords: master.defaultKeywords,
      defaultSizeOptions: master.defaultSizeOptions,
      defaultPotOptions: master.defaultPotOptions,
      isAdded: master.families.length > 0,
      familyId: master.families[0]?.id ?? null,
      familyName: master.families[0]?.familyName ?? null,
    }));
  }

  async addFamilyFromMaster(masterId: number) {
    const master = await this.prisma.productFamilyMaster.findUnique({
      where: { id: masterId },
      include: { families: { orderBy: { id: 'asc' }, take: 1 } },
    });
    if (!master) throw new NotFoundException('Ana ürün ailesi bulunamadı.');

    const existingByMaster = master.families[0];
    if (existingByMaster) {
      return {
        alreadyAdded: true,
        family: await this.getFamily(existingByMaster.id),
      };
    }

    const existingFamily = master.familyCode
      ? await this.prisma.productionFamily.findFirst({
          where: { OR: [{ familyCode: master.familyCode }, { familyName: master.name }] },
        })
      : await this.prisma.productionFamily.findUnique({ where: { familyName: master.name } });
    if (existingFamily) {
      await this.prisma.productionFamily.update({
        where: { id: existingFamily.id },
        data: { masterId: master.id },
      });

      return {
        alreadyAdded: true,
        family: await this.getFamily(existingFamily.id),
      };
    }

    const family = await this.prisma.productionFamily.create({
      data: {
        masterId: master.id,
        familyName: master.name,
        familyCode: master.familyCode,
        description: master.description,
        keywords: master.defaultKeywords.length > 0 ? master.defaultKeywords : [master.name],
        autoMatchingEnabled: false,
        status: 'ACTIVE',
      },
    });

    await this.replaceFamilyOptions(family.id, master.defaultSizeOptions, master.defaultPotOptions);
    await this.ensureDefaultTemplate(family.id, master.name);
    await this.refreshFamilySuggestions(family.id);

    return {
      alreadyAdded: false,
      family: await this.getFamily(family.id),
    };
  }

  async bulkAddFamiliesFromMasters(masterIds: number[]) {
    const cleanIds = Array.from(new Set(masterIds.map(Number).filter((value) => Number.isFinite(value))));
    if (cleanIds.length === 0) throw new BadRequestException('Seçili aile bulunamadı.');

    const results = [];
    for (const masterId of cleanIds) {
      results.push(await this.addFamilyFromMaster(masterId));
    }

    return {
      addedCount: results.filter((result) => !result.alreadyAdded).length,
      alreadyAddedCount: results.filter((result) => result.alreadyAdded).length,
      families: results.map((result) => result.family),
    };
  }

  async getFamilyVariants(id: number) {
    await this.ensureFamily(id);

    return this.prisma.trendyolProductVariant.findMany({
      where: { familyId: id },
      include: {
        family: true,
        sizeOption: true,
        potOption: true,
        template: true,
      },
      orderBy: { productName: 'asc' },
    });
  }

  async getFamilyMatchCandidates(id: number) {
    const family = await this.ensureFamily(id);
    const variants = await this.prisma.trendyolProductVariant.findMany({
      where: {
        OR: [
          { familyId: null },
          { familyId: id },
        ],
      },
      orderBy: { productName: 'asc' },
    });

    const keywords = family.keywords.map((keyword) => this.normalize(keyword)).filter(Boolean);

    return variants
      .map((variant) => {
        const normalizedName = this.normalize(variant.productName);
        const matchedKeyword = keywords.find((keyword) => normalizedName.includes(keyword));
        const suggestedByFamily = variant.suggestedFamilyName === family.familyName;
        const isLinked = variant.familyId === family.id;
        const isSuggested = Boolean(matchedKeyword || suggestedByFamily);

        return {
          ...variant,
          isLinked,
          isSuggested,
          matchedKeyword: matchedKeyword ?? null,
        };
      })
      .filter((variant) => variant.isLinked || variant.isSuggested || family.autoMatchingEnabled)
      .sort((a, b) => Number(b.isLinked) - Number(a.isLinked) || Number(b.isSuggested) - Number(a.isSuggested));
  }

  async listTemplates() {
    const families = await this.prisma.productionFamily.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { familyName: 'asc' },
    });
    for (const family of families) {
      await this.ensureDefaultTemplate(family.id, family.familyName);
    }

    return this.prisma.productionRecipeTemplate.findMany({
      distinct: ['familyId'],
      include: {
        family: true,
        components: {
          include: { stockCard: true },
          orderBy: { id: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBambuCostRule() {
    const family = await this.ensureBambuFamily();
    const rule = await this.ensureBambuRule(family.id);
    return this.serializeBambuRule(rule);
  }

  async updateBambuCostRule(payload: unknown) {
    const family = await this.ensureBambuFamily();
    await this.ensureBambuRule(family.id);
    const body = (payload ?? {}) as Record<string, unknown>;

    const rule = await this.prisma.bambuCostRule.update({
      where: { familyId: family.id },
      data: {
        leafStockCardId: this.optionalNumber(body.leafStockCardId) ?? null,
        trunkStockCardId: this.optionalNumber(body.trunkStockCardId) ?? null,
        leavesPerStep: this.optionalNumber(body.leavesPerStep) ?? 1,
        leafStepCm: this.optionalNumber(body.leafStepCm) ?? 10,
        roundingMode: this.roundingMode(body.roundingMode),
        trunkLengthCm: this.optionalNumber(body.trunkLengthCm) ?? 220,
        siliconeAmount: this.optionalNumber(body.siliconeAmount) ?? this.optionalNumber(body.siliconeGr) ?? 1,
        laborAmount: 0,
        overheadAmount: this.optionalNumber(body.generalExpenseAmount) ?? this.optionalNumber(body.overheadAmount) ?? 0,
        electricityAmount: 0,
        packagingAmount: this.optionalNumber(body.packagingAmount) ?? 0,
      },
      include: this.bambuRuleInclude(),
    });

    return this.serializeBambuRule(rule);
  }

  async updateBambuException(payload: unknown) {
    const family = await this.ensureBambuFamily();
    const rule = await this.ensureBambuRule(family.id);
    const body = (payload ?? {}) as Record<string, unknown>;
    const sizeCm = this.optionalNumber(body.sizeCm);
    if (!sizeCm) throw new BadRequestException('Boy bilgisi zorunludur.');

    await this.prisma.bambuCostException.upsert({
      where: { ruleId_sizeCm: { ruleId: rule.id, sizeCm } },
      update: {
        leafCount: this.nullableNumber(body.leafCount),
        siliconeAmount: null,
        laborAmount: null,
        overheadAmount: null,
      },
      create: {
        ruleId: rule.id,
        sizeCm,
        leafCount: this.nullableNumber(body.leafCount),
        siliconeAmount: null,
        laborAmount: null,
        overheadAmount: null,
      },
    });

    return this.getBambuCostRule();
  }

  async deductBambuStock(payload: unknown, userId: number) {
    const body = (payload ?? {}) as Record<string, unknown>;
    const eventKey = this.text(body.eventKey);
    if (!eventKey) throw new BadRequestException('İşlem anahtarı zorunludur.');
    const existing = await this.prisma.stockUsageLog.findFirst({ where: { eventKey: { startsWith: `${eventKey}:` } } });
    if (existing) throw new BadRequestException('Bu üretim/sipariş için stok daha önce düşülmüş.');

    const sizeCm = this.optionalNumber(body.sizeCm);
    if (!sizeCm) throw new BadRequestException('Ürün boyu zorunludur.');
    const variantId = this.optionalNumber(body.variantId);
    const eventType = this.stockUsageEventType(body.eventType);
    const rule = await this.ensureBambuRule((await this.ensureBambuFamily()).id);
    const calculated = this.calculateBambuCost(rule, sizeCm);
    if (calculated.warnings.length > 0) throw new BadRequestException(calculated.warnings.join(' '));

    const usages = [
      { stockCardId: rule.leafStockCardId, quantity: calculated.leafCount, unit: 'adet' },
      { stockCardId: rule.trunkStockCardId, quantity: sizeCm, unit: 'cm' },
    ].filter((item): item is { stockCardId: number; quantity: number; unit: string } => Boolean(item.stockCardId) && item.quantity > 0);

    const logs = [];
    for (const usage of usages) {
      const stockCard = await this.prisma.stockCard.findUnique({ where: { id: usage.stockCardId } });
      if (!stockCard) continue;
      const previousStock = Number(stockCard.stockQuantity);
      const nextStock = previousStock - usage.quantity;
      const updated = await this.prisma.stockCard.update({
        where: { id: usage.stockCardId },
        data: { stockQuantity: nextStock },
      });
      logs.push(await this.prisma.stockUsageLog.create({
        data: {
          stockCardId: usage.stockCardId,
          variantId,
          eventType,
          eventKey: `${eventKey}:${usage.stockCardId}`,
          quantity: usage.quantity,
          unit: usage.unit,
          previousStock,
          nextStock: Number(updated.stockQuantity),
          userId,
        },
      }));
    }

    return { ok: true, deductedCount: logs.length, logs };
  }

  async listVariants() {
    const variants = await this.prisma.trendyolProductVariant.findMany({
      where: { status: 'ACTIVE' },
      include: {
        family: true,
        sizeOption: true,
        potOption: true,
        template: true,
        productCostDraft: {
          include: {
            items: { include: { stockCard: true } },
            pots: { include: { stockCard: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return variants.map((variant) => ({
      ...variant,
      lastCalculatedCost: variant.productCostDraft ? this.serializeCostDraft(variant.productCostDraft).totalCost : 0,
      productCostStatus: this.variantCostStatus(variant),
    }));
  }

  async getVariantDetail(id: number) {
    const variant = await this.prisma.trendyolProductVariant.findUnique({
      where: { id },
      include: {
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
    if (!variant) throw new NotFoundException('Ürün bulunamadı.');

    if (variant.productCostDraft?.status === 'DRAFT') {
      await this.ensureDraftDefaultExpenses(variant, variant.productCostDraft.id);
      const refreshed = await this.prisma.trendyolProductVariant.findUnique({
        where: { id },
        include: {
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
      if (refreshed) {
        const neighbors = await this.variantNeighbors(id);
        return {
          variant: refreshed,
          hasSavedCostDraft: Boolean(refreshed.productCostDraft),
          costDraft: refreshed.productCostDraft ? this.serializeCostDraft(refreshed.productCostDraft) : await this.defaultCostDraft(refreshed),
          progress: await this.costProgress(),
          ...neighbors,
        };
      }
    }

    const neighbors = await this.variantNeighbors(id);
    return {
      variant,
      hasSavedCostDraft: Boolean(variant.productCostDraft),
      costDraft: variant.productCostDraft ? this.serializeCostDraft(variant.productCostDraft) : await this.defaultCostDraft(variant),
      progress: await this.costProgress(),
      ...neighbors,
    };
  }

  async getCostProgress() {
    return this.costProgress();
  }

  async listDefaultExpenses() {
    await this.ensureDefaultExpenses();
    const expenses = await this.prisma.defaultProductExpense.findMany({
      orderBy: { id: 'asc' },
    });
    return expenses.map((item) => this.serializeDefaultExpense(item));
  }

  async updateDefaultExpense(id: number, payload: unknown, userId: number) {
    const body = (payload ?? {}) as Record<string, unknown>;
    const existing = await this.prisma.defaultProductExpense.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Varsayılan gider bulunamadı.');
    const newAmount = this.optionalNumber(body.defaultAmount) ?? Number(existing.defaultAmount);
    const scope = this.text(body.changeScope) ?? 'future_only';
    const shouldUpdateDrafts = scope === 'drafts' || scope === 'all_existing';

    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.defaultProductExpense.update({
        where: { id },
        data: {
          name: this.text(body.name) ?? existing.name,
          defaultAmount: newAmount,
          applyCategories: this.stringList(body.applyCategories),
          excludeCategories: this.stringList(body.excludeCategories),
          isActive: this.optionalBoolean(body.isActive) ?? existing.isActive,
          validFrom: this.text(body.validFrom) ? new Date(String(body.validFrom)) : existing.validFrom,
          description: this.text(body.description),
          status: body.status === 'PASSIVE' ? 'PASSIVE' : existing.status,
        },
      });

      let affectedDraftCount = 0;
      if (shouldUpdateDrafts) {
        const result = await tx.productCostItem.updateMany({
          where: {
            defaultExpenseKey: existing.expenseKey,
            isDefaultExpense: true,
            draft: scope === 'drafts' ? { status: 'DRAFT' } : undefined,
          },
          data: {
            name: saved.name,
            manualUnitCost: saved.defaultAmount,
            defaultAmount: saved.defaultAmount,
            isActive: saved.isActive,
          },
        });
        affectedDraftCount = result.count;
      }

      await tx.defaultProductExpenseHistory.create({
        data: {
          expenseId: existing.id,
          oldAmount: existing.defaultAmount,
          newAmount,
          changedByUserId: userId,
          affectedDraftCount,
          changeScope: scope,
          reason: this.text(body.reason),
        },
      });

      return saved;
    });

    return this.serializeDefaultExpense(updated);
  }

  async createDefaultExpense(payload: unknown) {
    const body = (payload ?? {}) as Record<string, unknown>;
    const name = this.text(body.name);
    if (!name) throw new BadRequestException('Gider adı zorunludur.');
    const expenseKey = this.text(body.expenseKey) ?? this.normalizeHeader(name);
    const created = await this.prisma.defaultProductExpense.create({
      data: {
        expenseKey,
        name,
        defaultAmount: this.optionalNumber(body.defaultAmount) ?? 0,
        applyCategories: this.stringList(body.applyCategories),
        excludeCategories: this.stringList(body.excludeCategories),
        isActive: this.optionalBoolean(body.isActive) ?? true,
        validFrom: this.text(body.validFrom) ? new Date(String(body.validFrom)) : new Date(),
        description: this.text(body.description),
        status: 'ACTIVE',
      },
    });
    return this.serializeDefaultExpense(created);
  }

  async saveVariantCostDraft(variantId: number, payload: unknown, approve = false, userRole = 'STAFF', userId = 1) {
    const variant = await this.prisma.trendyolProductVariant.findUnique({ where: { id: variantId } });
    if (!variant) throw new NotFoundException('Ürün bulunamadı.');
    const body = (payload ?? {}) as Record<string, any>;
    const items = Array.isArray(body.items) ? body.items : [];
    const pots = Array.isArray(body.pots) ? body.pots : [];
    const salePrice = this.optionalNumber(body.salePrice) ?? Number(variant.trendyolSalePrice);
    const profitMarginPercent = this.optionalNumber(body.profitMarginPercent) ?? 45;
    const commissionPercent = this.optionalNumber(body.commissionPercent) ?? Number(variant.commissionPercent);
    const vatPercent = this.optionalNumber(body.vatPercent) ?? 20;
    const shippingCost = this.optionalNumber(body.shippingCost) ?? 0;
    const desi = this.optionalNumber(body.desi) ?? 0;
    const marketplaceMarkupPercent = this.optionalNumber(body.marketplaceMarkupPercent) ?? 25;
    const campaignBufferPercent = this.optionalNumber(body.campaignBufferPercent) ?? 0;
    const stockCostMap = await this.buildStockCostMap([...items, ...pots]);
    const totalCost = this.round(
      items.reduce((sum: number, item: any) => sum + this.itemTotal(item, stockCostMap), 0) +
      pots.reduce((sum: number, item: any) => sum + this.itemTotal(item, stockCostMap), 0),
    );
    const vatIncludedCost = totalCost * (1 + vatPercent / 100);
    const minimumSalePrice = this.round(vatIncludedCost * (1 + profitMarginPercent / 100));
    if ((profitMarginPercent < 45 || salePrice < minimumSalePrice) && userRole !== 'OWNER') {
      throw new BadRequestException('Erhan Flowers minimum kâr oranı %45’tir.');
    }

    const draft = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.productCostDraft.upsert({
        where: { variantId },
        update: {
          salePrice,
          profitMarginPercent,
          commissionPercent,
          vatPercent,
          shippingCost,
          desi,
          marketplaceMarkupPercent,
          campaignBufferPercent,
          totalCost,
          status: approve ? 'APPROVED' : 'DRAFT',
          approvedAt: approve ? new Date() : null,
        },
        create: {
          variantId,
          salePrice,
          profitMarginPercent,
          commissionPercent,
          vatPercent,
          shippingCost,
          desi,
          marketplaceMarkupPercent,
          campaignBufferPercent,
          totalCost,
          status: approve ? 'APPROVED' : 'DRAFT',
          approvedAt: approve ? new Date() : null,
        },
      });

      await tx.productCostItem.deleteMany({ where: { draftId: saved.id } });
      await tx.productPotItem.deleteMany({ where: { draftId: saved.id } });

      if (items.length > 0) {
        await tx.productCostItem.createMany({
          data: items.map((item: any) => ({
            draftId: saved.id,
            stockCardId: this.optionalNumber(item.stockCardId) ?? null,
            name: this.text(item.name) ?? 'Malzeme',
            group: this.costItemGroup(item.group),
            quantity: this.optionalNumber(item.quantity) ?? 0,
            unit: this.text(item.unit) ?? 'adet',
            source: item.source === 'MANUAL' || item.manual ? 'MANUAL' : 'AUTO',
            manualUnitCost: this.optionalNumber(item.manualUnitCost ?? item.unitCost) ?? 0,
            isActive: item.isActive !== false,
            isDefaultExpense: Boolean(item.isDefaultExpense),
            defaultExpenseKey: this.text(item.defaultExpenseKey),
            defaultAmount: this.optionalNumber(item.defaultAmount),
          })),
        });
      }

      if (pots.length > 0) {
        await tx.productPotItem.createMany({
          data: pots.map((item: any) => ({
            draftId: saved.id,
            stockCardId: this.optionalNumber(item.stockCardId) ?? null,
            name: this.text(item.name) ?? 'Saksı',
            potType: this.text(item.potType),
            color: this.text(item.color),
            width: this.optionalNumber(item.width) ?? 0,
            length: this.optionalNumber(item.length) ?? 0,
            height: this.optionalNumber(item.height) ?? 0,
            diameter: this.optionalNumber(item.diameter) ?? 0,
            quantity: this.optionalNumber(item.quantity) ?? 1,
            source: item.source === 'MANUAL' || item.manual ? 'MANUAL' : 'AUTO',
            manualUnitCost: this.optionalNumber(item.manualUnitCost ?? item.unitCost) ?? 0,
          })),
        });
      }

      await tx.trendyolProductVariant.update({
        where: { id: variantId },
        data: { costStatus: approve ? 'Tamamlandı' : 'Taslak' },
      });

      await tx.trendyolProductVariant.update({
        where: { id: variantId },
        data: { trendyolSalePrice: salePrice, commissionPercent },
      });

      if (approve) {
        const productId = (variant as any).productId as number | null | undefined;
        const identityFilters = [
          { barcode: variant.barcode },
          { modelCode: variant.currentModelCode ?? variant.proposedModelCode ?? undefined },
        ].filter((item) => Object.values(item).some(Boolean));
        const product = productId
          ? await tx.product.findUnique({ where: { id: productId } })
          : identityFilters.length
            ? await tx.product.findFirst({ where: { OR: identityFilters }, orderBy: { id: 'asc' } })
            : null;

        if (product) {
          await tx.product.update({
            where: { id: product.id },
            data: {
              costPrice: totalCost,
              shopPrice: salePrice,
              marketPrice: salePrice,
              listPrice: salePrice,
              stockQuantity: variant.stockQuantity,
            },
          });
        }
      }

      return tx.productCostDraft.findUnique({
        where: { id: saved.id },
        include: {
          items: { include: { stockCard: true }, orderBy: { id: 'asc' } },
          pots: { include: { stockCard: true }, orderBy: { id: 'asc' } },
        },
      });
    });

    return { ok: true, costDraft: this.serializeCostDraft(draft) };
  }

  async startVariantCostDraftFromTemplate(variantId: number, userRole = 'STAFF', userId = 1) {
    const variant = await this.prisma.trendyolProductVariant.findUnique({
      where: { id: variantId },
      include: {
        sizeOption: true,
        potOption: true,
        template: {
          include: {
            components: { include: { stockCard: true }, orderBy: { id: 'asc' } },
          },
        },
      },
    });
    if (!variant) throw new NotFoundException('Urun bulunamadi.');
    if (!variant.template) throw new BadRequestException('Bu urune recete sablonu bagli degil.');

    const sizeLabel = this.normalize(variant.sizeOption?.sizeLabel ?? variant.detectedSize ?? '');
    const potName = this.normalize(variant.potOption?.potName ?? variant.detectedPot ?? '');
    const components = variant.template.components.filter((component) => {
      if (component.scope === 'SIZE_VARIANT' && this.normalize(component.sizeLabel ?? '') !== sizeLabel) return false;
      if (component.scope === 'POT_VARIANT' && this.normalize(component.potName ?? '') !== potName) return false;
      return true;
    });

    const items = components
      .filter((component) => component.costGroup !== 'POT')
      .map((component) => ({
        name: component.componentName,
        group: this.costGroupToItemGroup(component.costGroup),
        quantity: Number(component.quantity ?? 0),
        unit: component.unit,
        source: component.stockCardId ? 'AUTO' : 'MANUAL',
        stockCardId: component.stockCardId,
        manualUnitCost: Number(component.manualAmount ?? 0),
      }));
    const pots = components
      .filter((component) => component.costGroup === 'POT')
      .map((component) => ({
        name: component.componentName,
        potType: component.potName,
        quantity: Number(component.quantity ?? 1),
        source: component.stockCardId ? 'AUTO' : 'MANUAL',
        stockCardId: component.stockCardId,
        manualUnitCost: Number(component.manualAmount ?? 0),
      }));

    return this.saveVariantCostDraft(variantId, {
      salePrice: Number(variant.trendyolSalePrice ?? 0),
      commissionPercent: Number(variant.template.defaultCommissionPercent ?? variant.commissionPercent ?? 21),
      vatPercent: Number(variant.template.vatPercent ?? 20),
      items,
      pots,
    }, false, userRole, userId);
  }

  async copyVariantCostDraft(targetVariantId: number, payload: unknown, userRole = 'STAFF', userId = 1) {
    const body = (payload ?? {}) as Record<string, unknown>;
    const sourceVariantId = this.optionalNumber(body.sourceVariantId);
    if (!sourceVariantId) throw new BadRequestException('Kaynak ürün seçilmelidir.');
    if (sourceVariantId === targetVariantId) throw new BadRequestException('Aynı üründen reçete kopyalanamaz.');

    const source = await this.prisma.trendyolProductVariant.findUnique({
      where: { id: sourceVariantId },
      include: {
        productCostDraft: {
          include: {
            items: { include: { stockCard: true }, orderBy: { id: 'asc' } },
            pots: { include: { stockCard: true }, orderBy: { id: 'asc' } },
          },
        },
      },
    });
    if (!source?.productCostDraft) throw new BadRequestException('Kaynak ürünün kopyalanacak reçetesi yok.');

    const target = await this.prisma.trendyolProductVariant.findUnique({
      where: { id: targetVariantId },
      include: { family: true },
    });
    if (!target) throw new NotFoundException('Hedef ürün bulunamadı.');

    const copyMaterials = this.optionalBoolean(body.copyMaterials) ?? true;
    const copyExpenses = this.optionalBoolean(body.copyExpenses) ?? true;
    const copyShippingAndDesi = this.optionalBoolean(body.copyShippingAndDesi) ?? true;
    const copyPriceRates = this.optionalBoolean(body.copyPriceRates) ?? true;
    const sourceDraft = this.serializeCostDraft(source.productCostDraft);
    const materialItems = sourceDraft.items.filter((item: any) => !(item.source === 'MANUAL' && (item.isDefaultExpense || ['LABOR', 'OTHER', 'PACKAGING'].includes(item.group))));
    const expenseItems = sourceDraft.items.filter((item: any) => item.source === 'MANUAL' && (item.isDefaultExpense || ['LABOR', 'OTHER', 'PACKAGING'].includes(item.group)));
    const defaultExpenses = await this.defaultExpenseItemsForVariant(target);
    const items = [
      ...(copyMaterials ? materialItems : []),
      ...(copyExpenses ? expenseItems : defaultExpenses),
    ].map((item: any) => ({
      name: item.name,
      group: item.group,
      quantity: item.quantity,
      unit: item.unit,
      source: item.source,
      stockCardId: item.stockCardId,
      manualUnitCost: item.manualUnitCost,
      automaticUnitCost: item.automaticUnitCost,
      isActive: item.isActive,
      isDefaultExpense: item.isDefaultExpense,
      defaultExpenseKey: item.defaultExpenseKey,
      defaultAmount: item.defaultAmount,
    }));
    const pots = copyMaterials ? sourceDraft.pots.map((pot: any) => ({
      name: pot.name,
      potType: pot.potType,
      color: pot.color,
      width: pot.width,
      length: pot.length,
      height: pot.height,
      diameter: pot.diameter,
      quantity: pot.quantity,
      source: pot.source,
      stockCardId: pot.stockCardId,
      manualUnitCost: pot.manualUnitCost,
      automaticUnitCost: pot.automaticUnitCost,
    })) : [];

    const result = await this.saveVariantCostDraft(targetVariantId, {
      salePrice: Number(sourceDraft.salePrice ?? 0),
      profitMarginPercent: copyPriceRates ? sourceDraft.profitMarginPercent : 45,
      commissionPercent: copyPriceRates ? sourceDraft.commissionPercent : Number(target.commissionPercent ?? 21),
      vatPercent: copyPriceRates ? sourceDraft.vatPercent : 20,
      shippingCost: copyShippingAndDesi ? sourceDraft.shippingCost : 0,
      desi: copyShippingAndDesi ? sourceDraft.desi : 0,
      marketplaceMarkupPercent: copyPriceRates ? sourceDraft.marketplaceMarkupPercent : 25,
      campaignBufferPercent: copyPriceRates ? sourceDraft.campaignBufferPercent : 0,
      items,
      pots,
    }, false, userRole, userId);

    const sizeWarning = this.normalize(source.detectedSize ?? '') !== this.normalize(target.detectedSize ?? '');
    return {
      ...result,
      status: 'Taslak',
      sizeWarning,
      warning: sizeWarning ? 'Kaynak ürün ile hedef ürünün boyu farklıdır. Malzeme miktarlarını kontrol edin.' : null,
    };
  }

  async previewTrendyolImport(file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException('Excel dosyası yüklenmedi.');
    const rows = this.parseTrendyolRows(file.buffer);
    return this.buildTrendyolImportPreview(rows, file.originalname);
  }

  async applyTrendyolImport(file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException('Excel dosyası yüklenmedi.');
    const rows = this.parseTrendyolRows(file.buffer);
    const preview = await this.buildTrendyolImportPreview(rows, file.originalname);

    let added = 0;
    let updated = 0;
    for (const row of preview.rows.filter((item: any) => item.status === 'YENI_URUN' || item.status === 'GUNCELLENECEK')) {
      const data = row.data;
      const existing = row.status === 'GUNCELLENECEK';
      await this.prisma.trendyolProductVariant.upsert({
        where: { barcode: data.barcode },
        update: {
          productName: data.productName,
          currentModelCode: data.oldModelCode,
          supplierStockCode: data.supplierStockCode,
          brand: data.brand,
          trendyolCategoryName: data.categoryName,
          productColor: data.color,
          productDescription: data.description,
          stockQuantity: data.stockQuantity,
          trendyolProductUrl: data.productUrl,
          images: data.images,
          trendyolSalePrice: data.salePrice,
          commissionPercent: data.commissionPercent,
          detectedSize: data.detectedSize,
          detectedPot: data.detectedPot,
          importSource: file.originalname,
          importedAt: new Date(),
        },
        create: {
          barcode: data.barcode,
          productName: data.productName,
          currentModelCode: data.oldModelCode,
          supplierStockCode: data.supplierStockCode,
          brand: data.brand,
          trendyolCategoryName: data.categoryName,
          productColor: data.color,
          productDescription: data.description,
          stockQuantity: data.stockQuantity,
          trendyolProductUrl: data.productUrl,
          images: data.images,
          trendyolSalePrice: data.salePrice,
          commissionPercent: data.commissionPercent,
          detectedSize: data.detectedSize,
          detectedPot: data.detectedPot,
          recipeStatus: 'Eşleştirme Bekliyor',
          costStatus: 'Bekliyor',
          importSource: file.originalname,
          importedAt: new Date(),
        },
      });
      if (existing) updated += 1;
      else added += 1;
    }

    return { ok: true, totalRows: preview.totalRows, added, updated, errorRows: preview.errorRows, skippedRows: preview.skippedRows };
  }

  async assignVariantToFamily(variantId: number, payload: { familyId?: number; masterId?: number }) {
    const variant = await this.prisma.trendyolProductVariant.findUnique({ where: { id: variantId } });
    if (!variant) throw new NotFoundException('Trendyol varyasyonu bulunamadı.');

    let familyId = this.optionalNumber(payload.familyId);
    if (!familyId && payload.masterId) {
      const result = await this.addFamilyFromMaster(Number(payload.masterId));
      familyId = result.family.id;
    }
    if (!familyId) throw new BadRequestException('Ürün ailesi seçilmelidir.');

    const family = await this.ensureFamily(familyId);
    const [defaultTemplate, sizes, pots] = await Promise.all([
      this.ensureDefaultTemplate(family.id, family.familyName),
      this.prisma.productionSizeOption.findMany({ where: { familyId: family.id } }),
      this.prisma.productionPotOption.findMany({ where: { familyId: family.id } }),
    ]);

    const sizeOption = sizes.find((size) => size.sizeLabel === variant.detectedSize);
    const potOption = pots.find((pot) => this.normalize(pot.potName) === this.normalize(variant.detectedPot ?? ''));

    const updated = await this.prisma.trendyolProductVariant.update({
      where: { id: variant.id },
      data: {
        familyId: family.id,
        sizeOptionId: sizeOption?.id ?? null,
        potOptionId: potOption?.id ?? null,
        templateId: defaultTemplate.id,
        suggestedFamilyName: family.familyName,
        recipeStatus: 'Aileye Bağlandı',
        costStatus: 'Hesaplanabilir',
      },
      include: {
        family: true,
        sizeOption: true,
        potOption: true,
        template: true,
      },
    });

    return {
      ok: true,
      variant: updated,
    };
  }

  async uploadVariantImage(variantId: number, file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException('Görsel yüklenemedi.');
    if (!file.mimetype.startsWith('image/')) throw new BadRequestException('Sadece görsel dosyası yüklenebilir.');

    const variant = await this.prisma.trendyolProductVariant.findUnique({ where: { id: variantId } });
    if (!variant) throw new NotFoundException('Trendyol varyasyonu bulunamadı.');

    const filePath = `/uploads/trendyol-variants/${file.filename}`;
    const currentImages = Array.isArray(variant.images)
      ? variant.images.filter((image): image is string => typeof image === 'string' && image.trim().length > 0)
      : [];
    const images = [filePath, ...currentImages.filter((image) => image !== filePath)];

    const updated = await this.prisma.trendyolProductVariant.update({
      where: { id: variant.id },
      data: { images },
    });

    const product = variant.barcode
      ? await this.prisma.product.findUnique({ where: { barcode: variant.barcode } }).catch(() => null)
      : null;
    if (product) {
      await this.prisma.mediaFile.create({
        data: {
          productId: product.id,
          fileName: file.originalname,
          filePath,
          folderName: 'Trendyol Varyasyon Görselleri',
          fileType: file.mimetype,
        },
      });
    }

    return {
      ok: true,
      imagePath: filePath,
      variant: updated,
    };
  }

  async deleteVariantImage(variantId: number, imagePath: string) {
    const variant = await this.prisma.trendyolProductVariant.findUnique({ where: { id: variantId } });
    if (!variant) throw new NotFoundException('Trendyol varyasyonu bulunamadı.');
    const currentImages = Array.isArray(variant.images)
      ? variant.images.filter((image): image is string => typeof image === 'string' && image.trim().length > 0)
      : [];
    const images = currentImages.filter((image) => image !== imagePath);
    const updated = await this.prisma.trendyolProductVariant.update({ where: { id: variant.id }, data: { images } });
    return { ok: true, variant: updated };
  }

  async setVariantCoverImage(variantId: number, imagePath: string) {
    const variant = await this.prisma.trendyolProductVariant.findUnique({ where: { id: variantId } });
    if (!variant) throw new NotFoundException('Trendyol varyasyonu bulunamadı.');
    const currentImages = Array.isArray(variant.images)
      ? variant.images.filter((image): image is string => typeof image === 'string' && image.trim().length > 0)
      : [];
    if (!currentImages.includes(imagePath)) throw new BadRequestException('Görsel bu üründe bulunamadı.');
    const images = [imagePath, ...currentImages.filter((image) => image !== imagePath)];
    const updated = await this.prisma.trendyolProductVariant.update({ where: { id: variant.id }, data: { images } });
    return { ok: true, variant: updated };
  }

  // Fiyat ve güncel görselleri aynı anda Trendyol'a gönderir: önce hesaplanan
  // pazaryeri fiyatını varyasyona yazar, sonra tam ürün gönderimini (görseller
  // dahil) tetikler. Trendyol'da görselleri tek başına güncelleyen ayrı bir uç
  // nokta yok; görsel değişikliği yalnızca tam ürün gönderimiyle yansır.
  async pushImagesAndPriceToTrendyol(variantId: number, salePrice: number, userId: number) {
    if (!Number.isFinite(salePrice) || salePrice <= 0) {
      throw new BadRequestException('Geçerli bir Trendyol satış fiyatı gereklidir.');
    }
    await this.prisma.trendyolProductVariant.update({
      where: { id: variantId },
      data: { trendyolSalePrice: salePrice },
    });
    return this.publishing.send([variantId], userId, { allowIncomplete: true, platforms: ['TRENDYOL'] as IntegrationPlatform[] });
  }

  async listOverheads() {
    const templates = await this.prisma.productionRecipeTemplate.findMany({
      include: {
        family: true,
        components: {
          where: { costGroup: { in: ['LABOR', 'ELECTRICITY', 'PACKAGING', 'OTHER'] } },
          include: { stockCard: true },
          orderBy: { id: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return templates;
  }

  listHistory() {
    return this.prisma.productionCostHistory.findMany({
      include: {
        variant: {
          include: { family: true, sizeOption: true, potOption: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async calculateVariantCost(id: number) {
    const variant = await this.prisma.trendyolProductVariant.findUnique({
      where: { id },
      include: {
        family: true,
        sizeOption: true,
        potOption: { include: { stockCard: true } },
        template: {
          include: {
            components: {
              include: { stockCard: true },
            },
          },
        },
      },
    });

    if (!variant) throw new NotFoundException('Trendyol varyasyonu bulunamadı.');
    if (!variant.template) throw new BadRequestException('Bu varyasyona reçete şablonu bağlanmamış.');

    const breakdown = this.calculateBreakdown(variant);
    const salePrice = Number(variant.trendyolSalePrice);
    const commission = this.round(salePrice * (Number(variant.commissionPercent) / 100));
    const vatPercent = Number(variant.template.vatPercent);
    const vatAmount = this.round(salePrice * (vatPercent / (100 + vatPercent)));
    const estimatedNetProfit = this.round(salePrice - commission - vatAmount - breakdown.totalProductionCost);
    const profitRate = salePrice > 0 ? this.round((estimatedNetProfit / salePrice) * 100) : 0;

    const result = {
      variant,
      breakdown,
      trendyolCommission: commission,
      vatAmount,
      estimatedNetProfit,
      profitRate,
    };

    await this.prisma.productionCostHistory.create({
      data: {
        variantId: variant.id,
        totalProductionCost: breakdown.totalProductionCost,
        trendyolCommission: commission,
        vatAmount,
        estimatedNetProfit,
        profitRate,
      },
    });

    return result;
  }

  async createFamily(payload: unknown) {
    const data = this.normalizeFamilyPayload(payload);
    const familyName = data.familyName;
    if (!familyName) throw new BadRequestException('Aile adı zorunludur.');

    const family = await this.prisma.productionFamily.create({
      data: {
        familyName,
        masterId: data.masterId,
        familyCode: data.familyCode,
        categoryId: data.categoryId,
        mainModelCode: data.mainModelCode,
        description: data.description,
        keywords: data.keywords,
        autoMatchingEnabled: data.autoMatchingEnabled,
        status: data.status,
      },
    });

    await this.replaceFamilyOptions(family.id, data.sizeOptions, data.potOptions);
    await this.ensureDefaultTemplate(family.id, familyName);
    await this.refreshFamilySuggestions(family.id);

    return this.getFamily(family.id);
  }

  async updateFamily(id: number, payload: unknown) {
    await this.ensureFamily(id);
    const data = this.normalizeFamilyPayload(payload);

    await this.prisma.productionFamily.update({
      where: { id },
      data: {
        familyName: data.familyName,
        masterId: data.masterId,
        familyCode: data.familyCode,
        categoryId: data.categoryId,
        mainModelCode: data.mainModelCode,
        description: data.description,
        keywords: data.keywords,
        autoMatchingEnabled: data.autoMatchingEnabled,
        status: data.status,
      },
    });

    await this.replaceFamilyOptions(id, data.sizeOptions, data.potOptions);
    await this.refreshFamilySuggestions(id);

    return this.getFamily(id);
  }

  async passiveFamily(id: number) {
    await this.ensureFamily(id);
    return this.prisma.productionFamily.update({
      where: { id },
      data: { status: 'PASSIVE' },
    });
  }

  async deleteFamily(id: number) {
    const family = await this.ensureFamily(id);
    if (family.familyName === 'Yapay Ficus Ağacı') {
      throw new BadRequestException('Mevcut Ficus ailesi silinemez. Pasife alınabilir.');
    }

    const linkedCount = await this.prisma.trendyolProductVariant.count({ where: { familyId: id } });
    if (linkedCount > 0) {
      throw new BadRequestException('Bağlı ürünleri olan aile silinemez. Önce ürünleri başka aileye taşıyın veya aileyi pasife alın.');
    }

    await this.prisma.productionFamily.delete({ where: { id } });
    return { ok: true };
  }

  async matchProductsToFamily(id: number, variantIds: number[]) {
    const family = await this.ensureFamily(id);
    const cleanIds = variantIds.map(Number).filter((value) => Number.isFinite(value));
    if (cleanIds.length === 0) throw new BadRequestException('Seçili ürün bulunamadı.');

    const [defaultTemplate, sizes, pots] = await Promise.all([
      this.prisma.productionRecipeTemplate.findFirst({ where: { familyId: id, status: 'ACTIVE' }, orderBy: { id: 'asc' } }),
      this.prisma.productionSizeOption.findMany({ where: { familyId: id } }),
      this.prisma.productionPotOption.findMany({ where: { familyId: id } }),
    ]);

    const variants = await this.prisma.trendyolProductVariant.findMany({ where: { id: { in: cleanIds } } });

    await this.prisma.$transaction(
      variants.map((variant) => {
        const sizeOption = sizes.find((size) => size.sizeLabel === variant.detectedSize);
        const potOption = pots.find((pot) => this.normalize(pot.potName) === this.normalize(variant.detectedPot ?? ''));

        return this.prisma.trendyolProductVariant.update({
          where: { id: variant.id },
          data: {
            familyId: family.id,
            sizeOptionId: sizeOption?.id ?? null,
            potOptionId: potOption?.id ?? null,
            templateId: defaultTemplate?.id ?? null,
            recipeStatus: defaultTemplate ? 'Şablona Bağlandı' : 'Aileye Bağlandı',
            costStatus: defaultTemplate ? 'Hesaplanabilir' : 'Reçete Bekliyor',
          },
        });
      }),
    );

    return {
      matchedCount: variants.length,
      familyId: family.id,
      familyName: family.familyName,
    };
  }

  async updateMatchDetails(
    familyId: number,
    payload: { variantIds?: number[]; detectedSize?: string; detectedPot?: string; stockCardId?: number },
  ) {
    await this.ensureFamily(familyId);
    const cleanIds = Array.from(new Set((payload.variantIds ?? []).map(Number).filter((value) => Number.isFinite(value))));
    if (cleanIds.length === 0) throw new BadRequestException('Seçili ürün bulunamadı.');

    const detectedSize = this.text(payload.detectedSize);
    const detectedPot = this.text(payload.detectedPot);
    const stockCardId = this.optionalNumber(payload.stockCardId);

    let sizeOptionId: number | null | undefined;
    if (detectedSize) {
      const sizeOption = await this.prisma.productionSizeOption.upsert({
        where: { familyId_sizeLabel: { familyId, sizeLabel: detectedSize } },
        update: {},
        create: { familyId, sizeLabel: detectedSize, sortOrder: 999 },
      });
      sizeOptionId = sizeOption.id;
    }

    let potOptionId: number | null | undefined;
    if (detectedPot) {
      if (stockCardId) {
        const stockCard = await this.prisma.stockCard.findUnique({ where: { id: stockCardId } });
        if (!stockCard) throw new NotFoundException('Saksı stok kartı bulunamadı.');
      }

      const existingPot = await this.prisma.productionPotOption.findFirst({
        where: { familyId, potName: detectedPot },
      });
      const potOption = existingPot
        ? await this.prisma.productionPotOption.update({
            where: { id: existingPot.id },
            data: { stockCardId: stockCardId ?? existingPot.stockCardId },
          })
        : await this.prisma.productionPotOption.create({
            data: { familyId, potName: detectedPot, stockCardId, sortOrder: 999 },
          });
      potOptionId = potOption.id;
    }

    await this.prisma.trendyolProductVariant.updateMany({
      where: { id: { in: cleanIds } },
      data: {
        ...(detectedSize ? { detectedSize, sizeOptionId } : {}),
        ...(detectedPot ? { detectedPot, potOptionId } : {}),
        recipeStatus: 'Aday - Onay Bekliyor',
        costStatus: 'Bekliyor',
      },
    });

    return {
      updatedCount: cleanIds.length,
      detectedSize,
      detectedPot,
    };
  }

  async createTemplate(payload: unknown) {
    const body = (payload ?? {}) as Record<string, unknown>;
    const familyId = this.optionalNumber(body.familyId);
    const templateName = this.text(body.templateName);
    if (!familyId || !templateName) throw new BadRequestException('Aile ve şablon adı zorunludur.');

    const family = await this.ensureFamily(familyId);
    const existing = await this.prisma.productionRecipeTemplate.findFirst({
      where: { familyId },
      include: {
        family: true,
        components: {
          include: { stockCard: true },
          orderBy: { id: 'asc' },
        },
      },
      orderBy: { id: 'asc' },
    });
    if (existing) return existing;

    return this.prisma.productionRecipeTemplate.create({
      data: {
        familyId,
        templateName: `${family.familyName} Ana Reçetesi`,
        description: this.text(body.description),
        vatPercent: this.optionalNumber(body.vatPercent) ?? 20,
        defaultCommissionPercent: this.optionalNumber(body.defaultCommissionPercent) ?? 20,
      },
    });
  }

  async updateTemplateComponents(templateId: number, payload: unknown) {
    const template = await this.prisma.productionRecipeTemplate.findUnique({
      where: { id: templateId },
      include: { components: true },
    });
    if (!template) throw new NotFoundException('Reçete bulunamadı.');

    const body = (payload ?? {}) as Record<string, unknown>;
    const components = Array.isArray(body.components) ? body.components : [];
    const updates = components
      .map((item) => item as Record<string, unknown>)
      .map((item) => ({
        id: this.optionalNumber(item.id),
        quantity: this.optionalNumber(item.quantity),
        unit: this.text(item.unit),
        stockCardId: this.optionalNumber(item.stockCardId),
      }))
      .filter((item) => item.id && template.components.some((component) => component.id === item.id));

    const stockCardIds = Array.from(new Set(updates.map((item) => item.stockCardId).filter((id): id is number => Boolean(id))));
    if (stockCardIds.length > 0) {
      const count = await this.prisma.stockCard.count({ where: { id: { in: stockCardIds } } });
      if (count !== stockCardIds.length) throw new BadRequestException('Seçilen stok kartlarından biri bulunamadı.');
    }

    await this.prisma.$transaction(
      updates.map((item) =>
        this.prisma.productionTemplateComponent.update({
          where: { id: item.id! },
          data: {
            quantity: item.quantity ?? 0,
            unit: item.unit ?? 'adet',
            stockCardId: item.stockCardId ?? null,
            manualAmount: null,
          },
        }),
      ),
    );

    return this.prisma.productionRecipeTemplate.findUnique({
      where: { id: templateId },
      include: {
        family: true,
        components: {
          include: { stockCard: true },
          orderBy: { id: 'asc' },
        },
      },
    });
  }

  async createVariant(payload: unknown) {
    const body = (payload ?? {}) as Record<string, unknown>;
    const barcode = this.text(body.barcode);
    const productName = this.text(body.productName);
    const familyId = this.optionalNumber(body.familyId);
    if (!barcode || !productName || !familyId) throw new BadRequestException('Barkod, ürün adı ve aile zorunludur.');

    return this.prisma.trendyolProductVariant.create({
      data: {
        barcode,
        productName,
        familyId,
        currentModelCode: this.text(body.currentModelCode),
        sizeOptionId: this.optionalNumber(body.sizeOptionId),
        potOptionId: this.optionalNumber(body.potOptionId),
        templateId: this.optionalNumber(body.templateId),
        trendyolSalePrice: this.optionalNumber(body.trendyolSalePrice) ?? 0,
        commissionPercent: this.optionalNumber(body.commissionPercent) ?? 20,
      },
    });
  }

  private calculateBreakdown(variant: {
    sizeOption: { sizeLabel: string } | null;
    potOption: ({ potName: string; stockCard: { purchasePrice: Prisma.Decimal; packageContent: Prisma.Decimal; automaticUnitCost: Prisma.Decimal } | null }) | null;
    template: {
      components: Array<{
        stockCard: { purchasePrice: Prisma.Decimal; packageContent: Prisma.Decimal; automaticUnitCost: Prisma.Decimal } | null;
        componentName: string;
        costGroup: ProductionCostGroup;
        scope: TemplateComponentScope;
        sizeLabel: string | null;
        potName: string | null;
        quantity: Prisma.Decimal;
        manualAmount: Prisma.Decimal | null;
      }>;
    } | null;
  }) {
    const totals: Record<ProductionCostGroup, number> = {
      LEAF: 0,
      TRUNK: 0,
      POT: 0,
      CONSUMABLE: 0,
      LABOR: 0,
      ELECTRICITY: 0,
      PACKAGING: 0,
      OTHER: 0,
    };
    const warnings: string[] = [];

    for (const component of variant.template?.components ?? []) {
      if (component.scope === 'SIZE_VARIANT' && component.sizeLabel !== variant.sizeOption?.sizeLabel) continue;
      if (component.scope === 'POT_VARIANT' && component.potName !== variant.potOption?.potName) continue;

      const nonStockGroups: ProductionCostGroup[] = ['LABOR', 'ELECTRICITY', 'OTHER'];
      const isNonStockCost = nonStockGroups.includes(component.costGroup);
      let lineTotal = 0;

      if (isNonStockCost && !component.stockCard) {
        lineTotal = Number(component.manualAmount ?? 0) * Number(component.quantity || 1);
      } else {
        const unitPrice = component.stockCard ? this.stockUnitCost(component.stockCard) : 0;
        if (!component.stockCard) {
          warnings.push(`${component.componentName}: Stok kartı seçilmemiş`);
        }
        if (component.stockCard && this.hasMissingStockCost(component.stockCard)) {
          warnings.push(`${component.componentName}: Stok kartında maliyet bilgisi eksik`);
        }
        lineTotal = unitPrice * Number(component.quantity);
      }
      totals[component.costGroup] += lineTotal;
    }

    if (variant.potOption?.stockCard) {
      if (this.hasMissingStockCost(variant.potOption.stockCard)) {
        warnings.push(`${variant.potOption.potName}: Stok kartında maliyet bilgisi eksik`);
      }
      totals.POT += this.stockUnitCost(variant.potOption.stockCard);
    }

    const totalProductionCost = Object.values(totals).reduce((sum, value) => sum + value, 0);

    return {
      leafCost: this.round(totals.LEAF),
      trunkCost: this.round(totals.TRUNK),
      potCost: this.round(totals.POT),
      consumableCost: this.round(totals.CONSUMABLE),
      laborCost: this.round(totals.LABOR),
      electricityCost: this.round(totals.ELECTRICITY),
      packagingCost: this.round(totals.PACKAGING),
      otherCost: this.round(totals.OTHER),
      totalProductionCost: this.round(totalProductionCost),
      warnings: Array.from(new Set(warnings)),
      labels: costGroupLabels,
    };
  }

  private async variantNeighbors(id: number) {
    const ids = await this.prisma.trendyolProductVariant.findMany({
      where: { OR: [{ status: 'ACTIVE' }, { id }] },
      orderBy: { createdAt: 'desc' },
      select: { id: true, productCostDraft: { select: { status: true } } },
    });
    const index = ids.findIndex((item) => item.id === id);
    const nextIncomplete = ids.slice(index + 1).find((item) => item.productCostDraft?.status !== 'APPROVED')
      ?? ids.slice(0, Math.max(index, 0)).find((item) => item.productCostDraft?.status !== 'APPROVED');
    return {
      previousProductId: index > 0 ? ids[index - 1].id : null,
      nextProductId: index >= 0 && index < ids.length - 1 ? ids[index + 1].id : null,
      nextIncompleteProductId: nextIncomplete?.id ?? null,
    };
  }

  private async costProgress() {
    const [total, completed] = await Promise.all([
      this.prisma.trendyolProductVariant.count({ where: { status: 'ACTIVE' } }),
      this.prisma.trendyolProductVariant.count({ where: { status: 'ACTIVE', productCostDraft: { status: 'APPROVED' } } }),
    ]);
    return { total, completed };
  }

  private variantCostStatus(variant: { productCostDraft?: { status: string } | null; costStatus?: string | null }) {
    if (!variant.productCostDraft) return 'Maliyet Girilmedi';
    if (variant.productCostDraft.status === 'APPROVED') return 'Tamamlandı';
    if (variant.costStatus === 'Kontrol Edilecek') return 'Kontrol Edilecek';
    return 'Taslak';
  }

  private async defaultCostDraft(variant: any) {
    const defaultExpenses = await this.defaultExpenseItemsForVariant(variant);
    return {
      id: null,
      salePrice: Number(variant.trendyolSalePrice ?? 0),
      commissionPercent: Number(variant.commissionPercent ?? 21),
      profitMarginPercent: 45,
      vatPercent: 20,
      shippingCost: 0,
      desi: 0,
      marketplaceMarkupPercent: 25,
      campaignBufferPercent: 0,
      totalCost: 0,
      status: 'DRAFT',
      items: [
        { id: null, name: 'Yaprak', group: 'LEAF_TRUNK', quantity: 0, unit: 'adet', source: 'AUTO', stockCardId: null, manualUnitCost: 0, automaticUnitCost: 0, totalCost: 0 },
        { id: null, name: 'G\u00f6vde', group: 'LEAF_TRUNK', quantity: 1, unit: 'adet', source: 'AUTO', stockCardId: null, manualUnitCost: 0, automaticUnitCost: 0, totalCost: 0 },
        ...defaultExpenses,
      ],
      pots: [],
    };
  }

  private serializeCostDraft(draft: any) {
    return {
      id: draft?.id ?? null,
      salePrice: Number(draft?.salePrice ?? 0),
      profitMarginPercent: Number(draft?.profitMarginPercent ?? 45),
      commissionPercent: Number(draft?.commissionPercent ?? 21),
      vatPercent: Number(draft?.vatPercent ?? 20),
      shippingCost: Number(draft?.shippingCost ?? 0),
      desi: Number(draft?.desi ?? 0),
      marketplaceMarkupPercent: Number(draft?.marketplaceMarkupPercent ?? 25),
      campaignBufferPercent: Number(draft?.campaignBufferPercent ?? 0),
      totalCost: this.round(
        (draft?.items ?? []).reduce((sum: number, item: any) => sum + this.serializeCostItem(item).totalCost, 0) +
        (draft?.pots ?? []).reduce((sum: number, item: any) => sum + this.serializePotItem(item).totalCost, 0),
      ),
      status: draft?.status ?? 'DRAFT',
      items: (draft?.items ?? []).map((item: any) => this.serializeCostItem(item)),
      pots: (draft?.pots ?? []).map((item: any) => this.serializePotItem(item)),
    };
  }

  private serializeCostItem(item: any) {
    const automaticUnitCost = item.stockCard ? this.stockUnitCost(item.stockCard) : 0;
    const unitCost = item.source === 'MANUAL' ? Number(item.manualUnitCost ?? 0) : automaticUnitCost;
    const quantity = Number(item.quantity ?? 0);
    const isActive = item.isActive !== false;
    return {
      id: item.id,
      name: item.name,
      group: item.group,
      quantity,
      unit: item.unit,
      source: item.source,
      stockCardId: item.stockCardId,
      stockCard: item.stockCard,
      manualUnitCost: Number(item.manualUnitCost ?? 0),
      automaticUnitCost,
      isActive,
      isDefaultExpense: Boolean(item.isDefaultExpense),
      defaultExpenseKey: item.defaultExpenseKey ?? null,
      defaultAmount: item.defaultAmount === null || item.defaultAmount === undefined ? null : Number(item.defaultAmount),
      totalCost: isActive ? this.round(quantity * unitCost) : 0,
    };
  }

  private serializePotItem(item: any) {
    const automaticUnitCost = item.stockCard ? this.stockUnitCost(item.stockCard) : 0;
    const unitCost = item.source === 'MANUAL' ? Number(item.manualUnitCost ?? 0) : automaticUnitCost;
    const quantity = Number(item.quantity ?? 0);
    return {
      id: item.id,
      name: item.name,
      potType: item.potType,
      color: item.color,
      width: Number(item.width ?? 0),
      length: Number(item.length ?? 0),
      height: Number(item.height ?? 0),
      diameter: Number(item.diameter ?? 0),
      quantity,
      source: item.source,
      stockCardId: item.stockCardId,
      stockCard: item.stockCard,
      manualUnitCost: Number(item.manualUnitCost ?? 0),
      automaticUnitCost,
      totalCost: this.round(quantity * unitCost),
    };
  }

  private itemTotal(item: any, stockCostMap?: Map<number, number>) {
    const quantity = this.optionalNumber(item.quantity) ?? 0;
    if (item.isActive === false) return 0;
    const stockCardId = this.optionalNumber(item.stockCardId);
    const unitCost = item.source === 'MANUAL' || item.manual
      ? this.optionalNumber(item.manualUnitCost ?? item.unitCost) ?? 0
      : stockCardId && stockCostMap?.has(stockCardId)
        ? stockCostMap.get(stockCardId) ?? 0
        : this.optionalNumber(item.automaticUnitCost ?? item.unitCost) ?? 0;
    return quantity * unitCost;
  }

  private async buildStockCostMap(rows: any[]) {
    const ids = Array.from(new Set(rows.map((item) => this.optionalNumber(item.stockCardId)).filter(Boolean) as number[]));
    if (ids.length === 0) return new Map<number, number>();
    const stockCards = await this.prisma.stockCard.findMany({ where: { id: { in: ids } } });
    return new Map(stockCards.map((stockCard) => [stockCard.id, this.stockUnitCost(stockCard)]));
  }

  private async ensureDefaultExpenses() {
    const seeds = [
      {
        expenseKey: 'genel-kira',
        name: 'Genel Gider + Kira',
        defaultAmount: 100,
        description: 'Her \u00fcr\u00fcn i\u00e7in genel gider ve kira pay\u0131.',
      },
      {
        expenseKey: 'sarf-toplam',
        name: 'Al\u00e7\u0131 + Strafor + Paketleme + Karton + Silikon',
        defaultAmount: 100,
        description: '\u00dcr\u00fcn ba\u015f\u0131na toplu sarf ve paketleme gideri.',
      },
      {
        expenseKey: 'elektrik-su-iscilik',
        name: 'Elektrik + Su + \u0130\u015f\u00e7ilik',
        defaultAmount: 100,
        description: '\u00dcr\u00fcn ba\u015f\u0131na elektrik, su ve i\u015f\u00e7ilik gideri.',
      },
    ];
    const activeKeys = seeds.map((seed) => seed.expenseKey);

    await this.prisma.defaultProductExpense.updateMany({
      where: { expenseKey: { notIn: activeKeys } },
      data: { status: 'PASSIVE', isActive: false },
    });

    for (const seed of seeds) {
      await this.prisma.defaultProductExpense.upsert({
        where: { expenseKey: seed.expenseKey },
        update: {
          name: seed.name,
          defaultAmount: seed.defaultAmount,
          applyCategories: [],
          excludeCategories: [],
          isActive: true,
          description: seed.description,
          status: 'ACTIVE',
        },
        create: {
          expenseKey: seed.expenseKey,
          name: seed.name,
          defaultAmount: seed.defaultAmount,
          applyCategories: [],
          excludeCategories: [],
          isActive: true,
          validFrom: new Date(),
          description: seed.description,
          status: 'ACTIVE',
        },
      });
    }
  }

  private async defaultExpenseItemsForVariant(variant: any) {
    await this.ensureDefaultExpenses();
    const defaults = await this.prisma.defaultProductExpense.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { id: 'asc' },
    });
    const categoryText = this.normalize(`${variant.trendyolCategoryName ?? ''} ${variant.family?.familyName ?? ''} ${variant.productName ?? ''}`);
    const noFoam = this.normalize(`${variant.productDescription ?? ''}`).includes('strafor kullanilmaz');

    return defaults.map((expense) => {
      const excluded = expense.excludeCategories.some((category) => categoryText.includes(this.normalize(category)));
      const appliedByCategory = expense.applyCategories.length === 0 || expense.applyCategories.some((category) => categoryText.includes(this.normalize(category)));
      const isFoamBlocked = false;
      const isActive = Boolean(expense.isActive) && appliedByCategory && !excluded && !isFoamBlocked;
      const amount = Number(expense.defaultAmount);
      return {
        id: null,
        name: expense.name,
        group: expense.expenseKey === 'elektrik-su-iscilik' ? 'LABOR' : 'OTHER',
        quantity: 1,
        unit: 'TL',
        source: 'MANUAL',
        stockCardId: null,
        manualUnitCost: amount,
        automaticUnitCost: 0,
        isActive,
        isDefaultExpense: true,
        defaultExpenseKey: expense.expenseKey,
        defaultAmount: amount,
        totalCost: isActive ? amount : 0,
      };
    });
  }

  private async ensureDraftDefaultExpenses(variant: any, draftId: number) {
    const defaultItems = await this.defaultExpenseItemsForVariant(variant);
    const existing = await this.prisma.productCostItem.findMany({
      where: { draftId, isDefaultExpense: true },
      select: { defaultExpenseKey: true },
    });
    const existingKeys = new Set(existing.map((item) => item.defaultExpenseKey).filter(Boolean));
    const missing = defaultItems.filter((item) => item.defaultExpenseKey && !existingKeys.has(item.defaultExpenseKey));
    if (missing.length === 0) return;

    await this.prisma.productCostItem.createMany({
      data: missing.map((item) => ({
        draftId,
        stockCardId: null,
        name: item.name,
        group: item.group as any,
        quantity: 1,
        unit: 'TL',
        source: 'MANUAL',
        manualUnitCost: item.manualUnitCost,
        isActive: item.isActive,
        isDefaultExpense: true,
        defaultExpenseKey: item.defaultExpenseKey,
        defaultAmount: item.defaultAmount,
      })),
    });
  }

  private serializeDefaultExpense(item: any) {
    return {
      id: item.id,
      expenseKey: item.expenseKey,
      name: item.name,
      defaultAmount: Number(item.defaultAmount ?? 0),
      applyCategories: item.applyCategories ?? [],
      excludeCategories: item.excludeCategories ?? [],
      isActive: Boolean(item.isActive),
      validFrom: item.validFrom,
      description: item.description,
      status: item.status,
    };
  }

  private async deductApprovedCostStock(tx: Prisma.TransactionClient, variantId: number, userId: number, items: any[], pots: any[]) {
    const rows = [...items, ...pots]
      .filter((item) => !(item.source === 'MANUAL' || item.manual))
      .map((item) => ({
        stockCardId: this.optionalNumber(item.stockCardId),
        quantity: this.optionalNumber(item.quantity) ?? 0,
        unit: this.text(item.unit) ?? 'adet',
      }))
      .filter((item): item is { stockCardId: number; quantity: number; unit: string } => Boolean(item.stockCardId) && item.quantity > 0);

    for (const row of rows) {
      const eventKey = `product-cost-approved:${variantId}:${row.stockCardId}`;
      const existing = await tx.stockUsageLog.findUnique({ where: { eventKey } });
      if (existing) continue;
      const stockCard = await tx.stockCard.findUnique({ where: { id: row.stockCardId } });
      if (!stockCard) continue;
      const previousStock = Number(stockCard.stockQuantity);
      const nextStock = previousStock - row.quantity;
      if (nextStock < 0) {
        throw new BadRequestException(`${stockCard.name} stok miktarı yetersiz.`);
      }
      const updated = await tx.stockCard.update({
        where: { id: row.stockCardId },
        data: { stockQuantity: nextStock, lastMovementAt: new Date() },
      });
      await tx.stockUsageLog.create({
        data: {
          stockCardId: row.stockCardId,
          variantId,
          eventType: 'PRODUCTION_COMPLETED',
          eventKey,
          quantity: row.quantity,
          unit: row.unit,
          previousStock,
          nextStock: Number(updated.stockQuantity),
          userId,
        },
      });
    }
  }

  private costItemGroup(value: unknown) {
    const allowed = ['LEAF_TRUNK', 'POT', 'CONSUMABLE', 'LABOR', 'PACKAGING', 'OTHER'];
    return allowed.includes(String(value)) ? String(value) as any : 'OTHER';
  }

  private costGroupToItemGroup(value: ProductionCostGroup) {
    if (value === 'POT') return 'POT';
    if (value === 'LABOR') return 'LABOR';
    if (value === 'PACKAGING') return 'PACKAGING';
    if (value === 'CONSUMABLE' || value === 'ELECTRICITY') return 'CONSUMABLE';
    if (value === 'OTHER') return 'OTHER';
    return 'LEAF_TRUNK';
  }

  private parseTrendyolRows(buffer: Buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  }

  private async buildTrendyolImportPreview(rows: Record<string, unknown>[], source: string) {
    const parsed = rows.map((row, index) => this.normalizeTrendyolRow(row, index + 2, source));
    const barcodes = parsed.map((item) => item.data.barcode).filter(Boolean);
    const existing = new Set(
      (
        await this.prisma.trendyolProductVariant.findMany({
          where: { barcode: { in: barcodes } },
          select: { barcode: true },
        })
      ).map((item) => item.barcode),
    );

    const seen = new Set<string>();
    const previewRows = parsed.map((item) => {
      if (item.errors.length > 0) return { ...item, status: 'HATALI' };
      if (seen.has(item.data.barcode)) return { ...item, status: 'ATLANACAK', errors: ['Aynı Excel içinde barkod tekrar ediyor.'] };
      seen.add(item.data.barcode);
      return { ...item, status: existing.has(item.data.barcode) ? 'GUNCELLENECEK' : 'YENI_URUN' };
    });

    return {
      totalRows: rows.length,
      newRows: previewRows.filter((item) => item.status === 'YENI_URUN').length,
      updateRows: previewRows.filter((item) => item.status === 'GUNCELLENECEK').length,
      skippedRows: previewRows.filter((item) => item.status === 'ATLANACAK').length,
      errorRows: previewRows.filter((item) => item.status === 'HATALI').length,
      rows: previewRows,
    };
  }

  private normalizeTrendyolRow(row: Record<string, unknown>, rowNumber: number, source: string) {
    const get = (...names: string[]) => {
      const entries = Object.entries(row);
      for (const name of names) {
        const found = entries.find(([key]) => this.normalizeHeader(key) === this.normalizeHeader(name));
        if (found) return String(found[1] ?? '').trim();
      }
      return '';
    };
    const productName = get('Ürün Adı', 'Ürün İsmi', 'Başlık', 'Product Name');
    const barcode = get('Barkod', 'Barcode');
    const oldModelCode = get('Model Kodu', 'Model Kod', 'Stok Kodu', 'Ürün Kodu');
    const supplierStockCode = get('Tedarikçi Stok Kodu', 'Tedarikçi Kodu', 'Stok Kodu');
    const images = [get('Görseller', 'Görsel Linkleri', 'Görsel', 'Image', 'Images')]
      .flatMap((value) => value.split(/[,\n;]/).map((item) => item.trim()).filter(Boolean));
    const data = {
      rowNumber,
      source,
      barcode,
      productName,
      oldModelCode,
      supplierStockCode,
      brand: get('Marka', 'Brand'),
      categoryName: get('Trendyol Kategori Adı', 'Kategori', 'Kategori Adı'),
      color: get('Ürün Rengi', 'Renk', 'Color'),
      salePrice: this.optionalNumber(get('Satış Fiyatı', 'Fiyat', 'Piyasa Satış Fiyatı')) ?? 0,
      commissionPercent: this.optionalNumber(get('Komisyon Oranı', 'Komisyon')) ?? 21,
      stockQuantity: Math.round(this.optionalNumber(get('Stok Adedi', 'Stok', 'Miktar')) ?? 0),
      productUrl: get('Trendyol Ürün Linki', 'Ürün Linki', 'Link', 'URL'),
      description: get('Açıklama', 'Ürün Açıklaması', 'Description'),
      images,
      detectedSize: this.detectSize(productName),
      detectedPot: this.detectPot(productName),
    };
    const errors = [];
    if (!barcode) errors.push('Barkod eksik.');
    if (!productName) errors.push('Ürün adı eksik.');
    return { rowNumber, data, errors };
  }

  private normalizeHeader(value: string) {
    return this.normalize(value).replace(/[^a-z0-9]/g, '');
  }

  private detectSize(productName: string) {
    const match = productName.match(/(\d{2,3})\s*cm/i);
    return match ? `${match[1]} cm` : null;
  }

  private detectPot(productName: string) {
    const normalized = this.normalize(productName);
    const pots = [
      'siyah gold', 'siyah gumus', 'beyaz gold', 'beyaz gumus',
      'siyah lilyum', 'beyaz lilyum', 'metal', 'beyaz plastik',
      'siyah plastik', 'beyaz vega', 'siyah vega', 'beyaz kure',
      'siyah kure', 'nergiz', 'luna', 'plastik',
    ];
    const found = pots.find((pot) => normalized.includes(pot));
    if (!found) return null;
    return found
      .split(' ')
      .map((part) => part.charAt(0).toLocaleUpperCase('tr-TR') + part.slice(1))
      .join(' ');
  }

  private stockUnitCost(stockCard: { purchasePrice: Prisma.Decimal; packageContent: Prisma.Decimal; automaticUnitCost: Prisma.Decimal; manualUnitCostEnabled?: boolean; manualUnitCost?: Prisma.Decimal }) {
    if (stockCard.manualUnitCostEnabled) return Number(stockCard.manualUnitCost ?? 0);
    const stored = Number(stockCard.automaticUnitCost);
    if (stored > 0) return stored;

    const packageContent = Number(stockCard.packageContent);
    if (Number(stockCard.purchasePrice) > 0 && packageContent > 0) {
      return Number(stockCard.purchasePrice) / packageContent;
    }

    return 0;
  }

  private hasMissingStockCost(stockCard: { purchasePrice: Prisma.Decimal; packageContent: Prisma.Decimal }) {
    return Number(stockCard.purchasePrice) <= 0 || Number(stockCard.packageContent) <= 0;
  }

  private async ensureBambuFamily() {
    const existing = await this.prisma.productionFamily.findFirst({
      where: {
        OR: [
          { familyName: { contains: 'Bambu', mode: 'insensitive' } },
          { familyCode: { contains: 'BAMBU', mode: 'insensitive' } },
        ],
      },
      orderBy: { id: 'asc' },
    });
    if (existing) return existing;

    const master = await this.prisma.productFamilyMaster.findFirst({
      where: { name: { contains: 'Bambu', mode: 'insensitive' } },
      orderBy: { id: 'asc' },
    });
    if (master) {
      const result = await this.addFamilyFromMaster(master.id);
      return result.family;
    }

    return this.prisma.productionFamily.create({
      data: {
        familyName: 'Bambu Tekli',
        familyCode: 'BAMBU_TEKLI',
        keywords: ['bambu', 'bambu tekli'],
        autoMatchingEnabled: false,
        status: 'ACTIVE',
      },
    });
  }

  private async ensureBambuRule(familyId: number) {
    return this.prisma.bambuCostRule.upsert({
      where: { familyId },
      update: {},
      create: {
        familyId,
        leavesPerStep: 1,
        leafStepCm: 10,
        roundingMode: 'NEAREST',
        trunkLengthCm: 220,
        siliconeAmount: 1,
        laborAmount: 0,
        overheadAmount: 15,
        electricityAmount: 0,
        packagingAmount: 0,
      },
      include: this.bambuRuleInclude(),
    });
  }

  private bambuRuleInclude() {
    return {
      family: true,
      leafStockCard: true,
      trunkStockCard: true,
      exceptions: { orderBy: { sizeCm: 'asc' as const } },
    };
  }

  private serializeBambuRule(rule: any) {
    const previewSizes = [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200];
    return {
      id: rule.id,
      familyId: rule.familyId,
      familyName: rule.family.familyName,
      leafStockCardId: rule.leafStockCardId,
      trunkStockCardId: rule.trunkStockCardId,
      leavesPerStep: Number(rule.leavesPerStep),
      leafStepCm: Number(rule.leafStepCm),
      roundingMode: rule.roundingMode,
      trunkLengthCm: Number(rule.trunkLengthCm),
      siliconeAmount: Number(rule.siliconeAmount),
      laborAmount: 0,
      overheadAmount: Number(rule.laborAmount) + Number(rule.overheadAmount) + Number(rule.electricityAmount),
      electricityAmount: 0,
      packagingAmount: Number(rule.packagingAmount),
      stockCards: {
        leaf: rule.leafStockCard ? this.serializeBambuStockCard(rule.leafStockCard) : null,
        trunk: rule.trunkStockCard ? this.serializeBambuStockCard(rule.trunkStockCard) : null,
      },
      exceptions: rule.exceptions.map((item: any) => ({
        id: item.id,
        sizeCm: item.sizeCm,
        leafCount: item.leafCount === null ? null : Number(item.leafCount),
        siliconeAmount: item.siliconeAmount === null ? null : Number(item.siliconeAmount),
        laborAmount: item.laborAmount === null ? null : Number(item.laborAmount),
        overheadAmount: item.overheadAmount === null ? null : Number(item.overheadAmount),
      })),
      preview: previewSizes.map((sizeCm) => this.calculateBambuCost(rule, sizeCm)),
    };
  }

  private serializeBambuStockCard(stockCard: any) {
    return {
      id: stockCard.id,
      name: stockCard.name,
      sku: stockCard.sku,
      unit: stockCard.unit,
      purchasePrice: Number(stockCard.purchasePrice),
      packageContent: Number(stockCard.packageContent),
      automaticUnitCost: Number(stockCard.automaticUnitCost),
      stockQuantity: Number(stockCard.stockQuantity),
    };
  }

  private calculateBambuCost(rule: any, sizeCm: number) {
    const exception = rule.exceptions.find((item: any) => item.sizeCm === sizeCm);
    const leafCount = exception?.leafCount !== null && exception?.leafCount !== undefined
      ? Number(exception.leafCount)
      : this.calculateBambuLeafCount(sizeCm, Number(rule.leafStepCm), Number(rule.leavesPerStep), rule.roundingMode);
    const leafUnitCost = rule.leafStockCard ? this.stockUnitCost(rule.leafStockCard) : 0;
    const trunkLengthCm = Number(rule.trunkLengthCm);
    const trunkFullPieces = sizeCm > 0 ? Math.floor(trunkLengthCm / sizeCm) : 0;
    const warnings: string[] = [];

    if (!rule.leafStockCard) warnings.push('Yaprak stok kartı seçilmemiş.');
    if (!rule.trunkStockCard) warnings.push('Gövde stok kartı seçilmemiş.');
    if (rule.leafStockCard && this.hasMissingStockCost(rule.leafStockCard)) warnings.push('Yaprak stok kartında maliyet bilgisi eksik.');
    if (rule.trunkStockCard && this.hasMissingStockCost(rule.trunkStockCard)) warnings.push('Gövde stok kartında maliyet bilgisi eksik.');
    if (trunkFullPieces <= 0) warnings.push('Ürün boyu çubuk uzunluğundan büyük. Gövde maliyeti hesaplanamaz.');

    const trunkCost = rule.trunkStockCard && trunkFullPieces > 0 ? Number(rule.trunkStockCard.purchasePrice) / trunkFullPieces : 0;
    const leafCost = leafCount * leafUnitCost;
    const siliconeCost = Number(rule.siliconeAmount);
    const packagingCost = Number(rule.packagingAmount);
    const laborCost = 0;
    const overheadCost = exception
      ? Number(exception.laborAmount ?? 0) + Number(exception.overheadAmount ?? 0)
      : Number(rule.laborAmount) + Number(rule.overheadAmount) + Number(rule.electricityAmount);
    const electricityCost = 0;
    const totalCost = leafCost + trunkCost + siliconeCost + laborCost + overheadCost + electricityCost + packagingCost;

    return {
      sizeCm,
      leafCount: this.round(leafCount),
      trunkFullPieces,
      leafCost: this.round(leafCost),
      trunkCost: this.round(trunkCost),
      siliconeCost: this.round(siliconeCost),
      laborAmount: this.round(laborCost),
      overheadAmount: this.round(overheadCost),
      electricityAmount: this.round(electricityCost),
      packagingCost: this.round(packagingCost),
      totalCost: this.round(totalCost),
      hasException: Boolean(exception),
      siliconeAmount: this.round(siliconeCost),
      warnings,
    };
  }

  private calculateBambuLeafCount(sizeCm: number, leafStepCm: number, leavesPerStep: number, roundingMode: BambuLeafRoundingMode) {
    const raw = leafStepCm > 0 ? (sizeCm / leafStepCm) * leavesPerStep : 0;
    if (roundingMode === 'DOWN') return Math.floor(raw);
    if (roundingMode === 'UP') return Math.ceil(raw);
    return Math.round(raw);
  }

  private roundingMode(value: unknown): BambuLeafRoundingMode {
    const allowed: BambuLeafRoundingMode[] = ['DOWN', 'UP', 'NEAREST'];
    return allowed.includes(value as BambuLeafRoundingMode) ? (value as BambuLeafRoundingMode) : 'NEAREST';
  }

  private stockUsageEventType(value: unknown): StockUsageEventType {
    const allowed: StockUsageEventType[] = ['PRODUCTION_COMPLETED', 'ORDER_SHIPPED'];
    return allowed.includes(value as StockUsageEventType) ? (value as StockUsageEventType) : 'PRODUCTION_COMPLETED';
  }

  private nullableNumber(value: unknown) {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private text(value: unknown) {
    if (value === undefined || value === null) return undefined;
    const text = String(value).trim();
    return text || undefined;
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

  private round(value: number) {
    return Math.round(value * 100) / 100;
  }

  private async ensureFamily(id: number) {
    if (!Number.isFinite(id)) throw new BadRequestException('Geçerli ürün ailesi seçilmelidir.');
    const family = await this.prisma.productionFamily.findUnique({ where: { id } });
    if (!family) throw new NotFoundException('Ürün ailesi bulunamadı.');
    return family;
  }

  private normalizeFamilyPayload(payload: unknown) {
    const body = (payload ?? {}) as Record<string, unknown>;
    return {
      familyName: this.text(body.familyName ?? body.family_name),
      masterId: this.optionalNumber(body.masterId),
      familyCode: this.text(body.familyCode ?? body.family_code),
      categoryId: this.optionalNumber(body.categoryId),
      mainModelCode: this.text(body.mainModelCode ?? body.main_model_code),
      description: this.text(body.description),
      status: body.status === 'PASSIVE' ? ('PASSIVE' as const) : ('ACTIVE' as const),
      keywords: this.stringList(body.keywords),
      sizeOptions: this.stringList(body.sizeOptions),
      potOptions: this.stringList(body.potOptions),
      autoMatchingEnabled: Boolean(body.autoMatchingEnabled),
    };
  }

  private stringList(value: unknown) {
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean);
    }

    if (typeof value === 'string') {
      return value
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [];
  }

  private async replaceFamilyOptions(familyId: number, sizeOptions: string[], potOptions: string[]) {
    const linkedSizeIds = new Set(
      (
        await this.prisma.trendyolProductVariant.findMany({
          where: { familyId, sizeOptionId: { not: null } },
          select: { sizeOptionId: true },
        })
      )
        .map((item) => item.sizeOptionId)
        .filter(Boolean) as number[],
    );
    const linkedPotIds = new Set(
      (
        await this.prisma.trendyolProductVariant.findMany({
          where: { familyId, potOptionId: { not: null } },
          select: { potOptionId: true },
        })
      )
        .map((item) => item.potOptionId)
        .filter(Boolean) as number[],
    );

    const existingSizes = await this.prisma.productionSizeOption.findMany({ where: { familyId } });
    const existingPots = await this.prisma.productionPotOption.findMany({ where: { familyId } });

    for (const [index, sizeLabel] of sizeOptions.entries()) {
      await this.prisma.productionSizeOption.upsert({
        where: { familyId_sizeLabel: { familyId, sizeLabel } },
        update: { sortOrder: index + 1 },
        create: { familyId, sizeLabel, sortOrder: index + 1 },
      });
    }

    for (const size of existingSizes) {
      if (!sizeOptions.includes(size.sizeLabel) && !linkedSizeIds.has(size.id)) {
        await this.prisma.productionSizeOption.delete({ where: { id: size.id } });
      }
    }

    for (const [index, potName] of potOptions.entries()) {
      await this.prisma.productionPotOption.upsert({
        where: { familyId_potName: { familyId, potName } },
        update: { sortOrder: index + 1 },
        create: { familyId, potName, sortOrder: index + 1 },
      });
    }

    for (const pot of existingPots) {
      if (!potOptions.includes(pot.potName) && !linkedPotIds.has(pot.id)) {
        await this.prisma.productionPotOption.delete({ where: { id: pot.id } });
      }
    }
  }

  private async refreshFamilySuggestions(familyId: number) {
    const family = await this.ensureFamily(familyId);
    const keywords = family.keywords.map((keyword) => this.normalize(keyword)).filter(Boolean);

    if (keywords.length === 0) return;

    const variants = await this.prisma.trendyolProductVariant.findMany({
      where: { familyId: null },
      select: { id: true, productName: true },
    });

    const suggestedIds = variants
      .filter((variant) => keywords.some((keyword) => this.normalize(variant.productName).includes(keyword)))
      .map((variant) => variant.id);

    if (suggestedIds.length === 0) return;

    await this.prisma.trendyolProductVariant.updateMany({
      where: { id: { in: suggestedIds }, familyId: null },
      data: {
        suggestedFamilyName: family.familyName,
        recipeStatus: 'Aday - Onay Bekliyor',
        costStatus: 'Bekliyor',
      },
    });
  }

  private async ensureDefaultTemplate(familyId: number, familyName: string) {
    const existing = await this.prisma.productionRecipeTemplate.findFirst({
      where: { familyId },
      orderBy: { id: 'asc' },
    });
    if (existing) return existing;

    const template = await this.prisma.productionRecipeTemplate.create({
      data: {
        familyId,
        templateName: `${familyName} Ana Reçetesi`,
        description: 'Ana maliyet kalemleri hazırlandı. Stok kartı eşleştirmeleri ve miktarlar kullanıcı tarafından girilecek.',
        vatPercent: 20,
        defaultCommissionPercent: 20,
        status: 'ACTIVE',
      },
    });

    const components = [
      { componentName: 'Yaprak', costGroup: 'LEAF' as const, scope: 'COMMON' as const, unit: 'adet' },
      { componentName: 'Gövde', costGroup: 'TRUNK' as const, scope: 'COMMON' as const, unit: 'adet' },
      { componentName: 'Saksı', costGroup: 'POT' as const, scope: 'POT_VARIANT' as const, unit: 'adet' },
      { componentName: 'Silikon', costGroup: 'CONSUMABLE' as const, scope: 'COMMON' as const, unit: 'gr' },
      { componentName: 'İşçilik', costGroup: 'LABOR' as const, scope: 'COMMON' as const, unit: 'iş' },
      { componentName: 'Elektrik', costGroup: 'ELECTRICITY' as const, scope: 'COMMON' as const, unit: 'pay' },
      { componentName: 'Paketleme', costGroup: 'PACKAGING' as const, scope: 'COMMON' as const, unit: 'adet' },
      { componentName: 'Diğer Gider', costGroup: 'OTHER' as const, scope: 'COMMON' as const, unit: 'pay' },
    ];

    await this.prisma.productionTemplateComponent.createMany({
      data: components.map((component) => ({
        templateId: template.id,
        componentName: component.componentName,
        costGroup: component.costGroup,
        scope: component.scope,
        quantity: 0,
        unit: component.unit,
      })),
    });

    return template;
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
