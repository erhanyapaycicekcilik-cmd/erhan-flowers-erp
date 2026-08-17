import { Body, Controller, Get, Param, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { OwnerGuard } from '../auth/owner.guard';
import { ProductCenterService } from './product-center.service';

type AuthenticatedRequest = Request & { user?: { id: number; role: string } };

@UseGuards(AuthGuard)
@Controller('product-center')
export class ProductCenterController {
  constructor(private readonly productCenter: ProductCenterService) {}

  @Get('entries')
  entries() {
    return this.productCenter.listEntries();
  }

  @Get('entries/:id')
  entry(@Param('id') id: string) {
    return this.productCenter.getEntry(Number(id));
  }

  @Post('entries')
  @UseGuards(OwnerGuard)
  upsert(@Body() body: unknown) {
    return this.productCenter.upsertEntry(body as any);
  }

  @Post('entries/identity')
  @UseGuards(OwnerGuard)
  identity(@Body() body: unknown) {
    return this.productCenter.generateEntryIdentity(body as any);
  }

  @Post('entries/:id/passive')
  @UseGuards(OwnerGuard)
  passiveEntry(@Param('id') id: string) {
    return this.productCenter.passiveEntry(Number(id));
  }

  @Post('entries/quick')
  quickSave(@Body() body: unknown) {
    return this.productCenter.quickSaveEntry(body as any);
  }

  @Get('export/excel')
  @UseGuards(OwnerGuard)
  exportExcel() {
    return this.productCenter.exportUnlinkedExcel();
  }

  @Post('import/excel')
  @UseGuards(OwnerGuard)
  @UseInterceptors(FileInterceptor('file'))
  importExcel(@UploadedFile() file: Express.Multer.File) {
    return this.productCenter.importExcel(file);
  }

  @Get('cleanup/auto-stock-cards')
  @UseGuards(OwnerGuard)
  autoStockCards() {
    return this.productCenter.listAutoCreatedStockCardCandidates();
  }

  @Post('cleanup/auto-stock-cards/:id')
  @UseGuards(OwnerGuard)
  cleanupAutoStockCard(@Param('id') id: string, @Body() body: unknown) {
    return this.productCenter.cleanupAutoCreatedStockCard(Number(id), body);
  }

  @Post('entries/:id/copy-recipe')
  @UseGuards(OwnerGuard)
  copyRecipe(@Param('id') id: string, @Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.productCenter.copyRecipe(Number(id), body, request.user!.role, request.user!.id);
  }

  @Post('entries/:id/shop-card')
  @UseGuards(OwnerGuard)
  shopCard(@Param('id') id: string) {
    return this.productCenter.generateShopCard(Number(id));
  }
}
