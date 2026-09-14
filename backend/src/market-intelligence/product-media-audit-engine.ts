import {
  erhanFlowersStandardMediaSet,
  priorityScoreWeights,
  recommendationRules,
  visualScoreWeights,
} from './product-media-audit.config';
import {
  MediaRequirementType,
  ProductMediaIssue,
  ProductMediaIssueSeverity,
  ProductMediaRecommendation,
  SalesSignals,
  VisualScoreInput,
} from './product-media-audit.types';

const scoreKeys = Object.keys(visualScoreWeights) as Array<keyof typeof visualScoreWeights>;

export function calculateOverallVisualScore(scores: VisualScoreInput) {
  const total = scoreKeys.reduce((sum, key) => sum + clampScore(scores[key], 0, 10) * visualScoreWeights[key], 0);
  return round(total, 1);
}

export function determineRecommendation(overallVisualScore: number, issues: Pick<ProductMediaIssue, 'issueType' | 'severity'>[]) {
  const hasCriticalOverride = issues.some(
    (issue) => issue.severity === ProductMediaIssueSeverity.CRITICAL || (recommendationRules.criticalIssueTypes as readonly string[]).includes(issue.issueType),
  );
  if (hasCriticalOverride) return recommendationRules.fallbackRecommendation;
  if (overallVisualScore >= recommendationRules.keepMinScore) return ProductMediaRecommendation.KEEP;
  if (overallVisualScore >= recommendationRules.improveMinScore) return ProductMediaRecommendation.IMPROVE;
  return ProductMediaRecommendation.REBUILD;
}

export function detectMissingMedia(presentMediaTypes: MediaRequirementType[], requiredMediaTypes = erhanFlowersStandardMediaSet) {
  const present = new Set(presentMediaTypes);
  return requiredMediaTypes.filter((type) => !present.has(type));
}

export function calculateChangePriorityScore(overallVisualScore: number, salesSignals: SalesSignals) {
  const visualIssueLevel = (10 - clampScore(overallVisualScore, 0, 10)) / 10;
  const salesQuantity = normalize(salesSignals.salesQuantity, 120);
  const revenue = normalize(salesSignals.revenue, 150000);
  const views = normalize(salesSignals.views, 6000);
  const conversionRate = clampScore(salesSignals.conversionRate ?? 0, 0, 0.12) / 0.12;
  const ratingSignal = normalize((salesSignals.ratingCount ?? 0) * (salesSignals.ratingAverage ?? 0), 500);
  const stockSignal = normalize(salesSignals.stockQuantity, 120);

  const score =
    visualIssueLevel * priorityScoreWeights.visualIssueLevel +
    salesQuantity * priorityScoreWeights.salesQuantity +
    revenue * priorityScoreWeights.revenue +
    views * priorityScoreWeights.views +
    conversionRate * priorityScoreWeights.conversionRate +
    ratingSignal * priorityScoreWeights.ratingSignal +
    stockSignal * priorityScoreWeights.stockSignal;

  return Math.round(clampScore(score * 100, 0, 100));
}

export function priorityClass(score: number) {
  if (score >= 80) return 'Çok Yüksek';
  if (score >= 60) return 'Yüksek';
  if (score >= 40) return 'Orta';
  if (score >= 20) return 'Düşük';
  return 'Çok Düşük';
}

export function canMoveToReadyToPublish(currentState: string, humanApproved: boolean) {
  return humanApproved && currentState === 'APPROVED';
}

function normalize(value: number | null | undefined, max: number) {
  return clampScore(Number(value ?? 0) / max, 0, 1);
}

function clampScore(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
