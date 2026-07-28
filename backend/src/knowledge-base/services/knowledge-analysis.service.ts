import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma-client';
import { PrismaService } from '../../prisma/prisma.service';
import { TextNormalizerService } from './text-normalizer.service';

type Candidate<T> = { item: T; confidence: number; source: string; priority: number };
type PotTraits = {
  type: string | null;
  typeLabel: string | null;
  color: string | null;
  colorLabel: string | null;
  typeKeyword: string | null;
  colorKeyword: string | null;
};

@Injectable()
export class KnowledgeAnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly normalizer: TextNormalizerService,
  ) {}

  async analyzeProductName(text: string, createdById?: number) {
    const originalText = this.validateText(text);
    const normalizedText = this.normalizer.normalize(originalText);
    const heightCm = this.normalizer.extractHeightCm(originalText);
    const stemCount = this.normalizer.extractStemCount(originalText);
    const potTraits = this.detectPotTraits(normalizedText);

    const [plantTypes, aliases, potProfiles, recipeProfiles, rules, stockCards] = await Promise.all([
      this.prisma.knowledgePlantType.findMany({
        where: { isActive: true },
        include: { productFamily: true, defaultLeafStockCard: true, defaultTrunkStockCard: true, defaultPotStockCard: true, defaultRecipe: true },
      }),
      this.prisma.knowledgeAlias.findMany({
        where: { isActive: true },
        include: { plantType: { include: { productFamily: true } }, potProfile: { include: { stockCard: true } } },
        orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.knowledgePotProfile.findMany({
        where: { isActive: true }, include: { stockCard: true }, orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.knowledgeRecipeProfile.findMany({
        where: { isActive: true },
        include: { items: { include: { stockCard: true }, orderBy: { sortOrder: 'asc' } } },
        orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.knowledgeRule.findMany({ where: { isActive: true }, include: { stockCard: true }, orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }] }),
      this.prisma.stockCard.findMany({ where: { status: 'ACTIVE' } }),
    ]);

    const plantCandidates: Candidate<(typeof plantTypes)[number]>[] = [];
    const potCandidates: Candidate<(typeof potProfiles)[number]>[] = [];
    for (const alias of aliases) {
      if (!this.matches(normalizedText, alias.normalizedAlias)) continue;
      const confidence = this.aliasConfidence(alias.normalizedAlias, normalizedText);
      if (alias.plantType) plantCandidates.push({ item: alias.plantType as (typeof plantTypes)[number], confidence, source: `alias:${alias.alias}`, priority: alias.priority });
      if (alias.potProfile) potCandidates.push({ item: alias.potProfile as (typeof potProfiles)[number], confidence, source: `alias:${alias.alias}`, priority: alias.priority });
    }
    for (const plantType of plantTypes) {
      if (this.matches(normalizedText, plantType.normalizedName)) plantCandidates.push({ item: plantType, confidence: 0.88, source: 'bitki adı', priority: 100 });
    }
    for (const potProfile of potProfiles) {
      if (this.matches(normalizedText, potProfile.normalizedName)) potCandidates.push({ item: potProfile, confidence: 0.86, source: 'saksı adı', priority: potProfile.priority });
    }

    const plant = this.pickBest(plantCandidates);
    const pot = this.pickBest(potCandidates);
    const recipeProfile = this.pickRecipe(recipeProfiles, plant?.item.id, plant?.item.productFamilyId, heightCm);
    const matchedRules = this.pickRules(rules, normalizedText, plant?.item.id, plant?.item.normalizedName, heightCm);
    const mergedAction = Object.assign({}, ...matchedRules.map((rule) => rule.actionJson as Record<string, unknown>));
    const resolvedPotStockCard = this.resolvePotStockCard(stockCards, potTraits, pot?.item.stockCardId);
    const resolvedRecipeItems = this.applyStructuredRules(
      this.resolveRecipeItems(recipeProfile?.items ?? [], mergedAction, heightCm, stemCount, resolvedPotStockCard, stockCards),
      matchedRules,
    );
    const warnings: string[] = [];
    const ambiguities: Prisma.InputJsonValue[] = [];
    if (!plant) warnings.push('Bitki türü eşleşmedi.');
    if (!pot && !potTraits.type) warnings.push('Saksı profili eşleşmedi.');
    if (potTraits.type && !resolvedPotStockCard) warnings.push('Algılanan saksıya uygun stok kartı bulunamadı.');
    if (!heightCm) warnings.push('Boy bilgisi bulunamadı.');
    if (!recipeProfile) warnings.push('Uygun reçete profili bulunamadı.');
    this.pushAmbiguity(ambiguities, 'Bitki türü', plantCandidates, plant?.item.id);
    this.pushAmbiguity(ambiguities, 'Saksı profili', potCandidates, pot?.item.id);

    const scores = [plant?.confidence ?? 0, resolvedPotStockCard ? 0.92 : pot?.confidence ?? 0, heightCm ? 0.95 : 0, recipeProfile ? 0.9 : 0];
    const overallConfidence = this.roundConfidence(scores.reduce((sum, score) => sum + score, 0) / scores.length);
    const decisionStatus = overallConfidence >= 0.9 ? 'AUTO_APPLY' : overallConfidence >= 0.7 ? 'SUGGEST' : 'REVIEW_REQUIRED';
    const potResult = pot
      ? { id: pot.item.id, name: pot.item.name, stockCardId: resolvedPotStockCard?.id ?? pot.item.stockCardId, stockCard: resolvedPotStockCard, confidence: pot.confidence }
      : potTraits.type
        ? { id: 0, name: [potTraits.colorLabel, potTraits.typeLabel, 'Saksı'].filter(Boolean).join(' '), stockCardId: resolvedPotStockCard?.id ?? null, stockCard: resolvedPotStockCard, confidence: resolvedPotStockCard ? 0.84 : 0.7 }
        : null;

    const result = {
      originalText,
      normalizedText,
      heightCm,
      detected: { plantCode: plant ? this.normalizer.normalize(plant.item.name).toUpperCase() : null, heightCm, stemCount, potType: potTraits.type, potColor: potTraits.color },
      plantType: plant ? { id: plant.item.id, name: plant.item.name, confidence: plant.confidence } : null,
      productFamily: plant?.item.productFamily ? { id: plant.item.productFamily.id, name: plant.item.productFamily.familyName, confidence: this.roundConfidence(plant.confidence - 0.03) } : null,
      potProfile: potResult,
      resolvedPotStockCard,
      defaultLeafStockCard: plant?.item.defaultLeafStockCard ?? null,
      defaultTrunkStockCard: plant?.item.defaultTrunkStockCard ?? null,
      defaultPotStockCard: plant?.item.defaultPotStockCard ?? null,
      recipeProfile: recipeProfile ? { id: recipeProfile.id, name: recipeProfile.name, items: resolvedRecipeItems } : null,
      matchedRules: matchedRules.map((rule) => ({ id: rule.id, name: rule.name, ruleKind: rule.ruleKind })),
      warnings,
      ambiguities,
      overallConfidence,
      decisionStatus,
      appliedAutomatically: decisionStatus === 'AUTO_APPLY',
    };

    const log = await this.prisma.knowledgeAnalysisLog.create({
      data: {
        inputText: originalText, normalizedInput: normalizedText, detectedPlantTypeId: plant?.item.id,
        detectedProductFamilyId: plant?.item.productFamilyId, detectedPotProfileId: pot?.item.id,
        detectedHeightCm: heightCm, confidenceScore: overallConfidence, resultJson: result as Prisma.InputJsonValue, createdById,
        decisionStatus, matchedRecipeId: recipeProfile?.id, appliedAutomatically: decisionStatus === 'AUTO_APPLY',
      },
    });
    return { ...result, analysisLogId: log.id };
  }

  private detectPotTraits(normalizedText: string): PotTraits {
    const types = [['metal', 'METAL', 'Metal'], ['vega', 'VEGA', 'Vega'], ['lilyum', 'LILYUM', 'Lilyum'], ['luna', 'LUNA', 'Luna'], ['nergiz', 'NERGIZ', 'Nergiz'], ['plastik', 'PLASTIK', 'Plastik'], ['kure', 'KURE', 'Küre'], ['fiber', 'FIBER', 'Fiber']] as const;
    const colors = [['siyah', 'BLACK', 'Siyah'], ['beyaz', 'WHITE', 'Beyaz'], ['gumus', 'SILVER', 'Gümüş'], ['gold', 'GOLD', 'Gold'], ['altin', 'GOLD', 'Gold']] as const;
    const type = types.find(([keyword]) => this.matches(normalizedText, keyword));
    const color = colors.find(([keyword]) => this.matches(normalizedText, keyword));
    return { type: type?.[1] ?? null, typeLabel: type?.[2] ?? null, color: color?.[1] ?? null, colorLabel: color?.[2] ?? null, typeKeyword: type?.[0] ?? null, colorKeyword: color?.[0] ?? null };
  }

  private resolvePotStockCard<T extends { id: number; name: string; category: string | null }>(stockCards: T[], traits: PotTraits, preferredId?: number | null) {
    if (preferredId) {
      const preferred = stockCards.find((item) => item.id === preferredId);
      if (preferred) return preferred;
    }
    if (!traits.typeKeyword) return null;
    return stockCards.map((item) => {
      const text = this.normalizer.normalize(`${item.name} ${item.category ?? ''}`);
      let score = text.includes('saksi') ? 20 : 0;
      if (text.includes(traits.typeKeyword!)) score += 50;
      if (traits.colorKeyword && text.includes(traits.colorKeyword)) score += 35;
      if (traits.color === 'BLACK' && (text.includes('gold') || text.includes('gumus'))) score -= 40;
      return { item, score };
    }).filter(({ score }) => score >= 70).sort((a, b) => b.score - a.score || a.item.id - b.item.id)[0]?.item ?? null;
  }

  private pickRules<T extends { conditionJson: unknown; actionJson: unknown; plantTypeId?: number | null; heightCm?: number | null }>(rules: T[], normalizedText: string, plantTypeId?: number, plantName?: string, heightCm?: number | null) {
    return rules.filter((rule) => {
      const condition = (rule.conditionJson ?? {}) as { contains?: string[]; plant?: string };
      const terms = Array.isArray(condition.contains) ? condition.contains : [];
      return (terms.length === 0 || terms.every((term) => this.matches(normalizedText, this.normalizer.normalize(term)))) &&
        (!condition.plant || this.normalizer.normalize(condition.plant) === plantName) &&
        (!rule.plantTypeId || rule.plantTypeId === plantTypeId) &&
        (!rule.heightCm || rule.heightCm === heightCm);
    });
  }

  private applyStructuredRules(items: any[], rules: any[]) {
    const componentMap: Record<string, string> = { LEAF: 'LEAF', TRUNK: 'TRUNK', STONE: 'OTHER', SILICONE: 'SILICONE', LABOR: 'LABOR', POT: 'POT' };
    const result = [...items];
    for (const rule of rules) {
      const componentType = componentMap[String(rule.ruleKind ?? '').toUpperCase()];
      if (!componentType) continue;
      const next = {
        componentType,
        quantity: Number(rule.quantity ?? (rule.amountTl ? 1 : 0)),
        quantityLabel: Number(rule.quantity ?? rule.amountTl ?? 0),
        unit: rule.unit ?? (rule.amountTl ? 'TL' : 'Adet'),
        stockCardId: rule.stockCardId ?? null,
        stockCard: rule.stockCard ?? null,
        displayName: rule.name,
        source: rule.stockCardId ? 'AUTO' : 'MANUAL',
        manualUnitCost: Number(rule.amountTl ?? 0),
        knowledgeRuleId: rule.id,
      };
      const index = result.findIndex((item) => item.componentType === componentType);
      if (index >= 0) result[index] = { ...result[index], ...next };
      else result.push(next);
    }
    return result;
  }

  private resolveRecipeItems(items: any[], actionValue: unknown, heightCm: number | null, stemCount: number | null, potStockCard: any, stockCards: any[]) {
    const action = (actionValue ?? {}) as Record<string, unknown>;
    const leafStepCm = Number(action.leafStepCm ?? 10);
    const quantities: Record<string, number | null> = {
      LEAF: heightCm && leafStepCm > 0 ? Math.round((heightCm / leafStepCm) * Number(action.leavesPerStep ?? 1)) : null,
      TRUNK: stemCount, SILICONE: Number(action.siliconeAmount ?? 1), LABOR: Number(action.laborAmount ?? 100),
      OTHER: Number(action.stoneAmount ?? 0), POT: 1,
    };
    const resolved = items.map((item) => {
      const quantity = quantities[item.componentType] ?? Number(item.quantity ?? 0);
      const isDirectExpense = ['SILICONE', 'LABOR'].includes(item.componentType);
      return {
        ...item, quantity: isDirectExpense ? 1 : quantity, quantityLabel: quantity,
        stockCardId: item.componentType === 'POT' ? potStockCard?.id ?? item.stockCardId : item.stockCardId,
        stockCard: item.componentType === 'POT' ? potStockCard ?? item.stockCard : item.stockCard,
        displayName: item.componentType === 'OTHER' ? 'Taş' : undefined,
        source: item.stockCardId || item.componentType === 'POT' ? 'AUTO' : 'MANUAL',
        manualUnitCost: isDirectExpense ? quantity : 0,
      };
    });
    if (potStockCard && !resolved.some((item) => item.componentType === 'POT')) resolved.push({ componentType: 'POT', quantity: 1, quantityLabel: 1, unit: potStockCard.unit ?? 'Adet', stockCardId: potStockCard.id, stockCard: potStockCard, displayName: 'Saksı', source: 'AUTO', manualUnitCost: 0 });
    if (!resolved.some((item) => item.componentType === 'OTHER')) {
      const stoneStock = stockCards.find((item) => item.id === Number(action.stoneStockCardId ?? 0)) ?? null;
      resolved.push({ componentType: 'OTHER', quantity: quantities.OTHER ?? 0, quantityLabel: quantities.OTHER ?? 0, unit: stoneStock?.unit ?? 'KG', stockCardId: stoneStock?.id ?? null, stockCard: stoneStock, displayName: 'Taş', source: stoneStock ? 'AUTO' : 'MANUAL', manualUnitCost: 0 });
    }
    return resolved;
  }

  private validateText(text: string) {
    const value = String(text ?? '').trim();
    if (!value) throw new BadRequestException('Analiz için ürün adı girilmelidir.');
    if (value.length > 300) throw new BadRequestException('Ürün adı en fazla 300 karakter olabilir.');
    return value;
  }
  private matches(source: string, term: string) { return Boolean(term) && ` ${source} `.includes(` ${term} `); }
  private aliasConfidence(alias: string, text: string) { return alias === text ? 0.98 : alias.split(' ').filter(Boolean).length >= 2 ? 0.92 : 0.82; }
  private pickBest<T extends { id: number }>(candidates: Candidate<T>[]) {
    const deduped = new Map<number, Candidate<T>>();
    for (const candidate of candidates) {
      const current = deduped.get(candidate.item.id);
      if (!current || candidate.confidence > current.confidence || candidate.priority < current.priority) deduped.set(candidate.item.id, candidate);
    }
    return [...deduped.values()].sort((a, b) => b.confidence - a.confidence || a.priority - b.priority)[0] ?? null;
  }
  private pushAmbiguity<T extends { id: number; name: string }>(target: Prisma.InputJsonValue[], label: string, candidates: Candidate<T>[], selectedId?: number) {
    const unique = [...new Map(candidates.map((candidate) => [candidate.item.id, candidate])).values()].filter((candidate) => candidate.item.id !== selectedId);
    if (unique.length) target.push({ type: label, alternatives: unique.slice(0, 5).map((candidate) => ({ id: candidate.item.id, name: candidate.item.name, confidence: candidate.confidence, source: candidate.source })) });
  }
  private pickRecipe<T extends { plantTypeId: number | null; productFamilyId: number | null; minHeightCm: number | null; maxHeightCm: number | null; isDefault: boolean; priority?: number }>(profiles: T[], plantTypeId?: number, productFamilyId?: number | null, heightCm?: number | null) {
    return profiles.filter((recipe) => {
      const ownerOk = (plantTypeId && recipe.plantTypeId === plantTypeId) || (productFamilyId && recipe.productFamilyId === productFamilyId);
      const heightOk = !heightCm || ((!recipe.minHeightCm || heightCm >= recipe.minHeightCm) && (!recipe.maxHeightCm || heightCm <= recipe.maxHeightCm));
      return Boolean(ownerOk) && heightOk;
    }).sort((a, b) => Number(a.priority ?? 100) - Number(b.priority ?? 100) || Number(b.isDefault) - Number(a.isDefault))[0] ?? null;
  }
  private roundConfidence(value: number) { return Math.max(0, Math.min(1, Number(value.toFixed(2)))); }
}
