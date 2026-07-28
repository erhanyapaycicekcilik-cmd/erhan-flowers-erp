import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DeliveriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(status: string) {
    const filter = this.deliveryStatus(status);
    return this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT
        d.id,
        d.sale_id AS "saleId",
        d.delivery_type AS "deliveryType",
        d.status,
        d.planned_date AS "plannedDate",
        d.planned_time AS "plannedTime",
        d.delivery_note AS "deliveryNote",
        d.delivered_at AS "deliveredAt",
        s.sale_number AS "saleNumber",
        s.status AS "saleStatus",
        s.invoice_status AS "invoiceStatus",
        s.grand_total AS "grandTotal",
        c.display_name AS "customerName",
        c.phone AS "customerPhone",
        a.full_address AS "fullAddress",
        a.city,
        a.district
      FROM retail_deliveries d
      JOIN retail_sales s ON s.id = d.sale_id
      JOIN retail_customers c ON c.id = s.customer_id
      LEFT JOIN retail_customer_addresses a ON a.id = d.address_id
      WHERE (${filter}::text = '' OR d.status::text = ${filter})
      ORDER BY d.updated_at DESC, d.id DESC
      LIMIT 200
    `;
  }

  async updateStatus(id: number, payload: unknown, userId: number) {
    const body = (payload ?? {}) as Record<string, unknown>;
    const nextStatus = this.deliveryStatus(body.status);
    if (!nextStatus) throw new BadRequestException('Teslimat durumu zorunludur.');
    return this.prisma.$transaction(async (tx) => {
      const deliveries = await tx.$queryRaw<Array<Record<string, unknown>>>`SELECT * FROM retail_deliveries WHERE id = ${id} FOR UPDATE`;
      const delivery = deliveries[0];
      if (!delivery) throw new BadRequestException('Teslimat bulunamadı.');
      await tx.$executeRaw`
        UPDATE retail_deliveries
        SET status = ${nextStatus}::"RetailDeliveryStatus",
            delivered_at = CASE WHEN ${nextStatus} = 'DELIVERED' THEN NOW() ELSE delivered_at END,
            delivered_by_id = CASE WHEN ${nextStatus} = 'DELIVERED' THEN ${userId} ELSE delivered_by_id END,
            updated_at = NOW()
        WHERE id = ${id}
      `;
      const saleStatus = nextStatus === 'OUT_FOR_DELIVERY' ? 'OUT_FOR_DELIVERY' : nextStatus === 'DELIVERED' ? 'DELIVERED' : null;
      if (saleStatus) {
        await tx.$executeRaw`UPDATE retail_sales SET status = ${saleStatus}::"RetailSaleStatus", updated_at = NOW() WHERE id = ${Number(delivery.sale_id)}`;
        await tx.$executeRaw`
          INSERT INTO retail_sale_status_history (sale_id, old_status, new_status, note, changed_by_id, changed_at)
          VALUES (${Number(delivery.sale_id)}, NULL, ${saleStatus}::"RetailSaleStatus", 'Teslimat ekranından güncellendi.', ${userId}, NOW())
        `;
      }
      const updated = await tx.$queryRaw<Array<Record<string, unknown>>>`SELECT * FROM retail_deliveries WHERE id = ${id}`;
      return updated[0];
    });
  }

  private deliveryStatus(value: unknown) {
    const text = typeof value === 'string' ? value.trim().toUpperCase() : '';
    const map: Record<string, string> = {
      BEKLEYEN: 'WAITING',
      HAZIRLANAN: 'PREPARING',
      YOLDA: 'OUT_FOR_DELIVERY',
      'TESLIM EDILDI': 'DELIVERED',
      'TESLİM EDİLDİ': 'DELIVERED',
    };
    const allowed = ['NOT_REQUIRED', 'WAITING', 'PLANNED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
    return allowed.includes(text) ? text : map[text] ?? '';
  }
}
