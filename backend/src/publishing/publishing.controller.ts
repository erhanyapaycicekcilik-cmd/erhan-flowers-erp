import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { OwnerGuard } from '../auth/owner.guard';
import { PublishingService } from './publishing.service';

type AuthenticatedRequest = Request & { user?: { id: number; name: string; email: string; role: string } };

@UseGuards(AuthGuard, OwnerGuard)
@Controller('publishing')
export class PublishingController {
  constructor(private readonly publishing: PublishingService) {}

  @Get('products')
  products() {
    return this.publishing.listProducts();
  }

  @Get('products/:id/preview')
  preview(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.publishing.preview(Number(id), request.user!.id);
  }

  @Post('products/:id/test-update')
  testUpdate(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.publishing.testUpdate(Number(id), request.user!.id);
  }

  @Post('send')
  send(@Body() body: { variantIds?: number[] }, @Req() request: AuthenticatedRequest) {
    return this.publishing.send(body.variantIds ?? [], request.user!.id);
  }

  @Get('history')
  history() {
    return this.publishing.history();
  }
}
