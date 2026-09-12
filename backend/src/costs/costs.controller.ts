import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { OwnerGuard } from '../auth/owner.guard';
import { PrismaService } from '../prisma/prisma.service';
import { TrendyolProductSyncService } from '../public-catalog/trendyol-product-sync.service';
import { CostsService } from './costs.service';

@UseGuards(AuthGuard, OwnerGuard)
@Controller('costs')
export class CostsController {
  constructor(
    private readonly costs: CostsService,
    private readonly prisma: PrismaService,
    private readonly trendyolSync: TrendyolProductSyncService,
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
      await this.prisma.product.update({
        where: { id: Number(productId) },
        data: {
          sitePrice: result.costs.sitePrice,
          shopPrice: result.costs.shopPrice,
          marketPrice: result.costs.marketplacePrice,
          status: 'ACTIVE',
        },
      });

      // Siteyi arka planda revalidate et (hata olursa sessizce geç)
      void this.trendyolSync.revalidateSite();
    }

    return result;
  }
}
