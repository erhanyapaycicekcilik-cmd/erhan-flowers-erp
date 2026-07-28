import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StockCardsController } from './stock-cards.controller';
import { StockCardsService } from './stock-cards.service';

@Module({
  imports: [AuthModule],
  controllers: [StockCardsController],
  providers: [StockCardsService],
  exports: [StockCardsService],
})
export class StockCardsModule {}

