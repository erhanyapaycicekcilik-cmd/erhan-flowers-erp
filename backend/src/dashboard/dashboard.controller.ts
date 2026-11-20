import { Controller, ForbiddenException, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { DashboardService } from './dashboard.service';

type AuthenticatedRequest = Request & { user?: { id: number; name: string; email: string; role: string } };

@UseGuards(AuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  summary(@Req() request: AuthenticatedRequest) {
    return this.dashboard.summary(request.user?.role);
  }

  @Get('daily-sales')
  dailySales() {
    return this.dashboard.dailySales();
  }

  @Get('company-revenue')
  companyRevenue() {
    return this.dashboard.dailySalesByCompany();
  }

  /** Günlük ciro defteri — sadece sahip/yönetici */
  @Get('revenue')
  revenue(
    @Req() request: AuthenticatedRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('source') source?: string,
    @Query('refresh') refresh?: string,
  ) {
    if (!['OWNER', 'MANAGER'].includes(request.user?.role ?? '')) throw new ForbiddenException('Bu rapor için yetkiniz yok.');
    return this.dashboard.revenueLedger(from, to, source !== 'erp', refresh === '1');
  }

  /** Hakedişler (platform cari hesap ekstresi) — sadece sahip/yönetici */
  @Get('settlements')
  settlements(@Req() request: AuthenticatedRequest, @Query('from') from?: string, @Query('to') to?: string, @Query('refresh') refresh?: string) {
    if (!['OWNER', 'MANAGER'].includes(request.user?.role ?? '')) throw new ForbiddenException('Bu rapor için yetkiniz yok.');
    return this.dashboard.settlements(from, to, refresh === '1');
  }

  @Get('daily-report')
  dailyReport(@Query('date') date?: string) {
    return this.dashboard.dailyReport(date);
  }
}
