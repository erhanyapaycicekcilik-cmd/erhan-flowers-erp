import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PublishingController } from './publishing.controller';
import { PublishingService } from './publishing.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PublishingController],
  providers: [PublishingService],
})
export class PublishingModule {}
