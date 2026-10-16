import { BadRequestException, Body, Controller, Get, Header, NotFoundException, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';

import { AuthGuard } from '../auth/auth.guard';
import { PublicCatalogService } from './public-catalog.service';
import { TrendyolProductSyncService } from './trendyol-product-sync.service';

// AuthGuard YOK — herkese açık müşteri kataloğu
@Controller('public/catalog')
export class PublicCatalogController {
  constructor(
    private readonly catalog: PublicCatalogService,
    private readonly trendyolSync: TrendyolProductSyncService,
  ) {}

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

  // Fotoğrafla fiyat sorgulama — Gemini görsel tanıma ile ürün ara (şifresiz, mobil kullanımı)
  @Post('price-lookup')
  async priceLookup(@Body() body: { imageBase64?: string; mimeType?: string }) {
    if (!body.imageBase64) throw new BadRequestException('imageBase64 gerekli.');
    const mimeType = body.mimeType || 'image/jpeg';
    return this.catalog.lookupByImage(body.imageBase64, mimeType);
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

  // Admin: Ürün adına göre otomatik kategori ataması
  // Bambu → Bambu, Sarmaşık → Sarmaşık, Ağaç → Yapay Ağaç Yeşil vb.
  @Post('admin/recategorize')
  recategorizeByName(@Query('secret') secret?: string) {
    const expected = process.env.REVALIDATE_SECRET || 'dev-secret-local';
    if (secret !== expected) return { error: 'Unauthorized' };
    return this.catalog.recategorizeByName();
  }

  // Admin: Tüm onaylı maliyetleri sitePrice'a toplu yansıt
  @Post('admin/bulk-sync-site-price')
  bulkSyncSitePrice(@Query('secret') secret?: string) {
    const expected = process.env.REVALIDATE_SECRET || 'dev-secret-local';
    if (secret !== expected) return { error: 'Unauthorized' };
    return this.catalog.bulkSyncSitePriceFromApprovedCosts();
  }

  // Admin: Trendyol ürünlerini anında çek
  // REVALIDATE_SECRET ile korunur — JWT gerekmez, florayapay admin panelinden çağrılabilir
  @Post('admin/trendyol-sync')
  runTrendyolSync(@Query('secret') secret?: string) {
    const expected = process.env.REVALIDATE_SECRET || 'dev-secret-local';
    if (secret !== expected) {
      return { error: 'Unauthorized' };
    }
    return this.trendyolSync.syncNow();
  }

  // Meta/WhatsApp Commerce Manager ürün kataloğu feed'i (CSV)
  @Get('meta-feed')
  async metaCatalogFeed(@Res() res: Response) {
    const siteUrl = process.env.SITE_URL || 'https://www.erhanflowers.com';
    const { products } = await this.catalog.listProducts({ limit: 2000, page: 1 });

    const escapeCsv = (v: string | number | null | undefined) => {
      const s = String(v ?? '');
      return s.includes('"') || s.includes(',') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const headers = ['id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link', 'brand', 'retailer_id'];
    const rows = (products as any[])
      .filter((p) => p.mainImage && p.sitePrice > 0)
      .map((p) => [
        escapeCsv(p.id),
        escapeCsv(p.name),
        escapeCsv(p.description || p.name),
        escapeCsv(p.inStock ? 'in stock' : 'out of stock'),
        'new',
        escapeCsv(`${Number(p.sitePrice).toFixed(2)} TRY`),
        escapeCsv(`${siteUrl}/urun/${p.slug}`),
        escapeCsv(p.mainImage),
        escapeCsv(p.brand || 'Flora Yapay Çiçek'),
        escapeCsv(p.modelCode || p.id),
      ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    res.setHeader('Content-Disposition', 'inline; filename="meta-catalog.csv"');
    res.send(csv);
  }
}
