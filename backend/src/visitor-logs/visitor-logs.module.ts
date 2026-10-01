import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { VisitorLogsController } from './visitor-logs.controller';
import { VisitorLogsService } from './visitor-logs.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [VisitorLogsController],
  providers: [VisitorLogsService],
})
export class VisitorLogsModule {}
