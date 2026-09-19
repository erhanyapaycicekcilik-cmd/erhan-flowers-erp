import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductionCostsModule } from '../production-costs/production-costs.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { ProductsModule } from '../products/products.module';
import { ProductCenterController } from './product-center.controller';
import { ProductCenterService } from './product-center.service';

@Module({
  imports: [PrismaModule, AuthModule, ProductionCostsModule, IntegrationsModule, ProductsModule],
  controllers: [ProductCenterController],
  providers: [ProductCenterService],
})
export class ProductCenterModule {}
