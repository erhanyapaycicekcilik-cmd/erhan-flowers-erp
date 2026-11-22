import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SalesService } from '../sales/sales.service';

@Injectable()
export class PublicOrdersService implements OnModuleInit {
  private systemUserId = 1;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sales: SalesService,
  ) {}

  async onModuleInit() {
    const rows = await this.prisma.$queryRaw<{ id: number }[]>`SELECT id FROM users WHERE role = 'OWNER' LIMIT 1`;
    if (rows[0]) this.systemUserId = rows[0].id;
  }

  async createPublicOrder(body: {
    name: string;
    phone: string;
    city: string;
    district: string;
    address: string;
    note?: string;
    invoiceType: 'individual' | 'corporate';
    companyName?: string;
    taxNumber?: string;
    taxOffice?: string;
    invoiceAddress?: string;
    channel?: string;
  }) {
    const internalNoteParts: string[] = [];
    if (body.invoiceType === 'corporate') {
      internalNoteParts.push('[KURUMSAL FATURA]');
      if (body.companyName) internalNoteParts.push(`Şirket: ${body.companyName}`);
      if (body.taxNumber) internalNoteParts.push(`Vergi No: ${body.taxNumber}`);
      if (body.taxOffice) internalNoteParts.push(`Vergi Dairesi: ${body.taxOffice}`);
      if (body.invoiceAddress) internalNoteParts.push(`Fatura Adresi: ${body.invoiceAddress}`);
    }

    const channel = (body.channel ?? 'WHATSAPP').toUpperCase();
    const clientRequestId = `public-order-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    return this.sales.createSale({
      clientRequestId,
      channel,
      saleType: 'STORE_SALE',
      status: 'CONFIRMED',
      customer: {
        firstName: body.name.trim(),
        phone: body.phone.trim(),
      },
      address: {
        city: body.city.trim(),
        district: body.district.trim(),
        fullAddress: body.address.trim(),
      },
      delivery: {
        deliveryType: 'CARGO',
        note: body.note?.trim() || undefined,
      },
      payments: [{ method: 'CASH', amount: 0, clientKey: `pay-${clientRequestId}` }],
      items: [{ productName: 'Sipariş', quantity: 1, unitPrice: 0, discountAmount: 0, stockFulfillmentType: 'READY_STOCK' }],
      customerNote: body.note?.trim() || undefined,
      internalNote: internalNoteParts.length ? internalNoteParts.join('\n') : undefined,
    }, this.systemUserId);
  }
}
