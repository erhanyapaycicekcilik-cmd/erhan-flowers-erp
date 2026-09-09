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
import { OrderSyncService } from './services/order-sync.service';
import { GmailOrderService } from './services/gmail-order.service';
import { HepsiburadaSyncService } from './services/hepsiburada-sync.service';
import { FloraSyncService } from './services/flora-sync.service';
import { GmailController } from './gmail.controller';
import { HepsiburadaWebhookController } from './hepsiburada-webhook.controller';

@Module({
  imports: [PrismaModule, AuthModule, StaffTasksModule],
  controllers: [IntegrationsController, GmailController, HepsiburadaWebhookController],
  providers: [IntegrationsService, IntegrationCenterService, CredentialVaultService, OrderSyncService, GmailOrderService, HepsiburadaSyncService, FloraSyncService, TrendyolAdapter, HepsiburadaAdapter, N11Adapter, TicimaxAdapter, MockMarketplaceAdapter],
  exports: [IntegrationCenterService, TrendyolAdapter, HepsiburadaAdapter, N11Adapter, TicimaxAdapter, OrderSyncService, GmailOrderService, HepsiburadaSyncService, FloraSyncService],
})
export class IntegrationsModule {}
