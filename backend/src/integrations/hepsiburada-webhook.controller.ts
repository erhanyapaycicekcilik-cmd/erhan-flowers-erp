import { Body, Controller, ForbiddenException, Headers, HttpCode, Logger, Post } from '@nestjs/common';
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
  async receiveOrder(
    @Body() payload: HbWebhookPayload,
    @Headers('x-hb-webhook-secret') secret?: string,
  ) {
    const expected = process.env.HB_WEBHOOK_SECRET;
    // Secret tanımlıysa doğrula; tanımlı değilse geç (eski davranış korunur)
    if (expected && secret !== expected) {
      this.logger.warn(`Hepsiburada webhook: geçersiz secret — istek reddedildi`);
      throw new ForbiddenException('Geçersiz webhook secret');
    }
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

        const savedOrder = await this.prisma.marketplaceOrder.create({
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

        // Her kalem için stok düşümü yap (barcode = merchantSKU)
        for (const li of lineItems) {
          const barcode = li.merchantSKU ?? li.sku ?? null;
          const qty = li.quantity ?? 1;
          if (barcode) {
            await this.deductProductStock(barcode, qty, `HB_WEBHOOK_${savedOrder.id}`, `Hepsiburada siparis: ${orderNumber}`);
          }
        }

        this.logger.log(`HB webhook: yeni sipariş kaydedildi: ${orderNumber}`);
      } catch (err) {
        this.logger.error(`HB webhook sipariş kayıt hatası (${orderNumber}): ${String(err)}`);
      }
    }

    return { received: true };
  }

  private async deductProductStock(barcode: string, qty: number, orderPrefix: string, note: string): Promise<void> {
    try {
      const product = await this.prisma.product.findFirst({
        where: { barcode },
        select: { id: true, stockQuantity: true },
      });
      if (!product) {
        // StockCard üzerinden de dene
        const sc = await this.prisma.stockCard.findFirst({
          where: { barcode, status: 'ACTIVE' },
          select: { id: true, stockQuantity: true, unit: true },
        });
        if (!sc) return;
        const eventKey = `${orderPrefix}_SC_${sc.id}`;
        const exists = await this.prisma.stockMovement.findUnique({ where: { eventKey } });
        if (exists) return;
        const prev = Number(sc.stockQuantity);
        const deduct = Math.min(qty, prev);
        const next = prev - deduct;
        await this.prisma.$transaction([
          this.prisma.stockCard.update({ where: { id: sc.id }, data: { stockQuantity: next, lastMovementAt: new Date() } }),
          this.prisma.stockMovement.create({ data: { stockCardId: sc.id, type: 'OUT', quantity: -deduct, unit: sc.unit, previousStock: prev, nextStock: next, note, referenceType: 'MARKETPLACE_ORDER', referenceId: orderPrefix, eventKey } }),
        ]);
        return;
      }
      const eventKey = `${orderPrefix}_PRODUCT_${product.id}`;
      const exists = await this.prisma.stockMovement.findUnique({ where: { eventKey } });
      if (exists) return;
      const prev = Number(product.stockQuantity);
      const next = Math.max(0, prev - qty);
      await this.prisma.$transaction([
        this.prisma.product.update({ where: { id: product.id }, data: { stockQuantity: next } }),
        this.prisma.stockMovement.create({ data: { productId: product.id, type: 'OUT', quantity: -(prev - next), unit: 'ADET', previousStock: prev, nextStock: next, note, referenceType: 'MARKETPLACE_ORDER', referenceId: orderPrefix, eventKey } }),
      ]);
    } catch (err) {
      this.logger.warn(`HB webhook stok düşümü hatası (${barcode}): ${String(err)}`);
    }
  }
}
