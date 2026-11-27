import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { InternalKeyGuard } from '../auth/internal-key.guard';
import { OwnerGuard } from '../auth/owner.guard';
import { GeminiContentService } from './gemini-content.service';
import { ProductsService } from './products.service';
import { BulkPriceParams, BulkPriceService } from './bulk-price.service';
import { SharedStockService } from './shared-stock.service';
import { TrendyolProductSyncService } from '../public-catalog/trendyol-product-sync.service';

@UseGuards(AuthGuard)
@Controller('products')
export class ProductsController {
  constructor(
    private readonly products: ProductsService,
    private readonly geminiContent: GeminiContentService,
    private readonly trendyolSync: TrendyolProductSyncService,
    private readonly bulkPrice: BulkPriceService,
    private readonly sharedStock: SharedStockService,
  ) {}

  @Get()
  list() {
    return this.products.list();
  }

  @Get('export-excel')
  async exportExcel(@Query('platform') platform: string = 'GENEL', @Res() res: Response) {
    const buffer = await this.products.exportExcel(platform);
    const filename = `urunler-${platform.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @Get('export-excel-by-category')
  async exportExcelByCategory(@Res() res: Response) {
    const buffer = await this.products.exportExcelByCategory();
    const filename = `urunler-9-kategori-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @Post()
  create(@Body() body: unknown) {
    return this.products.create(body);
  }

  @Post('gemini-seo')
  generateSeoContent(@Body() body: unknown) {
    return this.geminiContent.generate(body);
  }

  @Post('gemini-reference-search')
  generateReferenceSearch(@Body() body: unknown) {
    return this.geminiContent.generateReferenceSearch(body);
  }

  @Post('barcode')
  generateBarcode(@Body() body: unknown) {
    return this.products.generateBarcode(body);
  }

  @Post('identity-check')
  checkIdentity(@Body() body: unknown) {
    return this.products.checkIdentity(body);
  }

  // ─── Ortak stok (Erhan + Flora aynı depo, ilan adedi reçeteden) ───────────
  @UseGuards(OwnerGuard)
  @Get('shared-stock/settings')
  sharedStockSettings() {
    return this.sharedStock.getSettings();
  }

  @UseGuards(OwnerGuard)
  @Post('shared-stock/settings')
  sharedStockUpdateSettings(@Body() body: { mode?: 'OFF' | 'PREVIEW' | 'ON'; buffer?: number }) {
    return this.sharedStock.updateSettings(body);
  }

  @UseGuards(OwnerGuard)
  @Get('shared-stock/preview')
  sharedStockPreview(@Query('store') store?: string, @Query('onlyChanged') onlyChanged?: string, @Query('q') q?: string) {
    return this.sharedStock.preview({ store, onlyChanged: onlyChanged === '1' || onlyChanged === 'true', search: q });
  }

  @UseGuards(OwnerGuard)
  @Post('shared-stock/run')
  sharedStockRun() {
    return this.sharedStock.runNow();
  }

  // ─── Toplu zam / indirim (Trendyol ürünleri → tüm pazaryerleri) ───────────
  @UseGuards(OwnerGuard)
  @Post('bulk-price/preview')
  bulkPricePreview(@Body() body: BulkPriceParams) {
    return this.bulkPrice.preview(body);
  }

  @UseGuards(OwnerGuard)
  @Post('bulk-price/apply')
  bulkPriceApply(@Body() body: BulkPriceParams & { variantIds?: number[] }) {
    return this.bulkPrice.apply(body);
  }

  @UseGuards(OwnerGuard)
  @Get('bulk-price/status')
  async bulkPriceStatus() {
    return { job: this.bulkPrice.status(), lastUndo: await this.bulkPrice.lastUndo() };
  }

  @UseGuards(OwnerGuard)
  @Post('bulk-price/undo')
  bulkPriceUndo() {
    return this.bulkPrice.undo();
  }

  @Post('broadcast-all')
  broadcastAll() {
    // Run in background to avoid gateway timeout on large catalogs
    this.products.broadcastAll().catch(() => {});
    return { started: true, message: 'Toplu yayın arka planda başlatıldı' };
  }

  @Post('send-to-pazarama')
  @UseGuards(OwnerGuard)
  sendToPazarama() {
    return this.products.sendToPazarama();
  }

  @Post('broadcast-images-all')
  @UseGuards(OwnerGuard)
  broadcastImagesAll() {
    return this.products.broadcastImagesAll();
  }

  @Post('sync-from-trendyol')
  @UseGuards(OwnerGuard)
  syncFromTrendyol() {
    return this.products.syncFromTrendyol();
  }

  @Post('trendyol-full-sync')
  @UseGuards(OwnerGuard)
  async trendyolFullSync() {
    const syncResult = await this.trendyolSync.syncNow();
    const broadcastResult = await this.products.broadcastAll();
    return { ...syncResult, broadcast: broadcastResult };
  }

  @Post(':id/broadcast-images')
  @UseGuards(OwnerGuard)
  broadcastImages(@Param('id') id: string) {
    return this.products.broadcastImages(Number(id));
  }

  @Post('bulk-set-model-codes')
  bulkSetModelCodes(@Body() body: { items: { barcode: string; modelCode: string }[] }) {
    return this.products.bulkSetModelCodes(body.items);
  }

  @Post('backfill-cost-drafts')
  backfillCostDrafts() {
    return this.products.backfillCostDrafts();
  }

  @Post('backfill-site-price')
  @UseGuards(OwnerGuard)
  backfillSitePrice() {
    return this.products.backfillSitePrice();
  }

  @Post('import-prices-excel')
  @UseGuards(OwnerGuard)
  @UseInterceptors(FileInterceptor('file'))
  async importPricesExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('Dosya yüklenmedi');
    return this.products.importPricesFromExcel(file.buffer);
  }

  @Post('parse-excel-preview')
  @UseInterceptors(FileInterceptor('file'))
  async parseExcelPreview(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('Dosya yüklenmedi');
    return this.products.parseExcelPreview(file.buffer);
  }

  @Post('import-trendyol-excel')
  @UseInterceptors(FileInterceptor('file'))
  async importTrendyolExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('Dosya yüklenmedi');
    return this.products.importTrendyolExcel(file.buffer);
  }

  @Post('import-from-excel-with-categories')
  @UseInterceptors(FileInterceptor('file'))
  async importFromExcelWithCategories(
    @UploadedFile() file: Express.Multer.File,
    @Body('assignments') assignmentsJson: string,
  ) {
    if (!file) throw new Error('Dosya yüklenmedi');
    const assignments = JSON.parse(assignmentsJson ?? '[]') as Array<{ rowIndex: number; categoryId: number }>;
    return this.products.importFromExcelWithCategories(file.buffer, assignments);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.products.update(Number(id), body);
  }

  @Patch(':id/passive')
  passive(@Param('id') id: string) {
    return this.products.passive(Number(id));
  }

}
