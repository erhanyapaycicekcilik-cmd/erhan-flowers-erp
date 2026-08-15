import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '../auth/auth.guard';
import { OwnerGuard } from '../auth/owner.guard';
import { IntegrationCenterService } from './services/integration-center.service';
import { IntegrationsService } from './integrations.service';

type AuthenticatedRequest = Request & { user?: { id: number; role: string } };

@UseGuards(AuthGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly integrations: IntegrationsService,
    private readonly integrationCenter: IntegrationCenterService,
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
  platformSettings() {
    return this.integrationCenter.listPlatformSettings();
  }

  @Put('platform-settings/:platform')
  @UseGuards(OwnerGuard)
  savePlatformSettings(@Param('platform') platform: string, @Body() body: unknown) {
    return this.integrationCenter.savePlatformSettings({ ...(body as Record<string, unknown>), platform });
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
}
