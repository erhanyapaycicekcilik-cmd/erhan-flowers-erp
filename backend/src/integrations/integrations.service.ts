import { BadRequestException, Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { Prisma } from '../generated/prisma-client';
import { PrismaService } from '../prisma/prisma.service';
import { StaffTasksService } from '../staff-tasks/staff-tasks.service';
import { GenericMarketplaceAdapter } from './adapters/generic-marketplace.adapter';
import { ExternalOrder, IntegrationAdapter, IntegrationPlatform } from './adapters/integration-adapter.interface';
import { TrendyolAdapter } from './adapters/trendyol.adapter';

const platforms: Array<{ platform: IntegrationPlatform; displayName: string }> = [
  { platform: 'TRENDYOL', displayName: 'Trendyol' },
  { platform: 'HEPSIBURADA', displayName: 'Hepsiburada' },
  { platform: 'N11', displayName: 'N11' },
  { platform: 'AMAZON', displayName: 'Amazon' },
  { platform: 'WEBSITE', displayName: 'Web Site' },
  { platform: 'TICIMAX', displayName: 'Ticimax' },
];

const TICIMAX_PLATFORM: IntegrationPlatform = 'TICIMAX';
const TICIMAX_DEFAULTS = {
  tenant: 'Erhan Flowers',
  siteUrl: 'https://www.erhanflowers.com',
  serviceEndpoint: 'https://www.erhanflowers.com/servis/UrunServis.svc',
  wsdlUrl: 'https://www.erhanflowers.com/servis/UrunServis.svc?wsdl',
};

type TicimaxSettingsPayload = {
  tenant?: unknown;
  siteUrl?: unknown;
  serviceEndpoint?: unknown;
  wsdlUrl?: unknown;
  uyeKodu?: unknown;
};

type TicimaxSettingsRow = {
  tenant: string;
  platform: string;
  siteUrl: string | null;
  serviceEndpoint: string | null;
  wsdlUrl: string | null;
  secretValue: string | null;
  status: string;
  lastTestAt: Date | null;
  lastError: string | null;
};

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly staffTasks: StaffTasksService,
    private readonly trendyolAdapter: TrendyolAdapter,
  ) {}

  async listConnections() {
    await this.ensureConnectionRows();
    return this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT platform, display_name AS "displayName", status, uses_env_credentials AS "usesEnvCredentials",
        last_test_at AS "lastTestAt", last_sync_at AS "lastSyncAt", last_error AS "lastError"
      FROM integration_connections
      ORDER BY CASE platform
        WHEN 'TRENDYOL' THEN 1 WHEN 'HEPSIBURADA' THEN 2 WHEN 'N11' THEN 3 WHEN 'AMAZON' THEN 4 WHEN 'WEBSITE' THEN 5 WHEN 'TICIMAX' THEN 6 ELSE 99 END
    `;
  }

  async getTicimaxSettings(tenantValue?: string) {
    const tenant = this.cleanTenant(tenantValue);
    const row = await this.ensureTicimaxSettings(tenant);
    return this.serializeTicimaxSettings(row);
  }

  async saveTicimaxSettings(payload: TicimaxSettingsPayload) {
    const tenant = this.cleanTenant(payload.tenant);
    const siteUrl = this.cleanUrl(payload.siteUrl, 'Site Adresi') || TICIMAX_DEFAULTS.siteUrl;
    const serviceEndpoint = this.cleanUrl(payload.serviceEndpoint, 'Servis Endpoint') || TICIMAX_DEFAULTS.serviceEndpoint;
    const wsdlUrl = this.cleanUrl(payload.wsdlUrl, 'WSDL Adresi') || TICIMAX_DEFAULTS.wsdlUrl;
    const uyeKodu = this.text(payload.uyeKodu);
    const current = await this.ensureTicimaxSettings(tenant);
    const secretValue = uyeKodu ? this.encryptSecret(uyeKodu) : current.secretValue;
    const status = secretValue ? 'CONFIGURED' : 'MISSING_CREDENTIALS';

    const [row] = await this.prisma.$queryRaw<TicimaxSettingsRow[]>`
      INSERT INTO integration_tenant_settings (
        tenant, platform, site_url, service_endpoint, wsdl_url, secret_value, status, created_at, updated_at
      )
      VALUES (
        ${tenant}, ${TICIMAX_PLATFORM}, ${siteUrl}, ${serviceEndpoint}, ${wsdlUrl}, ${secretValue}, ${status}, NOW(), NOW()
      )
      ON CONFLICT (tenant, platform) DO UPDATE SET
        site_url = EXCLUDED.site_url,
        service_endpoint = EXCLUDED.service_endpoint,
        wsdl_url = EXCLUDED.wsdl_url,
        secret_value = EXCLUDED.secret_value,
        status = EXCLUDED.status,
        last_error = NULL,
        updated_at = NOW()
      RETURNING tenant, platform, site_url AS "siteUrl", service_endpoint AS "serviceEndpoint",
        wsdl_url AS "wsdlUrl", secret_value AS "secretValue", status, last_test_at AS "lastTestAt", last_error AS "lastError"
    `;

    await this.upsertConnectionStatus(TICIMAX_PLATFORM, status, null);
    await this.log(TICIMAX_PLATFORM, 'SAVE_SETTINGS', 'SUCCESS', 'Ticimax bağlantı ayarları kaydedildi.', null, null, { tenant, siteUrl, serviceEndpoint, wsdlUrl, hasUyeKodu: Boolean(secretValue) });
    return this.serializeTicimaxSettings(row);
  }

  async testTicimaxSettings(tenantValue?: string) {
    const tenant = this.cleanTenant(tenantValue);
    const row = await this.ensureTicimaxSettings(tenant);
    const missing: string[] = [];
    if (!row.siteUrl) missing.push('Site Adresi');
    if (!row.serviceEndpoint) missing.push('Servis Endpoint');
    if (!row.wsdlUrl) missing.push('WSDL Adresi');
    if (!row.secretValue) missing.push('UyeKodu');

    if (missing.length > 0) {
      const message = `Ticimax bağlantı bilgileri eksik: ${missing.join(', ')}`;
      await this.updateTicimaxTestResult(tenant, 'MISSING_CREDENTIALS', message);
      return { ok: false, status: 'MISSING_CREDENTIALS', message, missingKeys: missing };
    }

    const result = await this.testWsdlReachability(row.wsdlUrl!);
    const status = result.ok ? 'CONNECTED' : 'FAILED';
    await this.updateTicimaxTestResult(tenant, status, result.ok ? null : result.message);
    await this.log(TICIMAX_PLATFORM, 'TEST_CONNECTION', result.ok ? 'SUCCESS' : status, result.message, null, null, { tenant, wsdlUrl: row.wsdlUrl });
    return { ok: result.ok, status, message: result.message };
  }

  async testConnection(platformValue: string) {
    const platform = this.platform(platformValue);
    if (platform === TICIMAX_PLATFORM) return this.testTicimaxSettings();
    const adapter = this.adapter(platform);
    const result = await adapter.testConnection();
    await this.prisma.$executeRaw`
      INSERT INTO integration_connections (platform, display_name, status, uses_env_credentials, last_test_at, last_error, created_at, updated_at)
      VALUES (${platform}, ${this.displayName(platform)}, ${result.status}, true, NOW(), ${result.ok ? null : result.message}, NOW(), NOW())
      ON CONFLICT (platform) DO UPDATE SET status = EXCLUDED.status, last_test_at = NOW(), last_error = EXCLUDED.last_error, updated_at = NOW()
    `;
    await this.log(platform, 'TEST_CONNECTION', result.ok ? 'SUCCESS' : result.status, result.message);
    return result;
  }

  async syncOrders(platformValue: string, userId: number) {
    const platform = this.platform(platformValue);
    if (platform === TICIMAX_PLATFORM) {
      throw new BadRequestException('Ticimax için sipariş çekme veya ürün gönderme henüz aktif değil.');
    }
    const adapter = this.adapter(platform);
    const connection = await adapter.testConnection();
    if (!connection.ok) {
      await this.log(platform, 'FETCH_ORDERS', connection.status, connection.message);
      return { ok: false, imported: 0, duplicated: 0, message: connection.message, missingKeys: connection.missingKeys ?? [] };
    }

    const orders = await adapter.fetchOrders();
    let imported = 0;
    let duplicated = 0;
    for (const order of orders) {
      const result = await this.importExternalOrder(order, userId);
      if (result.created) imported += 1;
      else duplicated += 1;
    }
    await this.prisma.$executeRaw`
      UPDATE integration_connections SET status = 'CONNECTED', last_sync_at = NOW(), last_error = NULL, updated_at = NOW()
      WHERE platform = ${platform}
    `;
    await this.log(platform, 'FETCH_ORDERS', 'SUCCESS', `${imported} yeni, ${duplicated} mükerrer sipariş işlendi.`, null, null, { imported, duplicated });
    return { ok: true, imported, duplicated };
  }

  async listOrders(query: Record<string, string> = {}) {
    const platform = this.text(query.platform).toUpperCase();
    const status = this.text(query.status).toUpperCase();
    const q = this.text(query.q);
    return this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT s.id, s.sale_number AS "saleNumber", s.platform_order_number AS "platformOrderNumber",
        s.external_order_id AS "externalOrderId", s.channel AS platform, s.status,
        s.integration_sync_status AS "integrationSyncStatus", s.last_synced_at AS "lastSyncedAt",
        s.order_date AS "orderDate", s.delivery_due_at AS "deliveryDueAt",
        s.cargo_provider AS "cargoProvider", s.cargo_tracking_number AS "cargoTrackingNumber",
        s.grand_total AS "grandTotal", c.display_name AS "customerName", c.phone,
        COUNT(i.id)::int AS "itemCount"
      FROM retail_sales s
      JOIN retail_customers c ON c.id = s.customer_id
      LEFT JOIN retail_sale_items i ON i.sale_id = s.id
      WHERE s.integration_sync_status <> 'MANUAL'
        AND (${platform} = '' OR s.channel::text = ${platform})
        AND (${status} = '' OR s.status::text = ${status})
        AND (${q} = '' OR s.sale_number ILIKE ${`%${q}%`} OR s.platform_order_number ILIKE ${`%${q}%`} OR c.display_name ILIKE ${`%${q}%`} OR c.phone ILIKE ${`%${q}%`})
      GROUP BY s.id, c.display_name, c.phone
      ORDER BY COALESCE(s.order_date, s.created_at) DESC
      LIMIT 200
    `;
  }

  async operationsSummary() {
    const [summary] = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT
        COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)::int AS "todayOrders",
        COUNT(*) FILTER (WHERE status = 'CONFIRMED')::int AS "newOrders",
        COUNT(*) FILTER (WHERE status IN ('PREPARING', 'IN_PRODUCTION'))::int AS "inProduction",
        COUNT(*) FILTER (WHERE status = 'READY')::int AS ready,
        COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS completed,
        COUNT(*) FILTER (WHERE integration_sync_status = 'MATCHING_REQUIRED')::int AS "matchingRequired"
      FROM retail_sales
      WHERE integration_sync_status <> 'MANUAL'
    `;
    const byPlatform = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT channel::text AS platform, COUNT(*)::int AS count
      FROM retail_sales
      WHERE integration_sync_status <> 'MANUAL'
      GROUP BY channel
      ORDER BY count DESC
    `;
    const taskLoad = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT assignment_group AS "assignmentGroup", status, COUNT(*)::int AS count
      FROM production_staff_tasks
      WHERE status IN ('NEW', 'SEEN', 'STARTED', 'BLOCKED')
      GROUP BY assignment_group, status
      ORDER BY assignment_group, status
    `;
    return { ...summary, byPlatform, taskLoad };
  }

  listLogs(status?: string) {
    const cleanStatus = this.text(status).toUpperCase();
    return this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT id, platform, action, status, message, external_order_id AS "externalOrderId", sale_id AS "saleId",
        started_at AS "startedAt", completed_at AS "completedAt", payload_summary AS "payloadSummary"
      FROM integration_sync_logs
      WHERE (${cleanStatus} = '' OR status = ${cleanStatus})
      ORDER BY started_at DESC
      LIMIT 200
    `;
  }

  private async importExternalOrder(order: ExternalOrder, userId: number) {
    const idempotencyKey = `${order.platform}:${order.externalOrderId}`;
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${idempotencyKey}))`;
      const existing = await tx.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM retail_sales WHERE idempotency_key = ${idempotencyKey} LIMIT 1
      `;
      if (existing[0]) return { created: false, saleId: existing[0].id };

      const customer = await this.ensureCustomer(tx, order, userId);
      const address = await this.ensureAddress(tx, Number(customer.id), order, userId);
      const saleNumber = await this.nextSaleNumber(tx);
      const totals = this.orderTotals(order);
      const status = totals.remainingTotal > 0 ? 'PAYMENT_PENDING' : 'CONFIRMED';
      const syncStatus = await this.hasUnmatchedItems(order) ? 'MATCHING_REQUIRED' : 'SYNCED';
      const saleRows = await tx.$queryRaw<Array<{ id: number }>>`
        INSERT INTO retail_sales (
          sale_number, customer_id, address_id, channel, sale_type, status, currency, subtotal, discount_total,
          delivery_fee, grand_total, paid_total, remaining_total, customer_note, internal_note, event_key, created_by_id,
          platform_order_number, external_order_id, idempotency_key, integration_sync_status, last_synced_at,
          cargo_provider, cargo_tracking_number, order_date, delivery_due_at, created_at, updated_at
        )
        VALUES (
          ${saleNumber}, ${Number(customer.id)}, ${Number(address.id)}, ${order.platform}::"RetailSaleChannel", 'DELIVERY_SALE'::"RetailSaleType",
          ${status}::"RetailSaleStatus", 'TRY', ${totals.subtotal}, 0, 0, ${totals.grandTotal}, ${totals.paidTotal}, ${totals.remainingTotal},
          NULL, ${`Platform siparişi: ${order.platform}`}, ${`INTEGRATION_ORDER:${idempotencyKey}`}, ${userId},
          ${order.platformOrderNumber}, ${order.externalOrderId}, ${idempotencyKey}, ${syncStatus}, NOW(),
          ${order.cargoProvider ?? null}, ${order.cargoTrackingNumber ?? null}, ${order.orderDate ?? new Date()}, ${order.deliveryDueAt ?? null}, NOW(), NOW()
        )
        RETURNING id
      `;
      const saleId = saleRows[0].id;
      await tx.$executeRaw`
        INSERT INTO retail_sale_status_history (sale_id, old_status, new_status, note, changed_by_id, changed_at)
        VALUES (${saleId}, NULL, ${status}::"RetailSaleStatus", 'Entegrasyon siparişi oluşturuldu.', ${userId}, NOW())
      `;

      for (const item of order.items) {
        const match = await this.matchItem(tx, item.barcode, item.modelCode, item.externalVariantId);
        const lineTotal = this.roundMoney(item.quantity * item.unitPrice);
        const itemRows = await tx.$queryRaw<Array<{ id: number; stockCardId: number | null; unit: string | null }>>`
          INSERT INTO retail_sale_items (
            sale_id, variant_id, stock_card_id, barcode, model_code, product_name_snapshot, external_line_id,
            external_variant_id, variation_text, quantity, unit_price, discount_amount, line_total, unit_cost_snapshot,
            stock_fulfillment_type, created_at
          )
          VALUES (
            ${saleId}, ${match.variantId}, ${match.stockCardId}, ${item.barcode ?? null}, ${item.modelCode ?? null}, ${item.productName},
            ${item.externalLineId ?? null}, ${item.externalVariantId ?? null}, ${item.variationText ?? null}, ${item.quantity},
            ${item.unitPrice}, 0, ${lineTotal}, ${match.unitCost}, 'READY_STOCK'::"StockFulfillmentType", NOW()
          )
          RETURNING id, stock_card_id AS "stockCardId", (SELECT unit FROM stock_cards WHERE id = stock_card_id) AS unit
        `;
        if (itemRows[0]?.stockCardId) {
          await this.reserveStock(tx, Number(itemRows[0].stockCardId), saleId, Number(itemRows[0].id), item.quantity, String(itemRows[0].unit ?? 'Adet'), userId);
        }
      }

      await tx.$executeRaw`
        INSERT INTO retail_deliveries (
          sale_id, address_id, delivery_type, status, planned_date, planned_time, delivery_note, event_key, created_at, updated_at
        )
        VALUES (${saleId}, ${Number(address.id)}, 'CARGO'::"RetailDeliveryType", 'WAITING'::"RetailDeliveryStatus",
          ${order.deliveryDueAt ?? null}, NULL, ${order.cargoProvider ?? null}, ${`DELIVERY:${saleId}`}, NOW(), NOW())
      `;

      await this.staffTasks.createTasksForSale(tx, saleId);
      await this.log(order.platform, 'IMPORT_ORDER', 'SUCCESS', 'Sipariş içe aktarıldı.', order.externalOrderId, saleId, { itemCount: order.items.length });
      return { created: true, saleId };
    });
  }

  private async reserveStock(tx: Prisma.TransactionClient, stockCardId: number, saleId: number, saleItemId: number, quantity: number, unit: string, userId: number) {
    const eventKey = `STOCK_RESERVATION:${saleId}:${saleItemId}`;
    const existing = await tx.$queryRaw<Array<{ id: number }>>`SELECT id FROM stock_reservations WHERE event_key = ${eventKey} LIMIT 1`;
    if (existing[0]) return;
    await tx.$queryRaw`SELECT id FROM stock_cards WHERE id = ${stockCardId} FOR UPDATE`;
    await tx.$executeRaw`
      UPDATE stock_cards SET reserved_quantity = reserved_quantity + ${quantity}, updated_at = NOW()
      WHERE id = ${stockCardId}
    `;
    await tx.$executeRaw`
      INSERT INTO stock_reservations (stock_card_id, sale_id, sale_item_id, quantity, unit, status, event_key, created_by_id, created_at, updated_at)
      VALUES (${stockCardId}, ${saleId}, ${saleItemId}, ${quantity}, ${unit}, 'ACTIVE', ${eventKey}, ${userId}, NOW(), NOW())
    `;
  }

  private async matchItem(tx: Prisma.TransactionClient, barcode?: string, modelCode?: string, externalVariantId?: string) {
    const variants = await tx.$queryRaw<Array<Record<string, unknown>>>`
      SELECT id, barcode, current_model_code AS "currentModelCode", proposed_model_code AS "proposedModelCode"
      FROM trendyol_product_variants
      WHERE (${barcode ?? ''} <> '' AND barcode = ${barcode ?? ''})
        OR (${modelCode ?? ''} <> '' AND (current_model_code = ${modelCode ?? ''} OR proposed_model_code = ${modelCode ?? ''}))
        OR (${externalVariantId ?? ''} <> '' AND CAST(id AS text) = ${externalVariantId ?? ''})
      LIMIT 1
    `;
    const variant = variants[0];
    const stockCards = await tx.$queryRaw<Array<Record<string, unknown>>>`
      SELECT id, automatic_unit_cost AS "automaticUnitCost", manual_unit_cost AS "manualUnitCost", manual_unit_cost_enabled AS "manualUnitCostEnabled"
      FROM stock_cards
      WHERE (${barcode ?? ''} <> '' AND barcode = ${barcode ?? ''})
        OR (${modelCode ?? ''} <> '' AND (sku = ${modelCode ?? ''} OR old_model_code = ${modelCode ?? ''} OR model = ${modelCode ?? ''}))
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    const stockCard = stockCards[0];
    return {
      variantId: variant ? Number(variant.id) : null,
      stockCardId: stockCard ? Number(stockCard.id) : null,
      unitCost: stockCard ? Number(stockCard.manualUnitCostEnabled ? stockCard.manualUnitCost : stockCard.automaticUnitCost) : null,
    };
  }

  private async hasUnmatchedItems(order: ExternalOrder) {
    for (const item of order.items) {
      const rows = await this.prisma.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM stock_cards
        WHERE (${item.barcode ?? ''} <> '' AND barcode = ${item.barcode ?? ''})
          OR (${item.modelCode ?? ''} <> '' AND (sku = ${item.modelCode ?? ''} OR old_model_code = ${item.modelCode ?? ''} OR model = ${item.modelCode ?? ''}))
        LIMIT 1
      `;
      if (!rows[0]) return true;
    }
    return false;
  }

  private async ensureCustomer(tx: Prisma.TransactionClient, order: ExternalOrder, userId: number) {
    const normalizedPhone = this.normalizePhone(order.phone);
    if (!normalizedPhone) throw new BadRequestException('Platform siparişinde geçerli telefon bulunamadı.');
    const existing = await tx.$queryRaw<Array<Record<string, unknown>>>`
      SELECT id FROM retail_customers WHERE normalized_phone = ${normalizedPhone} LIMIT 1
    `;
    if (existing[0]) return existing[0];
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(19010101)`;
    const next = await tx.$queryRaw<Array<{ nextId: number }>>`SELECT COALESCE(MAX(id), 0) + 1 AS "nextId" FROM retail_customers`;
    const customerCode = `MUS-${String(Number(next[0].nextId)).padStart(6, '0')}`;
    const rows = await tx.$queryRaw<Array<Record<string, unknown>>>`
      INSERT INTO retail_customers (
        customer_code, customer_type, first_name, display_name, phone, normalized_phone, whatsapp_phone,
        source, order_communication_allowed, created_by_id, created_at, updated_at
      )
      VALUES (${customerCode}, 'INDIVIDUAL', ${order.customerName}, ${order.customerName}, ${order.phone}, ${normalizedPhone}, ${order.phone},
        ${order.platform}::"RetailSaleChannel", true, ${userId}, NOW(), NOW())
      RETURNING id
    `;
    return rows[0];
  }

  private async ensureAddress(tx: Prisma.TransactionClient, customerId: number, order: ExternalOrder, userId: number) {
    const fullAddress = this.text(order.addressText) || 'Platform sipariş adresi';
    const existing = await tx.$queryRaw<Array<Record<string, unknown>>>`
      SELECT id FROM retail_customer_addresses
      WHERE customer_id = ${customerId} AND full_address = ${fullAddress} AND is_active = true
      LIMIT 1
    `;
    if (existing[0]) return existing[0];
    const rows = await tx.$queryRaw<Array<Record<string, unknown>>>`
      INSERT INTO retail_customer_addresses (
        customer_id, title, recipient_name, recipient_phone, city, district, full_address, is_default, created_by_id, created_at, updated_at
      )
      VALUES (${customerId}, 'Platform', ${order.customerName}, ${order.phone}, ${order.city ?? null}, ${order.district ?? null}, ${fullAddress}, false, ${userId}, NOW(), NOW())
      RETURNING id
    `;
    return rows[0];
  }

  private async nextSaleNumber(tx: Prisma.TransactionClient) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(17001703)`;
    const year = new Date().getFullYear();
    const rows = await tx.$queryRaw<Array<{ nextNo: number }>>`
      SELECT COALESCE(MAX(CAST(SUBSTRING(sale_number FROM 9) AS integer)), 0) + 1 AS "nextNo"
      FROM retail_sales
      WHERE sale_number ~ ${`^EF-${year}-[0-9]{6}$`}
    `;
    return `EF-${year}-${String(Number(rows[0]?.nextNo ?? 1)).padStart(6, '0')}`;
  }

  private orderTotals(order: ExternalOrder) {
    const subtotal = this.roundMoney(order.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0));
    const grandTotal = this.roundMoney(order.totalAmount || subtotal);
    const paidTotal = order.paymentStatus === 'WAITING' ? 0 : this.roundMoney(order.paidAmount ?? grandTotal);
    return { subtotal, grandTotal, paidTotal, remainingTotal: this.roundMoney(Math.max(0, grandTotal - paidTotal)) };
  }

  private async ensureConnectionRows() {
    for (const item of platforms) {
      await this.prisma.$executeRaw`
        INSERT INTO integration_connections (platform, display_name, status, uses_env_credentials, created_at, updated_at)
        VALUES (${item.platform}, ${item.displayName}, 'NOT_CONFIGURED', ${item.platform !== TICIMAX_PLATFORM}, NOW(), NOW())
        ON CONFLICT (platform) DO NOTHING
      `;
    }
  }

  private async ensureTicimaxSettings(tenant: string) {
    const [row] = await this.prisma.$queryRaw<TicimaxSettingsRow[]>`
      INSERT INTO integration_tenant_settings (
        tenant, platform, site_url, service_endpoint, wsdl_url, status, created_at, updated_at
      )
      VALUES (
        ${tenant}, ${TICIMAX_PLATFORM}, ${TICIMAX_DEFAULTS.siteUrl}, ${TICIMAX_DEFAULTS.serviceEndpoint}, ${TICIMAX_DEFAULTS.wsdlUrl},
        'NOT_CONFIGURED', NOW(), NOW()
      )
      ON CONFLICT (tenant, platform) DO UPDATE SET updated_at = integration_tenant_settings.updated_at
      RETURNING tenant, platform, site_url AS "siteUrl", service_endpoint AS "serviceEndpoint",
        wsdl_url AS "wsdlUrl", secret_value AS "secretValue", status, last_test_at AS "lastTestAt", last_error AS "lastError"
    `;
    await this.upsertConnectionStatus(TICIMAX_PLATFORM, row.status, row.lastError);
    return row;
  }

  private async updateTicimaxTestResult(tenant: string, status: string, lastError: string | null) {
    const [row] = await this.prisma.$queryRaw<TicimaxSettingsRow[]>`
      UPDATE integration_tenant_settings
      SET status = ${status}, last_test_at = NOW(), last_error = ${lastError}, updated_at = NOW()
      WHERE tenant = ${tenant} AND platform = ${TICIMAX_PLATFORM}
      RETURNING tenant, platform, site_url AS "siteUrl", service_endpoint AS "serviceEndpoint",
        wsdl_url AS "wsdlUrl", secret_value AS "secretValue", status, last_test_at AS "lastTestAt", last_error AS "lastError"
    `;
    await this.upsertConnectionStatus(TICIMAX_PLATFORM, status, lastError);
    return row;
  }

  private async upsertConnectionStatus(platform: IntegrationPlatform, status: string, lastError: string | null) {
    await this.prisma.$executeRaw`
      INSERT INTO integration_connections (platform, display_name, status, uses_env_credentials, last_error, created_at, updated_at)
      VALUES (${platform}, ${this.displayName(platform)}, ${status}, ${platform !== TICIMAX_PLATFORM}, ${lastError}, NOW(), NOW())
      ON CONFLICT (platform) DO UPDATE SET status = EXCLUDED.status, last_error = EXCLUDED.last_error, updated_at = NOW()
    `;
  }

  private serializeTicimaxSettings(row: TicimaxSettingsRow) {
    return {
      tenant: row.tenant,
      siteUrl: row.siteUrl ?? TICIMAX_DEFAULTS.siteUrl,
      serviceEndpoint: row.serviceEndpoint ?? TICIMAX_DEFAULTS.serviceEndpoint,
      wsdlUrl: row.wsdlUrl ?? TICIMAX_DEFAULTS.wsdlUrl,
      status: row.status,
      lastTestAt: row.lastTestAt,
      lastError: row.lastError,
      hasUyeKodu: Boolean(row.secretValue),
      uyeKoduMasked: this.maskSecret(row.secretValue),
    };
  }

  private async testWsdlReachability(wsdlUrl: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(wsdlUrl, { method: 'GET', signal: controller.signal });
      const text = await response.text().catch(() => '');
      if (!response.ok) {
        return { ok: false, message: `WSDL adresine erişilemedi. HTTP ${response.status}` };
      }
      const looksLikeWsdl = text.includes('wsdl:definitions') || text.includes('<definitions') || text.includes('UrunServis');
      if (!looksLikeWsdl) {
        return { ok: false, message: 'WSDL adresi yanıt verdi ancak servis tanımı doğrulanamadı.' };
      }
      return { ok: true, message: 'Ticimax WSDL adresine erişildi. Ürün gönderme çağrısı yapılmadı.' };
    } catch (error) {
      return { ok: false, message: error instanceof Error && error.name === 'AbortError' ? 'WSDL bağlantı testi zaman aşımına uğradı.' : 'WSDL bağlantı testi başarısız oldu.' };
    } finally {
      clearTimeout(timeout);
    }
  }

  private encryptSecret(value: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.secretKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return ['v1', iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
  }

  private decryptSecret(value: string) {
    const [version, ivText, tagText, encryptedText] = value.split(':');
    if (version !== 'v1' || !ivText || !tagText || !encryptedText) return '';
    const decipher = createDecipheriv('aes-256-gcm', this.secretKey(), Buffer.from(ivText, 'base64'));
    decipher.setAuthTag(Buffer.from(tagText, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(encryptedText, 'base64')), decipher.final()]).toString('utf8');
  }

  private maskSecret(value: string | null) {
    if (!value) return '';
    try {
      const decrypted = this.decryptSecret(value);
      if (!decrypted) return '••••';
      return `•••• ${decrypted.slice(-4)}`;
    } catch {
      return '••••';
    }
  }

  private secretKey() {
    return createHash('sha256').update(process.env.JWT_SECRET ?? 'local-dev-secret').digest();
  }

  private cleanTenant(value: unknown) {
    return this.text(value) || TICIMAX_DEFAULTS.tenant;
  }

  private cleanUrl(value: unknown, label: string) {
    const text = this.text(value);
    if (!text) return '';
    try {
      const url = new URL(text);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Invalid protocol');
      return url.toString();
    } catch {
      throw new BadRequestException(`${label} geçerli bir URL olmalıdır.`);
    }
  }

  private adapter(platform: IntegrationPlatform): IntegrationAdapter {
    if (platform === 'TRENDYOL') return this.trendyolAdapter;
    return new GenericMarketplaceAdapter(platform);
  }

  private platform(value: string): IntegrationPlatform {
    const text = this.text(value).toUpperCase();
    if (platforms.some((item) => item.platform === text)) return text as IntegrationPlatform;
    throw new BadRequestException('Platform desteklenmiyor.');
  }

  private displayName(platform: IntegrationPlatform) {
    return platforms.find((item) => item.platform === platform)?.displayName ?? platform;
  }

  private async log(platform: string, action: string, status: string, message: string, externalOrderId?: string | null, saleId?: number | null, payloadSummary?: unknown) {
    await this.prisma.$executeRaw`
      INSERT INTO integration_sync_logs (platform, action, status, message, external_order_id, sale_id, completed_at, payload_summary)
      VALUES (${platform}, ${action}, ${status}, ${message}, ${externalOrderId ?? null}, ${saleId ?? null}, NOW(), ${payloadSummary ? JSON.stringify(payloadSummary) : null}::jsonb)
    `;
  }

  private normalizePhone(value: unknown) {
    let digits = this.text(value).replace(/\D/g, '');
    if (!digits) return null;
    if (digits.startsWith('0090')) digits = digits.slice(4);
    if (digits.startsWith('90') && digits.length === 12) digits = digits.slice(2);
    if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
    if (digits.length === 10) return `90${digits}`;
    return digits;
  }

  private text(value: unknown) {
    return String(value ?? '').trim();
  }

  private roundMoney(value: number) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }
}
