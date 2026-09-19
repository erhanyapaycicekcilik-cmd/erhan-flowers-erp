import { Module } from '@nestjs/common'
import { PublicOrdersController, WebOrdersController } from './web-orders.controller'
import { WebOrdersService } from './web-orders.service'
import { PrismaModule } from '../prisma/prisma.module'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PublicOrdersController, WebOrdersController],
  providers: [WebOrdersService],
})
export class WebOrdersModule {}
