import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StaffTasksModule } from '../staff-tasks/staff-tasks.module';
import { TrendyolAdapter } from './adapters/trendyol.adapter';
import { HepsiburadaAdapter } from './adapters/hepsiburada.adapter';
import { N11Adapter } from './adapters/n11.adapter';
import { TicimaxAdapter } from './adapters/ticimax.adapter';
import { MockMarketplaceAdapter } from './adapters/mock/mock-marketplace.adapter';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { CredentialVaultService } from './services/credential-vault.service';
import { IntegrationCenterService } from './services/integration-center.service';

@Module({
  imports: [PrismaModule, AuthModule, StaffTasksModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, IntegrationCenterService, CredentialVaultService, TrendyolAdapter, HepsiburadaAdapter, N11Adapter, TicimaxAdapter, MockMarketplaceAdapter],
  exports: [IntegrationCenterService, TrendyolAdapter, HepsiburadaAdapter, N11Adapter, TicimaxAdapter],
})
export class IntegrationsModule {}
