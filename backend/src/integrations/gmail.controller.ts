import { Controller, Get, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { OwnerGuard } from '../auth/owner.guard';
import { GmailOrderService } from './services/gmail-order.service';

@Controller('integrations/gmail')
export class GmailController {
  constructor(private readonly gmailOrder: GmailOrderService) {}

  @Get('auth')
  gmailAuth(@Res() res: Response) {
    const url = this.gmailOrder.getAuthUrl();
    res.redirect(url);
  }

  @Get('callback')
  async gmailCallback(@Query('code') code: string, @Res() res: Response) {
    const ok = await this.gmailOrder.exchangeCode(code);
    const host = process.env.FRONTEND_URL ?? 'https://erp.florayapaycicek.com';
    res.redirect(`${host}/integrations?gmail=${ok ? 'connected' : 'error'}`);
  }

  @Get('status')
  gmailStatus() {
    return this.gmailOrder.getStatus();
  }

  @Post('sync')
  @UseGuards(OwnerGuard)
  async gmailSync() {
    await this.gmailOrder.pollNewOrderEmails();
    return { ok: true, message: 'Gmail sipariş senkronizasyonu başlatıldı.' };
  }
}
