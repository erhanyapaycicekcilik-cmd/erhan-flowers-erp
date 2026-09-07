export type Status = 'ACTIVE' | 'PASSIVE';
export type UserRole = 'OWNER' | 'MANAGER' | 'STAFF';

export type CurrentUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
};

export type Category = {
  id: number;
  name: string;
  codePrefix: string;
  startCode: number;
  currentCode: number;
  status: Status;
};

export type Product = {
  id: number;
  productName: string;
  modelCode: string;
  categoryId: number;
  barcode: string | null;
  stockQuantity: number;
  criticalStockLevel: number;
  costPrice: number;
  desi: number;
  shippingCost: number;
  shopPrice: number;
  sitePrice: number;
  marketPrice: number;
  listPrice: number;
  imageUrls: string[];
  brand: string;
  vatRate: number;
  origin: string;
  colorVariant: string | null;
  material: string | null;
  packageDimensions: string | null;
  warrantyMonths: number;
  warrantyType: string | null;
  status: Status;
  description: string | null;
  publishingStatus?: {
    trendyol: { ready: boolean; missingFields: string[] };
    hepsiburada: { ready: boolean; missingFields: string[] };
    ciceksepeti: { ready: boolean; missingFields: string[] };
    ticimax: { ready: boolean; missingFields: string[] };
  };
  createdAt: string;
  updatedAt: string;
  category?: Category;
  mediaFiles?: MediaFile[];
};

export type MediaFile = {
  id: number;
  productId: number | null;
  fileName: string;
  filePath: string;
  folderName: string;
  fileType: string;
  createdAt: string;
  product?: Product | null;
};

export type StockCard = {
  id: number;
  name: string;
  sku: string | null;
  category: string | null;
  color?: string | null;
  model?: string | null;
  size?: string | null;
  productFamily?: string | null;
  productType?: string | null;
  height?: string | null;
  width?: string | null;
  potType?: string | null;
  potColor?: string | null;
  potSize?: string | null;
  trunkType?: string | null;
  leafFlowerType?: string | null;
  brand?: string | null;
  oldModelCode?: string | null;
  barcode?: string | null;
  salePrice?: number;
  warehouse?: string | null;
  shelfLocation?: string | null;
  shortDescription?: string | null;
  technicalSpecs?: string | null;
  seoTitle?: string | null;
  metaDescription?: string | null;
  imagePath?: string | null;
  images?: {
    id: number;
    fileName: string;
    filePath: string;
    folderName: string;
    fileType: string;
    isMain: boolean;
    createdAt: string;
  }[];
  description?: string | null;
  criticalStockLevel?: number;
  supplierName?: string | null;
  lastMovementAt?: string | null;
  purchaseUnit: string;
  purchaseQuantity: number;
  unit: string;
  packageContent: number;
  purchasePrice: number;
  manualUnitCostEnabled: boolean;
  manualUnitCost: number;
  automaticUnitCost: number;
  stockQuantity: number | null;
  _count?: {
    productCostItems?: number;
    productPotItems?: number;
  };
  status: Status;
  createdAt: string;
  updatedAt: string;
};

export type RecipeCostType = 'LABOR' | 'ELECTRICITY' | 'SILICONE' | 'PACKAGING' | 'SHIPPING' | 'OTHER';

export type RecipeItem = {
  id?: number;
  stockCardId: number;
  quantity: number;
  unit: string;
  stockCard?: StockCard;
  lineTotal?: number;
  warning?: string | null;
};

export type RecipeExtraCost = {
  id?: number;
  type: RecipeCostType;
  name: string;
  amount: number;
};

export type ProductRecipe = {
  id: number;
  productId: number;
  shopMarginPercent: number;
  siteMarginPercent: number;
  marketplaceMarginPercent: number;
  items: RecipeItem[];
  extraCosts: RecipeExtraCost[];
};

export type CostCalculation = {
  componentTotal: number;
  extraTotal: number;
  totalCost: number;
  shopPrice: number;
  sitePrice: number;
  marketplacePrice: number;
  warnings?: string[];
};
