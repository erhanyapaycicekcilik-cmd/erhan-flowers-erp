import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { MarketIntelligenceService } from './market-intelligence.service';
import { InstagramService } from './instagram.service';
import { OwnPerformanceService } from './own-performance.service';

@UseGuards(AuthGuard)
@Controller('market-intelligence')
export class MarketIntelligenceController {
  constructor(
    private readonly marketIntelligence: MarketIntelligenceService,
    private readonly instagram: InstagramService,
    private readonly ownPerformance: OwnPerformanceService,
  ) {}

  @Post('own-performance/sync')
  syncOwnPerformance(@Body() body: { limit?: number }) {
    return this.ownPerformance.triggerSync(body?.limit);
  }

  @Get('own-performance/sync/status')
  ownPerformanceSyncStatus() {
    return this.ownPerformance.syncStatus();
  }

  @Get('own-performance/top-favorited')
  topFavorited(@Query('limit') limit?: string) {
    return this.ownPerformance.getTopFavorited(limit ? Number(limit) : 100);
  }

  @Get('own-performance/top-sellers')
  topSellers(@Query('limit') limit?: string) {
    return this.ownPerformance.getTopSellers(limit ? Number(limit) : 100);
  }

  @Get('own-performance/dead-zone')
  deadZoneAnalysis() {
    return this.ownPerformance.getDeadZoneAnalysis();
  }

  @Get('own-performance/action-plan')
  actionPlan() {
    return this.ownPerformance.getActionPlan();
  }

  @Get('own-performance/action-plan/excel')
  actionPlanExcel() {
    return this.ownPerformance.exportActionPlanExcel();
  }

  @Get('keywords')
  listKeywords() {
    return this.marketIntelligence.listKeywords();
  }

  @Post('keywords')
  addKeyword(@Body() body: { keyword?: string; categoryId?: number }) {
    return this.marketIntelligence.addKeyword(body.keyword ?? '', body.categoryId ?? null);
  }

  @Patch('keywords/:id')
  setKeywordActive(@Param('id', ParseIntPipe) id: number, @Body() body: { isActive?: boolean }) {
    return this.marketIntelligence.setKeywordActive(id, body.isActive !== false);
  }

  @Delete('keywords/:id')
  deleteKeyword(@Param('id', ParseIntPipe) id: number) {
    return this.marketIntelligence.deleteKeyword(id);
  }

  @Get('report/today')
  todayReport() {
    return this.marketIntelligence.getTodayReport();
  }

  @Get('report/history')
  reportHistory(@Query('limit') limit?: string) {
    return this.marketIntelligence.getReportHistory(limit ? Number(limit) : 30);
  }

  @Post('report/generate')
  generateReport() {
    return this.marketIntelligence.generateDailyReport();
  }

  @Get('social/instagram/status')
  instagramStatus() {
    return this.instagram.getStatus();
  }

  @Post('social/instagram/connect')
  connectInstagram(@Body() body: { accessToken?: string; instagramBusinessId?: string }) {
    return this.instagram.connect(body.accessToken ?? '', body.instagramBusinessId ?? '');
  }

  @Delete('social/instagram/connect')
  disconnectInstagram() {
    return this.instagram.disconnect();
  }

  @Get('social/instagram/report/today')
  instagramTodayReport() {
    return this.instagram.getTodayReport();
  }

  @Get('social/instagram/report/history')
  instagramReportHistory(@Query('limit') limit?: string) {
    return this.instagram.getReportHistory(limit ? Number(limit) : 30);
  }

  @Post('social/instagram/report/generate')
  generateInstagramReport() {
    return this.instagram.generateDailyReport();
  }
}
