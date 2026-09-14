import {
  MediaRequirementType,
  ProductMediaAuditChannel,
  ProductMediaRecommendation,
} from './product-media-audit.types';

export const visualScoreWeights = {
  mainImageScore: 0.25,
  realismScore: 0.15,
  lifestyleScore: 0.15,
  detailScore: 0.1,
  measurementScore: 0.1,
  consistencyScore: 0.15,
  commercialScore: 0.1,
} as const;

export const priorityScoreWeights = {
  visualIssueLevel: 0.35,
  salesQuantity: 0.2,
  revenue: 0.15,
  views: 0.1,
  conversionRate: 0.1,
  ratingSignal: 0.05,
  stockSignal: 0.05,
} as const;

export const recommendationRules = {
  keepMinScore: 8,
  improveMinScore: 6,
  criticalIssueTypes: ['WRONG_PRODUCT_IMAGE', 'MAIN_IMAGE_MISSING', 'INCONSISTENT_PRODUCT_SET', 'MARKETPLACE_CRITICAL_VIOLATION'],
  fallbackRecommendation: ProductMediaRecommendation.REBUILD,
} as const;

export const erhanFlowersStandardMediaSet: MediaRequirementType[] = [
  MediaRequirementType.MAIN_PRODUCT,
  MediaRequirementType.HOME_LIFESTYLE,
  MediaRequirementType.OFFICE_LIFESTYLE,
  MediaRequirementType.CAFE_LIFESTYLE,
  MediaRequirementType.CLOSE_UP,
  MediaRequirementType.TOP_VIEW,
  MediaRequirementType.MEASUREMENT,
];

export const marketplaceRules = {
  [ProductMediaAuditChannel.GLOBAL]: {
    maxImages: null,
    recommendedSize: null,
    dpi: null,
    urlProtocol: 'HTTPS',
    requiredMediaSet: erhanFlowersStandardMediaSet,
    optionalMediaSet: [MediaRequirementType.VIDEO],
  },
  [ProductMediaAuditChannel.TRENDYOL]: {
    maxImages: 8,
    recommendedSize: { width: 1200, height: 1800 },
    dpi: 96,
    urlProtocol: 'HTTPS',
    requiredMediaSet: erhanFlowersStandardMediaSet,
    optionalMediaSet: [MediaRequirementType.VIDEO],
  },
  [ProductMediaAuditChannel.ERHANFLOWERS_COM]: {
    maxImages: null,
    recommendedSize: { width: 1600, height: 1600 },
    dpi: 96,
    urlProtocol: 'HTTPS',
    requiredMediaSet: erhanFlowersStandardMediaSet,
    optionalMediaSet: [MediaRequirementType.VIDEO],
  },
  [ProductMediaAuditChannel.FLORAYAPAYCICEK_COM]: {
    maxImages: null,
    recommendedSize: { width: 1600, height: 1600 },
    dpi: 96,
    urlProtocol: 'HTTPS',
    requiredMediaSet: erhanFlowersStandardMediaSet,
    optionalMediaSet: [MediaRequirementType.VIDEO],
  },
} as const;
