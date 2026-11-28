import { Controller, Get, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { OwnerGuard } from '../auth/owner.guard';
import { GmailOrderService } from './services/gmail-order.service';
import { DriveSyncService } from './services/drive-sync.service';

@Controller('integrations/gmail')
export class GmailController {
  constructor(private readonly gmailOrder: GmailOrderService, private readonly drive: DriveSyncService) {}

  @Get('auth')
  gmailAuth(@Query('purpose') purpose: string | undefined, @Res() res: Response) {
    // purpose=drive: Google Drive bağlantısı (Flora saksısız fotoğrafları) — aynı Google uygulaması ve dönüş adresi
    const url = purpose === 'drive' ? this.drive.getAuthUrl() : this.gmailOrder.getAuthUrl(purpose);
    res.redirect(url);
  }

  @Get('callback')
  async gmailCallback(@Query('code') code: string, @Query('state') state: string | undefined, @Res() res: Response) {
    const host = process.env.FRONTEND_URL ?? 'https://erp.florayapaycicek.com';
    if (state === 'drive') {
      const driveOk = await this.drive.exchangeCode(code);
      return res.redirect(`${host}/flora/urunler?drive=${driveOk ? 'connected' : 'error'}`);
    }
    const ok = await this.gmailOrder.exchangeCode(code, state);
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
