import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { BillAccountsService } from './bill-accounts.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('bill-accounts')
@UseGuards(AuthGuard)
export class BillAccountsController {
  constructor(private service: BillAccountsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body() body: { type: string; name: string; dueDay: number; statementDay?: number; estimatedAmount?: number; sortOrder?: number }) {
    return this.service.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: { name?: string; dueDay?: number; statementDay?: number | null; estimatedAmount?: number | null; sortOrder?: number; isActive?: boolean }) {
    return this.service.update(Number(id), body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }

  @Post(':id/pay')
  togglePayment(
    @Param('id') id: string,
    @Body() body: { year: number; month: number; amount?: number; note?: string },
  ) {
    return this.service.togglePayment(Number(id), body.year, body.month, body.amount, body.note);
  }
}
