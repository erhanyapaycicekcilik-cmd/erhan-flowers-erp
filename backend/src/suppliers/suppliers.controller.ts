import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { SuppliersService } from './suppliers.service';

@UseGuards(AuthGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get()
  list() { return this.suppliers.listSuppliers(); }

  @Get('summary')
  summary() { return this.suppliers.summary(); }

  @Get(':id')
  get(@Param('id') id: string) { return this.suppliers.getSupplier(Number(id)); }

  @Post()
  create(@Body() body: { name: string; phone?: string; email?: string; address?: string; notes?: string }) {
    return this.suppliers.createSupplier(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: { name?: string; phone?: string; email?: string; address?: string; notes?: string }) {
    return this.suppliers.updateSupplier(Number(id), body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) { return this.suppliers.deleteSupplier(Number(id)); }

  @Post('transactions')
  addTransaction(@Body() body: {
    supplierId: number;
    type: 'DEBT_ADDED' | 'PAYMENT_MADE';
    amount: number;
    date: string;
    description?: string;
    documentNo?: string;
    stockCardId?: number;
    quantity?: number;
    unitPrice?: number;
  }) {
    return this.suppliers.addDebtTransaction(body);
  }

  @Delete('transactions/:id')
  deleteTransaction(@Param('id') id: string) { return this.suppliers.deleteTransaction(Number(id)); }
}
