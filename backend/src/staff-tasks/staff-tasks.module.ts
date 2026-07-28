import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StaffTaskEventsService } from './staff-task-events.service';
import { StaffTasksController } from './staff-tasks.controller';
import { StaffTasksService } from './staff-tasks.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [StaffTasksController],
  providers: [StaffTasksService, StaffTaskEventsService],
  exports: [StaffTasksService, StaffTaskEventsService],
})
export class StaffTasksModule {}
