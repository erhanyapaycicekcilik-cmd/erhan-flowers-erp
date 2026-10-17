import { Inject, Injectable, Optional } from '@nestjs/common';
import { BaseIntegrationAdapter } from './base-adapter';
import { AdapterConnectionResult, ExternalOrder } from './integration-adapter.interface';

// Pazarama Entegrasyon API — https://isortagim.pazarama.com/
// Auth: OAuth2 client_credentials veya doğrudan API Key Bearer token
const PAZARAMA_API = 'https://isortagim.pazarama.com';

@Injectable()
export class PazaramaAdapter extends BaseIntegrationAdapter {
  platform = 'PAZARAMA' as const;

  private credentials: Record<string, string>;
  private cachedToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(
    @Optional() @Inject('PAZARAMA_RUNTIME_CREDENTIALS') runtimeCredentials?: Record<string, string>,
  ) {
    super();
    this.credentials = runtimeCredentials ?? {};
  }

  private env(key: string): string {
    return (
      this.credentials[key] ||
      this.credentials[`PAZARAMA_${key}`] ||
      process.env[`PAZARAMA_${key}`] ||
      ''
    );
  }

  private missingKeys(): string[] {
    const missing: string[] = [];
    if (!this.env('API_KEY')) missing.push('PAZARAMA_API_KEY');
    return missing;
  }

  private async getToken(): Promise<string | null> {
    if (this.cachedToken && Date.now() < this.tokenExpiresAt) return this.cachedToken;

    const apiKey = this.env('API_KEY');
    const apiSecret = this.env('API_SECRET');
    if (!apiKey) return null;

    // OAuth2 client_credentials dene
    if (apiSecret) {
      try {
        const body = new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: apiKey,
          client_secret: apiSecret,
        });
        const basicAuth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
        const res = await fetch(`${PAZARAMA_API}/connect/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${basicAuth}`,
          },
          body: body.toString(),
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) {
          const data = await res.json() as Record<string, unknown>;
          const token = String(data?.access_token ?? data?.accessToken ?? data?.token ?? '') || null;
          if (token) {
            this.cachedToken = token;
            this.tokenExpiresAt = Date.now() + 50 * 60 * 1000;
            return token;
          }
        }
      } catch {
        // OAuth2 başarısız, fallback'e geç
      }
    }

    // Fallback: API Key'i doğrudan Bearer token olarak kullan
    this.cachedToken = apiKey;
    this.tokenExpiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 gün
    return apiKey;
  }

  private async bearerHeaders(): Promise<Record<string, string> | null> {
    const token = await this.getToken();
    if (!token) return null;
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  override async testConnection(): Promise<AdapterConnectionResult> {
    const missing = this.missingKeys();
    if (missing.length) return this.missing(missing);

    try {
      const token = await this.getToken();
      if (!token) {
        return { ok: false, status: 'MISSING_CREDENTIALS', message: 'Pazarama: token alınamadı. API Key/Secret kontrol edin.' };
      }

      // Gerçek bir API endpoint'i test et
      const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
      const res = await fetch(`${PAZARAMA_API}/api/order/orders?status=1&pageSize=1&pageIndex=0`, {
        headers,
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok || res.status === 204) {
        return { ok: true, status: 'CONNECTED', message: 'Pazarama API bağlantısı doğrulandı.' };
      }
      if (res.status === 401 || res.status === 403) {
        return { ok: false, status: 'MISSING_CREDENTIALS', message: `Pazarama: kimlik doğrulama başarısız. HTTP ${res.status}` };
      }
      // 4xx ama 401/403 değilse — API sunucusuna ulaşıldı
      if (res.status < 500) {
        return { ok: true, status: 'CONNECTED', message: `Pazarama API erişilebilir (HTTP ${res.status}).` };
      }
      return {
        ok: false,
        status: 'FAILED',
        message: `Pazarama API sunucu hatası. HTTP ${res.status}`,
      };
    } catch (err: unknown) {
      return {
        ok: false,
        status: 'FAILED',
        message: `Pazarama API ulaşılamadı: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  override async fetchOrders(): Promise<ExternalOrder[]> {
    const missing = this.missingKeys();
    if (missing.length) return [];

    const headers = await this.bearerHeaders();
    if (!headers) return [];

    try {
      const res = await fetch(`${PAZARAMA_API}/api/order/orders?status=1&pageSize=50&pageIndex=0`, {
        headers,
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return [];

      const data = await res.json() as { data?: { orderList?: unknown[] } | unknown[] };
      const items: unknown[] = Array.isArray(data.data)
        ? data.data
        : (data.data as any)?.orderList ?? [];
      return (items as Record<string, unknown>[]).map((o) => this.mapOrder(o)).filter((o): o is ExternalOrder => o !== null);
    } catch {
      return [];
    }
  }

  override async fetchOrderDetail(_externalOrderId?: string): Promise<ExternalOrder | null> {
    if (!_externalOrderId) return null;
    const headers = await this.bearerHeaders();
    if (!headers) return null;

    try {
      const res = await fetch(`${PAZARAMA_API}/api/order/orders/${_externalOrderId}`, {
        headers,
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return null;
      const data = await res.json() as { data?: Record<string, unknown> } | Record<string, unknown>;
      const o = (data as any).data ?? data as Record<string, unknown>;
      return this.mapOrder(o);
    } catch {
      return null;
    }
  }

  override async pushPrice(payload: unknown): Promise<AdapterConnectionResult> {
    const missing = this.missingKeys();
    if (missing.length) return this.missing(missing);

    const headers = await this.bearerHeaders();
    if (!headers) return { ok: false, status: 'MISSING_CREDENTIALS', message: 'Pazarama: token alınamadı.' };

    const p = payload as Record<string, unknown>;
    const barcode = String(p.barcode ?? p.modelCode ?? '');
    const quantity = Number(p.stockQuantity ?? p.quantity ?? 0);
    if (!barcode) return { ok: false, status: 'FAILED', message: 'Pazarama: barcode/modelCode zorunlu.' };

    try {
      const res = await fetch(`${PAZARAMA_API}/api/product/updatestockandsaleprice`, {
        method: 'POST',
        headers,
        body: JSON.stringify([{ productCode: barcode, stockCount: quantity }]),
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) return { ok: true, status: 'CONNECTED', message: 'Pazarama stok güncellendi.' };
      return {
        ok: false,
        status: res.status === 401 || res.status === 403 ? 'MISSING_CREDENTIALS' : 'FAILED',
        message: `Pazarama stok güncelleme başarısız. HTTP ${res.status}`,
      };
    } catch (err: unknown) {
      return {
        ok: false,
        status: 'FAILED',
        message: `Pazarama stok güncellenemedi: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  override async pushStock(payload: unknown): Promise<AdapterConnectionResult> {
    return this.pushPrice(payload);
  }

  override async pushProduct(payload: unknown): Promise<AdapterConnectionResult> {
    const missing = this.missingKeys();
    if (missing.length) return this.missing(missing);

    const headers = await this.bearerHeaders();
    if (!headers) return { ok: false, status: 'MISSING_CREDENTIALS', message: 'Pazarama: token alınamadı.' };

    const p = payload as Record<string, unknown>;
    const barcode = String(p.barcode ?? p.modelCode ?? '');
    const salePrice = Number(p.salePrice ?? 0);
    const listPrice = Number(p.listPrice ?? p.salePrice ?? 0);
    const quantity = Number(p.stockQuantity ?? 0);

    const body = {
      productCode: barcode,
      name: String(p.productName ?? ''),
      description: String(p.description ?? p.productName ?? ''),
      salePrice,
      listPrice,
      stockCount: quantity,
      images: Array.isArray(p.imageUrls) ? (p.imageUrls as string[]).map((url, i) => ({ url, order: i })) : [],
      brand: String(p.brand ?? 'Erhan Flowers'),
      categoryName: String(p.categoryName ?? ''),
    };

    try {
      const res = await fetch(`${PAZARAMA_API}/api/product/createorupdate`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) return { ok: true, status: 'CONNECTED', message: 'Pazarama ürün gönderimi tamamlandı.' };
      return {
        ok: false,
        status: res.status === 401 || res.status === 403 ? 'MISSING_CREDENTIALS' : 'FAILED',
        message: `Pazarama ürün gönderimi başarısız. HTTP ${res.status}: ${await res.text().catch(() => '')}`,
      };
    } catch (err: unknown) {
      return {
        ok: false,
        status: 'FAILED',
        message: `Pazarama ürün gönderilemedi: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  override async updateOrderStatus(payload: unknown): Promise<AdapterConnectionResult> {
    const missing = this.missingKeys();
    if (missing.length) return this.missing(missing);

    const headers = await this.bearerHeaders();
    if (!headers) return { ok: false, status: 'MISSING_CREDENTIALS', message: 'Pazarama: token alınamadı.' };

    const p = payload as Record<string, unknown>;
    const orderId = String(p.externalOrderId ?? p.orderId ?? '');
    if (!orderId) return { ok: false, status: 'FAILED', message: 'Pazarama: orderId zorunlu.' };

    try {
      const res = await fetch(`${PAZARAMA_API}/api/order/updatestatus`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ orderNumber: orderId, status: p.status }),
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) return { ok: true, status: 'CONNECTED', message: 'Pazarama sipariş durumu güncellendi.' };
      return {
        ok: false,
        status: 'FAILED',
        message: `Pazarama sipariş durum güncelleme başarısız. HTTP ${res.status}`,
      };
    } catch (err: unknown) {
      return {
        ok: false,
        status: 'FAILED',
        message: `Pazarama sipariş durumu güncellenemedi: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  private mapOrder(o: Record<string, unknown>): ExternalOrder | null {
    const orderId = String(o.id ?? o.orderId ?? o.orderNumber ?? o.orderCode ?? '');
    if (!orderId) return null;

    const statusRaw = String(o.status ?? o.orderStatus ?? '').toUpperCase();
    const statusMap: Record<string, ExternalOrder['status']> = {
      '1': 'CONFIRMED',
      '2': 'PREPARING',
      '3': 'OUT_FOR_DELIVERY',
      '4': 'DELIVERED',
      '5': 'CANCELLED',
      NEW: 'CONFIRMED',
      CONFIRMED: 'CONFIRMED',
      PREPARING: 'PREPARING',
      SHIPPED: 'OUT_FOR_DELIVERY',
      DELIVERED: 'DELIVERED',
      CANCELLED: 'CANCELLED',
    };
    const status = statusMap[statusRaw] ?? 'CONFIRMED';

    const shipAddr = (o.shippingAddress ?? o.deliveryAddress ?? o.address ?? {}) as Record<string, unknown>;
    const customerName = String(
      o.customerName ?? o.buyerName ??
      shipAddr.fullName ??
      [shipAddr.firstName, shipAddr.lastName].filter(Boolean).join(' ') ??
      ''
    );
    const phone = String(o.customerPhone ?? o.phone ?? shipAddr.phone ?? '');
    const city = String(o.city ?? shipAddr.city ?? '');
    const district = String(o.district ?? shipAddr.district ?? '');

    const rawItems = Array.isArray(o.items) ? o.items
      : Array.isArray(o.orderLines) ? o.orderLines
      : Array.isArray(o.lines) ? o.lines
      : [];

    const items = (rawItems as Record<string, unknown>[]).map((item) => ({
      externalLineId: String(item.id ?? item.lineId ?? ''),
      productName: String(item.productName ?? item.name ?? item.title ?? ''),
      sku: String(item.sku ?? item.productCode ?? item.barcode ?? ''),
      barcode: String(item.barcode ?? item.productCode ?? item.sku ?? ''),
      quantity: Number(item.quantity ?? 1),
      unitPrice: Number(item.price ?? item.salePrice ?? item.unitPrice ?? 0),
    }));

    return {
      externalOrderId: orderId,
      platformOrderNumber: String(o.orderNumber ?? o.orderCode ?? orderId),
      platform: 'PAZARAMA' as any,
      status,
      externalStatus: statusRaw,
      customerName,
      phone,
      city,
      district,
      addressText: String(shipAddr.address ?? shipAddr.fullAddress ?? shipAddr.addressText ?? ''),
      totalAmount: Number(o.totalAmount ?? o.total ?? o.totalPrice ?? 0),
      orderDate: o.orderDate ? new Date(String(o.orderDate)) : undefined,
      items,
    };
  }
}
