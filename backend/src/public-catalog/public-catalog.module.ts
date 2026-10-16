import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { PublicCatalogController } from './public-catalog.controller';
import { PublicCatalogService } from './public-catalog.service';
import { TrendyolProductSyncService } from './trendyol-product-sync.service';
import { SiteSettingsModule } from '../site-settings/site-settings.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    JwtModule.register({ secret: process.env.JWT_SECRET || 'secret' }),
    SiteSettingsModule,
  ],
  controllers: [PublicCatalogController],
  providers: [PublicCatalogService, TrendyolProductSyncService],
  exports: [TrendyolProductSyncService],
})
export class PublicCatalogModule {}
