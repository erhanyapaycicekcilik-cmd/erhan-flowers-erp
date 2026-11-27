import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EInvoicesController } from './e-invoices.controller';
import { EInvoicesService } from './e-invoices.service';
import { TrendyolEFaturamProvider } from './providers/trendyol-efaturam.provider';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [AuthModule, PrismaModule, IntegrationsModule],
  controllers: [EInvoicesController],
  providers: [EInvoicesService, TrendyolEFaturamProvider],
})
export class EInvoicesModule {}
