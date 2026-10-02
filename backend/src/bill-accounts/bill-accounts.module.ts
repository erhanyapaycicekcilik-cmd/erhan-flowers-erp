import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { BillAccountsController } from './bill-accounts.controller';
import { BillAccountsService } from './bill-accounts.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [BillAccountsController],
  providers: [BillAccountsService],
})
export class BillAccountsModule {}
