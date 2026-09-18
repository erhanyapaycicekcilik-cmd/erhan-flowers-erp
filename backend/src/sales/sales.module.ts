import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductsModule } from '../products/products.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [PrismaModule, AuthModule, ProductsModule],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
