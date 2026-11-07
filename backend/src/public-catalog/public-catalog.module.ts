import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { PublicCatalogController } from './public-catalog.controller';
import { PublicCatalogService } from './public-catalog.service';
import { TrendyolProductSyncService } from './trendyol-product-sync.service';
import { SiteSettingsModule } from '../site-settings/site-settings.module';
import { CredentialVaultService } from '../integrations/services/credential-vault.service';
import { ProductGroupsController } from './product-groups.controller';
import { ProductGroupsService } from './product-groups.service';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    JwtModule.register({ secret: process.env.JWT_SECRET || 'secret' }),
    SiteSettingsModule,
  ],
  controllers: [PublicCatalogController, ProductGroupsController],
  providers: [PublicCatalogService, TrendyolProductSyncService, CredentialVaultService, ProductGroupsService],
  exports: [TrendyolProductSyncService],
})
export class PublicCatalogModule {}
