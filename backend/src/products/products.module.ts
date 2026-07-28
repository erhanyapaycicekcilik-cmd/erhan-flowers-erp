import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModelCodesController } from './model-codes.controller';
import { ModelCodesService } from './model-codes.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [AuthModule],
  controllers: [ProductsController, ModelCodesController],
  providers: [ProductsService, ModelCodesService],
  exports: [ProductsService, ModelCodesService],
})
export class ProductsModule {}

