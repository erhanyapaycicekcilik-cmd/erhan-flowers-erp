import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StaffTasksModule } from '../staff-tasks/staff-tasks.module';
import { TrendyolAdapter } from './adapters/trendyol.adapter';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';

@Module({
  imports: [PrismaModule, AuthModule, StaffTasksModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, TrendyolAdapter],
})
export class IntegrationsModule {}
