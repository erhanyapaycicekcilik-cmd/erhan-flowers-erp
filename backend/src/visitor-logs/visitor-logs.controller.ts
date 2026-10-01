import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { VisitorLogsService } from './visitor-logs.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('visitor-logs')
export class VisitorLogsController {
  constructor(private service: VisitorLogsService) {}

  @Post()
  @Throttle({ default: { limit: 20, ttl: 1000 } })
  async create(
    @Body() body: { site: string; path: string; ipAddress: string; userAgent?: string },
  ) {
    await this.service.create(body);
    return { ok: true };
  }

  @Get()
  @UseGuards(AuthGuard)
  list(@Query('site') site?: string, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.service.list({
      site,
      limit: limit ? Number(limit) : 100,
      offset: offset ? Number(offset) : 0,
    });
  }
}
