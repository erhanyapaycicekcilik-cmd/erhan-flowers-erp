import { Controller, Get, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { OwnerGuard } from '../auth/owner.guard';
import { GmailOrderService } from './services/gmail-order.service';

@Controller('integrations/gmail')
export class GmailController {
  constructor(private readonly gmailOrder: GmailOrderService) {}

  @Get('auth')
  gmailAuth(@Query('purpose') purpose: string | undefined, @Res() res: Response) {
    const url = this.gmailOrder.getAuthUrl(purpose);
    res.redirect(url);
  }

  @Get('callback')
  async gmailCallback(@Query('code') code: string, @Query('state') state: string | undefined, @Res() res: Response) {
    const ok = await this.gmailOrder.exchangeCode(code, state);
    const host = process.env.FRONTEND_URL ?? 'https://erp.florayapaycicek.com';
    if (state === 'bills') return res.redirect(`${host}/borclar?gmail=${ok ? 'connected' : 'error'}`);
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
