import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EInvoicesController } from './e-invoices.controller';
import { EInvoicesService } from './e-invoices.service';
import { TrendyolEFaturamProvider } from './providers/trendyol-efaturam.provider';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [EInvoicesController],
  providers: [EInvoicesService, TrendyolEFaturamProvider],
})
export class EInvoicesModule {}
