import { Module } from '@nestjs/common'
import { PublicOrdersController, WebOrdersController } from './web-orders.controller'
import { WebOrdersService } from './web-orders.service'
import { PrismaModule } from '../prisma/prisma.module'
import { AuthModule } from '../auth/auth.module'
import { PublicCatalogModule } from '../public-catalog/public-catalog.module'

@Module({
  imports: [PrismaModule, AuthModule, PublicCatalogModule],
  controllers: [PublicOrdersController, WebOrdersController],
  providers: [WebOrdersService],
})
export class WebOrdersModule {}
