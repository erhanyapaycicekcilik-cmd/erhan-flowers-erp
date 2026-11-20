import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { OwnerGuard } from '../auth/owner.guard';
import { BankDebtsService } from './bank-debts.service';

/** Banka borçları (kredi kartı / kredi / KMH) — sadece sistem sahibi */
@UseGuards(AuthGuard, OwnerGuard)
@Controller('bank-debts')
export class BankDebtsController {
  constructor(private readonly svc: BankDebtsService) {}

  @Get()
  list() { return this.svc.list(); }

  @Get('sms-log')
  smsLog() { return this.svc.smsLog(); }

  @Post()
  create(@Body() body: Record<string, any>) { return this.svc.create(body); }

  @Put('statements/:id')
  updateStatement(@Param('id') id: string, @Body() body: any) { return this.svc.updateStatement(Number(id), body); }

  @Post('statements/:id/pay')
  pay(@Param('id') id: string, @Body() body: { amount?: number; date?: string }) { return this.svc.togglePay(Number(id), body ?? {}); }

  @Delete('statements/:id')
  removeStatement(@Param('id') id: string) { return this.svc.removeStatement(Number(id)); }

  @Post(':id/statements')
  addStatement(@Param('id') id: string, @Body() body: any) { return this.svc.upsertStatement(Number(id), body); }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Record<string, any>) { return this.svc.update(Number(id), body); }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.svc.remove(Number(id)); }
}
