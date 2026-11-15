import { BadRequestException, Body, Controller, Headers, HttpException, HttpStatus, Post, Ip } from '@nestjs/common';
import { CustomerQuestionsService } from './customer-questions.service';

// Sitedeki "Toptan / kurumsal alım" formu. Talep ERP'de Müşteri Soruları ekranına (platform SITE_TOPTAN) düşer.
const hits = new Map<string, number[]>();
const LIMIT = 5; // saatte IP başına
const WINDOW = 60 * 60 * 1000;

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max) : '');

@Controller('public/wholesale-requests')
export class PublicWholesaleController {
  constructor(private readonly svc: CustomerQuestionsService) {}

  @Post()
  async create(@Body() body: Record<string, unknown>, @Ip() ip: string, @Headers('x-forwarded-for') fwd?: string) {
    // Bot tuzağı: görünmeyen alan doluysa sessizce kabul et, kaydetme
    if (clean(body?.website, 100)) return { success: true };

    const key = (fwd?.split(',')[0] || ip || 'x').trim();
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW);
    if (recent.length >= LIMIT) throw new HttpException('Çok fazla talep gönderildi, lütfen daha sonra tekrar deneyin.', HttpStatus.TOO_MANY_REQUESTS);
    hits.set(key, [...recent, now]);

    const name = clean(body?.name, 80);
    const phone = clean(body?.phone, 30);
    if (name.length < 2 || phone.replace(/\D/g, '').length < 10) {
      throw new BadRequestException('Ad soyad ve geçerli bir telefon numarası gerekli.');
    }
    return this.svc.createWholesaleRequest({
      name,
      phone,
      company: clean(body?.company, 120),
      city: clean(body?.city, 60),
      quantity: clean(body?.quantity, 40),
      message: clean(body?.message, 1000),
      productName: clean(body?.productName, 200),
      productSlug: clean(body?.productSlug, 200),
    });
  }
}
