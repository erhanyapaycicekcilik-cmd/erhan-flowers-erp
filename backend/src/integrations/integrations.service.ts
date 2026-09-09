import { BadRequestException, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import * as XLSX from 'xlsx';
import { Prisma } from '../generated/prisma-client';
import { PrismaService } from '../prisma/prisma.service';
import { StaffTasksService } from '../staff-tasks/staff-tasks.service';
import { GenericMarketplaceAdapter } from './adapters/generic-marketplace.adapter';
import { HepsiburadaAdapter } from './adapters/hepsiburada.adapter';
import { ExternalOrder, ExternalOrderSummary, IntegrationAdapter, IntegrationPlatform } from './adapters/integration-adapter.interface';
import { N11Adapter } from './adapters/n11.adapter';
import { TicimaxAdapter } from './adapters/ticimax.adapter';
import { TrendyolAdapter } from './adapters/trendyol.adapter';
import { IntegrationCenterService } from './services/integration-center.service';

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

const AUTO_SYNC_PLATFORMS: IntegrationPlatform[] = ['TRENDYOL', 'HEPSIBURADA', 'N11', 'TICIMAX'];
const AUTO_SYNC_INTERVAL_MS = 60 * 1000;

@Injectable()
export class IntegrationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IntegrationsService.name);
  private autoSyncTimer?: NodeJS.Timeout;
  private autoSyncRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly staffTasks: StaffTasksService,
    private readonly trendyolAdapter: TrendyolAdapter,
    private readonly integrationCenter: IntegrationCenterService,
  ) {}

  onModuleInit() {
    this.autoSyncTimer = setInterval(() => this.autoSyncAllPlatforms(), AUTO_SYNC_INTERVAL_MS);
    this.autoSyncAllPlatforms();
  }

  onModuleDestroy() {
    if (this.autoSyncTimer) clearInterval(this.autoSyncTimer);
  }

  private async autoSyncAllPlatforms() {
    if (this.autoSyncRunning) return;
    this.autoSyncRunning = true;
    try {
      const owner = await this.prisma.user.findFirst({ where: { role: 'OWNER' }, orderBy: { id: 'asc' }, select: { id: true } });
      if (!owner) return;
      for (const platform of AUTO_SYNC_PLATFORMS) {
        try {
          await this.syncOrders(platform, owner.id);
        } catch (error) {
          this.logger.warn(`Otomatik sipariş senkronizasyonu basarisiz (${platform}): ${this.errorMessage(error)}`);
        }
      }
    } finally {
      this.autoSyncRunning = false;
    }
  }

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
    const adapter = await this.adapter(platform);
    const result = await this.safeAdapterTest(adapter);
    await this.prisma.$executeRaw`
      INSERT INTO integration_connections (platform, display_name, status, uses_env_credentials, last_test_at, last_error, created_at, updated_at)
      VALUES (${platform}, ${this.displayName(platform)}, ${result.status}, true, NOW(), ${result.ok ? null : result.message}, NOW(), NOW())
      ON CONFLICT (platform) DO UPDATE SET status = EXCLUDED.status, last_test_at = NOW(), last_error = EXCLUDED.last_error, updated_at = NOW()
    `;
    await this.log(platform, 'TEST_CONNECTION', result.ok ? 'SUCCESS' : result.status, result.message);
    return result;
  }

  async syncOrders(platformValue: string, userId: number, companyCode = 'ERHAN') {
    const platform = this.platform(platformValue);
    const adapter = await this.adapter(platform, companyCode);
    const connection = await this.safeAdapterTest(adapter);
    if (!connection.ok) {
      await this.log(platform, 'FETCH_ORDERS', connection.status, connection.message);
      return { ok: false, imported: 0, duplicated: 0, message: connection.message, missingKeys: connection.missingKeys ?? [] };
    }

    let orders: ExternalOrder[] = [];
    try {
      orders = await adapter.fetchOrders();
    } catch (error) {
      const message = `${this.displayName(platform)} siparişleri alınamadı: ${this.errorMessage(error)}`;
      await this.log(platform, 'FETCH_ORDERS', 'FAILED', message);
      return { ok: false, imported: 0, duplicated: 0, unknownStatus: 0, failed: 0, message, missingKeys: [] };
    }
    let imported = 0;
    let duplicated = 0;
    let unknownStatus = 0;
    let failed = 0;
    for (const order of orders) {
      if (order.unknownStatus) {
        unknownStatus += 1;
        await this.log(platform, 'IMPORT_ORDER', 'UNKNOWN', 'Trendyol sipariş durumu eşleştirilemedi; sipariş yeni olarak kaydedilmedi.', order.externalOrderId, null, {
          platformOrderNumber: order.platformOrderNumber,
          externalStatus: order.externalStatus ?? null,
        });
        continue;
      }
      try {
        const result = await this.importExternalOrder({ ...order, companyCode }, userId);
        if (result.created) imported += 1;
        else duplicated += 1;
      } catch (error) {
        failed += 1;
        await this.log(platform, 'IMPORT_ORDER', 'FAILED', this.errorMessage(error), order.externalOrderId, null, {
          platformOrderNumber: order.platformOrderNumber,
          customerName: order.customerName,
        });
      }
    }
    await this.prisma.$executeRaw`
      UPDATE integration_connections SET status = 'CONNECTED', last_sync_at = NOW(), last_error = NULL, updated_at = NOW()
      WHERE platform = ${platform}
    `;
    await this.log(platform, 'FETCH_ORDERS', 'SUCCESS', `${imported} yeni, ${duplicated} mükerrer, ${unknownStatus} bilinmeyen durum işlendi.`, null, null, { imported, duplicated, unknownStatus });
    return { ok: true, imported, duplicated, unknownStatus, failed };
  }

  // Siparişi pazaryerine "hazırlandı/kargolandı" olarak bildirir (paketleme adımı).
  async updatePackageStatus(platformValue: string, payload: { shipmentPackageId?: string; status?: string; lines?: Array<{ lineId: number; quantity: number }>; trackingNumber?: string; cargoProviderId?: number }) {
    const platform = this.platform(platformValue);
    const adapter = await this.adapter(platform);
    const result = await adapter.updateOrderStatus(payload);
    await this.log(platform, 'UPDATE_PACKAGE_STATUS', result.ok ? 'SUCCESS' : 'FAILED', result.message, payload.shipmentPackageId ?? null, null, { status: payload.status });
    return result;
  }

  // Bir gönderimin (batchRequestId) pazaryerinde gerçekten işlenip işlenmediğini
  // sorgular. "Kuyruğa alındı" mesajı gerçek sonuç değildir; bu asenkron sonucu
  // ayrıca kontrol etmek gerekir.
  async checkBatchStatus(platformValue: string, batchRequestId: string) {
    const platform = this.platform(platformValue);
    const adapter = await this.adapter(platform);
    if (!adapter.checkBatchStatus) {
      return { ok: false, status: 'NOT_IMPLEMENTED' as const, message: `${platform} icin batch durumu sorgulama desteklenmiyor.` };
    }
    return adapter.checkBatchStatus(batchRequestId);
  }

  // Trendyol'da görsel silme API'den desteklenmediği için satıcı panelindeki
  // ürün düzenleme sayfasının linkini döner (elle silmek için).
  async getSellerPanelLink(platformValue: string, barcode: string) {
    const platform = this.platform(platformValue);
    const adapter = await this.adapter(platform);
    if (!adapter.getSellerPanelUrl) {
      return { ok: false, status: 'NOT_IMPLEMENTED' as const, message: `${platform} icin panel linki desteklenmiyor.` };
    }
    return adapter.getSellerPanelUrl(barcode);
  }

  // Maliyet ekranından tek bir ürünün fiyat/stoğunu pazaryerine gönderir
  // (ürünü yeniden oluşturmadan, sadece fiyat günceller).
  async pushPrice(platformValue: string, payload: { barcode?: string; salePrice?: number; listPrice?: number; stockQuantity?: number }) {
    const platform = this.platform(platformValue);
    const adapter = await this.adapter(platform);
    const result = await adapter.pushPrice(payload);
    await this.log(platform, 'PUSH_PRICE', result.ok ? 'SUCCESS' : 'FAILED', result.message, payload.barcode ?? null, null, { salePrice: payload.salePrice, stockQuantity: payload.stockQuantity });
    return result;
  }

  async importOrderExcel(platformValue: string, file: Express.Multer.File | undefined, userId: number) {
    const platform = this.platform(platformValue);
    if (platform !== 'TRENDYOL') {
      return { ok: false, imported: 0, duplicated: 0, failed: 0, total: 0, message: 'Excel sipariş içe aktarma şu an Trendyol için hazır.' };
    }
    if (!file?.buffer?.length) {
      return { ok: false, imported: 0, duplicated: 0, failed: 0, total: 0, message: 'Excel dosyası seçilmedi.' };
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return { ok: false, imported: 0, duplicated: 0, failed: 0, total: 0, message: 'Excel sayfası okunamadı.' };

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
    const orders = this.parseTrendyolOrderRows(rows);
    let imported = 0;
    let duplicated = 0;
    let failed = 0;

    for (const order of orders) {
      try {
        const result = await this.importExternalOrder(order, userId);
        if (result.created) imported += 1;
        else duplicated += 1;
      } catch (error) {
        failed += 1;
        await this.log(platform, 'IMPORT_ORDER_EXCEL', 'FAILED', this.errorMessage(error), order.externalOrderId, null, {
          platformOrderNumber: order.platformOrderNumber,
          itemCount: order.items.length,
        });
      }
    }

    const message = `${imported} yeni, ${duplicated} mükerrer sipariş Excel ile işlendi.`;
    await this.log(platform, 'IMPORT_ORDER_EXCEL', failed ? 'FAILED' : 'SUCCESS', message, null, null, {
      sourceFile: file.originalname,
      rowCount: rows.length,
      orderCount: orders.length,
      imported,
      duplicated,
      failed,
    });
    return { ok: failed === 0, imported, duplicated, failed, total: orders.length, message };
  }

  private async safeAdapterTest(adapter: IntegrationAdapter) {
    try {
      return await adapter.testConnection();
    } catch (error) {
      return {
        ok: false,
        status: 'FAILED' as const,
        message: `${this.displayName(adapter.platform)} API bağlantısı kurulamadı: ${this.errorMessage(error)}`,
        missingKeys: [],
      };
    }
  }

  private parseTrendyolOrderRows(rows: Array<Record<string, unknown>>): ExternalOrder[] {
    const grouped = new Map<string, ExternalOrder>();
    for (const row of rows) {
      const platformOrderNumber = this.rowText(row, ['siparis no', 'siparis numarasi', 'order number', 'order no']);
      const packageNumber = this.rowText(row, ['paket no', 'paket numarasi', 'teslimat no', 'shipment package', 'package']);
      const barcode = this.rowText(row, ['barkod', 'barcode']);
      const modelCode = this.rowText(row, ['stok kodu', 'model kodu', 'stok no', 'stock code', 'sku']);
      const productName = this.rowText(row, ['urun adi', 'urun', 'product name', 'product']);
      if (!platformOrderNumber && !packageNumber && !barcode && !productName) continue;

      const key = packageNumber || platformOrderNumber || `ROW:${grouped.size + 1}`;
      const existing = grouped.get(key);
      const totalAmount = this.rowNumber(row, ['satis tutari', 'toplam tutar', 'faturalanacak tutar', 'total amount', 'grand total']);
      const order = existing ?? {
        externalOrderId: key,
        platformOrderNumber: platformOrderNumber || key,
        platform: 'TRENDYOL' as const,
        status: 'CONFIRMED' as const,
        invoiceStatus: 'WAITING' as const,
        customerName: this.rowText(row, ['musteri adi', 'alici', 'ad soyad', 'buyer', 'customer']) || 'Trendyol Müşteri',
        phone: this.rowText(row, ['telefon', 'gsm', 'phone', 'alici telefon']),
        addressText: this.rowText(row, ['adres', 'teslimat adresi', 'address']),
        city: this.rowText(row, ['il', 'sehir', 'city']) || undefined,
        district: this.rowText(row, ['ilce', 'district']) || undefined,
        totalAmount: totalAmount || 0,
        paidAmount: totalAmount || 0,
        paymentStatus: 'PAID' as const,
        cargoProvider: this.rowText(row, ['kargo firmasi', 'kargo', 'cargo provider']) || undefined,
        cargoTrackingNumber: this.rowText(row, ['kargo kodu', 'kargo takip', 'cargo code', 'tracking number']) || undefined,
        orderDate: this.rowDate(row, ['siparis tarihi', 'siparis tarih', 'order date', 'created date']),
        items: [],
      };

      const quantity = this.rowNumber(row, ['adet', 'miktar', 'quantity', 'urun adedi']) || 1;
      const unitPrice = this.rowNumber(row, ['birim fiyat', 'satis fiyati', 'urun tutari', 'price', 'unit price']);
      order.items.push({
        externalLineId: this.rowText(row, ['kalem id', 'line id', 'order line id']) || undefined,
        externalVariantId: this.rowText(row, ['urun id', 'product id', 'listing id']) || barcode || modelCode || undefined,
        productName: productName || modelCode || barcode || 'Trendyol Ürün',
        variationText: this.rowText(row, ['renk', 'beden', 'varyasyon', 'variant']) || undefined,
        sku: modelCode || undefined,
        barcode: barcode || undefined,
        modelCode: modelCode || undefined,
        quantity,
        unitPrice,
      });
      order.totalAmount = order.totalAmount || this.roundMoney(order.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));
      order.paidAmount = order.totalAmount;
      grouped.set(key, order);
    }
    return Array.from(grouped.values()).filter((order) => order.items.length > 0);
  }

  private rowText(row: Record<string, unknown>, candidates: string[]) {
    for (const [key, value] of Object.entries(row)) {
      const normalized = this.normalizeHeader(key);
      if (candidates.some((candidate) => normalized.includes(this.normalizeHeader(candidate)))) {
        const text = this.text(value);
        if (text) return text;
      }
    }
    return '';
  }

  private rowNumber(row: Record<string, unknown>, candidates: string[]) {
    const text = this.rowText(row, candidates).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
    const value = Number(text);
    return Number.isFinite(value) ? value : 0;
  }

  private rowDate(row: Record<string, unknown>, candidates: string[]) {
    const text = this.rowText(row, candidates);
    if (!text) return undefined;
    const parts = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?/);
    if (parts) {
      const date = new Date(Number(parts[3]), Number(parts[2]) - 1, Number(parts[1]), Number(parts[4] ?? 0), Number(parts[5] ?? 0));
      return Number.isNaN(date.getTime()) ? undefined : date;
    }
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private normalizeHeader(value: string) {
    return value
      .toLocaleLowerCase('tr-TR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[ıİ]/g, 'i')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  async orderSummary(platformValue?: string) {
    const platformText = this.text(platformValue).toUpperCase();
    const platform = platformText ? this.platform(platformText) : 'TRENDYOL';
    if (platform === 'TRENDYOL') {
      try {
        const adapter = await this.adapter(platform);
        if (adapter.fetchOrderSummary) return await adapter.fetchOrderSummary();
      } catch (error) {
        await this.log(platform, 'FETCH_ORDER_SUMMARY', 'FAILED', this.errorMessage(error));
      }
    }
    return this.localOrderSummary(platform);
  }

  async listOrders(query: Record<string, string> = {}) {
    const platform = this.text(query.platform).toUpperCase();
    const q = this.text(query.q);
    const statuses = this.text(query.status)
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean);
    const page = Math.max(1, Number(query.page) || 1);
    const take = Math.min(500, Math.max(1, Number(query.pageSize ?? query.take) || 200));
    const offset = (page - 1) * take;
    const sort = this.text(query.sort);
    const orderBy =
      sort === 'oldest'
        ? Prisma.sql`COALESCE(s.order_date, s.created_at) ASC`
        : sort === 'due'
          ? Prisma.sql`COALESCE(s.delivery_due_at, s.order_date, s.created_at) ASC`
          : Prisma.sql`COALESCE(s.order_date, s.created_at) DESC`;
    const customerName = this.text(query.customerName);
    const saleNumber = this.text(query.saleNumber);
    const platformOrderNumber = this.text(query.platformOrderNumber);
    const packageNumber = this.text(query.packageNumber);
    const barcode = this.text(query.barcode);
    const cargoCode = this.text(query.cargoCode);
    const productName = this.text(query.productName);
    const modelCode = this.text(query.modelCode);
    const phone = this.text(query.phone);
    const cargoProvider = this.text(query.cargoProvider);
    const startDate = this.text(query.startDate);
    const endDate = this.text(query.endDate);
    const companyCode = this.text(query.company).toUpperCase();

    return this.prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT s.id, s.sale_number AS "saleNumber", s.platform_order_number AS "platformOrderNumber",
        s.external_order_id AS "externalOrderId", s.channel AS platform, s.status,
        s.integration_sync_status AS "integrationSyncStatus", s.last_synced_at AS "lastSyncedAt",
        s.order_date AS "orderDate", s.delivery_due_at AS "deliveryDueAt", s.created_at AS "createdAt",
        s.cargo_provider AS "cargoProvider", s.cargo_tracking_number AS "cargoTrackingNumber",
        s.grand_total AS "grandTotal", s.subtotal, s.delivery_fee AS "deliveryFee", s.invoice_status AS "invoiceStatus",
        s.invoice_note AS "invoiceNote", s.cancelled_at AS "cancelledAt", s.internal_note AS "internalNote",
        c.display_name AS "customerName", c.phone, c.customer_type AS "customerType",
        a.city, a.district, a.full_address AS "fullAddress",
        d.status AS "deliveryStatus", d.delivery_note AS "deliveryNote",
        u.name AS "cancelledByName",
        COUNT(i.id)::int AS "itemCount",
        COALESCE(SUM(i.quantity), 0)::float AS quantity,
        COALESCE(SUM((i.line_total - COALESCE(i.unit_cost_snapshot, 0) * i.quantity)), 0)::float AS "estimatedProfit",
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', i.id,
              'barcode', i.barcode,
              'modelCode', i.model_code,
              'productName', i.product_name_snapshot,
              'variationText', i.variation_text,
              'quantity', i.quantity,
              'unitPrice', i.unit_price,
              'lineTotal', i.line_total,
              'imagePath', COALESCE(sc.image_path, sc.external_image_url, i.external_image_url),
              'color', sc.color
            )
            ORDER BY i.id
          ) FILTER (WHERE i.id IS NOT NULL),
          '[]'::jsonb
        ) AS items
      FROM retail_sales s
      JOIN retail_customers c ON c.id = s.customer_id
      LEFT JOIN retail_customer_addresses a ON a.id = s.address_id
      LEFT JOIN retail_deliveries d ON d.sale_id = s.id
      LEFT JOIN users u ON u.id = s.cancelled_by_id
      LEFT JOIN retail_sale_items i ON i.sale_id = s.id
      LEFT JOIN stock_cards sc ON sc.id = i.stock_card_id
        OR (i.stock_card_id IS NULL AND i.barcode IS NOT NULL AND sc.barcode = i.barcode)
        OR (i.stock_card_id IS NULL AND i.model_code IS NOT NULL AND sc.sku = i.model_code)
      WHERE s.integration_sync_status <> 'MANUAL'
        AND (${companyCode} = '' OR EXISTS (SELECT 1 FROM companies co WHERE co.id = s.company_id AND co.code = ${companyCode}))
        AND (${platform} = '' OR s.channel::text = ${platform})
        AND (${statuses.length} = 0 OR s.status::text IN (${Prisma.join(statuses.length ? statuses : ['__NONE__'])}))
        AND (${q} = '' OR s.sale_number ILIKE ${`%${q}%`} OR s.platform_order_number ILIKE ${`%${q}%`} OR c.display_name ILIKE ${`%${q}%`} OR c.phone ILIKE ${`%${q}%`})
        AND (${customerName} = '' OR c.display_name ILIKE ${`%${customerName}%`})
        AND (${saleNumber} = '' OR s.sale_number ILIKE ${`%${saleNumber}%`})
        AND (${platformOrderNumber} = '' OR s.platform_order_number ILIKE ${`%${platformOrderNumber}%`})
        AND (${packageNumber} = '' OR s.external_order_id ILIKE ${`%${packageNumber}%`} OR s.platform_order_number ILIKE ${`%${packageNumber}%`})
        AND (${barcode} = '' OR EXISTS (SELECT 1 FROM retail_sale_items x WHERE x.sale_id = s.id AND x.barcode ILIKE ${`%${barcode}%`}))
        AND (${cargoCode} = '' OR s.cargo_tracking_number ILIKE ${`%${cargoCode}%`})
        AND (${productName} = '' OR EXISTS (SELECT 1 FROM retail_sale_items x WHERE x.sale_id = s.id AND x.product_name_snapshot ILIKE ${`%${productName}%`}))
        AND (${modelCode} = '' OR EXISTS (SELECT 1 FROM retail_sale_items x WHERE x.sale_id = s.id AND x.model_code ILIKE ${`%${modelCode}%`}))
        AND (${phone} = '' OR c.phone ILIKE ${`%${phone}%`})
        AND (${cargoProvider} = '' OR s.cargo_provider ILIKE ${`%${cargoProvider}%`})
        AND (${startDate} = '' OR COALESCE(s.order_date, s.created_at)::date >= ${startDate}::date)
        AND (${endDate} = '' OR COALESCE(s.order_date, s.created_at)::date <= ${endDate}::date)
      GROUP BY s.id, c.display_name, c.phone, c.customer_type, a.city, a.district, a.full_address, d.status, d.delivery_note, u.name
      ORDER BY ${orderBy}
      LIMIT ${take} OFFSET ${offset}
    `);
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
    // Günlük ciro: firma bazlı + genel toplam
    const dailyRevenue = await this.prisma.$queryRaw<Array<{ companyCode: string; companyName: string; todayRevenue: number; todayOrders: number }>>`
      SELECT co.code AS "companyCode", co.name AS "companyName",
        COALESCE(SUM(s.grand_total) FILTER (WHERE s.created_at::date = CURRENT_DATE AND s.status NOT IN ('CANCELLED')), 0)::float AS "todayRevenue",
        COUNT(*) FILTER (WHERE s.created_at::date = CURRENT_DATE AND s.status NOT IN ('CANCELLED'))::int AS "todayOrders"
      FROM companies co
      LEFT JOIN retail_sales s ON s.company_id = co.id AND s.integration_sync_status <> 'MANUAL'
      WHERE co.is_active = true
      GROUP BY co.id, co.code, co.name
      ORDER BY co.code
    `;
    const totalDailyRevenue = dailyRevenue.reduce((sum, r) => sum + Number(r.todayRevenue), 0);
    return { ...summary, byPlatform, taskLoad, dailyRevenue, totalDailyRevenue };
  }

  private async localOrderSummary(platform: IntegrationPlatform): Promise<ExternalOrderSummary> {
    const [summary] = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status IN ('CONFIRMED', 'PAYMENT_PENDING'))::int AS new,
        COUNT(*) FILTER (WHERE status IN ('PREPARING', 'IN_PRODUCTION'))::int AS processing,
        COUNT(*) FILTER (WHERE status = 'READY')::int AS ready,
        COUNT(*) FILTER (WHERE status = 'OUT_FOR_DELIVERY')::int AS transit,
        COUNT(*) FILTER (WHERE status IN ('DELIVERED', 'COMPLETED'))::int AS delivered,
        0::int AS reshipment,
        COUNT(*) FILTER (WHERE integration_sync_status = 'MATCHING_REQUIRED')::int AS hold,
        COUNT(*) FILTER (WHERE status = 'CANCELLED')::int AS cancelled,
        COUNT(*) FILTER (WHERE invoice_status = 'RETURNED')::int AS returned
      FROM retail_sales
      WHERE integration_sync_status <> 'MANUAL'
        AND channel::text = ${platform}
    `;
    return {
      total: Number(summary?.total ?? 0),
      new: Number(summary?.new ?? 0),
      processing: Number(summary?.processing ?? 0),
      ready: Number(summary?.ready ?? 0),
      transit: Number(summary?.transit ?? 0),
      delivered: Number(summary?.delivered ?? 0),
      reshipment: Number(summary?.reshipment ?? 0),
      hold: Number(summary?.hold ?? 0),
      cancelled: Number(summary?.cancelled ?? 0),
      returned: Number(summary?.returned ?? 0),
      lastUpdatedAt: new Date().toISOString(),
      source: 'LOCAL',
    };
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
    const companyPrefix = order.companyCode && order.companyCode !== 'ERHAN' ? `${order.companyCode}:` : '';
    const idempotencyKey = `${companyPrefix}${order.platform}:${order.externalOrderId}`;
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${idempotencyKey}))`;
      const existing = await tx.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM retail_sales WHERE idempotency_key = ${idempotencyKey} LIMIT 1
      `;
      if (existing[0]) {
        const status = order.status ?? null;
        const invoiceStatus = order.invoiceStatus ?? null;
        await tx.$executeRaw`
          UPDATE retail_sales
          SET status = COALESCE(${status}::"RetailSaleStatus", status),
              invoice_status = COALESCE(${invoiceStatus}::"RetailInvoiceStatus", invoice_status),
              order_date = COALESCE(${order.orderDate ?? null}, order_date),
              delivery_due_at = COALESCE(${order.deliveryDueAt ?? null}, delivery_due_at),
              cargo_provider = COALESCE(${order.cargoProvider ?? null}, cargo_provider),
              cargo_tracking_number = COALESCE(${order.cargoTrackingNumber ?? null}, cargo_tracking_number),
              last_synced_at = NOW(),
              updated_at = NOW()
          WHERE id = ${existing[0].id}
        `;
        return { created: false, saleId: existing[0].id };
      }

      const customer = await this.ensureCustomer(tx, order, userId);
      const address = await this.ensureAddress(tx, Number(customer.id), order, userId);
      const saleNumber = await this.nextSaleNumber(tx);
      const totals = this.orderTotals(order);
      const status = order.status ?? (totals.remainingTotal > 0 ? 'PAYMENT_PENDING' : 'CONFIRMED');
      const invoiceStatus = order.invoiceStatus ?? 'WAITING';
      const syncStatus = await this.hasUnmatchedItems(order) ? 'MATCHING_REQUIRED' : 'SYNCED';
      const companyCode = order.companyCode ?? 'ERHAN';
      const saleRows = await tx.$queryRaw<Array<{ id: number }>>`
        INSERT INTO retail_sales (
          sale_number, customer_id, address_id, channel, sale_type, status, currency, subtotal, discount_total,
          delivery_fee, grand_total, paid_total, remaining_total, customer_note, internal_note, event_key, created_by_id,
          platform_order_number, external_order_id, idempotency_key, integration_sync_status, last_synced_at,
          cargo_provider, cargo_tracking_number, order_date, delivery_due_at, invoice_status, company_id, created_at, updated_at
        )
        VALUES (
          ${saleNumber}, ${Number(customer.id)}, ${Number(address.id)}, ${order.platform}::"RetailSaleChannel", 'DELIVERY_SALE'::"RetailSaleType",
          ${status}::"RetailSaleStatus", 'TRY', ${totals.subtotal}, 0, 0, ${totals.grandTotal}, ${totals.paidTotal}, ${totals.remainingTotal},
          NULL, ${`Platform siparişi: ${order.platform}`}, ${`INTEGRATION_ORDER:${idempotencyKey}`}, ${userId},
          ${order.platformOrderNumber}, ${order.externalOrderId}, ${idempotencyKey}, ${syncStatus}, NOW(),
          ${order.cargoProvider ?? null}, ${order.cargoTrackingNumber ?? null}, ${order.orderDate ?? null}, ${order.deliveryDueAt ?? null}, ${invoiceStatus}::"RetailInvoiceStatus",
          (SELECT id FROM companies WHERE code = ${companyCode} LIMIT 1),
          NOW(), NOW()
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
            external_variant_id, external_image_url, variation_text, quantity, unit_price, discount_amount, line_total, unit_cost_snapshot,
            stock_fulfillment_type, created_at
          )
          VALUES (
            ${saleId}, ${match.variantId}, ${match.stockCardId}, ${item.barcode ?? null}, ${item.modelCode ?? null}, ${item.productName},
            ${item.externalLineId ?? null}, ${item.externalVariantId ?? null}, ${item.imageUrl ?? null}, ${item.variationText ?? null}, ${item.quantity},
            ${item.unitPrice}, 0, ${lineTotal}, ${match.unitCost}, 'READY_STOCK'::"StockFulfillmentType", NOW()
          )
          RETURNING id, stock_card_id AS "stockCardId", (SELECT unit FROM stock_cards WHERE id = stock_card_id) AS unit
        `;
        if (itemRows[0]?.stockCardId) {
          await this.deductStockForOrderItem(
            tx,
            Number(itemRows[0].stockCardId),
            saleId,
            Number(itemRows[0].id),
            item.quantity,
            String(itemRows[0].unit ?? 'Adet'),
            userId,
            order.platform,
            order.platformOrderNumber,
          );
        } else if (match.productId) {
          await this.deductStockForOrderProduct(
            tx,
            match.productId,
            saleId,
            Number(itemRows[0].id),
            match.variantId,
            item.quantity,
            userId,
            order.platform,
            order.platformOrderNumber,
          );
        } else if (match.variantId) {
          await this.deductStockForOrderVariant(
            tx,
            match.variantId,
            saleId,
            Number(itemRows[0].id),
            item.quantity,
            userId,
            order.platform,
            order.platformOrderNumber,
          );
        }
        if (match.variantId) {
          await this.deductRecipeStockForOrder(tx, match.variantId, saleId, Number(itemRows[0].id), item.quantity, userId);
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

  // Pazaryeri siparişi ERP'ye düştüğü anda stok gerçekten düşer (rezervasyon değil).
  // Yetersiz stok siparişin içe aktarılmasını engellemez; stok eksiye düşebilir,
  // hareket kaydında bu görünür kalır ki fark sonradan sayım/tedarik ile kapatılabilsin.
  private async deductStockForOrderItem(
    tx: Prisma.TransactionClient,
    stockCardId: number,
    saleId: number,
    saleItemId: number,
    quantity: number,
    unit: string,
    userId: number,
    platform: IntegrationPlatform,
    platformOrderNumber: string,
  ) {
    const eventKey = `ORDER_STOCK_OUT:${saleId}:${saleItemId}`;
    const existing = await tx.$queryRaw<Array<{ id: number }>>`SELECT id FROM stock_movements WHERE event_key = ${eventKey} LIMIT 1`;
    if (existing[0]) return;

    await tx.$queryRaw`SELECT id FROM stock_cards WHERE id = ${stockCardId} FOR UPDATE`;
    const cards = await tx.$queryRaw<Array<{ stockQuantity: number }>>`SELECT stock_quantity AS "stockQuantity" FROM stock_cards WHERE id = ${stockCardId}`;
    const previousStock = Number(cards[0]?.stockQuantity ?? 0);
    const nextStock = previousStock - quantity;

    await tx.$executeRaw`
      UPDATE stock_cards SET stock_quantity = ${nextStock}, last_movement_at = NOW(), updated_at = NOW()
      WHERE id = ${stockCardId}
    `;
    await tx.$executeRaw`
      INSERT INTO stock_movements (
        stock_card_id, type, quantity, unit, previous_stock, next_stock, reason, reference_type, reference_id, event_key, created_by_id, created_at
      )
      VALUES (
        ${stockCardId}, 'OUT', ${quantity}, ${unit}, ${previousStock}, ${nextStock},
        ${`${this.displayName(platform)} siparişi ${platformOrderNumber}`}, 'RETAIL_SALE', ${String(saleId)}, ${eventKey}, ${userId}, NOW()
      )
      ON CONFLICT (event_key) DO NOTHING
    `;
  }

  // Ürün Merkezi ürünleri (henüz stok kartına taşınmamış) için aynı düşüm mantığı.
  // Bulunursa bağlı trendyol_product_variants.stock_quantity alanı da eşitlenir.
  private async deductStockForOrderProduct(
    tx: Prisma.TransactionClient,
    productId: number,
    saleId: number,
    saleItemId: number,
    variantId: number | null,
    quantity: number,
    userId: number,
    platform: IntegrationPlatform,
    platformOrderNumber: string,
  ) {
    const eventKey = `ORDER_STOCK_OUT:${saleId}:${saleItemId}`;
    const existing = await tx.$queryRaw<Array<{ id: number }>>`SELECT id FROM stock_movements WHERE event_key = ${eventKey} LIMIT 1`;
    if (existing[0]) return;

    await tx.$queryRaw`SELECT id FROM products WHERE id = ${productId} FOR UPDATE`;
    const products = await tx.$queryRaw<Array<{ stockQuantity: number }>>`SELECT stock_quantity AS "stockQuantity" FROM products WHERE id = ${productId}`;
    const previousStock = Number(products[0]?.stockQuantity ?? 0);
    const nextStock = previousStock - quantity;

    await tx.$executeRaw`UPDATE products SET stock_quantity = ${nextStock}, updated_at = NOW() WHERE id = ${productId}`;
    if (variantId) {
      await tx.$executeRaw`UPDATE trendyol_product_variants SET stock_quantity = ${nextStock}, updated_at = NOW() WHERE id = ${variantId}`;
    }
    await tx.$executeRaw`
      INSERT INTO stock_movements (
        product_id, type, quantity, unit, previous_stock, next_stock, reason, reference_type, reference_id, event_key, created_by_id, created_at
      )
      VALUES (
        ${productId}, 'OUT', ${quantity}, 'Adet', ${previousStock}, ${nextStock},
        ${`${this.displayName(platform)} siparişi ${platformOrderNumber}`}, 'RETAIL_SALE', ${String(saleId)}, ${eventKey}, ${userId}, NOW()
      )
      ON CONFLICT (event_key) DO NOTHING
    `;
  }

  // "Trendyol Maliyet" ekranından içe aktarılmış ama henüz bir ürün/stok kartına
  // bağlanmamış (aile/maliyet ataması yapılmamış) varyasyonlar için: kendi
  // stock_quantity alanından düşer, böylece maliyet eşleştirmesi tamamlanmayı beklemez.
  private async deductStockForOrderVariant(
    tx: Prisma.TransactionClient,
    variantId: number,
    saleId: number,
    saleItemId: number,
    quantity: number,
    userId: number,
    platform: IntegrationPlatform,
    platformOrderNumber: string,
  ) {
    const eventKey = `ORDER_STOCK_OUT:${saleId}:${saleItemId}`;
    const existing = await tx.$queryRaw<Array<{ id: number }>>`SELECT id FROM stock_movements WHERE event_key = ${eventKey} LIMIT 1`;
    if (existing[0]) return;

    await tx.$queryRaw`SELECT id FROM trendyol_product_variants WHERE id = ${variantId} FOR UPDATE`;
    const rows = await tx.$queryRaw<Array<{ stockQuantity: number }>>`SELECT stock_quantity AS "stockQuantity" FROM trendyol_product_variants WHERE id = ${variantId}`;
    const previousStock = Number(rows[0]?.stockQuantity ?? 0);
    const nextStock = previousStock - quantity;

    await tx.$executeRaw`UPDATE trendyol_product_variants SET stock_quantity = ${nextStock}, updated_at = NOW() WHERE id = ${variantId}`;
    await tx.$executeRaw`
      INSERT INTO stock_movements (
        variant_id, type, quantity, unit, previous_stock, next_stock, reason, reference_type, reference_id, event_key, created_by_id, created_at
      )
      VALUES (
        ${variantId}, 'OUT', ${quantity}, 'Adet', ${previousStock}, ${nextStock},
        ${`${this.displayName(platform)} siparişi ${platformOrderNumber}`}, 'RETAIL_SALE', ${String(saleId)}, ${eventKey}, ${userId}, NOW()
      )
      ON CONFLICT (event_key) DO NOTHING
    `;
  }

  // Bitmiş ürünün kendi stoğu ayrı; bu, o ürünün ONAYLI reçetesindeki (yaprak,
  // gövde, saksı vb.) gerçek malzemeleri de ayrı ayrı düşer — dükkan satışlarındaki
  // deductRecipeStock ile aynı mantık, farkla: burada yetersiz stok siparişi
  // engellemez (marketplace siparişi zaten kesinleşmiş), stok eksiye düşebilir.
  private async deductRecipeStockForOrder(tx: Prisma.TransactionClient, variantId: number, saleId: number, saleItemId: number, saleQuantity: number, userId: number) {
    const draft = await tx.productCostDraft.findUnique({
      where: { variantId },
      include: { items: true, pots: true },
    });
    if (!draft || draft.status !== 'APPROVED') return;

    const recipeRows = [...draft.items, ...draft.pots]
      .filter((row) => row.source !== 'MANUAL' && row.stockCardId && Number(row.quantity) > 0)
      .map((row) => ({
        stockCardId: Number(row.stockCardId),
        quantity: Number(row.quantity) * saleQuantity,
        unit: 'unit' in row ? (row as { unit: string }).unit : 'adet',
      }));

    for (const row of recipeRows) {
      const eventKey = `ORDER_RECIPE_STOCK_OUT:${saleId}:${saleItemId}:${row.stockCardId}`;
      const existing = await tx.stockUsageLog.findUnique({ where: { eventKey } });
      if (existing) continue;

      await tx.$queryRaw`SELECT id FROM stock_cards WHERE id = ${row.stockCardId} FOR UPDATE`;
      const stockCard = await tx.stockCard.findUnique({ where: { id: row.stockCardId } });
      if (!stockCard) continue;

      const previousStock = Number(stockCard.stockQuantity);
      const nextStock = previousStock - row.quantity;
      const updated = await tx.stockCard.update({
        where: { id: row.stockCardId },
        data: { stockQuantity: nextStock, lastMovementAt: new Date() },
      });

      await tx.stockUsageLog.create({
        data: {
          stockCardId: row.stockCardId,
          variantId,
          eventType: 'ORDER_SHIPPED',
          eventKey,
          quantity: row.quantity,
          unit: row.unit,
          previousStock,
          nextStock: Number(updated.stockQuantity),
          userId,
        },
      });
    }
  }

  private async matchItem(tx: Prisma.TransactionClient, barcode?: string, modelCode?: string, externalVariantId?: string) {
    const variants = await tx.$queryRaw<Array<Record<string, unknown>>>`
      SELECT id, product_id AS "productId", barcode, current_model_code AS "currentModelCode", proposed_model_code AS "proposedModelCode"
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

    let productId = variant?.productId ? Number(variant.productId) : null;
    let productCostPrice: number | null = null;
    if (!stockCard) {
      const products = await tx.$queryRaw<Array<Record<string, unknown>>>`
        SELECT id, cost_price AS "costPrice" FROM products
        WHERE (${productId ?? 0} > 0 AND id = ${productId ?? 0})
          OR (${barcode ?? ''} <> '' AND barcode = ${barcode ?? ''})
          OR (${modelCode ?? ''} <> '' AND model_code = ${modelCode ?? ''})
        LIMIT 1
      `;
      if (products[0]) {
        productId = Number(products[0].id);
        productCostPrice = Number(products[0].costPrice ?? 0);
      }
    }

    return {
      variantId: variant ? Number(variant.id) : null,
      stockCardId: stockCard ? Number(stockCard.id) : null,
      productId: stockCard ? null : productId,
      unitCost: stockCard
        ? Number(stockCard.manualUnitCostEnabled ? stockCard.manualUnitCost : stockCard.automaticUnitCost)
        : productCostPrice,
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
    if (normalizedPhone) {
      const existing = await tx.$queryRaw<Array<Record<string, unknown>>>`
        SELECT id FROM retail_customers WHERE normalized_phone = ${normalizedPhone} LIMIT 1
      `;
      if (existing[0]) return existing[0];
    }
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(19010101)`;
    const next = await tx.$queryRaw<Array<{ nextId: number }>>`SELECT COALESCE(MAX(id), 0) + 1 AS "nextId" FROM retail_customers`;
    const customerCode = `MUS-${String(Number(next[0].nextId)).padStart(6, '0')}`;
    const phone = this.text(order.phone) || null;
    const rows = await tx.$queryRaw<Array<Record<string, unknown>>>`
      INSERT INTO retail_customers (
        customer_code, customer_type, first_name, display_name, phone, normalized_phone, whatsapp_phone,
        source, order_communication_allowed, created_by_id, created_at, updated_at
      )
      VALUES (${customerCode}, 'INDIVIDUAL', ${order.customerName}, ${order.customerName}, ${phone}, ${normalizedPhone}, ${phone},
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

  private async adapter(platform: IntegrationPlatform, companyCode = 'ERHAN'): Promise<IntegrationAdapter> {
    if (platform === 'TRENDYOL') return new TrendyolAdapter(await this.integrationCenter.runtimeCredentials(platform, companyCode));
    if (platform === 'HEPSIBURADA') return new HepsiburadaAdapter(await this.integrationCenter.runtimeCredentials(platform, companyCode));
    if (platform === 'N11') return new N11Adapter(await this.integrationCenter.runtimeCredentials(platform, companyCode));
    if (platform === 'TICIMAX') return new TicimaxAdapter(await this.integrationCenter.ticimaxRuntimeCredentials());
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

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Siparis ice aktarilamadi.';
  }

  private roundMoney(value: number) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }
}
