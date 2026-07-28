import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { IntegrationsService } from './integrations.service';

type AuthenticatedRequest = Request & { user?: { id: number; role: string } };

@UseGuards(AuthGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Get('connections')
  connections() {
    return this.integrations.listConnections();
  }

  @Get('ticimax')
  ticimaxSettings(@Query('tenant') tenant?: string) {
    return this.integrations.getTicimaxSettings(tenant);
  }

  @Put('ticimax')
  saveTicimaxSettings(@Body() body: unknown) {
    return this.integrations.saveTicimaxSettings(body as Record<string, unknown>);
  }

  @Post('ticimax/test')
  testTicimaxSettings(@Body() body: { tenant?: string }) {
    return this.integrations.testTicimaxSettings(body?.tenant);
  }

  @Post('connections/:platform/test')
  test(@Param('platform') platform: string) {
    return this.integrations.testConnection(platform);
  }

  @Post('orders/:platform/sync')
  syncOrders(@Param('platform') platform: string, @Req() request: AuthenticatedRequest) {
    return this.integrations.syncOrders(platform, request.user!.id);
  }

  @Get('orders')
  orders(@Query() query: Record<string, string>) {
    return this.integrations.listOrders(query);
  }

  @Get('operations')
  operations() {
    return this.integrations.operationsSummary();
  }

  @Get('history')
  history() {
    return this.integrations.listLogs();
  }

  @Get('errors')
  errors() {
    return this.integrations.listLogs('FAILED');
  }
}
