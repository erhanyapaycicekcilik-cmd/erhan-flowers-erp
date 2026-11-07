import {
  BadRequestException, Body, Controller, Delete, Get,
  NotFoundException, Param, Post, Put, Query,
} from '@nestjs/common';
import { ProductGroupsService } from './product-groups.service';

@Controller('public/catalog/groups')
export class ProductGroupsController {
  constructor(private readonly svc: ProductGroupsService) {}

  // ─── Public ───────────────────────────────────────────────────────────────

  @Get()
  listGroups(@Query('category') category?: string) {
    return this.svc.listGroups(category);
  }

  @Get(':slug')
  async getGroup(@Param('slug') slug: string) {
    const g = await this.svc.getGroupBySlug(slug);
    if (!g) throw new NotFoundException('Grup bulunamadı.');
    return g;
  }

  // ─── Admin (secret korumalı) ──────────────────────────────────────────────

  private checkSecret(secret: string | undefined) {
    const expected = process.env.REVALIDATE_SECRET || 'dev-secret-local';
    if (secret !== expected) throw new BadRequestException('Unauthorized');
  }

  @Get('admin/list')
  adminList(@Query('secret') secret?: string) {
    this.checkSecret(secret);
    return this.svc.adminListGroups();
  }

  @Get('admin/:id')
  async adminGet(@Param('id') id: string, @Query('secret') secret?: string) {
    this.checkSecret(secret);
    const g = await this.svc.adminGetGroup(Number(id));
    if (!g) throw new NotFoundException();
    return g;
  }

  @Post('admin/create')
  createGroup(
    @Query('secret') secret: string,
    @Body() body: { name: string; description?: string; mainImage?: string; category?: string; subCategory?: string; sortOrder?: number },
  ) {
    this.checkSecret(secret);
    if (!body.name) throw new BadRequestException('name gerekli');
    return this.svc.createGroup(body);
  }

  @Put('admin/:id')
  updateGroup(
    @Param('id') id: string,
    @Query('secret') secret: string,
    @Body() body: { name?: string; description?: string | null; mainImage?: string | null; category?: string | null; subCategory?: string | null; isActive?: boolean; sortOrder?: number },
  ) {
    this.checkSecret(secret);
    return this.svc.updateGroup(Number(id), body);
  }

  @Delete('admin/:id')
  deleteGroup(@Param('id') id: string, @Query('secret') secret: string) {
    this.checkSecret(secret);
    return this.svc.deleteGroup(Number(id));
  }

  @Post('admin/:id/variants')
  addVariant(
    @Param('id') id: string,
    @Query('secret') secret: string,
    @Body() body: { sizeLabel?: string; potLabel?: string; potImage?: string; productId?: number | null; trendyolVariantId?: number | null; priceOverride?: number | null; sortOrder?: number },
  ) {
    this.checkSecret(secret);
    return this.svc.addVariant(Number(id), body);
  }

  @Put('admin/variants/:variantId')
  updateVariant(
    @Param('variantId') variantId: string,
    @Query('secret') secret: string,
    @Body() body: { sizeLabel?: string | null; potLabel?: string | null; potImage?: string | null; productId?: number | null; trendyolVariantId?: number | null; priceOverride?: number | null; isActive?: boolean; sortOrder?: number },
  ) {
    this.checkSecret(secret);
    return this.svc.updateVariant(Number(variantId), body);
  }

  @Delete('admin/variants/:variantId')
  deleteVariant(@Param('variantId') variantId: string, @Query('secret') secret: string) {
    this.checkSecret(secret);
    return this.svc.deleteVariant(Number(variantId));
  }

  @Get('admin/search/products')
  searchProducts(@Query('q') q: string, @Query('secret') secret?: string) {
    this.checkSecret(secret);
    if (!q?.trim()) return { products: [], variants: [] };
    return this.svc.searchProductsForGroup(q);
  }
}
