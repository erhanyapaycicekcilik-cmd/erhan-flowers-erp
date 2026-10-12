import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { ProductsModule } from '../products/products.module';
import { StockCardsDriveSyncController } from './stock-cards-drive-sync.controller';
import { StockCardsController } from './stock-cards.controller';
import { StockCardsService } from './stock-cards.service';

@Module({
  imports: [AuthModule, IntegrationsModule, ProductsModule],
  controllers: [StockCardsController, StockCardsDriveSyncController],
  providers: [StockCardsService],
  exports: [StockCardsService],
})
export class StockCardsModule {}

