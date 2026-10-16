import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { SiteSettingsController } from './site-settings.controller';
import { SiteSettingsService } from './site-settings.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({ secret: process.env.JWT_SECRET || 'secret' }),
  ],
  controllers: [SiteSettingsController],
  providers: [SiteSettingsService],
  exports: [SiteSettingsService],
})
export class SiteSettingsModule {}
