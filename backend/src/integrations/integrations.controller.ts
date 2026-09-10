import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '../auth/auth.guard';
import { OwnerGuard } from '../auth/owner.guard';
import { IntegrationCenterService } from './services/integration-center.service';
import { IntegrationsService } from './integrations.service';
import { OrderSyncService } from './services/order-sync.service';
import { GmailOrderService } from './services/gmail-order.service';
import { HepsiburadaSyncService, HbStockItem, HbPriceItem } from './services/hepsiburada-sync.service';

type AuthenticatedRequest = Request & { user?: { id: number; role: string } };

@UseGuards(AuthGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly integrations: IntegrationsService,
    private readonly integrationCenter: IntegrationCenterService,
    private readonly orderSync: OrderSyncService,
    private readonly gmailOrder: GmailOrderService,
    private readonly hbSync: HepsiburadaSyncService,
  ) {}

  @Get('connections')
  connections() {
    return this.integrations.listConnections();
  }

  @Get('ticimax')
  ticimaxSettings(@Query('tenant') tenant?: string) {
    return this.integrations.getTicimaxSettings(tenant);
  }

  @Put('ticimax')
  @UseGuards(OwnerGuard)
  saveTicimaxSettings(@Body() body: unknown) {
    return this.integrations.saveTicimaxSettings(body as Record<string, unknown>);
  }

  @Post('ticimax/test')
  @UseGuards(OwnerGuard)
  testTicimaxSettings(@Body() body: { tenant?: string }) {
    return this.integrations.testTicimaxSettings(body?.tenant);
  }

  @Post('connections/:platform/test')
  @UseGuards(OwnerGuard)
  test(@Param('platform') platform: string) {
    return this.integrations.testConnection(platform);
  }

  @Post('orders/:platform/sync')
  @UseGuards(OwnerGuard)
  syncOrders(@Param('platform') platform: string, @Req() request: AuthenticatedRequest) {
    return this.integrations.syncOrders(platform, request.user!.id);
  }

  @Post('orders/:platform/excel-import')
  @UseGuards(OwnerGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } }))
  importOrderExcel(@Param('platform') platform: string, @UploadedFile() file: Express.Multer.File | undefined, @Req() request: AuthenticatedRequest) {
    return this.integrations.importOrderExcel(platform, file, request.user!.id);
  }

  @Get('orders/summary')
  orderSummary(@Query('platform') platform?: string) {
    return this.integrations.orderSummary(platform);
  }

  @Post('orders/:platform/package-status')
  @UseGuards(OwnerGuard)
  updatePackageStatus(@Param('platform') platform: string, @Body() body: { shipmentPackageId?: string; status?: string; lines?: Array<{ lineId: number; quantity: number }>; trackingNumber?: string; cargoProviderId?: number }) {
    return this.integrations.updatePackageStatus(platform, body);
  }

  @Get('products/:platform/panel-link/:barcode')
  @UseGuards(OwnerGuard)
  getSellerPanelLink(@Param('platform') platform: string, @Param('barcode') barcode: string) {
    return this.integrations.getSellerPanelLink(platform, barcode);
  }

  @Get('products/:platform/batch-status/:batchRequestId')
  @UseGuards(OwnerGuard)
  checkBatchStatus(@Param('platform') platform: string, @Param('batchRequestId') batchRequestId: string) {
    return this.integrations.checkBatchStatus(platform, batchRequestId);
  }

  @Post('products/:platform/price')
  @UseGuards(OwnerGuard)
  pushPrice(@Param('platform') platform: string, @Body() body: { barcode?: string; salePrice?: number; listPrice?: number; stockQuantity?: number }) {
    return this.integrations.pushPrice(platform, body);
  }

  @Get('orders')
  orders(@Query() query: Record<string, string>) {
    return this.integrations.listOrders(query);
  }

  @Get('operations')
  operations() {
    return this.integrations.operationsSummary();
  }

  @Get('history')
  history() {
    return this.integrations.listLogs();
  }

  @Get('errors')
  errors() {
    return this.integrations.listLogs('FAILED');
  }

  @Get('channels')
  channels() {
    return this.integrationCenter.listChannels();
  }

  @Get('accounts')
  accounts() {
    return this.integrationCenter.listAccounts();
  }

  @Get('platform-settings')
  platformSettings(@Query('company') company?: string) {
    return this.integrationCenter.listPlatformSettings(company || 'ERHAN');
  }

  @Put('platform-settings/:platform')
  @UseGuards(OwnerGuard)
  savePlatformSettings(@Param('platform') platform: string, @Query('company') company: string, @Body() body: unknown) {
    return this.integrationCenter.savePlatformSettings({ ...(body as Record<string, unknown>), platform, companyCode: company || 'ERHAN' });
  }

  @Post('platform-settings/analyze-screenshot')
  @UseGuards(OwnerGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } }))
  analyzeScreenshot(@UploadedFile() file?: Express.Multer.File) {
    return this.integrationCenter.analyzeCredentialScreenshot(file);
  }

  @Post('accounts')
  @UseGuards(OwnerGuard)
  createAccount(@Body() body: unknown) {
    return this.integrationCenter.createAccount(body as Record<string, unknown>);
  }

  @Patch('accounts/:id')
  @UseGuards(OwnerGuard)
  updateAccount(@Param('id') id: string, @Body() body: unknown) {
    return this.integrationCenter.updateAccount(Number(id), body as Record<string, unknown>);
  }

  @Post('accounts/:id/credentials')
  @UseGuards(OwnerGuard)
  addCredential(@Param('id') id: string, @Body() body: unknown) {
    return this.integrationCenter.addCredential(Number(id), body as Record<string, unknown>);
  }

  @Post('accounts/:id/test')
  @UseGuards(OwnerGuard)
  testAccount(@Param('id') id: string) {
    return this.integrationCenter.testAccount(Number(id));
  }

  @Get('product-mappings')
  productMappings() {
    return this.integrationCenter.listProductMappings();
  }

  @Post('product-mappings')
  @UseGuards(OwnerGuard)
  createProductMapping(@Body() body: unknown) {
    return this.integrationCenter.createProductMapping(body as Record<string, unknown>);
  }

  @Post('dry-run/product')
  @UseGuards(OwnerGuard)
  dryRunProduct(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.integrationCenter.dryRunProduct(body as Record<string, unknown>, request.user!.id);
  }

  @Get('sync-jobs')
  syncJobs() {
    return this.integrationCenter.listSyncJobs();
  }

  @Get('sync-jobs/:id')
  syncJob(@Param('id') id: string) {
    return this.integrationCenter.getSyncJob(Number(id));
  }

  @Post('orders/sync')
  @UseGuards(OwnerGuard)
  triggerOrderSync() {
    return this.orderSync.runSync();
  }

  @Get('sku-mappings/unmatched')
  unmatchedSkus(@Query('platform') platform?: string) {
    return this.orderSync.getUnmatchedSkus(platform ?? 'TRENDYOL');
  }

  @Get('sku-mappings')
  listSkuMappings(@Query('platform') platform?: string) {
    return this.orderSync.listSkuMappings(platform ?? 'TRENDYOL');
  }

  @Post('sku-mappings')
  @UseGuards(OwnerGuard)
  saveSkuMapping(@Body() body: { platform: string; externalSku: string; externalBarcode?: string; stockCardId: number }) {
    return this.orderSync.saveSkuMapping(body);
  }

  @Post('sku-mappings/apply-retroactive')
  @UseGuards(OwnerGuard)
  applyRetroactiveMappings() {
    return this.orderSync.applyRetroactiveMappings();
  }

  @Get('sku-components')
  listSkuComponents(@Query('platform') platform: string, @Query('sku') sku: string) {
    return this.orderSync.listSkuComponents(platform ?? 'TRENDYOL', sku);
  }

  @Post('sku-components')
  @UseGuards(OwnerGuard)
  saveSkuComponent(@Body() body: { platform: string; externalSku: string; stockCardId: number; quantity: number }) {
    return this.orderSync.saveSkuComponent(body);
  }

  @Post('sku-components/delete')
  @UseGuards(OwnerGuard)
  deleteSkuComponent(@Body() body: { platform: string; externalSku: string; stockCardId: number }) {
    return this.orderSync.deleteSkuComponent(body);
  }

  @Get('sku-mappings/all')
  allSkuMappings(@Query('platform') platform?: string) {
    return this.orderSync.getAllMappingsWithComponents(platform ?? 'TRENDYOL');
  }

  @Get('sku-mappings/excel-template')
  @UseGuards(OwnerGuard)
  async skuMappingExcelTemplate(@Query('platform') platform: string = 'TRENDYOL', @Res() res: Response) {
    const buffer = await this.orderSync.exportSkuMappingTemplate(platform);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${platform.toLowerCase()}-sku-eslestirme.xlsx"`);
    res.send(buffer);
  }

  @Post('sku-mappings/excel-import')
  @UseGuards(OwnerGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  importSkuMappingExcel(@Query('platform') platform: string = 'TRENDYOL', @UploadedFile() file: Express.Multer.File | undefined) {
    return this.orderSync.importSkuMappingExcel(platform, file);
  }

  // ── Hepsiburada API ────────────────────────────────────────────────────────

  @Get('hepsiburada/status')
  hbStatus() {
    return this.hbSync.getStatus();
  }

  @Post('hepsiburada/test')
  @UseGuards(OwnerGuard)
  hbTest() {
    return this.hbSync.testConnection();
  }

  @Post('hepsiburada/sync-orders')
  @UseGuards(OwnerGuard)
  hbSyncOrders() {
    return this.hbSync.syncOrdersNow();
  }

  @Post('hepsiburada/push-stock')
  @UseGuards(OwnerGuard)
  hbPushStock(@Body() body: { items?: HbStockItem[] }) {
    if (body.items?.length) return this.hbSync.pushStock(body.items);
    return this.hbSync.pushAllStockFromERP();
  }

  @Post('hepsiburada/push-prices')
  @UseGuards(OwnerGuard)
  hbPushPrices(@Body() body: { items?: HbPriceItem[] }) {
    if (body.items?.length) return this.hbSync.pushPrice(body.items);
    return this.hbSync.pushAllPricesFromERP();
  }

  @Get('hepsiburada/listings')
  @UseGuards(OwnerGuard)
  hbListings(@Query('offset') offset?: string, @Query('limit') limit?: string) {
    return this.hbSync.getListings(Number(offset ?? 0), Number(limit ?? 50));
  }

  @Post('trendyol/sync-stock-cards')
  @UseGuards(OwnerGuard)
  syncTrendyolStockCards() {
    return this.integrations.syncTrendyolStockCards();
  }

}
