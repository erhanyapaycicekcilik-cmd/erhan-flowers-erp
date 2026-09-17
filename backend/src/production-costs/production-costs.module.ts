import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PublishingModule } from '../publishing/publishing.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { ProductionCostsController } from './production-costs.controller';
import { ProductionCostsService } from './production-costs.service';

@Module({
  imports: [AuthModule, PublishingModule, IntegrationsModule],
  controllers: [ProductionCostsController],
  providers: [ProductionCostsService],
  exports: [ProductionCostsService],
})
export class ProductionCostsModule {}
