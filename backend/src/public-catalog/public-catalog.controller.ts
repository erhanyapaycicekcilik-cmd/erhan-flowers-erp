import { Controller, Get, NotFoundException, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { PublicCatalogService } from './public-catalog.service';

// AuthGuard YOK — herkese açık müşteri kataloğu
@Controller('public/catalog')
export class PublicCatalogController {
  constructor(private readonly catalog: PublicCatalogService) {}

  @Get('categories')
  listCategories() {
    return this.catalog.listCategories();
  }

  @Get('products')
  listProducts(
    @Query('category') category?: string,
    @Query('q') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: 'price_asc' | 'price_desc' | 'newest' | 'name',
  ) {
    return this.catalog.listProducts({
      categorySlug: category,
      search,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 48,
      sort,
    });
  }

  @Get('products/slug/:slug')
  async getProductBySlug(@Param('slug') slug: string) {
    const product = await this.catalog.getProductBySlug(slug);
    if (!product) throw new NotFoundException('Ürün bulunamadı.');
    return product;
  }

  @Get('products/:id')
  async getProductById(@Param('id') id: string) {
    const product = await this.catalog.getProductById(Number(id));
    if (!product) throw new NotFoundException('Ürün bulunamadı.');
    return product;
  }

  // Dükkan barkod okutma — sadece shopPrice döner
  @Get('shop-price/:barcode')
  async getShopPrice(@Param('barcode') barcode: string) {
    const result = await this.catalog.getShopPrice(barcode);
    if (!result) throw new NotFoundException('Barkod bulunamadı.');
    return result;
  }

  // Admin: Trendyol'dan sitePrice toplu senkronize et (korumalı endpoint)
  @Post('admin/sync-site-prices')
  @UseGuards(AuthGuard)
  syncSitePrices() {
    return this.catalog.bulkSyncSitePriceFromTrendyol();
  }
}
