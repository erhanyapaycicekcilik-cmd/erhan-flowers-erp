import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { BankDebtsController } from './bank-debts.controller';
import { BankDebtsService } from './bank-debts.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [BankDebtsController],
  providers: [BankDebtsService],
  exports: [BankDebtsService],
})
export class BankDebtsModule {}
