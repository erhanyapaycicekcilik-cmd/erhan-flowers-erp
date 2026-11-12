import { Inject, Injectable, Optional } from '@nestjs/common';
import { BaseIntegrationAdapter } from './base-adapter';
import { AdapterConnectionResult, ExternalOrder, ExternalOrderItem } from './integration-adapter.interface';

// Amazon Selling Partner API (SP-API) — Avrupa bölgesi, Türkiye pazaryeri.
// Kimlik doğrulama: LWA (Login with Amazon) refresh token → access token (1 saat geçerli).
// Gerekli bilgiler (Entegrasyon Hesapları ekranından veya .env'den):
//   MERCHANT_ID  → Satıcı ID (Seller Central → Hesap Bilgileri → Satıcı Kimliği / Merchant Token)
//   API_KEY      → LWA Client ID      (amzn1.application-oa2-client....)
//   API_SECRET   → LWA Client Secret
//   TOKEN        → Refresh Token      (Atzr|....) — uygulamayı kendi hesabına yetkilendirince verilir
// Opsiyonel: AMAZON_MARKETPLACE_ID (varsayılan Türkiye A33AVAJ2PDY3EV), AMAZON_SP_API_ENDPOINT
const LWA_TOKEN_URL = 'https://api.amazon.com/auth/o2/token';
const DEFAULT_ENDPOINT = 'https://sellingpartnerapi-eu.amazon.com';
const TURKEY_MARKETPLACE_ID = 'A33AVAJ2PDY3EV';

type AccessTokenCache = { token: string; expiresAt: number };
const tokenCache = new Map<string, AccessTokenCache>();

type AmazonRawOrder = Record<string, any>;
type AmazonRawItem = Record<string, any>;

@Injectable()
export class AmazonAdapter extends BaseIntegrationAdapter {
  platform = 'AMAZON' as const;

  private credentials: Record<string, string>;

  constructor(@Optional() @Inject('AMAZON_RUNTIME_CREDENTIALS') runtimeCredentials?: Record<string, string>) {
    super();
    this.credentials = runtimeCredentials ?? {};
  }

  private env(key: string, ...aliases: string[]): string {
    for (const k of [key, ...aliases]) {
      const v = this.credentials[k] || this.credentials[`AMAZON_${k}`] || process.env[`AMAZON_${k}`];
      if (v) return v.trim();
    }
    return '';
  }

  private get sellerId() { return this.env('MERCHANT_ID', 'SUPPLIER_ID', 'SELLER_ID'); }
  private get clientId() { return this.env('API_KEY', 'LWA_CLIENT_ID'); }
  private get clientSecret() { return this.env('API_SECRET', 'LWA_CLIENT_SECRET'); }
  private get refreshToken() { return this.env('TOKEN', 'REFRESH_TOKEN'); }
  private get marketplaceId() { return this.env('MARKETPLACE_ID') || TURKEY_MARKETPLACE_ID; }
  private get endpoint() { return (this.env('SP_API_ENDPOINT') || DEFAULT_ENDPOINT).replace(/\/+$/, ''); }

  private missingKeys(): string[] {
    const missing: string[] = [];
    if (!this.sellerId) missing.push('AMAZON_MERCHANT_ID');
    if (!this.clientId) missing.push('AMAZON_API_KEY (LWA Client ID)');
    if (!this.clientSecret) missing.push('AMAZON_API_SECRET (LWA Client Secret)');
    if (!this.refreshToken) missing.push('AMAZON_TOKEN (Refresh Token)');
    return missing;
  }

  private async accessToken(): Promise<string> {
    const cacheKey = `${this.clientId}:${this.refreshToken.slice(-12)}`;
    const cached = tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

    const res = await fetch(LWA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }).toString(),
      signal: AbortSignal.timeout(15000),
    });
    const data = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string; error_description?: string };
    if (!res.ok || !data.access_token) {
      throw new AmazonAuthError(`LWA token alınamadı (HTTP ${res.status}): ${data.error_description ?? data.error ?? 'bilinmeyen hata'}`);
    }
    tokenCache.set(cacheKey, { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 });
    return data.access_token;
  }

  private async request<T = any>(
    method: string,
    path: string,
    options: { query?: Record<string, string | undefined>; body?: unknown; token?: string; retry?: number } = {},
  ): Promise<{ status: number; data: T }> {
    const url = new URL(`${this.endpoint}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) if (v !== undefined && v !== '') url.searchParams.set(k, v);
    const token = options.token ?? (await this.accessToken());
    const res = await fetch(url, {
      method,
      headers: {
        'x-amz-access-token': token,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'ErhanFlowersERP/1.0 (Language=TypeScript)',
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(20000),
    });
    // SP-API hız limiti: 429'da kısa bekleyip tekrar dene
    const retry = options.retry ?? 0;
    if (res.status === 429 && retry < 3) {
      await sleep(2000 * (retry + 1));
      return this.request<T>(method, path, { ...options, token, retry: retry + 1 });
    }
    const text = await res.text();
    let data: any = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    return { status: res.status, data: data as T };
  }

  private errorText(data: any): string {
    const errors = Array.isArray(data?.errors) ? data.errors : [];
    if (errors.length) return errors.map((e: any) => `${e.code ?? ''} ${e.message ?? ''}`.trim()).join('; ').slice(0, 400);
    return JSON.stringify(data ?? {}).slice(0, 400);
  }

  override async testConnection(): Promise<AdapterConnectionResult> {
    const missing = this.missingKeys();
    if (missing.length) return this.missing(missing);
    try {
      const { status, data } = await this.request('GET', '/sellers/v1/marketplaceParticipations');
      if (status === 200) {
        const list: any[] = data?.payload ?? [];
        const tr = list.find((p) => p?.marketplace?.id === this.marketplaceId);
        if (!tr) {
          const ids = list.map((p) => `${p?.marketplace?.countryCode ?? '?'}:${p?.marketplace?.id ?? '?'}`).join(', ');
          return { ok: false, status: 'FAILED', message: `Amazon bağlantısı kuruldu ama ${this.marketplaceId} pazaryerine kayıtlı değilsiniz. Kayıtlı pazaryerleri: ${ids || 'yok'}` };
        }
        const name = tr?.storeName ? ` (${tr.storeName})` : '';
        return { ok: true, status: 'CONNECTED', message: `Amazon SP-API bağlantısı başarılı${name}.` };
      }
      if (status === 401 || status === 403) {
        return { ok: false, status: 'MISSING_CREDENTIALS', message: `Amazon yetki hatası (HTTP ${status}): ${this.errorText(data)}` };
      }
      return { ok: false, status: 'FAILED', message: `Amazon API hatası (HTTP ${status}): ${this.errorText(data)}` };
    } catch (err) {
      return { ok: false, status: err instanceof AmazonAuthError ? 'MISSING_CREDENTIALS' : 'FAILED', message: `Amazon: ${errMsg(err)}` };
    }
  }

  // Ham sipariş listesi + kalemleri. order-sync (marketplace_orders) ve fetchOrders (retail_sales) ortak kullanır.
  async fetchRawOrders(lookbackDays = 3): Promise<Array<{ order: AmazonRawOrder; items: AmazonRawItem[] }>> {
    if (this.missingKeys().length) return [];
    // Alıcı adı/adres kişisel veri (PII) — Restricted Data Token gerekir. Uygulamanın PII rolü yoksa normal token ile devam.
    const piiToken = await this.restrictedToken().catch(() => null);
    const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

    const orders: AmazonRawOrder[] = [];
    let nextToken: string | undefined;
    for (let page = 0; page < 10; page++) {
      const query: Record<string, string | undefined> = nextToken
        ? { MarketplaceIds: this.marketplaceId, NextToken: nextToken }
        : { MarketplaceIds: this.marketplaceId, LastUpdatedAfter: since, MaxResultsPerPage: '100' };
      const { status, data } = await this.request('GET', '/orders/v0/orders', { query, token: piiToken ?? undefined });
      if (status !== 200) throw new Error(`Amazon siparişleri alınamadı (HTTP ${status}): ${this.errorText(data)}`);
      orders.push(...((data?.payload?.Orders as AmazonRawOrder[]) ?? []));
      nextToken = data?.payload?.NextToken;
      if (!nextToken) break;
    }

    const result: Array<{ order: AmazonRawOrder; items: AmazonRawItem[] }> = [];
    for (const order of orders) {
      const items = await this.fetchOrderItems(String(order.AmazonOrderId)).catch(() => [] as AmazonRawItem[]);
      result.push({ order, items });
    }
    return result;
  }

  private async restrictedToken(): Promise<string | null> {
    const { status, data } = await this.request('POST', '/tokens/2021-03-01/restrictedDataToken', {
      body: {
        restrictedResources: [
          { method: 'GET', path: '/orders/v0/orders', dataElements: ['buyerInfo', 'shippingAddress'] },
        ],
      },
    });
    return status === 200 && data?.restrictedDataToken ? String(data.restrictedDataToken) : null;
  }

  private async fetchOrderItems(orderId: string): Promise<AmazonRawItem[]> {
    const items: AmazonRawItem[] = [];
    let nextToken: string | undefined;
    for (let page = 0; page < 5; page++) {
      const { status, data } = await this.request('GET', `/orders/v0/orders/${encodeURIComponent(orderId)}/orderItems`, {
        query: nextToken ? { NextToken: nextToken } : {},
      });
      if (status !== 200) break;
      items.push(...((data?.payload?.OrderItems as AmazonRawItem[]) ?? []));
      nextToken = data?.payload?.NextToken;
      if (!nextToken) break;
    }
    return items;
  }

  override async fetchOrders(): Promise<ExternalOrder[]> {
    const raw = await this.fetchRawOrders();
    // Ödemesi/onayı bekleyen (Pending) siparişler henüz hazırlanmaz — durumu netleşince gelir
    return raw
      .filter(({ order }) => AmazonAdapter.mapStatus(String(order.OrderStatus ?? '')) !== null)
      .map(({ order, items }) => this.mapOrder(order, items))
      .filter((o): o is ExternalOrder => o !== null);
  }

  override async fetchOrderDetail(externalOrderId?: string): Promise<ExternalOrder | null> {
    if (!externalOrderId || this.missingKeys().length) return null;
    const { status, data } = await this.request('GET', `/orders/v0/orders/${encodeURIComponent(externalOrderId)}`);
    if (status !== 200 || !data?.payload) return null;
    const items = await this.fetchOrderItems(externalOrderId).catch(() => []);
    return this.mapOrder(data.payload, items);
  }

  static mapStatus(raw: string): ExternalOrder['status'] | null {
    switch (raw) {
      case 'Unshipped':
      case 'PartiallyShipped':
        return 'CONFIRMED';
      case 'Shipped':
        return 'OUT_FOR_DELIVERY';
      case 'Canceled':
      case 'Unfulfillable':
        return 'CANCELLED';
      default:
        return null; // Pending / PendingAvailability / InvoiceUnconfirmed: ödeme veya onay bekleniyor
    }
  }

  private mapOrder(o: AmazonRawOrder, rawItems: AmazonRawItem[]): ExternalOrder | null {
    const orderId = String(o.AmazonOrderId ?? '');
    if (!orderId) return null;
    const externalStatus = String(o.OrderStatus ?? '');
    const status = AmazonAdapter.mapStatus(externalStatus);
    const addr = (o.ShippingAddress ?? {}) as Record<string, any>;
    const buyer = (o.BuyerInfo ?? {}) as Record<string, any>;
    const addressText = [addr.AddressLine1, addr.AddressLine2, addr.AddressLine3].filter(Boolean).join(' ');

    const items: ExternalOrderItem[] = rawItems.map((item) => {
      const qty = Number(item.QuantityOrdered ?? 1) || 1;
      const lineTotal = Number(item.ItemPrice?.Amount ?? 0);
      return {
        externalLineId: String(item.OrderItemId ?? ''),
        externalVariantId: String(item.ASIN ?? ''),
        productName: String(item.Title ?? item.SellerSKU ?? 'Amazon ürünü'),
        sku: String(item.SellerSKU ?? ''),
        barcode: String(item.SellerSKU ?? ''),
        modelCode: String(item.SellerSKU ?? ''),
        quantity: qty,
        unitPrice: Math.round((lineTotal / qty) * 100) / 100,
      };
    });

    const shippingFee = rawItems.reduce((sum, i) => sum + Number(i.ShippingPrice?.Amount ?? 0), 0);
    return {
      externalOrderId: orderId,
      platformOrderNumber: orderId,
      platform: 'AMAZON',
      status: status ?? 'PAYMENT_PENDING',
      unknownStatus: status === null,
      externalStatus,
      customerName: String(addr.Name ?? buyer.BuyerName ?? 'Amazon Müşterisi'),
      phone: String(addr.Phone ?? ''),
      addressText,
      city: String(addr.City ?? addr.StateOrRegion ?? ''),
      district: String(addr.District ?? addr.County ?? ''),
      totalAmount: Number(o.OrderTotal?.Amount ?? 0),
      paidAmount: Number(o.OrderTotal?.Amount ?? 0),
      deliveryFee: shippingFee,
      paymentStatus: status ? 'PAID' : 'WAITING',
      orderDate: o.PurchaseDate ? new Date(String(o.PurchaseDate)) : undefined,
      deliveryDueAt: o.LatestShipDate ? new Date(String(o.LatestShipDate)) : undefined,
      items,
    };
  }

  // ---- Fiyat / stok (Listings Items API) ----

  // ERP'deki barkod veya model kodundan Amazon'daki SKU'yu bul (ilk eşleşen)
  private async resolveListing(candidates: string[]): Promise<{ sku: string; productType: string } | null> {
    for (const sku of [...new Set(candidates.filter(Boolean))]) {
      const { status, data } = await this.request('GET', `/listings/2021-08-01/items/${encodeURIComponent(this.sellerId)}/${encodeURIComponent(sku)}`, {
        query: { marketplaceIds: this.marketplaceId, includedData: 'summaries' },
      });
      if (status === 200) {
        const productType = String(data?.summaries?.[0]?.productType ?? 'PRODUCT');
        return { sku, productType };
      }
      if (status !== 404) throw new Error(`Amazon ilan sorgusu başarısız (HTTP ${status}): ${this.errorText(data)}`);
    }
    return null;
  }

  override async pushPrice(payload: unknown): Promise<AdapterConnectionResult> {
    const missing = this.missingKeys();
    if (missing.length) return this.missing(missing);

    const p = (payload ?? {}) as Record<string, unknown>;
    const candidates = [p.amazonSku, p.sku, p.barcode, p.modelCode].map((v) => (v == null ? '' : String(v)));
    const salePrice = Number(p.salePrice ?? 0);
    const hasStock = p.stockQuantity !== undefined || p.quantity !== undefined;
    const quantity = Math.max(0, Math.floor(Number(p.stockQuantity ?? p.quantity ?? 0)));
    if (!candidates.some(Boolean)) return { ok: false, status: 'FAILED', message: 'Amazon: SKU/barkod zorunlu.' };

    try {
      const listing = await this.resolveListing(candidates);
      if (!listing) {
        return {
          ok: false,
          status: 'FAILED',
          message: `Amazon'da bu SKU ile ilan yok (${candidates.filter(Boolean).join(' / ')}). Ürünü önce Seller Central'da aynı SKU (barkod) ile açın.`,
        };
      }

      const patches: unknown[] = [];
      if (salePrice > 0) {
        patches.push({
          op: 'replace',
          path: '/attributes/purchasable_offer',
          value: [{
            marketplace_id: this.marketplaceId,
            currency: 'TRY',
            our_price: [{ schedule: [{ value_with_tax: Math.round(salePrice * 100) / 100 }] }],
          }],
        });
      }
      if (hasStock) {
        patches.push({
          op: 'replace',
          path: '/attributes/fulfillment_availability',
          value: [{ fulfillment_channel_code: 'DEFAULT', quantity }],
        });
      }
      if (!patches.length) return { ok: false, status: 'FAILED', message: 'Amazon: gönderilecek fiyat/stok yok.' };

      const { status, data } = await this.request(
        'PATCH',
        `/listings/2021-08-01/items/${encodeURIComponent(this.sellerId)}/${encodeURIComponent(listing.sku)}`,
        { query: { marketplaceIds: this.marketplaceId }, body: { productType: listing.productType, patches } },
      );
      const issues: any[] = Array.isArray(data?.issues) ? data.issues : [];
      const errors = issues.filter((i) => i?.severity === 'ERROR');
      if (status === 200 && data?.status === 'ACCEPTED' && !errors.length) {
        return { ok: true, status: 'CONNECTED', message: `Amazon fiyat/stok güncellendi (SKU ${listing.sku}).` };
      }
      const detail = errors.length ? errors.map((i) => `${i.code}: ${i.message}`).join('; ') : this.errorText(data);
      return {
        ok: false,
        status: status === 401 || status === 403 ? 'MISSING_CREDENTIALS' : 'FAILED',
        message: `Amazon fiyat/stok güncellenemedi (HTTP ${status}, SKU ${listing.sku}): ${detail.slice(0, 400)}`,
      };
    } catch (err) {
      return { ok: false, status: err instanceof AmazonAuthError ? 'MISSING_CREDENTIALS' : 'FAILED', message: `Amazon: ${errMsg(err)}` };
    }
  }

  override async pushStock(payload: unknown): Promise<AdapterConnectionResult> {
    return this.pushPrice(payload);
  }

  // Yeni ilan açmak Amazon'da ürün tipine özel çok sayıda zorunlu alan ister; şimdilik
  // mevcut ilanın fiyat/stoğu güncellenir. İlan yoksa açıklayıcı hata döner.
  override async pushProduct(payload: unknown): Promise<AdapterConnectionResult> {
    return this.pushPrice(payload);
  }

  async getSellerPanelUrl(barcode: string): Promise<AdapterConnectionResult & { panelUrl?: string }> {
    return {
      ok: true,
      status: 'CONNECTED',
      message: 'Seller Central envanter araması',
      panelUrl: `https://sellercentral.amazon.com.tr/myinventory/inventory?searchTerm=${encodeURIComponent(barcode)}`,
    };
  }
}

class AmazonAuthError extends Error {}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errMsg(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}
