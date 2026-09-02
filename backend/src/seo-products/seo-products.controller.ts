import { Body, Controller, Get, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { AuthGuard } from '../auth/auth.guard';
import { SeoProductsService } from './seo-products.service';

@UseGuards(AuthGuard)
@Controller('seo-products')
export class SeoProductsController {
  constructor(private readonly seoProducts: SeoProductsService) {}

  @Get()
  list() {
    return this.seoProducts.list();
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.seoProducts.detail(Number(id));
  }

  @Post(':id/draft')
  saveDraft(@Param('id') id: string, @Body() body: unknown) {
    return this.seoProducts.saveDraft(Number(id), body);
  }

  @Post(':id/generate')
  generateContent(@Param('id') id: string, @Body() body: unknown) {
    return this.seoProducts.generateContent(Number(id), body);
  }

  @Post(':id/approve')
  approveOne(@Param('id') id: string, @Body() body: unknown) {
    return this.seoProducts.approveOne(Number(id), body);
  }

  @Post(':id/image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, callback) => {
          const destination = join(process.cwd(), 'uploads', 'seo-upload-temp');
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
  uploadImage(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.seoProducts.uploadImage(Number(id), file);
  }

  @Post(':id/images/:index/main')
  makeMainImage(@Param('id') id: string, @Param('index') index: string) {
    return this.seoProducts.makeMainImage(Number(id), Number(index));
  }

  @Post(':id/images/:index/archive')
  archiveImage(@Param('id') id: string, @Param('index') index: string) {
    return this.seoProducts.archiveImage(Number(id), Number(index));
  }

  @Post(':id/images/:index/photoroom')
  processWithPhotoroom(@Param('id') id: string, @Param('index') index: string, @Body() body: { mode?: string }) {
    return this.seoProducts.processImageWithPhotoroom(Number(id), Number(index), body.mode);
  }

  @Post('assign-family')
  assignFamily(@Body() body: { variantIds?: number[]; familyId?: number }) {
    return this.seoProducts.assignFamily(body.variantIds ?? [], Number(body.familyId));
  }

  @Post('assign-pot')
  assignPot(@Body() body: { variantIds?: number[]; potName?: string }) {
    return this.seoProducts.assignPot(body.variantIds ?? [], body.potName);
  }

  @Post('bulk-generate-all')
  bulkGenerateAll(@Body() body: { onlyMissing?: boolean }) {
    return this.seoProducts.bulkGenerateAll(body.onlyMissing !== false);
  }

  @Post('rebuild-names')
  rebuildNames(@Body() body: { variantIds?: number[] }) {
    return this.seoProducts.rebuildNames(body.variantIds ?? []);
  }

  @Post('approve')
  approve(@Body() body: { variantIds?: number[] }) {
    return this.seoProducts.approve(body.variantIds ?? []);
  }
}
