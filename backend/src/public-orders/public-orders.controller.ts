import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PublicOrdersService } from './public-orders.service';

// AuthGuard YOK — müşteri sipariş formu (herkese açık), /hizli-siparis sayfası.
// DİKKAT: 'public/orders' sitenin sepet/ödeme siparişleri (web-orders) içindir; bu form oraya bağlanırsa
// site siparişleri bu kontrole düşer ve "Ad soyad zorunludur" hatası verir (25-27.11.2026 olayı).
@Controller('public/quick-orders')
export class PublicOrdersController {
  constructor(private readonly service: PublicOrdersService) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // dakikada max 5 sipariş
  async create(@Body() body: Record<string, unknown>) {
    const name = String(body.name ?? '').trim();
    const phone = String(body.phone ?? '').trim();
    const city = String(body.city ?? '').trim();
    const district = String(body.district ?? '').trim();
    const address = String(body.address ?? '').trim();
    const invoiceType = body.invoiceType === 'corporate' ? 'corporate' : 'individual';

    if (!name) throw new BadRequestException('Ad soyad zorunludur.');
    if (!phone || phone.replace(/\D/g, '').length < 10) throw new BadRequestException('Geçerli telefon giriniz.');
    if (!city) throw new BadRequestException('Şehir zorunludur.');
    if (!district) throw new BadRequestException('İlçe zorunludur.');
    if (!address) throw new BadRequestException('Adres zorunludur.');

    if (invoiceType === 'corporate') {
      if (!String(body.companyName ?? '').trim()) throw new BadRequestException('Şirket adı zorunludur.');
      if (!String(body.taxNumber ?? '').trim()) throw new BadRequestException('Vergi numarası zorunludur.');
      if (!String(body.taxOffice ?? '').trim()) throw new BadRequestException('Vergi dairesi zorunludur.');
    }

    return this.service.createPublicOrder({
      name,
      phone,
      city,
      district,
      address,
      note: String(body.note ?? '').trim() || undefined,
      invoiceType,
      companyName: String(body.companyName ?? '').trim() || undefined,
      taxNumber: String(body.taxNumber ?? '').trim() || undefined,
      taxOffice: String(body.taxOffice ?? '').trim() || undefined,
      invoiceAddress: String(body.invoiceAddress ?? '').trim() || undefined,
      channel: String(body.channel ?? 'WHATSAPP'),
    });
  }
}
