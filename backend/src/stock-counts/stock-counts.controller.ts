import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { OwnerGuard } from '../auth/owner.guard';
import { StockCountsService } from './stock-counts.service';

type AuthenticatedRequest = Request & { user?: { id: number; name: string; email: string; role: string } };

@UseGuards(AuthGuard, OwnerGuard)
@Controller('stock-counts')
export class StockCountsController {
  constructor(private readonly stockCounts: StockCountsService) {}

  @Get()
  list() {
    return this.stockCounts.list();
  }

  @Post()
  create(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.stockCounts.create(body, request.user!.id);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.stockCounts.get(Number(id));
  }

  @Post(':id/items')
  updateItems(@Param('id') id: string, @Body() body: unknown) {
    return this.stockCounts.updateItems(Number(id), body);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.stockCounts.approve(Number(id), request.user!.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.stockCounts.remove(Number(id));
  }
}
