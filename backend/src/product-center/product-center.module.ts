import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductionCostsModule } from '../production-costs/production-costs.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { ProductCenterController } from './product-center.controller';
import { ProductCenterService } from './product-center.service';

@Module({
  imports: [PrismaModule, AuthModule, ProductionCostsModule, IntegrationsModule],
  controllers: [ProductCenterController],
  providers: [ProductCenterService],
})
export class ProductCenterModule {}
