import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as XLSX from 'xlsx';
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
  async syncAllPlatforms() {
    this.logger.log('Tüm platform siparis senkronizasyonu basliyor...');
    try { await this.runSync(); } catch (err) {
      this.logger.error('Trendyol sync hatasi', err instanceof Error ? err.message : String(err));
    }
    try { await this.runN11Sync(); } catch (err) {
      this.logger.error('N11 sync hatasi', err instanceof Error ? err.message : String(err));
    }
    try { await this.runFloraTrendyolSync(); } catch (err) {
      this.logger.error('FLORA Trendyol sync hatasi', err instanceof Error ? err.message : String(err));
    }
    try { await this.runFloraN11Sync(); } catch (err) {
      this.logger.error('FLORA N11 sync hatasi', err instanceof Error ? err.message : String(err));
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
        // Check if this SKU has multi-component recipe
        const components = sku ? await this.prisma.$queryRaw<Array<{ stock_card_id: number; quantity: number }>>`
          SELECT stock_card_id, quantity FROM marketplace_sku_components
          WHERE platform = ${this.platform} AND external_sku = ${sku}
        ` : [];

        if (components.length > 0) {
          // Deduct from each component
          for (const comp of components) {
            const compCard = await this.prisma.stockCard.findFirst({ where: { id: comp.stock_card_id }, select: { id: true, stockQuantity: true, unit: true } });
            if (!compCard) continue;
            const deductQty = Number(comp.quantity) * qty;
            const prev = Number(compCard.stockQuantity);
            const next = prev - deductQty;
            const eventKey = `TRENDYOL_ORDER_${savedOrder.id}_SC_${compCard.id}`;
            const exists = await this.prisma.stockMovement.findUnique({ where: { eventKey } });
            if (!exists) {
              await this.prisma.$transaction([
                this.prisma.stockCard.update({ where: { id: compCard.id }, data: { stockQuantity: next, lastMovementAt: new Date() } }),
                this.prisma.stockMovement.create({ data: { stockCardId: compCard.id, type: 'OUT', quantity: -deductQty, unit: compCard.unit, previousStock: prev, nextStock: next, note: `Trendyol siparis: ${orderNumber}`, referenceType: 'MARKETPLACE_ORDER', referenceId: String(savedOrder.id), eventKey } }),
              ]);
              stockDeductions++;
            }
          }
        } else if (stockCard && Number(stockCard.stockQuantity) > 0) {
          const prevStock = Number(stockCard.stockQuantity);
          const deductQty = Math.min(qty, prevStock);
          const nextStock = prevStock - deductQty;
          const eventKey = `TRENDYOL_ORDER_${savedOrder.id}_SC_${stockCard.id}`;
          const alreadyExists = await this.prisma.stockMovement.findUnique({ where: { eventKey } });
          if (!alreadyExists) {
            await this.prisma.$transaction([
              this.prisma.stockCard.update({ where: { id: stockCard.id }, data: { stockQuantity: nextStock, lastMovementAt: new Date() } }),
              this.prisma.stockMovement.create({ data: { stockCardId: stockCard.id, type: 'OUT', quantity: -deductQty, unit: stockCard.unit, previousStock: prevStock, nextStock, note: `Trendyol siparis: ${orderNumber}`, referenceType: 'MARKETPLACE_ORDER', referenceId: String(savedOrder.id), eventKey } }),
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
      JOIN companies co ON co.id = ca.company_id
      WHERE sc.code = 'TRENDYOL' AND ca.is_active = true AND cc.is_active = true AND co.code = 'ERHAN'
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

  async runN11Sync(): Promise<{ processed: number; newOrders: number; stockDeductions: number }> {
    const rows = await this.prisma.$queryRaw<Array<{ credentialType: string; encryptedValue: string }>>`
      SELECT cc.credential_type AS "credentialType", cc.encrypted_value AS "encryptedValue"
      FROM channel_credentials cc
      JOIN channel_accounts ca ON ca.id = cc.channel_account_id
      JOIN sales_channels sc ON sc.id = ca.sales_channel_id
      JOIN companies co ON co.id = ca.company_id
      WHERE sc.code = 'N11' AND ca.is_active = true AND cc.is_active = true AND co.code = 'ERHAN' LIMIT 10
    `;
    const creds: Record<string, string> = {
      API_KEY: process.env.N11_API_KEY ?? '',
      API_SECRET: process.env.N11_API_SECRET ?? '',
    };
    for (const row of rows) {
      try {
        const val = this.credentialVault.decrypt(row.encryptedValue);
        if (row.credentialType === 'API_KEY') creds.API_KEY = val;
        if (row.credentialType === 'API_SECRET') creds.API_SECRET = val;
      } catch { /* skip */ }
    }
    if (!creds.API_KEY || !creds.API_SECRET) { this.logger.warn('N11 credentials bulunamadi.'); return { processed: 0, newOrders: 0, stockDeductions: 0 }; }

    const apiBase = (process.env.N11_API_URL ?? 'https://api.n11.com').replace(/\/+$/, '');
    const lookback = Date.now() - this.lookbackDays * 24 * 60 * 60 * 1000;
    const headers = { appkey: creds.API_KEY, appsecret: creds.API_SECRET, Accept: 'application/json', 'User-Agent': 'ErhanFlowersERP-N11' };

    const allOrders: Array<Record<string, unknown>> = [];
    let page = 0;
    while (page < 10) {
      const url = new URL(`${apiBase}/rest/delivery/v1/shipmentPackages`);
      url.searchParams.set('page', String(page));
      url.searchParams.set('size', '50');
      const res = await fetch(url.toString(), { method: 'GET', headers });
      if (!res.ok) { this.logger.warn(`N11 orders API hatasi: HTTP ${res.status}`); break; }
      const data = await res.json() as { content?: Array<Record<string, unknown>>; shipmentPackages?: Array<Record<string, unknown>>; totalCount?: number; pageCount?: number; totalPages?: number };
      const packages = data.content ?? data.shipmentPackages ?? [];
      if (!packages.length) break;
      allOrders.push(...packages);
      const total = data.totalCount ?? data.pageCount ?? 0;
      if (total > 0 && allOrders.length >= total) break;
      page++;
    }

    this.logger.log(`N11'den ${allOrders.length} siparis cekildi.`);
    let newOrders = 0; let stockDeductions = 0;

    for (const order of allOrders) {
      const externalOrderId = String(order.id ?? order.shipmentPackageId ?? '');
      if (!externalOrderId) continue;
      const rawDate = order.lastModifiedDate ?? order.orderDate;
      const orderDate = rawDate ? new Date(typeof rawDate === 'number' ? rawDate : String(rawDate)) : null;
      if (orderDate && orderDate.getTime() < lookback) continue;

      const existing = await this.prisma.marketplaceOrder.findUnique({
        where: { platform_externalOrderId: { platform: 'N11', externalOrderId } },
      });
      if (existing) {
        const newStatus = String(order.shipmentPackageStatus ?? order.status ?? '');
        if (newStatus && existing.status !== newStatus) {
          await this.prisma.marketplaceOrder.update({ where: { id: existing.id }, data: { status: newStatus } });
        }
        continue;
      }

      const lines = Array.isArray(order.lines) ? order.lines as Array<Record<string, unknown>> : (Array.isArray(order.orderItems) ? order.orderItems as Array<Record<string, unknown>> : []);
      const savedOrder = await this.prisma.marketplaceOrder.create({
        data: {
          platform: 'N11',
          externalOrderId,
          orderNumber: String(order.orderNumber ?? externalOrderId),
          status: String(order.shipmentPackageStatus ?? order.status ?? 'CREATED'),
          customerName: String(order.customerfullName ?? (order.billingAddress as Record<string,unknown>)?.fullName ?? order.buyerName ?? ''),
          totalAmount: Number(order.totalAmount ?? order.amount ?? 0),
          cargoAmount: Number(order.cargoAmount ?? 0),
          currency: 'TRY',
          orderDate: orderDate,
          rawPayload: order as object,
        },
      });
      newOrders++;

      for (const line of lines) {
        const sku = (line.stockCode ?? line.productSellerCode ?? line.merchantSku) ? String(line.stockCode ?? line.productSellerCode ?? line.merchantSku) : null;
        const barcode = line.barcode ? String(line.barcode) : null;
        const qty = Number(line.quantity ?? 1);
        const unitPrice = Number(line.price ?? line.unitPrice ?? 0);

        let stockCard: { id: number; stockQuantity: unknown; unit: string } | null = null;
        if (barcode) stockCard = await this.prisma.stockCard.findFirst({ where: { barcode, status: 'ACTIVE' }, select: { id: true, stockQuantity: true, unit: true } });
        if (!stockCard && sku) stockCard = await this.prisma.stockCard.findFirst({ where: { sku, status: 'ACTIVE' }, select: { id: true, stockQuantity: true, unit: true } });
        if (!stockCard && sku) {
          const mapping = await this.prisma.$queryRaw<Array<{ stock_card_id: number }>>`SELECT stock_card_id FROM marketplace_sku_mappings WHERE platform = 'N11' AND external_sku = ${sku} LIMIT 1`;
          if (mapping.length > 0) stockCard = await this.prisma.stockCard.findFirst({ where: { id: mapping[0].stock_card_id, status: 'ACTIVE' }, select: { id: true, stockQuantity: true, unit: true } });
        }

        await this.prisma.marketplaceOrderItem.create({
          data: { orderId: savedOrder.id, productName: String(line.productName ?? 'Bilinmeyen Urun'), sku, barcode, quantity: qty, unitPrice, totalPrice: qty * unitPrice, stockCardId: stockCard?.id ?? null },
        });

        if (stockCard && Number(stockCard.stockQuantity) > 0) {
          const prev = Number(stockCard.stockQuantity);
          const deduct = Math.min(qty, prev);
          const next = prev - deduct;
          const eventKey = `N11_ORDER_${savedOrder.id}_SC_${stockCard.id}`;
          const exists = await this.prisma.stockMovement.findUnique({ where: { eventKey } });
          if (!exists) {
            await this.prisma.$transaction([
              this.prisma.stockCard.update({ where: { id: stockCard.id }, data: { stockQuantity: next, lastMovementAt: new Date() } }),
              this.prisma.stockMovement.create({ data: { stockCardId: stockCard.id, type: 'OUT', quantity: -deduct, unit: stockCard.unit, previousStock: prev, nextStock: next, note: `N11 siparis: ${savedOrder.orderNumber}`, referenceType: 'MARKETPLACE_ORDER', referenceId: String(savedOrder.id), eventKey } }),
            ]);
            stockDeductions++;
          }
        }
      }
      await this.prisma.marketplaceOrder.update({ where: { id: savedOrder.id }, data: { stockDeducted: true } });
    }

    await this.prisma.integrationConnection.upsert({
      where: { platform: 'N11' },
      update: { lastSyncAt: new Date() },
      create: { platform: 'N11', displayName: 'N11', status: 'CONNECTED', lastSyncAt: new Date() },
    });

    this.logger.log(`N11 sync tamamlandi: ${newOrders} yeni siparis, ${stockDeductions} stok dusumu.`);
    return { processed: allOrders.length, newOrders, stockDeductions };
  }

  async listSkuComponents(platform: string, sku: string) {
    return this.prisma.$queryRaw<Array<{ id: number; stock_card_id: number; quantity: number; sku: string; name: string; unit: string }>>`
      SELECT c.id, c.stock_card_id, c.quantity, sc.sku, sc.name, sc.unit
      FROM marketplace_sku_components c
      JOIN stock_cards sc ON sc.id = c.stock_card_id
      WHERE c.platform = ${platform} AND c.external_sku = ${sku}
      ORDER BY c.id
    `;
  }

  async saveSkuComponent(body: { platform: string; externalSku: string; stockCardId: number; quantity: number }) {
    await this.prisma.$executeRaw`
      INSERT INTO marketplace_sku_components (platform, external_sku, stock_card_id, quantity)
      VALUES (${body.platform}, ${body.externalSku}, ${body.stockCardId}, ${body.quantity})
      ON CONFLICT (platform, external_sku, stock_card_id) DO UPDATE SET quantity = ${body.quantity}
    `;
    return { ok: true };
  }

  async deleteSkuComponent(body: { platform: string; externalSku: string; stockCardId: number }) {
    await this.prisma.$executeRaw`
      DELETE FROM marketplace_sku_components
      WHERE platform = ${body.platform} AND external_sku = ${body.externalSku} AND stock_card_id = ${body.stockCardId}
    `;
    return { ok: true };
  }

  async getAllMappingsWithComponents(platform: string) {
    const unmatched = await this.getUnmatchedSkus(platform);
    const mappings = await this.listSkuMappings(platform);
    const components = await this.prisma.$queryRaw<Array<{ external_sku: string; stock_card_id: number; quantity: number; sku: string; name: string; unit: string }>>`
      SELECT c.external_sku, c.stock_card_id, c.quantity, sc.sku, sc.name, sc.unit
      FROM marketplace_sku_components c
      JOIN stock_cards sc ON sc.id = c.stock_card_id
      WHERE c.platform = ${platform}
      ORDER BY c.external_sku, c.id
    `;
    // Group components by sku
    const componentMap: Record<string, typeof components> = {};
    for (const c of components) {
      if (!componentMap[c.external_sku]) componentMap[c.external_sku] = [];
      componentMap[c.external_sku].push(c);
    }
    // All SKUs that appear in orders
    const allSkus = await this.prisma.$queryRaw<Array<{ sku: string; barcode: string | null; orderCount: bigint }>>`
      SELECT moi.sku, moi.barcode, COUNT(*) as orderCount
      FROM marketplace_order_items moi
      JOIN marketplace_orders mo ON mo.id = moi.order_id
      WHERE mo.platform = ${platform} AND moi.sku IS NOT NULL
      GROUP BY moi.sku, moi.barcode ORDER BY orderCount DESC
    `;
    return allSkus.map(s => ({
      sku: s.sku,
      barcode: s.barcode,
      orderCount: Number(s.orderCount),
      components: componentMap[s.sku] ?? [],
      singleMapping: mappings.find(m => m.external_sku === s.sku) ?? null,
    }));
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

  async exportSkuMappingTemplate(platform: string): Promise<Buffer> {
    // Tüm eşleştirilmemiş ve eşleştirilmiş SKU'ları al
    const rows = await this.getAllMappingsWithComponents(platform);

    // ERP stok kartlarını al
    const stockCards = await this.prisma.stockCard.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, sku: true, name: true, unit: true, stockQuantity: true },
      orderBy: { name: 'asc' },
    });

    // Ana sayfa: SKU listesi
    const skuData = rows.map((row) => ({
      'Pazaryeri SKU': row.sku,
      'Barkod': row.barcode ?? '',
      'Sipariş Sayısı': row.orderCount,
      'Eşleşme Durumu': (row.components.length > 0 || row.singleMapping) ? 'Eşleştirildi' : 'Bekliyor',
      'Mevcut Eşleşme (Stok Kodu)': row.singleMapping?.sku ?? row.components.map((c) => c.sku).join(', '),
      'ERP Stok Kodu (Doldur)': '',
      'Adet (Doldur)': 1,
    }));

    // Referans sayfa: stok kartları listesi
    const scData = stockCards.map((sc) => ({
      'Stok Kodu': sc.sku,
      'Ürün Adı': sc.name,
      'Birim': sc.unit,
      'Stok': sc.stockQuantity,
    }));

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(skuData);
    const ws2 = XLSX.utils.json_to_sheet(scData);
    XLSX.utils.book_append_sheet(wb, ws1, 'SKU Eşleştirme');
    XLSX.utils.book_append_sheet(wb, ws2, 'ERP Stok Kartları');

    // Sütun genişlikleri
    ws1['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 12 }, { wch: 16 }, { wch: 30 }, { wch: 25 }, { wch: 10 }];
    ws2['!cols'] = [{ wch: 20 }, { wch: 40 }, { wch: 10 }, { wch: 10 }];

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    return buf;
  }

  async importSkuMappingExcel(platform: string, file: Express.Multer.File | undefined) {
    if (!file) return { ok: false, matched: 0, skipped: 0, errors: [] as string[], message: 'Dosya seçilmedi.' };

    const wb = XLSX.read(file.buffer, { type: 'buffer' });
    const ws = wb.Sheets['SKU Eşleştirme'];
    if (!ws) return { ok: false, matched: 0, skipped: 0, errors: [] as string[], message: '"SKU Eşleştirme" sayfası bulunamadı.' };

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

    let matched = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
      const externalSku = String(row['Pazaryeri SKU'] ?? '').trim();
      const erpSku = String(row['ERP Stok Kodu (Doldur)'] ?? '').trim();
      const qty = Number(row['Adet (Doldur)'] ?? 1) || 1;

      if (!externalSku || !erpSku) { skipped++; continue; }

      const stockCard = await this.prisma.stockCard.findFirst({ where: { sku: erpSku } });
      if (!stockCard) {
        errors.push(`${externalSku}: "${erpSku}" stok kodu bulunamadı`);
        skipped++;
        continue;
      }

      // Upsert: varsa güncelle, yoksa ekle
      await this.prisma.$executeRaw`
        INSERT INTO marketplace_sku_components (platform, external_sku, stock_card_id, quantity, created_at, updated_at)
        VALUES (${platform}, ${externalSku}, ${stockCard.id}, ${qty}, NOW(), NOW())
        ON CONFLICT (platform, external_sku, stock_card_id) DO UPDATE SET quantity = ${qty}, updated_at = NOW()
      `;
      matched++;
    }

    return {
      ok: true,
      matched,
      skipped,
      errors,
      message: `${matched} SKU eşleştirildi, ${skipped} satır atlandı${errors.length ? `, ${errors.length} hata` : ''}.`,
    };
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

  private async loadFloraCredentials(platform: 'TRENDYOL' | 'N11'): Promise<Record<string, string> | null> {
    const rows = await this.prisma.$queryRaw<Array<{ credentialType: string; encryptedValue: string; externalAccountId: string | null }>>`
      SELECT cc.credential_type AS "credentialType", cc.encrypted_value AS "encryptedValue",
             ca.external_account_id AS "externalAccountId"
      FROM channel_credentials cc
      JOIN channel_accounts ca ON ca.id = cc.channel_account_id
      JOIN sales_channels sc ON sc.id = ca.sales_channel_id
      JOIN companies co ON co.id = ca.company_id
      WHERE sc.code = ${platform} AND ca.is_active = true AND cc.is_active = true AND co.code = 'FLORA'
      LIMIT 20
    `;
    if (!rows.length) return null;
    const creds: Record<string, string> = {};
    for (const row of rows) {
      try {
        const val = this.credentialVault.decrypt(row.encryptedValue);
        if (row.credentialType === 'API_KEY') creds.API_KEY = val;
        if (row.credentialType === 'API_SECRET') creds.API_SECRET = val;
        if (row.credentialType === 'SUPPLIER_ID') creds.SUPPLIER_ID = val;
      } catch { /* skip */ }
    }
    if (!creds.SUPPLIER_ID && rows[0]?.externalAccountId) creds.SUPPLIER_ID = rows[0].externalAccountId;
    return creds;
  }

  async runFloraTrendyolSync(): Promise<{ processed: number; newOrders: number }> {
    const creds = await this.loadFloraCredentials('TRENDYOL');
    if (!creds || !creds.SUPPLIER_ID || !creds.API_KEY || !creds.API_SECRET) {
      this.logger.warn('FLORA Trendyol credentials bulunamadi, sync atlanıyor.');
      return { processed: 0, newOrders: 0 };
    }

    const apiBase = (process.env.TRENDYOL_API_URL ?? 'https://api.trendyol.com/sapigw').replace(/\/+$/, '');
    const now = Date.now();
    const startDate = now - this.lookbackDays * 24 * 60 * 60 * 1000;
    const auth = Buffer.from(`${creds.API_KEY}:${creds.API_SECRET}`).toString('base64');
    const headers = { Authorization: `Basic ${auth}`, 'User-Agent': `${creds.SUPPLIER_ID} - SelfIntegration`, Accept: 'application/json' };

    const allOrders: TrendyolOrder[] = [];
    let page = 0; let totalPages = 1;
    while (page < totalPages && page < 10) {
      const url = new URL(`${apiBase}/order/sellers/${creds.SUPPLIER_ID}/v2/orders`);
      url.searchParams.set('startDate', String(startDate));
      url.searchParams.set('endDate', String(now));
      url.searchParams.set('orderByField', 'PackageLastModifiedDate');
      url.searchParams.set('orderByDirection', 'DESC');
      url.searchParams.set('page', String(page));
      url.searchParams.set('size', '50');
      const response = await fetch(url.toString(), { method: 'GET', headers });
      if (!response.ok) { this.logger.warn(`FLORA Trendyol orders API hatasi: HTTP ${response.status}`); break; }
      const data = (await response.json()) as { content?: TrendyolOrder[]; totalPages?: number };
      if (page === 0) totalPages = Math.min(Number(data.totalPages ?? 1), 10);
      if (Array.isArray(data.content)) allOrders.push(...data.content);
      page++;
    }

    this.logger.log(`FLORA Trendyol'dan ${allOrders.length} siparis cekildi.`);
    let newOrders = 0;

    for (const order of allOrders) {
      const externalOrderId = this.text(order.shipmentPackageId ?? order.orderNumber ?? order.id);
      if (!externalOrderId) continue;
      const existing = await this.prisma.marketplaceOrder.findUnique({
        where: { platform_externalOrderId: { platform: 'TRENDYOL', externalOrderId: `FLORA_${externalOrderId}` } },
      });
      if (existing) continue;

      const shipmentAddress = (order.shipmentAddress ?? {}) as Record<string, unknown>;
      const invoiceAddress = (order.invoiceAddress ?? {}) as Record<string, unknown>;
      const customerName = [shipmentAddress.firstName, shipmentAddress.lastName].filter(Boolean).join(' ') ||
        this.text(shipmentAddress.fullName) || this.text(invoiceAddress.fullName) || '';

      await this.prisma.marketplaceOrder.create({
        data: {
          platform: 'TRENDYOL',
          externalOrderId: `FLORA_${externalOrderId}`,
          orderNumber: this.text(order.orderNumber ?? order.id),
          status: this.text(order.status) || 'CREATED',
          customerName: customerName || null,
          totalAmount: Number(order.totalPrice ?? order.grossAmount ?? 0),
          cargoAmount: Number(order.cargoPrice ?? order.shipmentPrice ?? 0),
          currency: 'TRY',
          orderDate: this.parseDate(order.orderDate ?? order.createdDate),
          cargoTrackingNumber: order.cargoTrackingNumber ? String(order.cargoTrackingNumber) : null,
          cargoProvider: order.cargoProviderName ? String(order.cargoProviderName) : null,
          rawPayload: { ...order as object, _company: 'FLORA' },
          stockDeducted: true,
        },
      });
      newOrders++;
    }

    this.logger.log(`FLORA Trendyol sync tamamlandi: ${newOrders} yeni siparis.`);
    return { processed: allOrders.length, newOrders };
  }

  async runFloraN11Sync(): Promise<{ processed: number; newOrders: number }> {
    const creds = await this.loadFloraCredentials('N11');
    if (!creds || !creds.API_KEY || !creds.API_SECRET) {
      this.logger.warn('FLORA N11 credentials bulunamadi, sync atlanıyor.');
      return { processed: 0, newOrders: 0 };
    }

    const apiBase = (process.env.N11_API_URL ?? 'https://api.n11.com').replace(/\/+$/, '');
    const lookback = Date.now() - this.lookbackDays * 24 * 60 * 60 * 1000;
    const headers = { appkey: creds.API_KEY, appsecret: creds.API_SECRET, Accept: 'application/json', 'User-Agent': 'FloraERP-N11' };

    const allOrders: Array<Record<string, unknown>> = [];
    let page = 0;
    while (page < 10) {
      const url = new URL(`${apiBase}/rest/delivery/v1/shipmentPackages`);
      url.searchParams.set('page', String(page)); url.searchParams.set('size', '50');
      const res = await fetch(url.toString(), { method: 'GET', headers });
      if (!res.ok) { this.logger.warn(`FLORA N11 orders API hatasi: HTTP ${res.status}`); break; }
      const data = await res.json() as { content?: Array<Record<string, unknown>>; shipmentPackages?: Array<Record<string, unknown>>; totalCount?: number };
      const packages = data.content ?? data.shipmentPackages ?? [];
      if (!packages.length) break;
      allOrders.push(...packages);
      const total = data.totalCount ?? 0;
      if (total > 0 && allOrders.length >= total) break;
      page++;
    }

    this.logger.log(`FLORA N11'den ${allOrders.length} siparis cekildi.`);
    let newOrders = 0;

    for (const order of allOrders) {
      const externalOrderId = String(order.id ?? order.shipmentPackageId ?? '');
      if (!externalOrderId) continue;
      const rawDate = order.lastModifiedDate ?? order.orderDate;
      const orderDate = rawDate ? new Date(typeof rawDate === 'number' ? rawDate : String(rawDate)) : null;
      if (orderDate && orderDate.getTime() < lookback) continue;

      const existing = await this.prisma.marketplaceOrder.findUnique({
        where: { platform_externalOrderId: { platform: 'N11', externalOrderId: `FLORA_${externalOrderId}` } },
      });
      if (existing) continue;

      await this.prisma.marketplaceOrder.create({
        data: {
          platform: 'N11',
          externalOrderId: `FLORA_${externalOrderId}`,
          orderNumber: String(order.orderNumber ?? externalOrderId),
          status: String(order.shipmentPackageStatus ?? order.status ?? 'CREATED'),
          customerName: String(order.customerfullName ?? (order.billingAddress as Record<string,unknown>)?.fullName ?? ''),
          totalAmount: Number(order.totalAmount ?? order.amount ?? 0),
          cargoAmount: Number(order.cargoAmount ?? 0),
          currency: 'TRY',
          orderDate: orderDate,
          rawPayload: { ...order as object, _company: 'FLORA' },
          stockDeducted: true,
        },
      });
      newOrders++;
    }

    this.logger.log(`FLORA N11 sync tamamlandi: ${newOrders} yeni siparis.`);
    return { processed: allOrders.length, newOrders };
  }
}
