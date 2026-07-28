import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ImageProcessingModule } from '../image-processing/image-processing.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SeoProductsController } from './seo-products.controller';
import { SeoProductsService } from './seo-products.service';

@Module({
  imports: [PrismaModule, AuthModule, ImageProcessingModule],
  controllers: [SeoProductsController],
  providers: [SeoProductsService],
})
export class SeoProductsModule {}
