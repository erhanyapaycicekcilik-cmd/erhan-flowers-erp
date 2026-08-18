import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { PublicCatalogService } from './public-catalog.service';

// Bilinçli olarak AuthGuard YOK — bu controller sitenin herkese açık
// ürün kataloğu için, giriş yapmamış ziyaretçiler tarafından çağrılır.
@Controller('public/catalog')
export class PublicCatalogController {
  constructor(private readonly catalog: PublicCatalogService) {}

  @Get('categories')
  listCategories() {
    return this.catalog.listCategories();
  }

  @Get('products')
  listProducts(@Query('category') category?: string) {
    return this.catalog.listProducts(category);
  }

  @Get('products/:id')
  async getProduct(@Param('id') id: string) {
    const product = await this.catalog.getProduct(Number(id));
    if (!product) throw new NotFoundException('Ürün bulunamadı.');
    return product;
  }
}
