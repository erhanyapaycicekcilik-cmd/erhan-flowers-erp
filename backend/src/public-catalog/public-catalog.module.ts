import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PublicCatalogController } from './public-catalog.controller';
import { PublicCatalogService } from './public-catalog.service';

@Module({
  imports: [PrismaModule],
  controllers: [PublicCatalogController],
  providers: [PublicCatalogService],
})
export class PublicCatalogModule {}
