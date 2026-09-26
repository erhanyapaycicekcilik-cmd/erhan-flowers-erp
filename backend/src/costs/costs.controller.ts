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

  /**
   * Reçete kaydedilince hesaplanan sitePrice ürüne yazılır,
   * ürün ACTIVE yapılır ve florayapay sitesi anında revalidate edilir.
   */
  @Post('products/:productId/recipe')
  async saveRecipe(@Param('productId') productId: string, @Body() body: unknown) {
    const result = await this.costs.saveRecipe(Number(productId), body);

    if (result?.costs?.sitePrice > 0) {
      const updated = await this.prisma.product.update({
        where: { id: Number(productId) },
        data: {
          sitePrice: result.costs.sitePrice,
          shopPrice: result.costs.shopPrice,
          marketPrice: result.costs.marketplacePrice,
          status: 'ACTIVE',
        },
        select: { barcode: true, modelCode: true, marketPrice: true, shopPrice: true, stockQuantity: true },
      });

      // Platformlara fiyat gönder (arka planda)
      void this.products.broadcastPriceStockPublic({
        barcode: updated.barcode,
        modelCode: updated.modelCode,
        marketPrice: updated.marketPrice,
        shopPrice: updated.shopPrice,
        stockQuantity: updated.stockQuantity,
      });

      // Siteyi arka planda revalidate et (hata olursa sessizce geç)
      void this.trendyolSync.revalidateSite();
    }

    return result;
  }
}
