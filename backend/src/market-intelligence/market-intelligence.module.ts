import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CredentialVaultService } from '../integrations/services/credential-vault.service';
import { MarketIntelligenceController } from './market-intelligence.controller';
import { MarketIntelligenceService } from './market-intelligence.service';
import { TrendyolScraperService } from './trendyol-scraper.service';
import { InstagramService } from './instagram.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MarketIntelligenceController],
  providers: [MarketIntelligenceService, TrendyolScraperService, InstagramService, CredentialVaultService],
})
export class MarketIntelligenceModule {}
