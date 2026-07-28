import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProductionCostsController } from './production-costs.controller';
import { ProductionCostsService } from './production-costs.service';

@Module({
  imports: [AuthModule],
  controllers: [ProductionCostsController],
  providers: [ProductionCostsService],
})
export class ProductionCostsModule {}

