import { Body, Controller, Delete, Get, Headers, HttpCode, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { OwnerGuard } from '../auth/owner.guard';
import { BillAccountsService } from './bill-accounts.service';
import { AuthGuard } from '../auth/auth.guard';

type AccountBody = {
  type?: string; name?: string; dueDay?: number; statementDay?: number | null; estimatedAmount?: number | null;
  sortOrder?: number; isActive?: boolean; provider?: string | null; subscriberNo?: string | null; emailSender?: string | null;
};

/** Telefon (Android SMS yönlendirme) buraya POST eder — oturum yerine gizli anahtar. */
@Controller('bill-accounts')
export class BillSmsWebhookController {
  constructor(private service: BillAccountsService) {}

  @Post('sms-webhook')
  @HttpCode(200)
  receive(@Query('token') token: string | undefined, @Headers('x-token') headerToken: string | undefined, @Body() body: unknown) {
    return this.service.receiveSms(token ?? headerToken, body);
  }
}

@Controller('bill-accounts')
@UseGuards(AuthGuard)
export class BillAccountsController {
  constructor(private service: BillAccountsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get('gmail-status')
  gmailStatus() {
    return this.service.gmailStatus();
  }

  @Get('sms-settings')
  @UseGuards(OwnerGuard)
  smsSettings() {
    return this.service.smsSettings();
  }

  @Post('sms-settings/regenerate')
  @UseGuards(OwnerGuard)
  regenerateSms() {
    return this.service.smsSettings(true);
  }

  @Post('scan-email')
  scanEmail(@Query('accountId') accountId?: string) {
    return this.service.scanEmails(accountId ? Number(accountId) : undefined);
  }

  @Post()
  create(@Body() body: AccountBody) {
    return this.service.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: AccountBody) {
    return this.service.update(Number(id), body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }

  @Put(':id/month')
  setMonth(
    @Param('id') id: string,
    @Body() body: { year: number; month: number; amount?: number | null; invoiceNo?: string | null; dueDate?: string | null; note?: string | null },
  ) {
    return this.service.setMonthBill(Number(id), body);
  }

  @Post(':id/pay')
  togglePayment(
    @Param('id') id: string,
    @Body() body: { year: number; month: number; amount?: number; note?: string },
  ) {
    return this.service.togglePayment(Number(id), body.year, body.month, body.amount, body.note);
  }
}
