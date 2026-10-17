import { Inject, Injectable, Optional } from '@nestjs/common';
import { BaseIntegrationAdapter } from './base-adapter';
import { AdapterConnectionResult, ExternalOrder } from './integration-adapter.interface';

// Trendrum seller API — https://seller.trendruum.com
// Dokümantasyon gelince endpoint'ler güncellenir; şimdilik REST tahmin yapısı.
const TRENDRUM_API = 'https://products.trendruum.com';

@Injectable()
export class TrendrumAdapter extends BaseIntegrationAdapter {
  platform = 'TRENDRUM' as const;

  private credentials: Record<string, string>;

  constructor(
    @Optional() @Inject('TRENDRUM_RUNTIME_CREDENTIALS') runtimeCredentials?: Record<string, string>,
  ) {
    super();
    this.credentials = runtimeCredentials ?? {};
  }

  private env(key: string): string {
    return (
      this.credentials[key] ||
      this.credentials[`TRENDRUM_${key}`] ||
      process.env[`TRENDRUM_${key}`] ||
      ''
    );
  }

  private authHeaders(): Record<string, string> {
    const apiKey = this.env('API_KEY');
    const apiSecret = this.env('API_SECRET');
    if (!apiKey || !apiSecret) return {};
    return {
      'Authorization': `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
    };
  }

  private missingKeys(): string[] {
    const missing: string[] = [];
    if (!this.env('API_KEY')) missing.push('TRENDRUM_API_KEY');
    if (!this.env('API_SECRET')) missing.push('TRENDRUM_API_SECRET');
    return missing;
  }

  override async testConnection(): Promise<AdapterConnectionResult> {
    const missing = this.missingKeys();
    if (missing.length) return this.missing(missing);

    try {
      const res = await fetch(`${TRENDRUM_API}/v1/products?page=0&size=1`, {
        headers: this.authHeaders(),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        return { ok: true, status: 'CONNECTED', message: 'Trendrum API bağlantısı doğrulandı.' };
      }
      return {
        ok: false,
        status: res.status === 401 || res.status === 403 ? 'MISSING_CREDENTIALS' : 'FAILED',
        message: `Trendrum API test başarısız. HTTP ${res.status}`,
      };
    } catch (err: unknown) {
      return {
        ok: false,
        status: 'FAILED',
        message: `Trendrum API ulaşılamadı: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  override async fetchOrders(): Promise<ExternalOrder[]> {
    const missing = this.missingKeys();
    if (missing.length) return [];

    try {
      const res = await fetch(`${TRENDRUM_API}/v1/orders?status=OPEN&page=0&size=50`, {
        headers: this.authHeaders(),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return [];

      const data = await res.json() as { content?: unknown[]; orders?: unknown[] };
      const items = data.content ?? data.orders ?? [];
      return (items as Record<string, unknown>[]).map((o) => this.mapOrder(o)).filter((o): o is ExternalOrder => o !== null);
    } catch {
      return [];
    }
  }

  override async fetchOrderDetail(_externalOrderId?: string): Promise<ExternalOrder | null> {
    const missing = this.missingKeys();
    if (missing.length || !_externalOrderId) return null;

    try {
      const res = await fetch(`${TRENDRUM_API}/v1/orders/${_externalOrderId}`, {
        headers: this.authHeaders(),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return null;
      const o = await res.json() as Record<string, unknown>;
      return this.mapOrder(o);
    } catch {
      return null;
    }
  }

  override async pushPrice(payload: unknown): Promise<AdapterConnectionResult> {
    const missing = this.missingKeys();
    if (missing.length) return this.missing(missing);

    const p = payload as Record<string, unknown>;
    const barcode = String(p.barcode ?? p.modelCode ?? '');
    const salePrice = Number(p.salePrice ?? p.shopPrice ?? 0);
    const listPrice = Number(p.listPrice ?? salePrice);
    const quantity = Number(p.stockQuantity ?? p.quantity ?? 0);
    if (!barcode) return { ok: false, status: 'FAILED', message: 'Trendrum: barcode/modelCode zorunlu.' };

    try {
      const res = await fetch(`${TRENDRUM_API}/v1/products/price-stock`, {
        method: 'PUT',
        headers: this.authHeaders(),
        body: JSON.stringify({ barcode, salePrice, listPrice, quantity }),
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) return { ok: true, status: 'CONNECTED', message: 'Trendrum fiyat/stok güncellendi.' };
      return {
        ok: false,
        status: res.status === 401 || res.status === 403 ? 'MISSING_CREDENTIALS' : 'FAILED',
        message: `Trendrum fiyat güncelleme başarısız. HTTP ${res.status}`,
      };
    } catch (err: unknown) {
      return {
        ok: false,
        status: 'FAILED',
        message: `Trendrum fiyat güncellenemedi: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  override async pushStock(payload: unknown): Promise<AdapterConnectionResult> {
    return this.pushPrice(payload);
  }

  override async pushProduct(payload: unknown): Promise<AdapterConnectionResult> {
    const missing = this.missingKeys();
    if (missing.length) return this.missing(missing);

    const p = payload as Record<string, unknown>;
    const body = {
      barcode: String(p.barcode ?? p.modelCode ?? ''),
      modelCode: String(p.modelCode ?? p.barcode ?? ''),
      title: String(p.productName ?? ''),
      description: String(p.description ?? p.productName ?? ''),
      salePrice: Number(p.salePrice ?? 0),
      listPrice: Number(p.listPrice ?? p.salePrice ?? 0),
      quantity: Number(p.stockQuantity ?? 0),
      images: Array.isArray(p.imageUrls) ? (p.imageUrls as string[]).map((url) => ({ url })) : [],
      brand: String(p.brand ?? 'Erhan Flowers'),
      categoryName: String(p.categoryName ?? ''),
    };

    try {
      const res = await fetch(`${TRENDRUM_API}/v1/products`, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) return { ok: true, status: 'CONNECTED', message: 'Trendrum ürün gönderimi tamamlandı.' };
      return {
        ok: false,
        status: res.status === 401 || res.status === 403 ? 'MISSING_CREDENTIALS' : 'FAILED',
        message: `Trendrum ürün gönderimi başarısız. HTTP ${res.status}: ${await res.text().catch(() => '')}`,
      };
    } catch (err: unknown) {
      return {
        ok: false,
        status: 'FAILED',
        message: `Trendrum ürün gönderilemedi: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  override async updateOrderStatus(payload: unknown): Promise<AdapterConnectionResult> {
    const missing = this.missingKeys();
    if (missing.length) return this.missing(missing);

    const p = payload as Record<string, unknown>;
    const orderId = String(p.externalOrderId ?? p.orderId ?? '');
    const status = String(p.status ?? '');
    if (!orderId) return { ok: false, status: 'FAILED', message: 'Trendrum: orderId zorunlu.' };

    try {
      const res = await fetch(`${TRENDRUM_API}/v1/orders/${orderId}/status`, {
        method: 'PUT',
        headers: this.authHeaders(),
        body: JSON.stringify({ status }),
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) return { ok: true, status: 'CONNECTED', message: 'Trendrum sipariş durumu güncellendi.' };
      return {
        ok: false,
        status: 'FAILED',
        message: `Trendrum sipariş durum güncelleme başarısız. HTTP ${res.status}`,
      };
    } catch (err: unknown) {
      return {
        ok: false,
        status: 'FAILED',
        message: `Trendrum sipariş durumu güncellenemedi: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  private mapOrder(o: Record<string, unknown>): ExternalOrder | null {
    const orderId = String(o.id ?? o.orderId ?? o.orderNumber ?? '');
    if (!orderId) return null;

    const statusRaw = String(o.status ?? '').toUpperCase();
    const statusMap: Record<string, ExternalOrder['status']> = {
      NEW: 'CONFIRMED',
      OPEN: 'CONFIRMED',
      CONFIRMED: 'CONFIRMED',
      PREPARING: 'PREPARING',
      SHIPPED: 'OUT_FOR_DELIVERY',
      DELIVERED: 'DELIVERED',
      CANCELLED: 'CANCELLED',
      RETURNED: 'CANCELLED',
    };
    const status = statusMap[statusRaw] ?? 'CONFIRMED';

    const shipAddr = (o.shippingAddress ?? o.deliveryAddress ?? {}) as Record<string, unknown>;
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
      productName: String(item.productName ?? item.title ?? ''),
      sku: String(item.sku ?? item.barcode ?? item.modelCode ?? ''),
      barcode: String(item.barcode ?? item.sku ?? ''),
      quantity: Number(item.quantity ?? 1),
      unitPrice: Number(item.price ?? item.salePrice ?? item.unitPrice ?? 0),
    }));

    return {
      externalOrderId: orderId,
      platformOrderNumber: String(o.orderNumber ?? orderId),
      platform: 'TRENDRUM' as any,
      status,
      externalStatus: statusRaw,
      customerName,
      phone,
      city,
      district,
      addressText: String(shipAddr.address ?? shipAddr.fullAddress ?? ''),
      totalAmount: Number(o.totalAmount ?? o.total ?? 0),
      orderDate: o.orderDate ? new Date(String(o.orderDate)) : undefined,
      items,
    };
  }
}
