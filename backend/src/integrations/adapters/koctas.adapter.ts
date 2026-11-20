import { Inject, Injectable, Optional } from '@nestjs/common';
import { BaseIntegrationAdapter } from './base-adapter';
import { AdapterConnectionResult, ExternalOrder, ExternalOrderItem } from './integration-adapter.interface';

// Koçtaş Satış Ortağım — Mirakl Marketplace Platform (satıcı API'si)
// Panel: https://koctas.mirakl.net  ·  API: https://koctas.mirakl.net/api
// Kimlik: "Authorization: <API anahtarı>" (Kişisel ayarlar > API anahtarı). Bearer ön eki YOK.
// SHOP_ID isteğe bağlı: kullanıcı birden fazla mağazaya bağlıysa hangi mağaza olduğunu seçer.
//   A01  GET  /api/account                     → bağlantı testi (mağaza bilgisi)
//   OR11 GET  /api/orders                      → siparişler
//   PRI01 POST /api/offers/pricing/imports     → sadece fiyat (CSV: offer-sku;price)
//   STO01 POST /api/offers/stock/imports       → sadece stok (CSV: offer-sku;quantity)
// Fiyat/stok güncellemesi teklifin diğer alanlarına dokunmaz ve Koçtaş'ta olmayan ürün için ilan açmaz.
const DEFAULT_API = 'https://koctas.mirakl.net/api';

type MiraklOrder = Record<string, any>;

@Injectable()
export class KoctasAdapter extends BaseIntegrationAdapter {
  platform = 'KOCTAS' as const;

  private credentials: Record<string, string>;

  constructor(@Optional() @Inject('KOCTAS_RUNTIME_CREDENTIALS') runtimeCredentials?: Record<string, string>) {
    super();
    this.credentials = runtimeCredentials ?? {};
  }

  private env(key: string): string {
    return (this.credentials[key] || this.credentials[`KOCTAS_${key}`] || process.env[`KOCTAS_${key}`] || '').trim();
  }

  private apiBase(): string {
    return (this.env('API_URL') || DEFAULT_API).replace(/\/+$/, '');
  }

  private missingKeys(): string[] {
    return this.env('API_KEY') ? [] : ['KOCTAS_API_KEY'];
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return { Authorization: this.env('API_KEY'), Accept: 'application/json', ...extra };
  }

  /** shop_id sorgu parametresi (tanımlıysa) */
  private shopQuery(prefix: '?' | '&' = '?'): string {
    const shopId = this.env('SUPPLIER_ID');
    return shopId ? `${prefix}shop_id=${encodeURIComponent(shopId)}` : '';
  }

  override async testConnection(): Promise<AdapterConnectionResult> {
    const missing = this.missingKeys();
    if (missing.length) return this.missing(missing);
    try {
      const res = await fetch(`${this.apiBase()}/account${this.shopQuery()}`, {
        headers: this.headers(),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        const name = String(data.shop_name ?? '');
        const id = String(data.shop_id ?? '');
        return { ok: true, status: 'CONNECTED', message: `Koçtaş bağlantısı başarılı${name ? `: ${name}` : ''}${id ? ` (mağaza ${id})` : ''}.` };
      }
      if (res.status === 401 || res.status === 403) {
        return { ok: false, status: 'MISSING_CREDENTIALS', message: `Koçtaş API anahtarı geçersiz veya yetkisiz (HTTP ${res.status}). Yeni anahtar oluşturduysanız eskisi artık çalışmaz.` };
      }
      const body = await res.text().catch(() => '');
      return { ok: false, status: 'FAILED', message: `Koçtaş API hatası (HTTP ${res.status}): ${body.slice(0, 200)}` };
    } catch (err: unknown) {
      return { ok: false, status: 'FAILED', message: `Koçtaş API'ye ulaşılamadı: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  /** Son N gün içinde güncellenen siparişler (tüm durumlar) — sayfalı */
  async fetchRawOrders(days = 14): Promise<MiraklOrder[]> {
    if (this.missingKeys().length) return [];
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const all: MiraklOrder[] = [];
    for (let offset = 0; offset < 2000; offset += 100) {
      const url = `${this.apiBase()}/orders?max=100&offset=${offset}&start_update_date=${encodeURIComponent(since)}${this.shopQuery('&')}`;
      const res = await fetch(url, { headers: this.headers(), signal: AbortSignal.timeout(20000) }).catch(() => null);
      if (!res || !res.ok) break;
      const data = (await res.json().catch(() => ({}))) as { orders?: MiraklOrder[]; total_count?: number };
      const page = Array.isArray(data.orders) ? data.orders : [];
      all.push(...page);
      if (page.length < 100 || all.length >= Number(data.total_count ?? 0)) break;
    }
    return all;
  }

  override async fetchOrders(): Promise<ExternalOrder[]> {
    const raw = await this.fetchRawOrders();
    return raw.map((o) => this.mapOrder(o)).filter((o): o is ExternalOrder => o !== null);
  }

  override async fetchOrderDetail(externalOrderId?: string): Promise<ExternalOrder | null> {
    if (this.missingKeys().length || !externalOrderId) return null;
    const res = await fetch(`${this.apiBase()}/orders?order_ids=${encodeURIComponent(externalOrderId)}${this.shopQuery('&')}`, {
      headers: this.headers(),
      signal: AbortSignal.timeout(15000),
    }).catch(() => null);
    if (!res || !res.ok) return null;
    const data = (await res.json().catch(() => ({}))) as { orders?: MiraklOrder[] };
    const order = data.orders?.[0];
    return order ? this.mapOrder(order) : null;
  }

  /** Mirakl sipariş durumu → ERP durumu */
  static mapStatus(state: string): ExternalOrder['status'] {
    switch (String(state || '').toUpperCase()) {
      case 'STAGING':
      case 'WAITING_ACCEPTANCE':
      case 'WAITING_DEBIT':
      case 'WAITING_DEBIT_PAYMENT':
        return 'CONFIRMED';
      case 'SHIPPING':
        return 'PREPARING';
      case 'SHIPPED':
      case 'TO_COLLECT':
        return 'OUT_FOR_DELIVERY';
      case 'RECEIVED':
      case 'CLOSED':
        return 'DELIVERED';
      case 'REFUSED':
      case 'CANCELED':
      case 'CANCELLED':
        return 'CANCELLED';
      default:
        return undefined;
    }
  }

  private mapOrder(o: MiraklOrder): ExternalOrder | null {
    const id = String(o.order_id ?? '');
    if (!id) return null;
    const customer = (o.customer ?? {}) as Record<string, any>;
    const ship = (customer.shipping_address ?? {}) as Record<string, any>;
    const name = [ship.firstname ?? customer.firstname, ship.lastname ?? customer.lastname].filter(Boolean).join(' ');
    const lines: ExternalOrderItem[] = (Array.isArray(o.order_lines) ? o.order_lines : []).map((l: Record<string, any>) => ({
      externalLineId: String(l.order_line_id ?? ''),
      productName: String(l.product_title ?? l.offer_sku ?? ''),
      sku: String(l.offer_sku ?? ''),
      barcode: String(l.offer_sku ?? ''),
      modelCode: String(l.offer_sku ?? ''),
      imageUrl: Array.isArray(l.product_medias) ? String(l.product_medias[0]?.media_url ?? '') || undefined : undefined,
      quantity: Number(l.quantity ?? 1),
      unitPrice: Number(l.price_unit ?? (Number(l.price ?? 0) / Math.max(1, Number(l.quantity ?? 1)))),
    }));
    const state = String(o.order_state ?? '');
    const mapped = KoctasAdapter.mapStatus(state);
    return {
      externalOrderId: id,
      platformOrderNumber: String(o.commercial_id ?? id),
      platform: 'KOCTAS',
      status: mapped,
      externalStatus: state,
      unknownStatus: !mapped,
      customerName: name || 'Koçtaş Müşterisi',
      phone: String(ship.phone ?? ship.phone_secondary ?? ''),
      addressText: [ship.street_1, ship.street_2, ship.zip_code].filter(Boolean).join(' '),
      city: ship.city ? String(ship.city) : undefined,
      district: ship.state ? String(ship.state) : undefined,
      totalAmount: Number(o.total_price ?? o.price ?? 0),
      deliveryFee: Number(o.shipping_price ?? 0),
      paymentStatus: 'PAID',
      cargoProvider: o.shipping_company ? String(o.shipping_company) : undefined,
      cargoTrackingNumber: o.shipping_tracking ? String(o.shipping_tracking) : undefined,
      orderDate: o.created_date ? new Date(String(o.created_date)) : undefined,
      deliveryDueAt: o.shipping_deadline ? new Date(String(o.shipping_deadline)) : undefined,
      items: lines,
    };
  }

  private async importCsv(path: string, header: string, row: string, what: string): Promise<AdapterConnectionResult> {
    const form = new FormData();
    form.append('file', new Blob([`${header}\n${row}\n`], { type: 'text/csv' }), `${what}.csv`);
    const shopId = this.env('SUPPLIER_ID');
    if (shopId) form.append('shop_id', shopId);
    try {
      const res = await fetch(`${this.apiBase()}${path}`, {
        method: 'POST',
        headers: this.headers(),
        body: form,
        signal: AbortSignal.timeout(20000),
      });
      const body = await res.text().catch(() => '');
      if (res.ok) {
        let importId = '';
        try { importId = String((JSON.parse(body) as Record<string, unknown>).import_id ?? ''); } catch { /* boş */ }
        return { ok: true, status: 'CONNECTED', message: `Koçtaş ${what} güncellemesi gönderildi${importId ? ` (içe aktarma ${importId})` : ''}.`, batchRequestId: importId || undefined };
      }
      return { ok: false, status: res.status === 401 || res.status === 403 ? 'MISSING_CREDENTIALS' : 'FAILED', message: `Koçtaş ${what} hatası (HTTP ${res.status}): ${body.slice(0, 200)}` };
    } catch (err: unknown) {
      return { ok: false, status: 'FAILED', message: `Koçtaş ${what} gönderilemedi: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  private sku(p: Record<string, unknown>): string {
    return String(p.barcode ?? p.sku ?? p.modelCode ?? '').trim();
  }

  override async pushStock(payload: unknown): Promise<AdapterConnectionResult> {
    const missing = this.missingKeys();
    if (missing.length) return this.missing(missing);
    const p = (payload ?? {}) as Record<string, unknown>;
    const sku = this.sku(p);
    if (!sku) return { ok: false, status: 'FAILED', message: 'Koçtaş: teklif kodu (barkod/model kodu) yok.' };
    const qty = Math.max(0, Math.floor(Number(p.stockQuantity ?? p.quantity ?? 0)));
    return this.importCsv('/offers/stock/imports', 'offer-sku;quantity', `${sku};${qty}`, 'stok');
  }

  override async pushPrice(payload: unknown): Promise<AdapterConnectionResult> {
    const missing = this.missingKeys();
    if (missing.length) return this.missing(missing);
    const p = (payload ?? {}) as Record<string, unknown>;
    const sku = this.sku(p);
    if (!sku) return { ok: false, status: 'FAILED', message: 'Koçtaş: teklif kodu (barkod/model kodu) yok.' };
    const price = Number(p.salePrice ?? 0);
    const results: AdapterConnectionResult[] = [];
    if (price > 0) results.push(await this.importCsv('/offers/pricing/imports', 'offer-sku;price', `${sku};${price.toFixed(2)}`, 'fiyat'));
    if (p.stockQuantity !== undefined || p.quantity !== undefined) results.push(await this.pushStock(p));
    if (!results.length) return { ok: false, status: 'FAILED', message: 'Koçtaş: gönderilecek fiyat/stok yok.' };
    const failed = results.find((r) => !r.ok);
    return failed ?? { ok: true, status: 'CONNECTED', message: results.map((r) => r.message).join(' ') };
  }
}
