import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { OwnerGuard } from '../auth/owner.guard';
import { EInvoicesService } from './e-invoices.service';
import { EInvoiceSettings } from './providers/e-invoice-provider.interface';

@UseGuards(AuthGuard, OwnerGuard)
@Controller('e-invoices')
export class EInvoicesController {
  constructor(private readonly service: EInvoicesService) {}

  @Get('settings')
  getSettings() {
    return this.service.getSettings();
  }

  @Put('settings')
  saveSettings(@Body() body: Partial<EInvoiceSettings>) {
    return this.service.saveSettings(body ?? {});
  }

  @Post('settings/test')
  test() {
    return this.service.testConnection();
  }

  @Get('pending')
  pending(@Query('days') days?: string) {
    return this.service.listPending(days);
  }

  @Get('draft/:sourceType/:sourceId')
  draft(@Param('sourceType') sourceType: string, @Param('sourceId', ParseIntPipe) sourceId: number) {
    return this.service.buildDraft({ sourceType: sourceType === 'WEB_ORDER' ? 'WEB_ORDER' : 'RETAIL_SALE', sourceId });
  }

  @Post('issue')
  issue(@Body() body: Parameters<EInvoicesService['issue']>[0]) {
    return this.service.issue(body ?? {});
  }

  @Get()
  list(@Query('status') status?: string, @Query('limit') limit?: string) {
    return this.service.listInvoices({ status, limit });
  }

  @Get(':id/pdf')
  pdf(@Param('id', ParseIntPipe) id: number) {
    return this.service.pdf(id);
  }

  @Post(':id/retry')
  retry(@Param('id', ParseIntPipe) id: number) {
    return this.service.retry(id);
  }
}
