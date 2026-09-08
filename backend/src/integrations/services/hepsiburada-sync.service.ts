import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { IntegrationsService } from '../integrations.service';
import { HepsiburadaAdapter } from '../adapters/hepsiburada.adapter';

const LISTING_URL = 'https://listing-external.hepsiburada.com';
const ORDERS_URL = 'https://oms-external.hepsiburada.com';

export type HbStockItem = { hepsiburadaSku: string; availableStock: number };
export type HbPriceItem = { hepsiburadaSku: string; price: string; salePrice?: string };
export type HbSyncResult = { ok: boolean; message: string; detail?: unknown };

@Injectable()
export class HepsiburadaSyncService {
  private readonly logger = new Logger(HepsiburadaSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrations: IntegrationsService,
  ) {}

  private get merchantId() { return process.env.HEPSIBURADA_MERCHANT_ID ?? ''; }
  private get secretKey()  { return process.env.HEPSIBURADA_SECRET_KEY  ?? ''; }
  private get userAgent()  { return process.env.HEPSIBURADA_USER_AGENT  ?? 'erhanflowers_dev'; }

  private get hasCredentials() {
    return Boolean(this.merchantId && this.secretKey);
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    const auth = Buffer.from(`${this.merchantId}:${this.secretKey}`).toString('base64');
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
      'User-Agent': this.userAgent,
      ...extra,
    };
  }

  // ── Otomatik sipariş sync (her 10 dakika) ──────────────────────────────────

  @Cron('*/10 * * * *')
  async cronSyncOrders() {
    if (!this.hasCredentials) return;
    try {
      const owner = await this.prisma.user.findFirst({ where: { role: 'OWNER' } });
      if (!owner) return;
      await this.integrations.syncOrders('HEPSIBURADA', owner.id);
      this.logger.log('Hepsiburada sipariş sync tamamlandı');
    } catch (err) {
      this.logger.warn(`Hepsiburada sipariş sync hatası: ${String(err)}`);
    }
  }

  // Manuel tetikleme — env var kimlik bilgileriyle doğrudan API çağrısı
  async syncOrdersNow(): Promise<HbSyncResult> {
    if (!this.hasCredentials) return { ok: false, message: 'Hepsiburada kimlik bilgileri eksik.' };
    try {
      const owner = await this.prisma.user.findFirst({ where: { role: 'OWNER' } });
      if (!owner) return { ok: false, message: 'Sistem sahibi bulunamadı.' };

      // Env var kimlik bilgileriyle doğrudan adapter oluştur (DB override bypass)
      const adapter = new HepsiburadaAdapter({
        MERCHANT_ID: this.merchantId,
        USERNAME: this.merchantId,
        PASSWORD: this.secretKey,
        API_KEY: this.merchantId,
        API_SECRET: this.secretKey,
        USER_AGENT: this.userAgent,
        API_URL: ORDERS_URL,
      });
      const testResult = await adapter.testConnection();
      if (!testResult.ok) return { ok: false, message: testResult.message };

      const result = await this.integrations.syncOrders('HEPSIBURADA', owner.id);
      return { ok: true, message: 'Sipariş sync tamamlandı.', detail: result };
    } catch (err) {
      return { ok: false, message: String(err) };
    }
  }

  // ── Stok güncelleme ────────────────────────────────────────────────────────

  async pushStock(items: HbStockItem[]): Promise<HbSyncResult> {
    if (!this.hasCredentials) return { ok: false, message: 'Hepsiburada kimlik bilgileri eksik.' };
    if (!items.length) return { ok: false, message: 'Güncellenecek ürün yok.' };

    const url = `${LISTING_URL}/listings/merchantid/${this.merchantId}/inventory-uploads`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(items),
    });

    if (res.ok) {
      const detail = await res.json().catch(() => null);
      this.logger.log(`Hepsiburada stok güncellendi: ${items.length} ürün`);
      return { ok: true, message: `${items.length} ürün stoğu Hepsiburada'ya gönderildi.`, detail };
    }

    const errText = await res.text().catch(() => res.statusText);
    this.logger.warn(`Hepsiburada stok güncelleme hatası HTTP ${res.status}: ${errText}`);
    return { ok: false, message: `Hepsiburada stok hatası (HTTP ${res.status}): ${errText.slice(0, 200)}` };
  }

  // Stok kartlarındaki mevcut stoğu otomatik topla ve gönder
  async pushAllStockFromERP(): Promise<HbSyncResult> {
    const rows = await this.prisma.$queryRaw<Array<{ external_sku: string; stock_quantity: number }>>`
      SELECT cpm.external_sku, sc.stock_quantity
      FROM channel_product_mappings cpm
      JOIN channel_accounts ca ON cpm.channel_account_id = ca.id
      JOIN sales_channels sch ON ca.sales_channel_id = sch.id
      JOIN stock_cards sc ON cpm.stock_card_id = sc.id
      WHERE sch.name ILIKE '%hepsiburada%'
        AND cpm.external_sku IS NOT NULL
        AND cpm.stock_card_id IS NOT NULL
    `.catch(() => []);

    if (!rows.length) {
      return { ok: false, message: 'Hepsiburada için eşleştirilmiş ürün bulunamadı. Önce entegrasyon hesabını kaydedin ve ürünleri eşleştirin.' };
    }

    const items: HbStockItem[] = rows.map((r: { external_sku: string; stock_quantity: unknown }) => ({
      hepsiburadaSku: r.external_sku,
      availableStock: Math.max(0, Number(r.stock_quantity)),
    }));

    return this.pushStock(items);
  }

  // ── Fiyat güncelleme ───────────────────────────────────────────────────────

  async pushPrice(items: HbPriceItem[]): Promise<HbSyncResult> {
    if (!this.hasCredentials) return { ok: false, message: 'Hepsiburada kimlik bilgileri eksik.' };
    if (!items.length) return { ok: false, message: 'Güncellenecek ürün yok.' };

    const url = `${LISTING_URL}/listings/merchantid/${this.merchantId}/price-uploads`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(items),
    });

    if (res.ok) {
      const detail = await res.json().catch(() => null);
      this.logger.log(`Hepsiburada fiyat güncellendi: ${items.length} ürün`);
      return { ok: true, message: `${items.length} ürün fiyatı Hepsiburada'ya gönderildi.`, detail };
    }

    const errText = await res.text().catch(() => res.statusText);
    this.logger.warn(`Hepsiburada fiyat güncelleme hatası HTTP ${res.status}: ${errText}`);
    return { ok: false, message: `Hepsiburada fiyat hatası (HTTP ${res.status}): ${errText.slice(0, 200)}` };
  }

  // Stok kartlarındaki fiyatları otomatik topla ve gönder
  async pushAllPricesFromERP(): Promise<HbSyncResult> {
    const rows = await this.prisma.$queryRaw<Array<{ external_sku: string; sale_price: number }>>`
      SELECT cpm.external_sku, sc.sale_price
      FROM channel_product_mappings cpm
      JOIN channel_accounts ca ON cpm.channel_account_id = ca.id
      JOIN sales_channels sch ON ca.sales_channel_id = sch.id
      JOIN stock_cards sc ON cpm.stock_card_id = sc.id
      WHERE sch.name ILIKE '%hepsiburada%'
        AND cpm.external_sku IS NOT NULL
        AND cpm.stock_card_id IS NOT NULL
        AND sc.sale_price > 0
    `.catch(() => []);

    if (!rows.length) {
      return { ok: false, message: 'Hepsiburada için fiyatlı eşleştirilmiş ürün bulunamadı.' };
    }

    const items: HbPriceItem[] = rows.map((r: { external_sku: string; sale_price: unknown }) => ({
      hepsiburadaSku: r.external_sku,
      price: Number(r.sale_price).toFixed(2),
    }));

    return this.pushPrice(items);
  }

  // ── Ürün listesi (Hepsiburada'dan çek) ────────────────────────────────────

  async getListings(offset = 0, limit = 50): Promise<HbSyncResult> {
    if (!this.hasCredentials) return { ok: false, message: 'Hepsiburada kimlik bilgileri eksik.' };

    const url = new URL(`${LISTING_URL}/listings/merchantid/${this.merchantId}`);
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('limit', String(limit));

    const res = await fetch(url, { method: 'GET', headers: this.headers() });
    if (res.ok) {
      const detail = await res.json().catch(() => null);
      return { ok: true, message: 'Listings alındı.', detail };
    }

    const errText = await res.text().catch(() => res.statusText);
    return { ok: false, message: `Listings hatası (HTTP ${res.status}): ${errText.slice(0, 200)}` };
  }

  // ── Bağlantı testi ────────────────────────────────────────────────────────

  async testConnection(): Promise<HbSyncResult> {
    if (!this.hasCredentials) return { ok: false, message: 'HEPSIBURADA_MERCHANT_ID veya HEPSIBURADA_SECRET_KEY eksik.' };

    const url = new URL(`${ORDERS_URL}/orders/merchantid/${this.merchantId}/openorders`);
    url.searchParams.set('offset', '0');
    url.searchParams.set('limit', '1');

    const res = await fetch(url, { method: 'GET', headers: this.headers({ 'Content-Type': '' }) });
    if (res.ok) return { ok: true, message: 'Hepsiburada API bağlantısı başarılı.' };

    const errText = await res.text().catch(() => res.statusText);
    return { ok: false, message: `Bağlantı hatası (HTTP ${res.status}): ${errText.slice(0, 200)}` };
  }

  getStatus() {
    return {
      configured: this.hasCredentials,
      merchantId: this.merchantId ? `${this.merchantId.slice(0, 8)}...` : null,
      userAgent: this.userAgent,
      cronSchedule: 'Her 10 dakika',
    };
  }
}
