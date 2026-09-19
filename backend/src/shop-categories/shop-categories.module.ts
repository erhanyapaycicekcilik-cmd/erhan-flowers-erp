import { Module } from '@nestjs/common'
import { ShopCategoriesController } from './shop-categories.controller'
import { ShopCategoriesService } from './shop-categories.service'
import { PrismaModule } from '../prisma/prisma.module'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ShopCategoriesController],
  providers: [ShopCategoriesService],
  exports: [ShopCategoriesService],
})
export class ShopCategoriesModule {}
