import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { TrendyolScraperService } from '../market-intelligence/trendyol-scraper.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PublishingModule } from '../publishing/publishing.module';
import { CatalogStrategyController } from './catalog-strategy.controller';
import { CatalogStrategyService } from './catalog-strategy.service';

@Module({
  imports: [PrismaModule, AuthModule, IntegrationsModule, PublishingModule],
  controllers: [CatalogStrategyController],
  providers: [CatalogStrategyService, TrendyolScraperService],
})
export class CatalogStrategyModule {}
