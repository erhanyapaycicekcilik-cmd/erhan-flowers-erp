export enum ProductMediaAuditChannel {
  GLOBAL = 'GLOBAL',
  TRENDYOL = 'TRENDYOL',
  ERHANFLOWERS_COM = 'ERHANFLOWERS_COM',
  FLORAYAPAYCICEK_COM = 'FLORAYAPAYCICEK_COM',
}

export enum ProductMediaAuditStatus {
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum ProductMediaRecommendation {
  KEEP = 'KEEP',
  IMPROVE = 'IMPROVE',
  REBUILD = 'REBUILD',
}

export enum ProductMediaIssueSeverity {
  INFO = 'INFO',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum MediaRequirementType {
  MAIN_PRODUCT = 'MAIN_PRODUCT',
  HOME_LIFESTYLE = 'HOME_LIFESTYLE',
  OFFICE_LIFESTYLE = 'OFFICE_LIFESTYLE',
  CAFE_LIFESTYLE = 'CAFE_LIFESTYLE',
  CLOSE_UP = 'CLOSE_UP',
  TOP_VIEW = 'TOP_VIEW',
  MEASUREMENT = 'MEASUREMENT',
  VIDEO = 'VIDEO',
}

export enum MediaRequirementStatus {
  PRESENT = 'PRESENT',
  MISSING = 'MISSING',
  NEEDS_IMPROVEMENT = 'NEEDS_IMPROVEMENT',
}

export enum ProductMediaPublishState {
  DRAFT = 'DRAFT',
  MEDIA_PREPARATION = 'MEDIA_PREPARATION',
  READY_FOR_REVIEW = 'READY_FOR_REVIEW',
  APPROVED = 'APPROVED',
  READY_TO_PUBLISH = 'READY_TO_PUBLISH',
  PUBLISHING = 'PUBLISHING',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
}

export type VisualScoreInput = {
  mainImageScore: number;
  realismScore: number;
  lifestyleScore: number;
  detailScore: number;
  measurementScore: number;
  consistencyScore: number;
  commercialScore: number;
};

export type SalesSignals = {
  salesQuantity?: number | null;
  revenue?: number | null;
  views?: number | null;
  conversionRate?: number | null;
  ratingAverage?: number | null;
  ratingCount?: number | null;
  stockQuantity?: number | null;
};

export type ProductMediaIssue = {
  id: string;
  auditId: string;
  issueType: string;
  severity: ProductMediaIssueSeverity;
  title: string;
  description: string;
  imageUrl?: string | null;
  createdAt: string;
};

export type ProductMediaRequirement = {
  id: string;
  auditId: string;
  mediaType: MediaRequirementType;
  status: MediaRequirementStatus;
};

export type ProductMediaAuditImage = {
  id: string;
  auditId: string;
  productImageId?: string | null;
  imageUrl: string;
  sortOrder: number;
  imageType: MediaRequirementType;
  score: number;
  analysisData: Record<string, unknown>;
  createdAt: string;
};

export type ProductMediaAudit = VisualScoreInput & {
  id: string;
  companyId: number;
  productId: string;
  productName: string;
  sku: string;
  barcode: string;
  category: string;
  brand: string;
  erpDetailUrl: string | null;
  salesPageUrl: string | null;
  channel: ProductMediaAuditChannel;
  status: ProductMediaAuditStatus;
  imageCount: number;
  overallVisualScore: number;
  changePriorityScore: number;
  priorityClass: 'Çok Yüksek' | 'Yüksek' | 'Orta' | 'Düşük' | 'Çok Düşük';
  recommendation: ProductMediaRecommendation;
  publishState: ProductMediaPublishState;
  mainImageStatus: MediaRequirementStatus;
  lifestyleStatus: MediaRequirementStatus;
  measurementStatus: MediaRequirementStatus;
  closeUpStatus: MediaRequirementStatus;
  salesSignals: SalesSignals;
  stockQuantity: number;
  price: number;
  aiSummary: string;
  aiIssues: string[];
  aiRecommendation: string;
  recommendedSet: string[];
  missingMediaTypes: MediaRequirementType[];
  issues: ProductMediaIssue[];
  requirements: ProductMediaRequirement[];
  images: ProductMediaAuditImage[];
  history: Array<{ analyzedAt: string; overallVisualScore: number; changePriorityScore: number; recommendation: ProductMediaRecommendation }>;
  beforeAfterPlan: {
    previousImages: string[];
    newImages: string[];
    changeDate: string | null;
    previousConversion: number | null;
    nextConversion: number | null;
    previousSales: number | null;
    nextSales: number | null;
    performanceDelta: number | null;
  };
  analyzedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductMediaAuditFilters = {
  channel?: ProductMediaAuditChannel;
  recommendation?: ProductMediaRecommendation;
  priority?: string;
  category?: string;
  brand?: string;
  status?: ProductMediaAuditStatus;
  missingMediaType?: MediaRequirementType;
  search?: string;
  minScore?: number;
  maxScore?: number;
  sort?: 'priority_desc' | 'score_asc' | 'sales_desc' | 'revenue_desc' | 'newest' | 'oldest';
  companyId?: number;
};

export type AuditBatch = {
  id: string;
  companyId: number;
  channel: ProductMediaAuditChannel;
  status: ProductMediaAuditStatus;
  total: number;
  completed: number;
  failed: number;
  queued: number;
  startedAt: string;
  completedAt: string | null;
};
