import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SalesModule } from '../sales/sales.module';
import { PublicOrdersController } from './public-orders.controller';
import { PublicOrdersService } from './public-orders.service';

@Module({
  imports: [PrismaModule, SalesModule],
  controllers: [PublicOrdersController],
  providers: [PublicOrdersService],
})
export class PublicOrdersModule {}
