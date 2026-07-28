import { Body, Controller, Get, Param, Post, Query, Req, Sse, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import { join } from 'path';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { StaffTaskEventsService } from './staff-task-events.service';
import { StaffTasksService } from './staff-tasks.service';

type AuthenticatedRequest = Request & { user?: { id: number; role: string } };

@UseGuards(AuthGuard)
@Controller('staff/tasks')
export class StaffTasksController {
  constructor(
    private readonly staffTasks: StaffTasksService,
    private readonly events: StaffTaskEventsService,
  ) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.staffTasks.listTasks(request.user!);
  }

  @Sse('events')
  eventsStream(@Query('heartbeat') _heartbeat = '') {
    return this.events.stream();
  }

  @Post(':id/seen')
  seen(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.staffTasks.markSeen(Number(id), request.user!);
  }

  @Post(':id/start')
  start(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.staffTasks.start(Number(id), request.user!);
  }

  @Post(':id/complete')
  complete(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.staffTasks.complete(Number(id), request.user!);
  }

  @Post(':id/block')
  block(@Param('id') id: string, @Body() body: { reason?: string }, @Req() request: AuthenticatedRequest) {
    return this.staffTasks.block(Number(id), request.user!, body.reason ?? '');
  }

  @Post(':id/proofs')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_request, _file, callback) => {
          const destination = join(process.cwd(), 'uploads', 'task-proofs');
          fs.mkdirSync(destination, { recursive: true });
          callback(null, destination);
        },
        filename: (_request, file, callback) => callback(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`),
      }),
    }),
  )
  proof(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Body('barcode') barcode: string, @Req() request: AuthenticatedRequest) {
    return this.staffTasks.addProof(Number(id), request.user!, file, barcode ?? '');
  }
}
