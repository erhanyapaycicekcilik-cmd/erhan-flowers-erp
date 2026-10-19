import { Module } from '@nestjs/common'
import { PublicOrdersController, TamiPaymentController, WebOrdersController } from './web-orders.controller'
import { TamiService } from './tami.service'
import { WebOrdersService } from './web-orders.service'
import { PrismaModule } from '../prisma/prisma.module'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PublicOrdersController, TamiPaymentController, WebOrdersController],
  providers: [WebOrdersService, TamiService],
})
export class WebOrdersModule {}
