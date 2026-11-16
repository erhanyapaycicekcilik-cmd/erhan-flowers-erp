import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { BillAccountsService } from './bill-accounts.service';
import { AuthGuard } from '../auth/auth.guard';

type AccountBody = {
  type?: string; name?: string; dueDay?: number; statementDay?: number | null; estimatedAmount?: number | null;
  sortOrder?: number; isActive?: boolean; provider?: string | null; subscriberNo?: string | null; emailSender?: string | null;
};

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
