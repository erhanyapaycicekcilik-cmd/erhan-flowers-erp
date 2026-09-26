import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductsModule } from '../products/products.module';
import { PublicCatalogModule } from '../public-catalog/public-catalog.module';
import { CostsController } from './costs.controller';
import { CostsService } from './costs.service';

@Module({
  imports: [AuthModule, PrismaModule, PublicCatalogModule, ProductsModule],
  controllers: [CostsController],
  providers: [CostsService],
})
export class CostsModule {}
