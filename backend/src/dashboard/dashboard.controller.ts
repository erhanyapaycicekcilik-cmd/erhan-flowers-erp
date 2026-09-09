import { Controller, Get, Req, UseGuards } from '@nestjs/common';
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
}
