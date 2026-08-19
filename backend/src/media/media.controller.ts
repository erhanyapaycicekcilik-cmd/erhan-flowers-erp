import { Body, Controller, Get, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { AuthGuard } from '../auth/auth.guard';
import { MediaService } from './media.service';

@UseGuards(AuthGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get()
  list() {
    return this.media.list();
  }

  @Get('image-generation-status')
  imageGenerationStatus() {
    return this.media.imageGenerationStatus();
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, callback) => {
          const destination = join(process.cwd(), 'uploads', 'products');
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
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { productId?: string; folderName?: string },
  ) {
    return this.media.create(file, body);
  }

  @Post('tree-standard-set')
  createTreeStandardSet(@Body() body: { imagePath?: string; productId?: string; folderName?: string }) {
    return this.media.createTreeStandardSet(body);
  }

  @Post('composite-product-image')
  createCompositeProductImage(@Body() body: { productStockCardId?: string; potStockCardId?: string; productId?: string; folderName?: string; productName?: string; referenceImageUrl?: string }) {
    return this.media.createCompositeProductImage(body);
  }

  @Post(':id/photoroom')
  processWithPhotoroom(@Param('id') id: string) {
    return this.media.processWithPhotoroom(Number(id));
  }

  @Post('bulk-photoroom')
  bulkProcessWithPhotoroom(@Body() body: { ids?: number[] }) {
    const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter((id) => Number.isFinite(id)) : [];
    return this.media.bulkProcessWithPhotoroom(ids);
  }
}
