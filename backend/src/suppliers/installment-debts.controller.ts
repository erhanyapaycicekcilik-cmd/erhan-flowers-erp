import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { InstallmentDebtsService } from './installment-debts.service';

@UseGuards(AuthGuard)
@Controller('installment-debts')
export class InstallmentDebtsController {
  constructor(private readonly service: InstallmentDebtsService) {}

  @Get()
  list() { return this.service.list(); }

  @Post()
  create(@Body() body: {
    title: string; creditor?: string; supplierId?: number | null; totalAmount: number;
    installmentCount: number; startDate: string; documentNo?: string; notes?: string;
  }) {
    return this.service.create(body);
  }

  @Put('installments/:id')
  updateInstallment(@Param('id') id: string, @Body() body: { amount?: number; dueDate?: string; note?: string }) {
    return this.service.updateInstallment(Number(id), body);
  }

  @Post('installments/:id/pay')
  pay(@Param('id') id: string, @Body() body: { amount?: number; date?: string; note?: string }) {
    return this.service.togglePay(Number(id), body ?? {});
  }

  @Get(':id')
  get(@Param('id') id: string) { return this.service.get(Number(id)); }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: { title?: string; creditor?: string; documentNo?: string; notes?: string; isClosed?: boolean }) {
    return this.service.update(Number(id), body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.remove(Number(id)); }
}
