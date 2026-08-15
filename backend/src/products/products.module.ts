import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModelCodesController } from './model-codes.controller';
import { ModelCodesService } from './model-codes.service';
import { GeminiContentService } from './gemini-content.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [AuthModule],
  controllers: [ProductsController, ModelCodesController],
  providers: [ProductsService, ModelCodesService, GeminiContentService],
  exports: [ProductsService, ModelCodesService],
})
export class ProductsModule {}
