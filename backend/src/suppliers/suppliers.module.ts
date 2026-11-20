import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { BankDebtsModule } from '../bank-debts/bank-debts.module';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { InstallmentDebtsController } from './installment-debts.controller';
import { InstallmentDebtsService } from './installment-debts.service';
import { SalariesController } from './salaries.controller';
import { SalariesService } from './salaries.service';

@Module({
  imports: [PrismaModule, AuthModule, BankDebtsModule],
  controllers: [SuppliersController, InstallmentDebtsController, SalariesController],
  providers: [SuppliersService, InstallmentDebtsService, SalariesService],
})
export class SuppliersModule {}
