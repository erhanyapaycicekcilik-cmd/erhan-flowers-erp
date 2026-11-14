import { BadRequestException, Body, Controller, Get, Header, NotFoundException, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';

import { isValidAdminSecret } from '../common/admin-secret';
import { AuthGuard } from '../auth/auth.guard';
import { PublicCatalogService } from './public-catalog.service';
import { TrendyolProductSyncService } from './trendyol-product-sync.service';
import { SiteSettingsService } from '../site-settings/site-settings.service';

// AuthGuard YOK — herkese açık müşteri kataloğu
@Controller('public/catalog')
export class PublicCatalogController {
  constructor(
    private readonly catalog: PublicCatalogService,
    private readonly trendyolSync: TrendyolProductSyncService,
    private readonly siteSettings: SiteSettingsService,
  ) {}

  @Get('settings')
  getSiteSettings() {
    return this.siteSettings.getAll();
  }

  @Get('categories')
  listCategories() {
    return this.catalog.listCategories();
  }

  @Get('subcategories')
  listSubCategories(@Query('category') category: string) {
    return this.catalog.listSubCategories(category);
  }

  @Get('products')
  listProducts(
    @Query('category') category?: string,
    @Query('subcategory') subcategory?: string,
    @Query('q') search?: string,
    @Query('barcode') barcode?: string,
    @Query('modelCode') modelCode?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: 'price_asc' | 'price_desc' | 'newest' | 'name',
  ) {
    return this.catalog.listProducts({
      categorySlug: category,
      subCategorySlug: subcategory,
      search,
      barcode,
      modelCode,
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
  @Post('admin/recategorize')
  recategorizeByName(@Query('secret') secret?: string) {
    if (!isValidAdminSecret(secret)) return { error: 'Unauthorized' };
    return this.catalog.recategorizeByName();
  }

  // Admin: Tüm onaylı maliyetleri sitePrice'a toplu yansıt
  @Post('admin/bulk-sync-site-price')
  bulkSyncSitePrice(@Query('secret') secret?: string) {
    if (!isValidAdminSecret(secret)) return { error: 'Unauthorized' };
    return this.catalog.bulkSyncSitePriceFromApprovedCosts();
  }

  // Admin: Toplu fiyat güncelleme — ürün adındaki kelimeye göre zam/indirim
  // dryRun: true → sadece önizleme, DB'ye yazmaz
  @Post('admin/bulk-price-adjust')
  async bulkPriceAdjust(
    @Query('secret') secret: string,
    @Body() body: { search: string; changePercent: number; dryRun?: boolean },
  ) {
    if (!isValidAdminSecret(secret)) return { error: 'Unauthorized' };
    if (!body.search?.trim()) throw new BadRequestException('search gerekli.');
    if (typeof body.changePercent !== 'number') throw new BadRequestException('changePercent sayı olmalı.');
    return this.catalog.bulkPriceAdjust({
      search: body.search,
      changePercent: body.changePercent,
      dryRun: body.dryRun ?? false,
    });
  }

  // Admin: Trendyol ürünlerini anında çek
  @Post('admin/trendyol-sync')
  runTrendyolSync(@Query('secret') secret?: string) {
    if (!isValidAdminSecret(secret)) {
      return { error: 'Unauthorized' };
    }
    return this.trendyolSync.syncNow();
  }

  // Admin: Ürün kategorisi güncelle
  @Post('admin/set-category')
  async setCategory(
    @Query('secret') secret: string,
    @Body() body: { productId: number; category: string; subCategory?: string | null },
  ) {
    if (!isValidAdminSecret(secret)) return { error: 'Unauthorized' };
    if (!body.productId || !body.category) throw new BadRequestException('productId ve category gerekli.');
    return this.catalog.setCategory(body.productId, body.category, body.subCategory ?? null);
  }

  @Post('admin/products')
  async createProduct(
    @Query('secret') secret: string,
    @Body() body: {
      name: string; modelCode?: string; sitePrice: number; originalPrice?: number;
      brand?: string; description?: string; origin?: string; vatRate?: number;
      warrantyMonths?: number; inStock?: boolean; images?: string[]; videoUrl?: string | null;
    },
  ) {
    if (!isValidAdminSecret(secret)) return { error: 'Unauthorized' };
    if (!body.name || !body.sitePrice) throw new BadRequestException('name ve sitePrice gerekli.');
    return this.catalog.createProduct(body);
  }

  @Post('admin/set-video')
  async setVideo(
    @Query('secret') secret: string,
    @Body() body: { productId: number; videoUrl: string | null },
  ) {
    if (!isValidAdminSecret(secret)) return { error: 'Unauthorized' };
    if (!body.productId) throw new BadRequestException('productId gerekli.');
    return this.catalog.setVideo(body.productId, body.videoUrl ?? null);
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

    const fileBase = (
      process.env.PUBLIC_FILE_BASE_URL ||
      process.env.PUBLIC_IMAGE_BASE_URL ||
      process.env.BACKEND_PUBLIC_URL ||
      'https://api.erhanflowers.com'
    ).trim().replace(/\/+$/, '');
    const absUrl = (u: string | null | undefined) => {
      const s = String(u ?? '').trim();
      if (!s) return '';
      if (/^https?:\/\//i.test(s)) return s;
      if (s.startsWith('//')) return `https:${s}`;
      return `${fileBase}/${s.replace(/^\/+/, '')}`;
    };

    const headers = ['id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link', 'additional_image_link', 'brand', 'product_type', 'retailer_id'];
    const rows = (products as any[])
      .filter((p) => absUrl(p.mainImage) && Number(p.sitePrice) > 0)
      .map((p) => {
        const images: string[] = (Array.isArray(p.images) ? p.images : []).map(absUrl).filter(Boolean);
        const mainImage = absUrl(p.mainImage);
        const extraImages = images.filter((u) => u !== mainImage).slice(0, 10);
        return [
          escapeCsv(p.id),
          escapeCsv(String(p.name ?? '').slice(0, 200)),
          escapeCsv(String(p.description || p.name || '').slice(0, 9999)),
          escapeCsv(p.inStock ? 'in stock' : 'out of stock'),
          'new',
          escapeCsv(`${Number(p.sitePrice).toFixed(2)} TRY`),
          escapeCsv(`${siteUrl}/urun/${p.slug}`),
          escapeCsv(mainImage),
          escapeCsv(extraImages.join(',')),
          escapeCsv(p.brand || 'Erhan Flowers'),
          escapeCsv(p.category || ''),
          escapeCsv(p.modelCode || p.id),
        ].join(',');
      });

    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    res.setHeader('Content-Disposition', 'inline; filename="meta-catalog.csv"');
    res.send(csv);
  }
}
