import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { OwnerGuard } from '../auth/owner.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { TrendyolProductSyncService } from '../public-catalog/trendyol-product-sync.service';
import { CostsService } from './costs.service';

@UseGuards(AuthGuard, OwnerGuard)
@Controller('costs')
export class CostsController {
  constructor(
    private readonly costs: CostsService,
    private readonly prisma: PrismaService,
    private readonly trendyolSync: TrendyolProductSyncService,
    private readonly products: ProductsService,
  ) {}

  @Get('products')
  listProducts() {
    return this.costs.listProductCosts();
  }

  @Get('products/:productId')
  getRecipe(@Param('productId') productId: string) {
    return this.costs.getProductRecipe(Number(productId));
  }

  @Post('products/:productId/recipe')
  async saveRecipe(@Param('productId') productId: string, @Body() body: unknown) {
    const b = (body ?? {}) as Record<string, unknown>;
    const productName = typeof b.productName === 'string' ? b.productName.trim() : null;
    const description = typeof b.description === 'string' ? b.description.trim() : null;

    const result = await this.costs.saveRecipe(Number(productId), body);

    // Ürün adı / açıklaması güncelleme
    const nameUpdateData: Record<string, unknown> = {};
    if (productName) nameUpdateData.productName = productName;
    if (description !== null) nameUpdateData.description = description;

    if (result?.costs?.sitePrice > 0) {
      const updated = await this.prisma.product.update({
        where: { id: Number(productId) },
        data: {
          ...nameUpdateData,
          sitePrice: result.costs.sitePrice,
          shopPrice: result.costs.shopPrice,
          marketPrice: result.costs.marketplacePrice,
          status: 'ACTIVE',
        },
        select: { barcode: true, modelCode: true, marketPrice: true, shopPrice: true, stockQuantity: true, productName: true, description: true },
      });

      void this.products.broadcastPriceStockPublic({
        barcode: updated.barcode,
        modelCode: updated.modelCode,
        marketPrice: updated.marketPrice,
        shopPrice: updated.shopPrice,
        stockQuantity: updated.stockQuantity,
      });

      void this.trendyolSync.revalidateSite();
    } else if (Object.keys(nameUpdateData).length > 0) {
      // Fiyat yoksa sadece ad/açıklama güncelle
      await this.prisma.product.update({
        where: { id: Number(productId) },
        data: nameUpdateData,
      });
    }

    return result;
  }
}
