import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CustomerQuestionsService } from './customer-questions.service';
import { PushNotificationService } from './push-notification.service';

@UseGuards(JwtAuthGuard)
@Controller('customer-questions')
export class CustomerQuestionsController {
  constructor(
    private readonly service: CustomerQuestionsService,
    private readonly push: PushNotificationService,
  ) {}

  @Get()
  list(
    @Query('status') status?: string,
    @Query('platform') platform?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list({
      status,
      platform,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
  }

  @Post(':id/answer')
  answer(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { answer: string; companyCode?: string },
  ) {
    return this.service.answer(id, body.answer, body.companyCode ?? 'ERHAN');
  }

  @Post('sync')
  async sync() {
    await this.service.syncAll();
    return { ok: true };
  }

  // Push notification abonelik endpoint'leri (auth guard olmadan da çalışır,
  // çünkü service worker token taşımaz — ayrı bir public route olarak açıyoruz)
  @Post('push/subscribe')
  subscribe(@Body() body: { endpoint: string; p256dh: string; auth: string }) {
    return this.push.subscribe(body.endpoint, body.p256dh, body.auth);
  }

  @Post('push/unsubscribe')
  unsubscribe(@Body() body: { endpoint: string }) {
    return this.push.unsubscribe(body.endpoint);
  }

  @Get('push/vapid-public-key')
  vapidPublicKey() {
    return { key: process.env.VAPID_PUBLIC_KEY ?? '' };
  }
}
