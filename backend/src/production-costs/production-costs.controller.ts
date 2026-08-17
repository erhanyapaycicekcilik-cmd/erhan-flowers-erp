import { Body, Controller, Get, Param, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { AuthGuard } from '../auth/auth.guard';
import { OwnerGuard } from '../auth/owner.guard';
import { ProductionCostsService } from './production-costs.service';

type AuthenticatedRequest = Request & { user?: { id: number; name: string; email: string; role: string } };

@UseGuards(AuthGuard, OwnerGuard)
@Controller('production-costs')
export class ProductionCostsController {
  constructor(private readonly productionCosts: ProductionCostsService) {}

  @Get('families')
  families() {
    return this.productionCosts.listFamilies();
  }

  @Get('family-masters')
  familyMasters() {
    return this.productionCosts.listFamilyMasters();
  }

  @Post('family-masters/bulk-add')
  bulkAddFamilyMasters(@Body() body: { masterIds?: number[] }) {
    return this.productionCosts.bulkAddFamiliesFromMasters(body.masterIds ?? []);
  }

  @Post('family-masters/:id/add')
  addFamilyMaster(@Param('id') id: string) {
    return this.productionCosts.addFamilyFromMaster(Number(id));
  }

  @Get('families/:id')
  family(@Param('id') id: string) {
    return this.productionCosts.getFamily(Number(id));
  }

  @Get('families/:id/match-candidates')
  matchCandidates(@Param('id') id: string) {
    return this.productionCosts.getFamilyMatchCandidates(Number(id));
  }

  @Get('families/:id/variants')
  familyVariants(@Param('id') id: string) {
    return this.productionCosts.getFamilyVariants(Number(id));
  }

  @Get('templates')
  templates() {
    return this.productionCosts.listTemplates();
  }

  @Get('default-expenses')
  defaultExpenses() {
    return this.productionCosts.listDefaultExpenses();
  }

  @Post('default-expenses')
  createDefaultExpense(@Body() body: unknown) {
    return this.productionCosts.createDefaultExpense(body);
  }

  @Post('default-expenses/:id')
  updateDefaultExpense(@Param('id') id: string, @Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.productionCosts.updateDefaultExpense(Number(id), body, request.user!.id);
  }

  @Get('bambu/rule')
  bambuRule() {
    return this.productionCosts.getBambuCostRule();
  }

  @Post('bambu/rule')
  updateBambuRule(@Body() body: unknown) {
    return this.productionCosts.updateBambuCostRule(body);
  }

  @Post('bambu/exceptions')
  updateBambuException(@Body() body: unknown) {
    return this.productionCosts.updateBambuException(body);
  }

  @Post('bambu/deduct-stock')
  deductBambuStock(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.productionCosts.deductBambuStock(body, request.user!.id);
  }

  @Get('variants')
  variants() {
    return this.productionCosts.listVariants();
  }

  @Get('progress')
  progress() {
    return this.productionCosts.getCostProgress();
  }

  @Get('variants/:id/detail')
  variantDetail(@Param('id') id: string) {
    return this.productionCosts.getVariantDetail(Number(id));
  }

  @Post('variants/:id/cost-draft')
  saveVariantCostDraft(@Param('id') id: string, @Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.productionCosts.saveVariantCostDraft(Number(id), body, false, request.user!.role, request.user!.id);
  }

  @Post('variants/:id/start-template')
  startVariantCostDraftFromTemplate(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.productionCosts.startVariantCostDraftFromTemplate(Number(id), request.user!.role, request.user!.id);
  }

  @Post('variants/:id/cost-approve')
  approveVariantCost(@Param('id') id: string, @Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.productionCosts.saveVariantCostDraft(Number(id), body, true, request.user!.role, request.user!.id);
  }

  @Post('variants/:id/copy-recipe')
  copyVariantCost(@Param('id') id: string, @Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.productionCosts.copyVariantCostDraft(Number(id), body, request.user!.role, request.user!.id);
  }

  @Post('trendyol-import/preview')
  @UseInterceptors(FileInterceptor('file'))
  previewTrendyolImport(@UploadedFile() file: Express.Multer.File) {
    return this.productionCosts.previewTrendyolImport(file);
  }

  @Post('trendyol-import/apply')
  @UseInterceptors(FileInterceptor('file'))
  applyTrendyolImport(@UploadedFile() file: Express.Multer.File) {
    return this.productionCosts.applyTrendyolImport(file);
  }

  @Get('overheads')
  overheads() {
    return this.productionCosts.listOverheads();
  }

  @Get('history')
  history() {
    return this.productionCosts.listHistory();
  }

  @Get('variants/:id/cost')
  variantCost(@Param('id') id: string) {
    return this.productionCosts.calculateVariantCost(Number(id));
  }

  @Post('variants/:id/family')
  assignVariantFamily(@Param('id') id: string, @Body() body: { familyId?: number; masterId?: number }) {
    return this.productionCosts.assignVariantToFamily(Number(id), body);
  }

  @Post('variants/:id/image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, callback) => {
          const destination = join(process.cwd(), 'uploads', 'trendyol-variants');
          fs.mkdirSync(destination, { recursive: true });
          callback(null, destination);
        },
        filename: (_req, file, callback) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          callback(null, `${unique}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  uploadVariantImage(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.productionCosts.uploadVariantImage(Number(id), file);
  }

  @Post('variants/:id/image/delete')
  deleteVariantImage(@Param('id') id: string, @Body() body: { imagePath?: string }) {
    return this.productionCosts.deleteVariantImage(Number(id), body.imagePath ?? '');
  }

  @Post('variants/:id/image/cover')
  setVariantCoverImage(@Param('id') id: string, @Body() body: { imagePath?: string }) {
    return this.productionCosts.setVariantCoverImage(Number(id), body.imagePath ?? '');
  }

  @Post('variants/:id/push-trendyol')
  pushImagesAndPrice(@Param('id') id: string, @Body() body: { salePrice?: number }, @Req() request: AuthenticatedRequest) {
    return this.productionCosts.pushImagesAndPriceToTrendyol(Number(id), Number(body.salePrice ?? 0), request.user!.id);
  }

  @Post('families')
  createFamily(@Body() body: unknown) {
    return this.productionCosts.createFamily(body);
  }

  @Post('families/:id')
  updateFamily(@Param('id') id: string, @Body() body: unknown) {
    return this.productionCosts.updateFamily(Number(id), body);
  }

  @Post('families/:id/passive')
  passiveFamily(@Param('id') id: string) {
    return this.productionCosts.passiveFamily(Number(id));
  }

  @Post('families/:id/delete')
  deleteFamily(@Param('id') id: string) {
    return this.productionCosts.deleteFamily(Number(id));
  }

  @Post('families/:id/match-products')
  matchProducts(@Param('id') id: string, @Body() body: { variantIds?: number[] }) {
    return this.productionCosts.matchProductsToFamily(Number(id), body.variantIds ?? []);
  }

  @Post('families/:id/match-details')
  updateMatchDetails(
    @Param('id') id: string,
    @Body() body: { variantIds?: number[]; detectedSize?: string; detectedPot?: string; stockCardId?: number },
  ) {
    return this.productionCosts.updateMatchDetails(Number(id), body);
  }

  @Post('templates')
  createTemplate(@Body() body: unknown) {
    return this.productionCosts.createTemplate(body);
  }

  @Post('templates/:id/components')
  updateTemplateComponents(@Param('id') id: string, @Body() body: unknown) {
    return this.productionCosts.updateTemplateComponents(Number(id), body);
  }

  @Post('variants')
  createVariant(@Body() body: unknown) {
    return this.productionCosts.createVariant(body);
  }
}
