import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { OwnerGuard } from '../auth/owner.guard';
import { CatalogStrategyService } from './catalog-strategy.service';

type AuthenticatedRequest = Request & { user?: { id: number; name: string; email: string; role: string } };

@UseGuards(AuthGuard, OwnerGuard)
@Controller('catalog-strategy')
export class CatalogStrategyController {
  constructor(private readonly catalogStrategy: CatalogStrategyService) {}

  @Get('cleanup/preview')
  cleanupPreview(@Query('company') company?: string, @Query('days') days?: string, @Query('minSold') minSold?: string) {
    return this.catalogStrategy.cleanupPreview(company, days, minSold);
  }

  @Post('cleanup/apply')
  cleanupApply(@Body() body: Parameters<CatalogStrategyService['cleanupApply']>[0], @Req() request: AuthenticatedRequest) {
    return this.catalogStrategy.cleanupApply(body ?? {}, request.user!.id);
  }

  @Get('bestsellers')
  bestsellers(@Query() query: Record<string, string>) {
    return this.catalogStrategy.bestsellers(query ?? {});
  }

  @Post('publish')
  publish(@Body() body: Parameters<CatalogStrategyService['publishToStores']>[0], @Req() request: AuthenticatedRequest) {
    return this.catalogStrategy.publishToStores(body ?? {}, request.user!.id);
  }
}
