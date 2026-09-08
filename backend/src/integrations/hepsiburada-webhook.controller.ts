import { Body, Controller, HttpCode, Logger, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface HbWebhookItem {
  id?: string;
  orderNumber?: string;
  orderDate?: string;
  name?: string;
  sku?: string;
  merchantSKU?: string;
  quantity?: number;
  totalPrice?: { amount?: number; currency?: string };
  unitPrice?: { amount?: number; currency?: string };
  customerName?: string;
  cargoCompany?: string;
  productImageUrlFormat?: string;
  status?: string;
  shippingAddress?: { address?: string; city?: string; town?: string };
}

interface HbWebhookPayload {
  items?: HbWebhookItem[];
}

@Controller('webhooks/hepsiburada')
export class HepsiburadaWebhookController {
  private readonly logger = new Logger(HepsiburadaWebhookController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Post('orders')
  @HttpCode(201)
  async receiveOrder(@Body() payload: HbWebhookPayload) {
    const items = payload?.items ?? [];
    if (!items.length) return { received: true };

    // Aynı orderNumber'a ait tüm itemleri tek sipariş olarak grupla
    const grouped = new Map<string, HbWebhookItem[]>();
    for (const item of items) {
      const key = item.orderNumber ?? item.id ?? 'unknown';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(item);
    }

    for (const [orderNumber, lineItems] of grouped) {
      const first = lineItems[0];
      const totalAmount = lineItems.reduce((s, i) => s + (i.totalPrice?.amount ?? 0), 0);
      const orderDate = first.orderDate ? new Date(first.orderDate) : new Date();

      try {
        const existing = await this.prisma.marketplaceOrder.findUnique({
          where: { platform_externalOrderId: { platform: 'HEPSIBURADA', externalOrderId: orderNumber } },
        });
        if (existing) {
          this.logger.log(`HB webhook: sipariş zaten var, güncelleniyor: ${orderNumber}`);
          await this.prisma.marketplaceOrder.update({
            where: { id: existing.id },
            data: { status: first.status === 'Open' ? 'CREATED' : (first.status ?? existing.status), rawPayload: payload as object },
          });
          continue;
        }

        await this.prisma.marketplaceOrder.create({
          data: {
            platform: 'HEPSIBURADA',
            orderNumber,
            externalOrderId: orderNumber,
            status: first.status === 'Open' ? 'CREATED' : (first.status ?? 'CREATED'),
            customerName: first.customerName ?? null,
            totalAmount,
            currency: first.totalPrice?.currency ?? 'TRY',
            orderDate,
            cargoProvider: first.cargoCompany ?? null,
            rawPayload: payload as object,
            items: {
              create: lineItems.map((li) => ({
                productName: li.name ?? 'Hepsiburada Ürünü',
                sku: li.sku ?? null,
                barcode: li.merchantSKU ?? null,
                quantity: li.quantity ?? 1,
                unitPrice: li.unitPrice?.amount ?? 0,
                totalPrice: li.totalPrice?.amount ?? 0,
              })),
            },
          },
        });

        this.logger.log(`HB webhook: yeni sipariş kaydedildi: ${orderNumber}`);
      } catch (err) {
        this.logger.error(`HB webhook sipariş kayıt hatası (${orderNumber}): ${String(err)}`);
      }
    }

    return { received: true };
  }
}
