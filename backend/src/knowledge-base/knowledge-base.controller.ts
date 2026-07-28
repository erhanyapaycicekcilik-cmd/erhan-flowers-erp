import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { OwnerGuard } from '../auth/owner.guard';
import { KnowledgeBaseService } from './knowledge-base.service';
import { KnowledgeAnalysisService } from './services/knowledge-analysis.service';

type AuthenticatedRequest = Request & { user?: { id: number; name: string; email: string; role: string } };

@UseGuards(AuthGuard)
@Controller('knowledge-base')
export class KnowledgeBaseController {
  constructor(
    private readonly knowledgeBase: KnowledgeBaseService,
    private readonly analysis: KnowledgeAnalysisService,
  ) {}

  @Get('plant-types')
  @UseGuards(OwnerGuard)
  listPlantTypes() {
    return this.knowledgeBase.listPlantTypes();
  }

  @Post('plant-types')
  @UseGuards(OwnerGuard)
  createPlantType(@Body() body: unknown) {
    return this.knowledgeBase.createPlantType(body);
  }

  @Get('plant-types/:id')
  @UseGuards(OwnerGuard)
  getPlantType(@Param('id') id: string) {
    return this.knowledgeBase.getPlantType(Number(id));
  }

  @Patch('plant-types/:id')
  @UseGuards(OwnerGuard)
  updatePlantType(@Param('id') id: string, @Body() body: unknown) {
    return this.knowledgeBase.updatePlantType(Number(id), body);
  }

  @Delete('plant-types/:id')
  @UseGuards(OwnerGuard)
  archivePlantType(@Param('id') id: string) { return this.knowledgeBase.archive('plantType', Number(id)); }

  @Get('aliases')
  @UseGuards(OwnerGuard)
  listAliases() {
    return this.knowledgeBase.listAliases();
  }

  @Post('aliases')
  @UseGuards(OwnerGuard)
  createAlias(@Body() body: unknown) {
    return this.knowledgeBase.createAlias(body);
  }

  @Patch('aliases/:id')
  @UseGuards(OwnerGuard)
  updateAlias(@Param('id') id: string, @Body() body: unknown) {
    return this.knowledgeBase.updateAlias(Number(id), body);
  }

  @Delete('aliases/:id')
  @UseGuards(OwnerGuard)
  archiveAlias(@Param('id') id: string) { return this.knowledgeBase.archive('alias', Number(id)); }

  @Get('pot-profiles')
  @UseGuards(OwnerGuard)
  listPotProfiles() {
    return this.knowledgeBase.listPotProfiles();
  }

  @Post('pot-profiles')
  @UseGuards(OwnerGuard)
  createPotProfile(@Body() body: unknown) {
    return this.knowledgeBase.createPotProfile(body);
  }

  @Patch('pot-profiles/:id')
  @UseGuards(OwnerGuard)
  updatePotProfile(@Param('id') id: string, @Body() body: unknown) {
    return this.knowledgeBase.updatePotProfile(Number(id), body);
  }

  @Delete('pot-profiles/:id')
  @UseGuards(OwnerGuard)
  archivePotProfile(@Param('id') id: string) { return this.knowledgeBase.archive('potProfile', Number(id)); }

  @Get('recipe-profiles')
  @UseGuards(OwnerGuard)
  listRecipeProfiles() {
    return this.knowledgeBase.listRecipeProfiles();
  }

  @Post('recipe-profiles')
  @UseGuards(OwnerGuard)
  createRecipeProfile(@Body() body: unknown) {
    return this.knowledgeBase.createRecipeProfile(body);
  }

  @Get('recipe-profiles/:id')
  @UseGuards(OwnerGuard)
  getRecipeProfile(@Param('id') id: string) {
    return this.knowledgeBase.getRecipeProfile(Number(id));
  }

  @Patch('recipe-profiles/:id')
  @UseGuards(OwnerGuard)
  updateRecipeProfile(@Param('id') id: string, @Body() body: unknown) {
    return this.knowledgeBase.updateRecipeProfile(Number(id), body);
  }

  @Delete('recipe-profiles/:id')
  @UseGuards(OwnerGuard)
  archiveRecipeProfile(@Param('id') id: string) { return this.knowledgeBase.archive('recipeProfile', Number(id)); }

  @Get('rules')
  @UseGuards(OwnerGuard)
  listRules(@Query('kind') kind = '') {
    return this.knowledgeBase.listRules(kind || undefined);
  }

  @Post('rules')
  @UseGuards(OwnerGuard)
  createRule(@Body() body: unknown) {
    return this.knowledgeBase.createRule(body);
  }

  @Patch('rules/:id')
  @UseGuards(OwnerGuard)
  updateRule(@Param('id') id: string, @Body() body: unknown) {
    return this.knowledgeBase.updateRule(Number(id), body);
  }

  @Delete('rules/:id')
  @UseGuards(OwnerGuard)
  archiveRule(@Param('id') id: string) { return this.knowledgeBase.archive('rule', Number(id)); }

  @Get('analysis-logs')
  @UseGuards(OwnerGuard)
  listAnalysisLogs(@Query('take') take = '100') {
    return this.knowledgeBase.listAnalysisLogs(Number(take));
  }

  @Post('analysis-logs/:id/feedback')
  @UseGuards(OwnerGuard)
  createFeedback(@Param('id') id: string, @Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.knowledgeBase.createFeedback(Number(id), body, request.user!.id);
  }

  @Get('stock-card-options')
  @UseGuards(OwnerGuard)
  stockCardOptions() {
    return this.knowledgeBase.listStockCardOptions();
  }

  @Post('analyze-product-name')
  analyzeProductName(@Body() body: { text?: string }, @Req() request: AuthenticatedRequest) {
    return this.analysis.analyzeProductName(body.text ?? '', request.user?.id);
  }
}
