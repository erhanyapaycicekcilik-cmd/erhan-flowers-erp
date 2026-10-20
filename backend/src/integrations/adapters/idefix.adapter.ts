import { Inject, Injectable, Optional } from '@nestjs/common';
import { BaseIntegrationAdapter } from './base-adapter';
import { AdapterConnectionResult, ExternalOrder } from './integration-adapter.interface';

// Idefix Merchant API — https://merchantapi.idefix.com/pim/catalog/{vendorId}/
// Auth: Authorization: ApiKey <API_KEY>
// Stok/Fiyat: POST /inventory-upload
const IDEFIX_API = 'https://merchantapi.idefix.com/pim/catalog';

@Injectable()
export class IdefixAdapter extends BaseIntegrationAdapter {
  platform = 'IDEFIX' as const;

  private credentials: Record<string, string>;

  constructor(
    @Optional() @Inject('IDEFIX_RUNTIME_CREDENTIALS') runtimeCredentials?: Record<string, string>,
  ) {
    super();
    this.credentials = runtimeCredentials ?? {};
  }

  private env(key: string): string {
    return (
      this.credentials[key] ||
      this.credentials[`IDEFIX_${key}`] ||
      process.env[`IDEFIX_${key}`] ||
      ''
    );
  }

  private missingKeys(): string[] {
    const missing: string[] = [];
    if (!this.env('API_KEY')) missing.push('IDEFIX_API_KEY');
    if (!this.env('SUPPLIER_ID')) missing.push('IDEFIX_SUPPLIER_ID');
    return missing;
  }

  private apiHeaders(): Record<string, string> {
    return {
      'X-API-KEY': this.env('API_KEY'),
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  override async testConnection(): Promise<AdapterConnectionResult> {
    const missing = this.missingKeys();
    if (missing.length) return this.missing(missing);

    try {
      const supplierId = this.env('SUPPLIER_ID');
      const res = await fetch(`${IDEFIX_API}/${supplierId}/inventory-list?pageSize=1&pageIndex=0`, {
        headers: this.apiHeaders(),
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok || res.status === 204) {
        return { ok: true, status: 'CONNECTED', message: 'Idefix API bağlantısı başarılı.' };
      }
      if (res.status === 401 || res.status === 403) {
        return { ok: false, status: 'MISSING_CREDENTIALS', message: `Idefix kimlik doğrulama başarısız. HTTP ${res.status}` };
      }
      if (res.status < 500) {
        return { ok: true, status: 'CONNECTED', message: `Idefix API erişilebilir (HTTP ${res.status}).` };
      }
      const body = await res.text().catch(() => '');
      return { ok: false, status: 'FAILED', message: `Idefix sunucu hatası. HTTP ${res.status}: ${body.slice(0, 200)}` };
    } catch (err: unknown) {
      return {
        ok: false,
        status: 'FAILED',
        message: `Idefix API ulaşılamadı: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  override async fetchOrders(): Promise<ExternalOrder[]> {
    const missing = this.missingKeys();
    if (missing.length) return [];

    const supplierId = this.env('SUPPLIER_ID');
    try {
      const res = await fetch(`${IDEFIX_API}/${supplierId}/orders?pageSize=50&pageIndex=0&status=New`, {
        headers: this.apiHeaders(),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return [];

      const data = await res.json() as { data?: unknown[] } | unknown[];
      const items: unknown[] = Array.isArray(data) ? data : ((data as any)?.data ?? []);
      return (items as Record<string, unknown>[]).map((o) => this.mapOrder(o)).filter((o): o is ExternalOrder => o !== null);
    } catch {
      return [];
    }
  }

  override async pushPrice(payload: unknown): Promise<AdapterConnectionResult> {
    const missing = this.missingKeys();
    if (missing.length) return this.missing(missing);

    const supplierId = this.env('SUPPLIER_ID');
    const p = payload as Record<string, unknown>;
    const barcode = String(p.barcode ?? p.modelCode ?? '');
    const salePrice = Number(p.salePrice ?? 0);
    const listPrice = Number(p.listPrice ?? p.salePrice ?? 0);
    const quantity = Number(p.stockQuantity ?? p.quantity ?? 0);

    if (!barcode) return { ok: false, status: 'FAILED', message: 'Idefix: barcode zorunlu.' };

    try {
      const res = await fetch(`${IDEFIX_API}/${supplierId}/inventory-upload`, {
        method: 'POST',
        headers: this.apiHeaders(),
        body: JSON.stringify([{ barcode, price: salePrice, comparePrice: listPrice, inventoryQuantity: quantity }]),
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) return { ok: true, status: 'CONNECTED', message: 'Idefix fiyat/stok güncellendi.' };
      const errBody = await res.text().catch(() => '');
      return {
        ok: false,
        status: res.status === 401 || res.status === 403 ? 'MISSING_CREDENTIALS' : 'FAILED',
        message: `Idefix fiyat/stok güncelleme başarısız. HTTP ${res.status}: ${errBody.slice(0, 300)}`,
      };
    } catch (err: unknown) {
      return {
        ok: false,
        status: 'FAILED',
        message: `Idefix fiyat/stok güncellenemedi: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  override async pushStock(payload: unknown): Promise<AdapterConnectionResult> {
    return this.pushPrice(payload);
  }

  override async updateOrderStatus(payload: unknown): Promise<AdapterConnectionResult> {
    const missing = this.missingKeys();
    if (missing.length) return this.missing(missing);

    const supplierId = this.env('SUPPLIER_ID');
    const p = payload as Record<string, unknown>;
    const orderId = String(p.externalOrderId ?? p.orderId ?? '');
    if (!orderId) return { ok: false, status: 'FAILED', message: 'Idefix: orderId zorunlu.' };

    try {
      const res = await fetch(`${IDEFIX_API}/sellers/${supplierId}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: this.apiHeaders(),
        body: JSON.stringify({ status: p.status }),
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) return { ok: true, status: 'CONNECTED', message: 'Idefix sipariş durumu güncellendi.' };
      return {
        ok: false,
        status: 'FAILED',
        message: `Idefix sipariş durum güncelleme başarısız. HTTP ${res.status}`,
      };
    } catch (err: unknown) {
      return {
        ok: false,
        status: 'FAILED',
        message: `Idefix sipariş durumu güncellenemedi: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  private mapOrder(o: Record<string, unknown>): ExternalOrder | null {
    const orderId = String(o.id ?? o.orderId ?? o.orderNumber ?? '');
    if (!orderId) return null;

    const statusRaw = String(o.status ?? o.orderStatus ?? '').toUpperCase();
    const statusMap: Record<string, ExternalOrder['status']> = {
      NEW: 'CONFIRMED',
      APPROVED: 'CONFIRMED',
      PREPARING: 'PREPARING',
      SHIPPED: 'OUT_FOR_DELIVERY',
      DELIVERED: 'DELIVERED',
      CANCELLED: 'CANCELLED',
      CANCELED: 'CANCELLED',
    };
    const status = statusMap[statusRaw] ?? 'CONFIRMED';

    const shipAddr = (o.shippingAddress ?? o.deliveryAddress ?? {}) as Record<string, unknown>;
    const customerName = String(
      o.customerName ?? o.buyerName ??
      shipAddr.fullName ??
      [shipAddr.firstName, shipAddr.lastName].filter(Boolean).join(' ') ??
      ''
    );

    const rawItems = Array.isArray(o.items) ? o.items
      : Array.isArray(o.orderLines) ? o.orderLines
      : [];

    const items = (rawItems as Record<string, unknown>[]).map((item) => ({
      externalLineId: String(item.id ?? item.lineId ?? ''),
      productName: String(item.productName ?? item.name ?? ''),
      sku: String(item.sku ?? item.barcode ?? ''),
      barcode: String(item.barcode ?? item.sku ?? ''),
      quantity: Number(item.quantity ?? 1),
      unitPrice: Number(item.price ?? item.salePrice ?? item.unitPrice ?? 0),
    }));

    return {
      externalOrderId: orderId,
      platformOrderNumber: String(o.orderNumber ?? orderId),
      platform: 'IDEFIX' as any,
      status,
      externalStatus: statusRaw,
      customerName,
      phone: String(o.customerPhone ?? shipAddr.phone ?? ''),
      city: String(o.city ?? shipAddr.city ?? ''),
      district: String(o.district ?? shipAddr.district ?? ''),
      addressText: String(shipAddr.address ?? shipAddr.fullAddress ?? ''),
      totalAmount: Number(o.totalAmount ?? o.total ?? 0),
      orderDate: o.orderDate ? new Date(String(o.orderDate)) : undefined,
      items,
    };
  }
}
