import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { OwnerGuard } from '../auth/owner.guard';
import { SalariesService } from './salaries.service';

/** Personel maaşları — kişisel veri: sadece sistem sahibi */
@UseGuards(AuthGuard, OwnerGuard)
@Controller('salaries')
export class SalariesController {
  constructor(private readonly svc: SalariesService) {}

  @Get()
  month(@Query('year') year: string, @Query('month') month: string) {
    const now = new Date();
    return this.svc.month(Number(year) || now.getFullYear(), Number(month) || now.getMonth() + 1);
  }

  @Put('payday')
  setPayday(@Body() body: { day: number }) {
    return this.svc.setPayday(body?.day);
  }

  @Post('pay')
  pay(@Body() body: { employeeId: number; year: number; month: number; amount?: number | null; note?: string | null }) {
    return this.svc.pay(Number(body.employeeId), Number(body.year), Number(body.month), body.amount, body.note);
  }

  @Post('unpay')
  unpay(@Body() body: { employeeId: number; year: number; month: number }) {
    return this.svc.unpay(Number(body.employeeId), Number(body.year), Number(body.month));
  }

  @Post('advances')
  addAdvance(@Body() body: { employeeId: number; date: string; amount: number; note?: string }) {
    return this.svc.addAdvance(body);
  }

  @Delete('advances/:id')
  deleteAdvance(@Param('id') id: string) {
    return this.svc.deleteAdvance(Number(id));
  }
}
