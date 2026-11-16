import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { InstallmentDebtsController } from './installment-debts.controller';
import { InstallmentDebtsService } from './installment-debts.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SuppliersController, InstallmentDebtsController],
  providers: [SuppliersService, InstallmentDebtsService],
})
export class SuppliersModule {}
