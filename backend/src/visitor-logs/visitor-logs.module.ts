import { Module } from '@nestjs/common';
import { VisitorLogsController } from './visitor-logs.controller';
import { VisitorLogsService } from './visitor-logs.service';

@Module({
  controllers: [VisitorLogsController],
  providers: [VisitorLogsService],
})
export class VisitorLogsModule {}
