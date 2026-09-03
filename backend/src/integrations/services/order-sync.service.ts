import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { CredentialVaultService } from './credential-vault.service';

interface TrendyolOrderLine {
  id?: unknown;
  lineItemId?: unknown;
  productName?: unknown;
  name?: unknown;
  merchantSku?: unknown;
  barcode?: unknown;
  quantity?: unknown;
  price?: unknown;
  amount?: unknown;
}

interface TrendyolOrder {
  orderNumber?: unknown;
  id?: unknown;
  shipmentPackageId?: unknown;
  status?: unknown;
  lines?: TrendyolOrderLine[];
  totalPrice?: unknown;
  grossAmount?: unknown;
  cargoPrice?: unknown;
  shipmentPrice?: unknown;
  cargoTrackingNumber?: unknown;
  cargoProviderName?: unknown;
  orderDate?: unknown;
  createdDate?: unknown;
  shipmentAddress?: { firstName?: unknown; lastName?: unknown; fullName?: unknown };
  invoiceAddress?: { fullName?: unknown };
}

@Injectable()
export class OrderSyncService {
  private readonly logger = new Logger(OrderSyncService.name);
  private readonly platform = 'TRENDYOL';
  private readonly lookbackDays = 3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly credentialVault: CredentialVaultService,
  ) {}

  @Cron('*/15 * * * *')
  async syncTrendyolOrders() {
    this.logger.log('Trendyol siparis senkronizasyonu basliyor...');
    try {
      await this.runSync();
    } catch (err) {
      this.logger.error('Trendyol siparis senkronizasyonu hatasi', err instanceof Error ? err.message : String(err));
    }
  }

  async runSync(): Promise<{ processed: number; newOrders: number; stockDeductions: number }> {
    const credentials = await this.loadCredentials();
    if (!credentials) {
      this.logger.warn('Trendyol credentials bulunamadi, sync atlanıyor.');
      return { processed: 0, newOrders: 0, stockDeductions: 0 };
    }

    const orders = await this.fetchOrders(credentials);
    this.logger.log(`Trendyol'dan ${orders.length} siparis cekildi.`);

    let newOrders = 0;
    let stockDeductions = 0;

    for (const order of orders) {
      const externalOrderId = this.text(order.shipmentPackageId ?? order.orderNumber ?? order.id);
      const orderNumber = this.text(order.orderNumber ?? order.id);
      if (!externalOrderId) continue;

      const existing = await this.prisma.marketplaceOrder.findUnique({
        where: { platform_externalOrderId: { platform: this.platform, externalOrderId } },
      });

      if (existing) {
        // Update status if changed
        const newStatus = this.text(order.status);
        if (newStatus && existing.status !== newStatus) {
          await this.prisma.marketplaceOrder.update({
            where: { id: existing.id },
            data: { status: newStatus, updatedAt: new Date() },
          });
        }
        continue;
      }

      // New order — save it
      const lines: TrendyolOrderLine[] = Array.isArray(order.lines) ? order.lines : [];
      const shipmentAddress = (order.shipmentAddress ?? {}) as Record<string, unknown>;
      const invoiceAddress = (order.invoiceAddress ?? {}) as Record<string, unknown>;
      const customerName =
        [shipmentAddress.firstName, shipmentAddress.lastName].filter(Boolean).join(' ') ||
        this.text(shipmentAddress.fullName) ||
        this.text(invoiceAddress.fullName) ||
        '';

      const savedOrder = await this.prisma.marketplaceOrder.create({
        data: {
          platform: this.platform,
          externalOrderId,
          orderNumber,
          status: this.text(order.status) || 'CREATED',
          customerName: customerName || null,
          totalAmount: Number(order.totalPrice ?? order.grossAmount ?? 0),
          cargoAmount: Number(order.cargoPrice ?? order.shipmentPrice ?? 0),
          currency: 'TRY',
          orderDate: this.parseDate(order.orderDate ?? order.createdDate),
          cargoTrackingNumber: order.cargoTrackingNumber ? String(order.cargoTrackingNumber) : null,
          cargoProvider: order.cargoProviderName ? String(order.cargoProviderName) : null,
          rawPayload: order as object,
        },
      });
      newOrders++;

      // Save order items and deduct stock
      for (const line of lines) {
        const barcode = line.barcode ? String(line.barcode) : null;
        const sku = line.merchantSku ? String(line.merchantSku) : null;
        const qty = Number(line.quantity ?? 1);
        const unitPrice = Number(line.price ?? line.amount ?? 0);

        // Find matching stock card: 1) barcode, 2) sku, 3) manual mapping table
        let stockCard: { id: number; stockQuantity: unknown; unit: string } | null = null;
        if (barcode) {
          stockCard = await this.prisma.stockCard.findFirst({
            where: { barcode, status: 'ACTIVE' },
            select: { id: true, stockQuantity: true, unit: true },
          });
        }
        if (!stockCard && sku) {
          stockCard = await this.prisma.stockCard.findFirst({
            where: { sku, status: 'ACTIVE' },
            select: { id: true, stockQuantity: true, unit: true },
          });
        }
        if (!stockCard && sku) {
          const mapping = await this.prisma.$queryRaw<Array<{ stock_card_id: number }>>`
            SELECT stock_card_id FROM marketplace_sku_mappings
            WHERE platform = ${this.platform} AND external_sku = ${sku} LIMIT 1
          `;
          if (mapping.length > 0) {
            stockCard = await this.prisma.stockCard.findFirst({
              where: { id: mapping[0].stock_card_id, status: 'ACTIVE' },
              select: { id: true, stockQuantity: true, unit: true },
            });
          }
        }

        await this.prisma.marketplaceOrderItem.create({
          data: {
            orderId: savedOrder.id,
            productName: this.text(line.productName ?? line.name) || 'Bilinmeyen Urun',
            sku: sku,
            barcode: barcode,
            quantity: qty,
            unitPrice,
            totalPrice: qty * unitPrice,
            stockCardId: stockCard?.id ?? null,
          },
        });

        // Deduct stock if stock card found and quantity > 0
        if (stockCard && Number(stockCard.stockQuantity) > 0) {
          const prevStock = Number(stockCard.stockQuantity);
          const deductQty = Math.min(qty, prevStock);
          const nextStock = prevStock - deductQty;
          const eventKey = `TRENDYOL_ORDER_${savedOrder.id}_SC_${stockCard.id}`;

          const alreadyExists = await this.prisma.stockMovement.findUnique({ where: { eventKey } });
          if (!alreadyExists) {
            await this.prisma.$transaction([
              this.prisma.stockCard.update({
                where: { id: stockCard.id },
                data: { stockQuantity: nextStock, lastMovementAt: new Date() },
              }),
              this.prisma.stockMovement.create({
                data: {
                  stockCardId: stockCard.id,
                  type: 'OUT',
                  quantity: -deductQty,
                  unit: stockCard.unit,
                  previousStock: prevStock,
                  nextStock,
                  note: `Trendyol siparis: ${orderNumber}`,
                  referenceType: 'MARKETPLACE_ORDER',
                  referenceId: String(savedOrder.id),
                  eventKey,
                },
              }),
            ]);
            stockDeductions++;
          }
        }
      }

      // Mark order as stock deducted
      await this.prisma.marketplaceOrder.update({
        where: { id: savedOrder.id },
        data: { stockDeducted: true },
      });
    }

    // Update last sync time
    await this.prisma.integrationConnection.upsert({
      where: { platform: this.platform },
      update: { lastSyncAt: new Date() },
      create: {
        platform: this.platform,
        displayName: 'Trendyol',
        status: 'CONNECTED',
        lastSyncAt: new Date(),
      },
    });

    this.logger.log(`Sync tamamlandi: ${newOrders} yeni siparis, ${stockDeductions} stok dusumu.`);
    return { processed: orders.length, newOrders, stockDeductions };
  }

  private async loadCredentials(): Promise<Record<string, string> | null> {
    const rows = await this.prisma.$queryRaw<Array<{ credentialType: string; encryptedValue: string; externalAccountId: string | null }>>`
      SELECT cc.credential_type AS "credentialType", cc.encrypted_value AS "encryptedValue",
             ca.external_account_id AS "externalAccountId"
      FROM channel_credentials cc
      JOIN channel_accounts ca ON ca.id = cc.channel_account_id
      JOIN sales_channels sc ON sc.id = ca.sales_channel_id
      WHERE sc.code = 'TRENDYOL' AND ca.is_active = true AND cc.is_active = true
      LIMIT 20
    `;

    if (!rows.length) return null;

    const creds: Record<string, string> = {};
    for (const row of rows) {
      try {
        const decrypted = this.credentialVault.decrypt(row.encryptedValue);
        if (row.credentialType === 'API_KEY') creds.API_KEY = decrypted;
        if (row.credentialType === 'API_SECRET') creds.API_SECRET = decrypted;
        if (row.credentialType === 'SUPPLIER_ID') creds.SUPPLIER_ID = decrypted;
      } catch {
        // skip bad credential
      }
    }

    // fallback: use externalAccountId as SUPPLIER_ID
    if (!creds.SUPPLIER_ID && rows[0]?.externalAccountId) {
      creds.SUPPLIER_ID = rows[0].externalAccountId;
    }
    // fallback to env vars
    if (!creds.SUPPLIER_ID) creds.SUPPLIER_ID = process.env.TRENDYOL_SUPPLIER_ID ?? '';
    if (!creds.API_KEY) creds.API_KEY = process.env.TRENDYOL_API_KEY ?? '';
    if (!creds.API_SECRET) creds.API_SECRET = process.env.TRENDYOL_API_SECRET ?? '';
    creds.API_URL = process.env.TRENDYOL_API_URL ?? 'https://api.trendyol.com/sapigw';

    if (!creds.SUPPLIER_ID || !creds.API_KEY || !creds.API_SECRET) return null;
    return creds;
  }

  private async fetchOrders(creds: Record<string, string>): Promise<TrendyolOrder[]> {
    const supplierId = creds.SUPPLIER_ID;
    const apiBase = creds.API_URL.replace(/\/+$/, '');
    const now = Date.now();
    const startDate = now - this.lookbackDays * 24 * 60 * 60 * 1000;

    const auth = Buffer.from(`${creds.API_KEY}:${creds.API_SECRET}`).toString('base64');
    const headers = {
      Authorization: `Basic ${auth}`,
      'User-Agent': `${supplierId} - SelfIntegration`,
      Accept: 'application/json',
    };

    const allOrders: TrendyolOrder[] = [];
    let page = 0;
    let totalPages = 1;

    while (page < totalPages && page < 10) {
      const url = new URL(`${apiBase}/order/sellers/${supplierId}/v2/orders`);
      url.searchParams.set('startDate', String(startDate));
      url.searchParams.set('endDate', String(now));
      url.searchParams.set('orderByField', 'PackageLastModifiedDate');
      url.searchParams.set('orderByDirection', 'DESC');
      url.searchParams.set('page', String(page));
      url.searchParams.set('size', '50');

      const response = await fetch(url.toString(), { method: 'GET', headers });
      if (!response.ok) {
        this.logger.warn(`Trendyol orders API hatasi: HTTP ${response.status}`);
        break;
      }
      const data = (await response.json()) as { content?: TrendyolOrder[]; totalPages?: number };
      if (page === 0) totalPages = Math.min(Number(data.totalPages ?? 1), 10);
      if (Array.isArray(data.content)) allOrders.push(...data.content);
      page++;
    }

    return allOrders;
  }

  async getUnmatchedSkus(platform: string): Promise<Array<{ sku: string; barcode: string | null; orderCount: number }>> {
    const rows = await this.prisma.$queryRaw<Array<{ sku: string; barcode: string | null; adet: bigint }>>`
      SELECT moi.sku, moi.barcode, COUNT(*) as adet
      FROM marketplace_order_items moi
      JOIN marketplace_orders mo ON mo.id = moi.order_id
      WHERE mo.platform = ${platform}
        AND moi.stock_card_id IS NULL
        AND moi.sku IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM marketplace_sku_mappings m
          WHERE m.platform = ${platform} AND m.external_sku = moi.sku
        )
      GROUP BY moi.sku, moi.barcode
      ORDER BY adet DESC
    `;
    return rows.map((r) => ({ sku: r.sku, barcode: r.barcode, orderCount: Number(r.adet) }));
  }

  async listSkuMappings(platform: string) {
    const rows = await this.prisma.$queryRaw<Array<{ id: number; external_sku: string; external_barcode: string | null; stock_card_id: number; sku: string; name: string }>>`
      SELECT m.id, m.external_sku, m.external_barcode, m.stock_card_id, sc.sku, sc.name
      FROM marketplace_sku_mappings m
      JOIN stock_cards sc ON sc.id = m.stock_card_id
      WHERE m.platform = ${platform}
      ORDER BY m.id DESC
    `;
    return rows;
  }

  async saveSkuMapping(body: { platform: string; externalSku: string; externalBarcode?: string; stockCardId: number }) {
    await this.prisma.$executeRaw`
      INSERT INTO marketplace_sku_mappings (platform, external_sku, external_barcode, stock_card_id)
      VALUES (${body.platform}, ${body.externalSku}, ${body.externalBarcode ?? null}, ${body.stockCardId})
      ON CONFLICT (platform, external_sku) DO UPDATE SET stock_card_id = ${body.stockCardId}, external_barcode = ${body.externalBarcode ?? null}
    `;
    return { ok: true };
  }

  async applyRetroactiveMappings(): Promise<{ updated: number }> {
    // Update existing order items that were unmatched but now have a mapping
    const result = await this.prisma.$executeRaw`
      UPDATE marketplace_order_items moi
      SET stock_card_id = m.stock_card_id
      FROM marketplace_sku_mappings m
      JOIN marketplace_orders mo ON mo.id = moi.order_id
      WHERE mo.platform = m.platform
        AND moi.sku = m.external_sku
        AND moi.stock_card_id IS NULL
    `;
    return { updated: Number(result) };
  }

  private text(value: unknown): string {
    return String(value ?? '').trim();
  }

  private parseDate(value: unknown): Date | null {
    const text = this.text(value);
    if (!text) return null;
    const parsed = /^\d+$/.test(text) ? new Date(Number(text)) : new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
}
