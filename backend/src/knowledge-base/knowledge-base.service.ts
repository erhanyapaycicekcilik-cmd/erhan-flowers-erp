import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma-client';
import { PrismaService } from '../prisma/prisma.service';
import { TextNormalizerService } from './services/text-normalizer.service';

@Injectable()
export class KnowledgeBaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly normalizer: TextNormalizerService,
  ) {}

  listPlantTypes() {
    return this.prisma.knowledgePlantType.findMany({
      include: { productFamily: true, defaultLeafStockCard: true, defaultTrunkStockCard: true, defaultPotStockCard: true, defaultRecipe: true },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  getPlantType(id: number) {
    return this.prisma.knowledgePlantType.findUnique({
      where: { id },
      include: { productFamily: true, defaultLeafStockCard: true, defaultTrunkStockCard: true, defaultPotStockCard: true, defaultRecipe: true, aliases: true },
    });
  }

  async createPlantType(payload: unknown) {
    const body = this.object(payload);
    const name = this.requiredString(body.name, 'Bitki türü adı zorunludur.');
    return this.prisma.knowledgePlantType.create({
      data: {
        name,
        code: this.optionalString(body.code)?.toUpperCase(),
        normalizedName: this.normalizer.normalize(name),
        description: this.optionalString(body.description),
        productFamilyId: this.optionalNumber(body.productFamilyId),
        defaultLeafStockCardId: this.optionalNumber(body.defaultLeafStockCardId),
        defaultTrunkStockCardId: this.optionalNumber(body.defaultTrunkStockCardId),
        defaultPotStockCardId: this.optionalNumber(body.defaultPotStockCardId),
        defaultRecipeId: this.optionalNumber(body.defaultRecipeId),
        isActive: this.optionalBoolean(body.isActive) ?? true,
      },
    });
  }

  async updatePlantType(id: number, payload: unknown) {
    await this.ensurePlantType(id);
    const body = this.object(payload);
    const data: Prisma.KnowledgePlantTypeUpdateInput = {};
    if ('name' in body) {
      const name = this.requiredString(body.name, 'Bitki türü adı zorunludur.');
      data.name = name;
      data.normalizedName = this.normalizer.normalize(name);
    }
    if ('description' in body) data.description = this.optionalString(body.description);
    if ('code' in body) data.code = this.optionalString(body.code)?.toUpperCase();
    if ('isActive' in body) data.isActive = this.optionalBoolean(body.isActive) ?? true;
    this.connectOptional(data, 'productFamily', body, 'productFamilyId');
    this.connectOptional(data, 'defaultLeafStockCard', body, 'defaultLeafStockCardId');
    this.connectOptional(data, 'defaultTrunkStockCard', body, 'defaultTrunkStockCardId');
    this.connectOptional(data, 'defaultPotStockCard', body, 'defaultPotStockCardId');
    this.connectOptional(data, 'defaultRecipe', body, 'defaultRecipeId');
    return this.prisma.knowledgePlantType.update({ where: { id }, data });
  }

  listAliases() {
    return this.prisma.knowledgeAlias.findMany({
      include: { plantType: true, potProfile: true, materialRule: true },
      orderBy: [{ isActive: 'desc' }, { priority: 'asc' }, { alias: 'asc' }],
    });
  }

  async createAlias(payload: unknown) {
    const body = this.object(payload);
    const alias = this.requiredString(body.alias, 'Eş anlamlı ad zorunludur.');
    const entityType = this.requiredString(body.entityType, 'Eşleşme tipi zorunludur.');
    this.ensureAliasTarget(body);
    return this.prisma.knowledgeAlias.create({
      data: {
        alias,
        normalizedAlias: this.normalizer.normalize(alias),
        entityType: entityType as Prisma.KnowledgeAliasCreateInput['entityType'],
        plantTypeId: this.optionalNumber(body.plantTypeId),
        potProfileId: this.optionalNumber(body.potProfileId),
        materialRuleId: this.optionalNumber(body.materialRuleId),
        priority: this.optionalNumber(body.priority) ?? 100,
        isActive: this.optionalBoolean(body.isActive) ?? true,
      },
    });
  }

  async updateAlias(id: number, payload: unknown) {
    await this.ensureAlias(id);
    const body = this.object(payload);
    if ('plantTypeId' in body || 'potProfileId' in body || 'materialRuleId' in body) this.ensureAliasTarget(body);
    const data: Prisma.KnowledgeAliasUpdateInput = {};
    if ('alias' in body) {
      const alias = this.requiredString(body.alias, 'Eş anlamlı ad zorunludur.');
      data.alias = alias;
      data.normalizedAlias = this.normalizer.normalize(alias);
    }
    if ('entityType' in body) data.entityType = this.requiredString(body.entityType, 'Eşleşme tipi zorunludur.') as Prisma.KnowledgeAliasUpdateInput['entityType'];
    if ('priority' in body) data.priority = this.optionalNumber(body.priority) ?? 100;
    if ('isActive' in body) data.isActive = this.optionalBoolean(body.isActive) ?? true;
    this.connectOptional(data, 'plantType', body, 'plantTypeId');
    this.connectOptional(data, 'potProfile', body, 'potProfileId');
    this.connectOptional(data, 'materialRule', body, 'materialRuleId');
    return this.prisma.knowledgeAlias.update({ where: { id }, data });
  }

  listPotProfiles() {
    return this.prisma.knowledgePotProfile.findMany({
      include: { stockCard: true, aliases: true },
      orderBy: [{ isActive: 'desc' }, { priority: 'asc' }, { name: 'asc' }],
    });
  }

  async createPotProfile(payload: unknown) {
    const body = this.object(payload);
    const name = this.requiredString(body.name, 'Saksı profili adı zorunludur.');
    return this.prisma.knowledgePotProfile.create({
      data: {
        name,
        normalizedName: this.normalizer.normalize(name),
        materialType: this.optionalString(body.materialType),
        color: this.optionalString(body.color),
        width: this.optionalNumber(body.width),
        depth: this.optionalNumber(body.depth),
        height: this.optionalNumber(body.height),
        diameter: this.optionalNumber(body.diameter),
        stockCardId: this.optionalNumber(body.stockCardId),
        priority: this.optionalNumber(body.priority) ?? 100,
        isActive: this.optionalBoolean(body.isActive) ?? true,
      },
    });
  }

  async updatePotProfile(id: number, payload: unknown) {
    await this.ensurePotProfile(id);
    const body = this.object(payload);
    const data: Prisma.KnowledgePotProfileUpdateInput = {};
    if ('name' in body) {
      const name = this.requiredString(body.name, 'Saksı profili adı zorunludur.');
      data.name = name;
      data.normalizedName = this.normalizer.normalize(name);
    }
    for (const key of ['materialType', 'color'] as const) if (key in body) data[key] = this.optionalString(body[key]);
    for (const key of ['width', 'depth', 'height', 'diameter', 'priority'] as const) if (key in body) data[key] = this.optionalNumber(body[key]) ?? undefined;
    if ('isActive' in body) data.isActive = this.optionalBoolean(body.isActive) ?? true;
    this.connectOptional(data, 'stockCard', body, 'stockCardId');
    return this.prisma.knowledgePotProfile.update({ where: { id }, data });
  }

  listRecipeProfiles() {
    return this.prisma.knowledgeRecipeProfile.findMany({
      include: { plantType: true, productFamily: true, items: { include: { stockCard: true }, orderBy: { sortOrder: 'asc' } } },
      orderBy: [{ isActive: 'desc' }, { priority: 'asc' }, { name: 'asc' }],
    });
  }

  getRecipeProfile(id: number) {
    return this.prisma.knowledgeRecipeProfile.findUnique({
      where: { id },
      include: { plantType: true, productFamily: true, items: { include: { stockCard: true }, orderBy: { sortOrder: 'asc' } } },
    });
  }

  async createRecipeProfile(payload: unknown) {
    const body = this.object(payload);
    const name = this.requiredString(body.name, 'Reçete profili adı zorunludur.');
    return this.prisma.knowledgeRecipeProfile.create({
      data: {
        name,
        plantTypeId: this.optionalNumber(body.plantTypeId),
        productFamilyId: this.optionalNumber(body.productFamilyId),
        minHeightCm: this.optionalNumber(body.minHeightCm),
        maxHeightCm: this.optionalNumber(body.maxHeightCm),
        priority: this.optionalNumber(body.priority) ?? 100,
        isDefault: this.optionalBoolean(body.isDefault) ?? false,
        isActive: this.optionalBoolean(body.isActive) ?? true,
        items: this.recipeItems(body.items),
      },
      include: { items: true },
    });
  }

  async updateRecipeProfile(id: number, payload: unknown) {
    await this.ensureRecipeProfile(id);
    const body = this.object(payload);
    const data: Prisma.KnowledgeRecipeProfileUpdateInput = {};
    if ('name' in body) data.name = this.requiredString(body.name, 'Reçete profili adı zorunludur.');
    for (const key of ['minHeightCm', 'maxHeightCm', 'priority'] as const) if (key in body) data[key] = this.optionalNumber(body[key]) ?? undefined;
    if ('isDefault' in body) data.isDefault = this.optionalBoolean(body.isDefault) ?? false;
    if ('isActive' in body) data.isActive = this.optionalBoolean(body.isActive) ?? true;
    this.connectOptional(data, 'plantType', body, 'plantTypeId');
    this.connectOptional(data, 'productFamily', body, 'productFamilyId');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.knowledgeRecipeProfile.update({ where: { id }, data });
      if ('items' in body) {
        await tx.knowledgeRecipeItem.deleteMany({ where: { recipeProfileId: id } });
        const items = this.recipeItems(body.items).create ?? [];
        if (Array.isArray(items) && items.length > 0) {
          await tx.knowledgeRecipeItem.createMany({ data: items.map((item) => ({ ...item, recipeProfileId: id })) });
        }
      }
      return tx.knowledgeRecipeProfile.findUnique({
        where: { id: updated.id },
        include: { plantType: true, productFamily: true, items: { include: { stockCard: true }, orderBy: { sortOrder: 'asc' } } },
      });
    });
  }

  listRules(ruleKind?: string) {
    return this.prisma.knowledgeRule.findMany({
      where: ruleKind ? { ruleKind: ruleKind.toUpperCase() } : undefined,
      include: { plantType: true, stockCard: true },
      orderBy: [{ isActive: 'desc' }, { ruleKind: 'asc' }, { priority: 'asc' }, { heightCm: 'asc' }],
    });
  }

  createRule(payload: unknown) {
    const body = this.object(payload);
    const ruleKind = this.requiredString(body.ruleKind, 'Kural grubu zorunludur.').toUpperCase();
    return this.prisma.knowledgeRule.create({
      data: {
        name: this.requiredString(body.name, 'Kural adı zorunludur.'),
        ruleType: this.ruleType(ruleKind),
        ruleKind,
        plantTypeId: this.optionalNumber(body.plantTypeId),
        heightCm: this.optionalNumber(body.heightCm),
        stockCardId: this.optionalNumber(body.stockCardId),
        quantity: this.optionalNumber(body.quantity),
        unit: this.optionalString(body.unit),
        amountTl: this.optionalNumber(body.amountTl),
        conditionJson: this.jsonObject(body.conditionJson),
        actionJson: this.jsonObject(body.actionJson),
        priority: this.optionalNumber(body.priority) ?? 100,
        isActive: this.optionalBoolean(body.isActive) ?? true,
      },
      include: { plantType: true, stockCard: true },
    });
  }

  async updateRule(id: number, payload: unknown) {
    const existing = await this.prisma.knowledgeRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Kural bulunamadı.');
    const body = this.object(payload);
    const data: Prisma.KnowledgeRuleUpdateInput = {};
    if ('name' in body) data.name = this.requiredString(body.name, 'Kural adı zorunludur.');
    if ('ruleKind' in body) {
      const kind = this.requiredString(body.ruleKind, 'Kural grubu zorunludur.').toUpperCase();
      data.ruleKind = kind;
      data.ruleType = this.ruleType(kind);
    }
    if ('heightCm' in body) data.heightCm = this.optionalNumber(body.heightCm);
    if ('quantity' in body) data.quantity = this.optionalNumber(body.quantity);
    if ('amountTl' in body) data.amountTl = this.optionalNumber(body.amountTl);
    if ('priority' in body) data.priority = this.optionalNumber(body.priority) ?? 100;
    if ('unit' in body) data.unit = this.optionalString(body.unit);
    if ('conditionJson' in body) data.conditionJson = this.jsonObject(body.conditionJson);
    if ('actionJson' in body) data.actionJson = this.jsonObject(body.actionJson);
    if ('isActive' in body) data.isActive = this.optionalBoolean(body.isActive) ?? true;
    this.connectOptional(data, 'plantType', body, 'plantTypeId');
    this.connectOptional(data, 'stockCard', body, 'stockCardId');
    return this.prisma.knowledgeRule.update({ where: { id }, data, include: { plantType: true, stockCard: true } });
  }

  listAnalysisLogs(take = 100) {
    return this.prisma.knowledgeAnalysisLog.findMany({
      take: Math.min(Math.max(take, 1), 500),
      include: { detectedPlantType: true, detectedPotProfile: true, feedbacks: { orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createFeedback(analysisLogId: number, payload: unknown, userId: number) {
    const log = await this.prisma.knowledgeAnalysisLog.findUnique({ where: { id: analysisLogId } });
    if (!log) throw new NotFoundException('Analiz kaydı bulunamadı.');
    const body = this.object(payload);
    return this.prisma.$transaction(async (tx) => {
      const feedback = await tx.knowledgeFeedback.create({
        data: {
          analysisLogId,
          fieldName: this.requiredString(body.fieldName, 'Düzeltilen alan zorunludur.'),
          detectedValue: body.detectedValue === undefined ? undefined : body.detectedValue as Prisma.InputJsonValue,
          correctedValue: (body.correctedValue ?? null) as Prisma.InputJsonValue,
          note: this.optionalString(body.note),
          createdById: userId,
        },
      });
      await tx.knowledgeAnalysisLog.update({ where: { id: analysisLogId }, data: { acceptedByUser: false, decisionStatus: 'CORRECTED' } });
      return feedback;
    });
  }

  listStockCardOptions() {
    return this.prisma.stockCard.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, sku: true, category: true, unit: true },
      orderBy: { name: 'asc' },
    });
  }

  archive(type: 'plantType' | 'alias' | 'potProfile' | 'recipeProfile' | 'rule', id: number) {
    const clients = {
      plantType: this.prisma.knowledgePlantType,
      alias: this.prisma.knowledgeAlias,
      potProfile: this.prisma.knowledgePotProfile,
      recipeProfile: this.prisma.knowledgeRecipeProfile,
      rule: this.prisma.knowledgeRule,
    } as const;
    return (clients[type] as any).update({ where: { id }, data: { isActive: false } });
  }

  private recipeItems(value: unknown) {
    if (!Array.isArray(value)) return {};
    return {
      create: value.slice(0, 100).map((raw, index) => {
        const item = this.object(raw);
        return {
          stockCardId: this.optionalNumber(item.stockCardId),
          componentType: this.requiredString(item.componentType, 'Bileşen tipi zorunludur.') as Prisma.KnowledgeRecipeItemCreateManyRecipeProfileInput['componentType'],
          quantity: this.optionalNumber(item.quantity) ?? 0,
          unit: this.optionalString(item.unit) ?? 'Adet',
          isOptional: this.optionalBoolean(item.isOptional) ?? false,
          sortOrder: this.optionalNumber(item.sortOrder) ?? index + 1,
        };
      }),
    };
  }

  private jsonObject(value: unknown): Prisma.InputJsonObject {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as Prisma.InputJsonObject;
  }

  private ruleType(ruleKind: string): Prisma.KnowledgeRuleCreateInput['ruleType'] {
    if (ruleKind === 'HEIGHT') return 'HEIGHT';
    if (ruleKind === 'POT') return 'POT';
    if (ruleKind === 'RECIPE') return 'RECIPE';
    return 'MATERIAL';
  }

  private object(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BadRequestException('Geçersiz veri gönderildi.');
    return value as Record<string, unknown>;
  }

  private requiredString(value: unknown, message: string) {
    const text = String(value ?? '').trim();
    if (!text) throw new BadRequestException(message);
    if (text.length > 300) throw new BadRequestException('Metin en fazla 300 karakter olabilir.');
    return text;
  }

  private optionalString(value: unknown) {
    if (value === undefined || value === null || value === '') return null;
    return String(value).trim();
  }

  private optionalNumber(value: unknown) {
    if (value === undefined || value === null || value === '') return null;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) throw new BadRequestException('Sayısal alan geçersiz.');
    return numeric;
  }

  private optionalBoolean(value: unknown) {
    if (value === undefined || value === null || value === '') return undefined;
    return value === true || value === 'true';
  }

  private connectOptional(target: Record<string, unknown>, relation: string, body: Record<string, unknown>, key: string) {
    if (!(key in body)) return;
    const id = this.optionalNumber(body[key]);
    target[relation] = id ? { connect: { id } } : { disconnect: true };
  }

  private ensureAliasTarget(body: Record<string, unknown>) {
    const targetCount = ['plantTypeId', 'potProfileId', 'materialRuleId'].filter((key) => this.optionalNumber(body[key]) !== null).length;
    if (targetCount !== 1) throw new BadRequestException('Eş anlamlı kayıt tam olarak bir hedefe bağlanmalıdır.');
  }

  private async ensurePlantType(id: number) {
    const item = await this.prisma.knowledgePlantType.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Bitki türü bulunamadı.');
  }

  private async ensureAlias(id: number) {
    const item = await this.prisma.knowledgeAlias.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Eş anlamlı kayıt bulunamadı.');
  }

  private async ensurePotProfile(id: number) {
    const item = await this.prisma.knowledgePotProfile.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Saksı profili bulunamadı.');
  }

  private async ensureRecipeProfile(id: number) {
    const item = await this.prisma.knowledgeRecipeProfile.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Reçete profili bulunamadı.');
  }
}
