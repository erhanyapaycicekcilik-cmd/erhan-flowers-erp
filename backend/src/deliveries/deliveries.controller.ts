import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { DeliveriesService } from './deliveries.service';

type AuthenticatedRequest = Request & { user?: { id: number; name: string; email: string; role: string } };

@UseGuards(AuthGuard)
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveries: DeliveriesService) {}

  @Get()
  list(@Query('status') status = '') {
    return this.deliveries.list(status);
  }

  @Post(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.deliveries.updateStatus(Number(id), body, request.user!.id);
  }
}
