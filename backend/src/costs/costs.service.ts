import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RecipeCostType } from '../generated/prisma-client';
import { PrismaService } from '../prisma/prisma.service';

type RecipePayload = {
  shopMarginPercent?: number;
  siteMarginPercent?: number;
  marketplaceMarginPercent?: number;
  shippingCost?: number;
  vatPercent?: number;
  items?: Array<{ stockCardId?: number; quantity?: number; unit?: string }>;
  extraCosts?: Array<{ type?: RecipeCostType; name?: string; amount?: number }>;
};

@Injectable()
export class CostsService {
  constructor(private readonly prisma: PrismaService) {}

  async listProductCosts() {
    const activeVariants = await this.prisma.trendyolProductVariant.findMany({
      where: { status: 'ACTIVE' },
      select: { productId: true, barcode: true, supplierStockCode: true, images: true },
    });

    const directProductIds = activeVariants.map((v) => v.productId).filter(Boolean) as number[];
    const barcodes = activeVariants.map((v) => v.barcode).filter(Boolean) as string[];
    const modelCodes = activeVariants.map((v) => v.supplierStockCode).filter(Boolean) as string[];

    const imageByBarcode = new Map<string, string>();
    const imageByModelCode = new Map<string, string>();
    for (const v of activeVariants) {
      const img = this.extractFirstImage(v.images);
      if (img) {
        if (v.barcode) imageByBarcode.set(v.barcode, img);
        if (v.supplierStockCode) imageByModelCode.set(v.supplierStockCode, img);
      }
    }

    const products = await this.prisma.product.findMany({
      where: {
        OR: [
          { id: { in: directProductIds } },
          { barcode: { in: barcodes } },
          { trendyolBarcode: { in: barcodes } },
          { modelCode: { in: modelCodes } },
        ],
      },
      include: {
        category: true,
        recipe: {
          include: {
            items: { include: { stockCard: true } },
            extraCosts: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return products.map((product) => {
      const ownImages = product.imageUrls as string[];
      const ownImage = Array.isArray(ownImages) && ownImages.length > 0 ? ownImages[0] : null;
      const variantImage =
        (product.barcode ? imageByBarcode.get(product.barcode) : null) ??
        (product.trendyolBarcode ? imageByBarcode.get(product.trendyolBarcode) : null) ??
        imageByModelCode.get(product.modelCode) ??
        null;
      return {
        id: product.id,
        productName: product.productName,
        modelCode: product.modelCode,
        barcode: product.barcode,
        category: product.category,
        catalogCategory: product.catalogCategory,
        status: product.status,
        imageUrl: ownImage ?? variantImage,
        costs: product.recipe ? this.calculate(product.recipe) : this.emptyCalculation(),
      };
    });
  }

  private extractFirstImage(images: unknown): string | null {
    if (!images) return null;
    if (Array.isArray(images)) {
      const first = images[0];
      if (typeof first === 'string') return first;
      if (first && typeof first === 'object') {
        const obj = first as Record<string, unknown>;
        if (typeof obj.url === 'string') return obj.url;
      }
    }
    return null;
  }

  async getProductRecipe(productId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        recipe: {
          include: {
            items: {
              include: { stockCard: true },
              orderBy: { id: 'asc' },
            },
            extraCosts: {
              orderBy: { id: 'asc' },
            },
          },
        },
      },
    });
    if (!product) {
      throw new NotFoundException('Ürün bulunamadı.');
    }
    const ownImages = product.imageUrls as string[];
    const ownImage = Array.isArray(ownImages) && ownImages.length > 0 ? ownImages[0] : null;
    let variantImage: string | null = null;
    if (!ownImage) {
      const orClauses: object[] = [];
      if (product.barcode) orClauses.push({ barcode: product.barcode });
      if (product.trendyolBarcode) orClauses.push({ barcode: product.trendyolBarcode });
      if (product.modelCode) orClauses.push({ supplierStockCode: product.modelCode });
      if (orClauses.length > 0) {
        const variant = await this.prisma.trendyolProductVariant.findFirst({
          where: { OR: orClauses },
          select: { images: true },
        });
        if (variant) variantImage = this.extractFirstImage(variant.images);
      }
    }
    return {
      product,
      imageUrl: ownImage ?? variantImage,
      recipe: product.recipe ? this.serializeRecipe(product.recipe) : null,
      costs: product.recipe ? this.calculate(product.recipe) : this.emptyCalculation(),
    };
  }

  async saveRecipe(productId: number, payload: unknown) {
    const data = this.normalize(payload);
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Ürün bulunamadı.');
    }
    const stockCardIds = (data.items ?? []).map((item) => item.stockCardId).filter(Boolean) as number[];
    const stockCards = await this.prisma.stockCard.findMany({ where: { id: { in: stockCardIds } } });
    if (stockCards.length !== stockCardIds.length) {
      throw new BadRequestException('Reçetede geçersiz stok kartı var.');
    }
    await this.prisma.productRecipe.upsert({
      where: { productId },
      create: {
        productId,
        shopMarginPercent: data.shopMarginPercent ?? 30,
        siteMarginPercent: data.siteMarginPercent ?? 45,
        marketplaceMarginPercent: data.marketplaceMarginPercent ?? 65,
        shippingCost: data.shippingCost ?? 0,
        vatPercent: data.vatPercent ?? 20,
      },
      update: {
        shopMarginPercent: data.shopMarginPercent ?? 30,
        siteMarginPercent: data.siteMarginPercent ?? 45,
        marketplaceMarginPercent: data.marketplaceMarginPercent ?? 65,
        shippingCost: data.shippingCost ?? 0,
        vatPercent: data.vatPercent ?? 20,
      },
    });
    const recipe = await this.prisma.productRecipe.findUniqueOrThrow({ where: { productId } });
    await this.prisma.$transaction([
      this.prisma.recipeItem.deleteMany({ where: { recipeId: recipe.id } }),
      this.prisma.recipeExtraCost.deleteMany({ where: { recipeId: recipe.id } }),
      ...this.buildItemCreates(recipe.id, data),
      ...this.buildExtraCostCreates(recipe.id, data),
    ]);
    return this.getProductRecipe(productId);
  }

  private buildItemCreates(recipeId: number, data: RecipePayload) {
    return (data.items ?? [])
      .filter((item) => item.stockCardId && item.quantity && item.unit)
      .map((item) =>
        this.prisma.recipeItem.create({
          data: {
            recipeId,
            stockCardId: item.stockCardId!,
            quantity: item.quantity!,
            unit: item.unit!,
          },
        }),
      );
  }

  private buildExtraCostCreates(recipeId: number, data: RecipePayload) {
    return (data.extraCosts ?? [])
      .filter((item) => item.name && item.amount !== undefined)
      .map((item) =>
        this.prisma.recipeExtraCost.create({
          data: {
            recipeId,
            type: item.type ?? 'OTHER',
            name: item.name!,
            amount: item.amount!,
          },
        }),
      );
  }

  private calculate(recipe: {
    shopMarginPercent: Prisma.Decimal;
    siteMarginPercent: Prisma.Decimal;
    marketplaceMarginPercent: Prisma.Decimal;
    shippingCost: Prisma.Decimal;
    vatPercent: Prisma.Decimal;
    items: Array<{ quantity: Prisma.Decimal; stockCard: { purchasePrice: Prisma.Decimal; packageContent: Prisma.Decimal; automaticUnitCost: Prisma.Decimal } }>;
    extraCosts: Array<{ amount: Prisma.Decimal }>;
  }) {
    const componentTotal = recipe.items.reduce((sum, item) => {
      return sum + Number(item.quantity) * this.stockUnitCost(item.stockCard);
    }, 0);
    const extraTotal = recipe.extraCosts.reduce((sum, item) => sum + Number(item.amount), 0);
    const totalCost = componentTotal + extraTotal;
    const shipping = Number(recipe.shippingCost);
    const vat = Number(recipe.vatPercent);
    const vatMult = 1 + vat / 100;
    return {
      componentTotal: this.round(componentTotal),
      extraTotal: this.round(extraTotal),
      totalCost: this.round(totalCost),
      shopPrice: this.round(totalCost * (1 + Number(recipe.shopMarginPercent) / 100) * vatMult),
      sitePrice: this.round((totalCost + shipping) * (1 + Number(recipe.siteMarginPercent) / 100) * vatMult),
      marketplacePrice: this.round((totalCost + shipping) * (1 + Number(recipe.marketplaceMarginPercent) / 100) * vatMult),
      warnings: this.stockWarnings(recipe.items.map((item) => item.stockCard)),
    };
  }

  private serializeRecipe(recipe: {
    id: number;
    productId: number;
    shopMarginPercent: Prisma.Decimal;
    siteMarginPercent: Prisma.Decimal;
    marketplaceMarginPercent: Prisma.Decimal;
    shippingCost: Prisma.Decimal;
    vatPercent: Prisma.Decimal;
    items: Array<{
      id: number;
      stockCardId: number;
      quantity: Prisma.Decimal;
      unit: string;
      stockCard: { purchasePrice: Prisma.Decimal; packageContent: Prisma.Decimal; automaticUnitCost: Prisma.Decimal; stockQuantity: Prisma.Decimal } & Record<string, unknown>;
    }>;
    extraCosts: Array<{ id: number; type: RecipeCostType; name: string; amount: Prisma.Decimal }>;
  }) {
    return {
      id: recipe.id,
      productId: recipe.productId,
      shopMarginPercent: Number(recipe.shopMarginPercent),
      siteMarginPercent: Number(recipe.siteMarginPercent),
      marketplaceMarginPercent: Number(recipe.marketplaceMarginPercent),
      shippingCost: Number(recipe.shippingCost),
      vatPercent: Number(recipe.vatPercent),
      items: recipe.items.map((item) => ({
        id: item.id,
        stockCardId: item.stockCardId,
        quantity: Number(item.quantity),
        unit: item.unit,
        stockCard: {
          ...item.stockCard,
          purchasePrice: Number(item.stockCard.purchasePrice),
          packageContent: Number(item.stockCard.packageContent),
          automaticUnitCost: Number(item.stockCard.automaticUnitCost),
          stockQuantity: Number(item.stockCard.stockQuantity),
        },
        lineTotal: this.round(Number(item.quantity) * this.stockUnitCost(item.stockCard)),
        warning: this.stockCostWarning(item.stockCard),
      })),
      extraCosts: recipe.extraCosts.map((item) => ({
        ...item,
        amount: Number(item.amount),
      })),
    };
  }

  private normalize(payload: unknown): RecipePayload {
    const body = (payload ?? {}) as RecipePayload;
    return {
      shopMarginPercent: this.numberOrDefault(body.shopMarginPercent, 30),
      siteMarginPercent: this.numberOrDefault(body.siteMarginPercent, 45),
      marketplaceMarginPercent: this.numberOrDefault(body.marketplaceMarginPercent, 65),
      shippingCost: this.numberOrDefault(body.shippingCost, 0),
      vatPercent: this.numberOrDefault(body.vatPercent, 20),
      items: (body.items ?? []).map((item) => ({
        stockCardId: Number(item.stockCardId),
        quantity: this.numberOrDefault(item.quantity, 0),
        unit: String(item.unit ?? '').trim(),
      })),
      extraCosts: (body.extraCosts ?? []).map((item) => ({
        type: this.validCostType(item.type),
        name: String(item.name ?? '').trim(),
        amount: this.numberOrDefault(item.amount, 0),
      })),
    };
  }

  private validCostType(value: unknown): RecipeCostType {
    const allowed: RecipeCostType[] = ['LABOR', 'ELECTRICITY', 'SILICONE', 'PACKAGING', 'SHIPPING', 'OTHER'];
    return allowed.includes(value as RecipeCostType) ? (value as RecipeCostType) : 'OTHER';
  }

  private numberOrDefault(value: unknown, fallback: number) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private applyMargin(cost: number, marginPercent: number) {
    return this.round(cost * (1 + marginPercent / 100));
  }

  private emptyCalculation() {
    return {
      componentTotal: 0,
      extraTotal: 0,
      totalCost: 0,
      shopPrice: 0,
      sitePrice: 0,
      marketplacePrice: 0,
      warnings: [],
    };
  }

  private stockUnitCost(stockCard: { purchasePrice: Prisma.Decimal; packageContent: Prisma.Decimal; automaticUnitCost: Prisma.Decimal }) {
    const stored = Number(stockCard.automaticUnitCost);
    if (stored > 0) return stored;
    const packageContent = Number(stockCard.packageContent);
    if (Number(stockCard.purchasePrice) > 0 && packageContent > 0) {
      return Number(stockCard.purchasePrice) / packageContent;
    }
    return 0;
  }

  private stockCostWarning(stockCard: { purchasePrice: Prisma.Decimal; packageContent: Prisma.Decimal }) {
    if (Number(stockCard.purchasePrice) <= 0 || Number(stockCard.packageContent) <= 0) {
      return 'Stok kartında maliyet bilgisi eksik';
    }
    return null;
  }

  private stockWarnings(stockCards: Array<{ purchasePrice: Prisma.Decimal; packageContent: Prisma.Decimal }>) {
    return stockCards
      .filter((stockCard) => this.stockCostWarning(stockCard))
      .map(() => 'Stok kartında maliyet bilgisi eksik');
  }

  private round(value: number) {
    return Math.round(value * 100) / 100;
  }
}
