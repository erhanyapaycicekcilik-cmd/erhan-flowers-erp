import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { EftService } from './eft.service';
import { EftController, EftPublicController } from './eft.controller';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    MulterModule.register({}),
  ],
  controllers: [EftController, EftPublicController],
  providers: [EftService],
  exports: [EftService],
})
export class EftModule {}
