import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { BankDebtsModule } from '../bank-debts/bank-debts.module';
import { BillAccountsController, BillSmsWebhookController } from './bill-accounts.controller';
import { BillAccountsService } from './bill-accounts.service';

@Module({
  imports: [AuthModule, PrismaModule, IntegrationsModule, BankDebtsModule],
  controllers: [BillSmsWebhookController, BillAccountsController],
  providers: [BillAccountsService],
})
export class BillAccountsModule {}
