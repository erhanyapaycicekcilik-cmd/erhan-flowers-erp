import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { MarketIntelligenceService } from './market-intelligence.service';
import { InstagramService } from './instagram.service';
import { OwnPerformanceService } from './own-performance.service';
import { ChatMessage, GeminiChatService } from './gemini-chat.service';
import { ProductMediaAuditService } from './product-media-audit.service';
import { ProductMediaAuditChannel, ProductMediaAuditFilters } from './product-media-audit.types';
import { DeepMarketResearchService } from './deep-market-research.service';

@UseGuards(AuthGuard)
@Controller('market-intelligence')
export class MarketIntelligenceController {
  constructor(
    private readonly marketIntelligence: MarketIntelligenceService,
    private readonly instagram: InstagramService,
    private readonly ownPerformance: OwnPerformanceService,
    private readonly geminiChat: GeminiChatService,
    private readonly productMediaAudit: ProductMediaAuditService,
    private readonly deepMarketResearch: DeepMarketResearchService,
  ) {}

  @Get('deep-research/providers')
  listDeepResearchProviders() {
    return this.deepMarketResearch.listProviders();
  }

  @Get('deep-research/settings')
  deepResearchSettings() {
    return this.deepMarketResearch.getSettings();
  }

  @Patch('deep-research/settings')
  updateDeepResearchSettings(@Body() body: { ownBrands?: string[]; negativeKeywords?: string[] }) {
    return this.deepMarketResearch.updateSettings(body);
  }

  @Post('deep-research/run')
  runDeepResearch(@Body() body: any) {
    return this.deepMarketResearch.runDeepResearch(body);
  }

  @Post('deep-research/save')
  saveDeepResearch(@Body() body: { result?: any; note?: string }) {
    return this.deepMarketResearch.saveResearch(body);
  }

  @Get('deep-research/saved')
  savedDeepResearches() {
    return this.deepMarketResearch.listSavedResearches();
  }

  @Get('opportunity-radar')
  opportunityRadar() {
    return this.deepMarketResearch.opportunityRadar();
  }

  @Post('opportunity-radar/save')
  saveOpportunity(@Body() body: { research?: any; status?: any; note?: string }) {
    return this.deepMarketResearch.saveOpportunity(body);
  }

  @Get('competitor-tracking')
  competitorTracking() {
    return this.deepMarketResearch.listCompetitors();
  }

  @Post('competitor-tracking')
  addCompetitorTracking(@Body() body: any) {
    return this.deepMarketResearch.addCompetitor(body);
  }

  @Post('chat')
  chat(@Body() body: { message?: string; history?: ChatMessage[] }) {
    return this.geminiChat.chat(body.message ?? '', Array.isArray(body.history) ? body.history : []);
  }

  @Get('product-media-audits')
  listProductMediaAudits(
    @Query('channel') channel?: ProductMediaAuditChannel,
    @Query('recommendation') recommendation?: ProductMediaAuditFilters['recommendation'],
    @Query('priority') priority?: string,
    @Query('category') category?: string,
    @Query('brand') brand?: string,
    @Query('status') status?: ProductMediaAuditFilters['status'],
    @Query('missingMediaType') missingMediaType?: ProductMediaAuditFilters['missingMediaType'],
    @Query('search') search?: string,
    @Query('minScore') minScore?: string,
    @Query('maxScore') maxScore?: string,
    @Query('sort') sort?: ProductMediaAuditFilters['sort'],
    @Query('companyId') companyId?: string,
  ) {
    return this.productMediaAudit.list({
      channel,
      recommendation,
      priority,
      category,
      brand,
      status,
      missingMediaType,
      search,
      minScore: minScore ? Number(minScore) : undefined,
      maxScore: maxScore ? Number(maxScore) : undefined,
      sort,
      companyId: companyId ? Number(companyId) : undefined,
    });
  }

  @Get('product-media-audits/summary')
  productMediaAuditSummary(@Query('companyId') companyId?: string) {
    return this.productMediaAudit.getSummary(companyId ? Number(companyId) : undefined);
  }

  @Get('product-media-audits/rules')
  productMediaAuditRules() {
    return this.productMediaAudit.getRules();
  }

  @Get('product-media-audits/batches/:id')
  productMediaAuditBatch(@Param('id') id: string, @Query('companyId') companyId?: string) {
    return this.productMediaAudit.getBatch(id, companyId ? Number(companyId) : undefined);
  }

  @Get('product-media-audits/:id')
  productMediaAuditDetail(@Param('id') id: string, @Query('companyId') companyId?: string) {
    return this.productMediaAudit.getById(id, companyId ? Number(companyId) : undefined);
  }

  @Get('product-media-audits/:id/history')
  async productMediaAuditHistory(@Param('id') id: string, @Query('channel') channel?: ProductMediaAuditChannel, @Query('companyId') companyId?: string) {
    const audit = await this.productMediaAudit.getById(id, companyId ? Number(companyId) : undefined);
    return this.productMediaAudit.getHistory(audit.productId, channel, companyId ? Number(companyId) : undefined);
  }

  @Post('product-media-audits/:id/analyze')
  startProductMediaAudit(@Param('id') id: string, @Body() body: { companyId?: number }) {
    return this.productMediaAudit.startProductAudit(id, body?.companyId);
  }

  @Post('product-media-audits/bulk-analyze')
  startBulkProductMediaAudit(@Body() body: { channel?: ProductMediaAuditChannel; companyId?: number }) {
    return this.productMediaAudit.startBulkAudit(body?.channel ?? ProductMediaAuditChannel.GLOBAL, body?.companyId);
  }

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
