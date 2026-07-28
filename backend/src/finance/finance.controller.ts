import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { OwnerGuard } from '../auth/owner.guard';
import { FinanceService } from './finance.service';

type AuthenticatedRequest = Request & { user?: { id: number; name: string; email: string; role: string } };

@UseGuards(AuthGuard, OwnerGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get('bootstrap')
  bootstrap() {
    return this.finance.bootstrap();
  }

  @Get('summary')
  summary(@Query('range') range?: string) {
    return this.finance.summary(range ?? 'month');
  }

  @Get('accounts')
  accounts() {
    return this.finance.listAccounts();
  }

  @Post('accounts')
  createAccount(@Body() body: unknown) {
    return this.finance.createAccount(body);
  }

  @Get('categories')
  categories() {
    return this.finance.listCategories();
  }

  @Post('categories')
  createCategory(@Body() body: unknown) {
    return this.finance.createCategory(body);
  }

  @Get('sales-channels')
  salesChannels() {
    return this.finance.listSalesChannels();
  }

  @Post('sales-channels')
  createSalesChannel(@Body() body: unknown) {
    return this.finance.createSalesChannel(body);
  }

  @Post('transactions')
  createTransaction(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.finance.createTransaction(body, request.user!.id);
  }

  @Post('transactions/:id/cancel')
  cancelTransaction(@Param('id') id: string, @Body() body: { reason?: string }, @Req() request: AuthenticatedRequest) {
    return this.finance.cancelTransaction(Number(id), body.reason ?? '', request.user!.id);
  }

  @Post('debts')
  createDebt(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.finance.createDebt(body, request.user!.id);
  }

  @Post('marketplace-records')
  createMarketplaceRecord(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.finance.createMarketplaceRecord(body, request.user!.id);
  }

  @Post('recurring-payments')
  createRecurring(@Body() body: unknown) {
    return this.finance.createRecurring(body);
  }

  @Post('salaries')
  createSalary(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.finance.createSalary(body, request.user!.id);
  }
}
