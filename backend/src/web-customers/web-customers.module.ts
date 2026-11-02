import { Module } from '@nestjs/common'
import { WebCustomersController } from './web-customers.controller'
import { WebCustomersService } from './web-customers.service'
import { PrismaModule } from '../prisma/prisma.module'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [WebCustomersController],
  providers: [WebCustomersService],
})
export class WebCustomersModule {}
