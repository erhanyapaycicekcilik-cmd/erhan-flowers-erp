import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SiteOnlyCatalogService } from './site-only-catalog.service';

@Module({
  imports: [PrismaModule],
  providers: [SiteOnlyCatalogService],
})
export class SiteOnlyCatalogModule {}
