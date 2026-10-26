import { Inject, Injectable, Optional } from '@nestjs/common';
import { BaseIntegrationAdapter } from './base-adapter';
import { AdapterConnectionResult, ExternalOrder } from './integration-adapter.interface';

// Trendrum Entegrasyon API — https://api.trendruum.com/api/v1/integration
// Auth: POST /auth/login { client_id, client_secret } → data.token (Bearer)
const TRENDRUM_API = 'https://api.trendruum.com/api/v1/integration';

@Injectable()
export class TrendrumAdapter extends BaseIntegrationAdapter {
  platform = 'TRENDRUM' as const;

  private credentials: Record<string, string>;
  private cachedToken: string | null = null;
  private tokenExpiresAt = 0;

  // Category ve brand lookup cache — instance başına, runtimeda dolar
  private categoryCache: { id: string; name: string }[] = [];
  private brandCache: { id: string; name: string }[] = [];

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

  private missingKeys(): string[] {
    const missing: string[] = [];
    if (!this.env('API_KEY')) missing.push('TRENDRUM_API_KEY');
    if (!this.env('API_SECRET')) missing.push('TRENDRUM_API_SECRET');
    return missing;
  }

  private async getToken(): Promise<string | null> {
    if (this.cachedToken && Date.now() < this.tokenExpiresAt) return this.cachedToken;

    const clientId = this.env('API_KEY');
    const clientSecret = this.env('API_SECRET');
    if (!clientId || !clientSecret) return null;

    try {
      const res = await fetch(`${TRENDRUM_API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return null;
      const data = await res.json() as { data?: { token?: string } };
      const token = data?.data?.token ?? null;
      if (token) {
        this.cachedToken = token;
        this.tokenExpiresAt = Date.now() + 50 * 60 * 1000;
      }
      return token;
    } catch {
      return null;
    }
  }

  private async bearerHeaders(): Promise<Record<string, string> | null> {
    const token = await this.getToken();
    if (!token) return null;
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  // Trendruum'dan tüm kategorileri çekip cache'e yükler
  private async loadCategories(headers: Record<string, string>): Promise<void> {
    if (this.categoryCache.length > 0) return;
    try {
      const res = await fetch(`${TRENDRUM_API}/categories`, {
        headers,
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return;
      const data = await res.json() as { data?: unknown[] };
      const items = (data.data ?? []) as Record<string, unknown>[];
      this.categoryCache = items.map((c) => ({ id: String(c._id ?? c.id ?? ''), name: String(c.name ?? '') }));
    } catch { /* kategori listesi çekilemedi, devam */ }
  }

  // Trendruum'dan marka listesini cache'e yükler
  private async loadBrands(headers: Record<string, string>): Promise<void> {
    if (this.brandCache.length > 0) return;
    try {
      const res = await fetch(`${TRENDRUM_API}/brands`, {
        headers,
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return;
      const data = await res.json() as { data?: unknown[] };
      const items = (data.data ?? []) as Record<string, unknown>[];
      this.brandCache = items.map((b) => ({ id: String(b._id ?? b.id ?? ''), name: String(b.name ?? '') }));
    } catch { /* marka listesi çekilemedi */ }
  }

  private findCategoryId(categoryName: string): string | null {
    if (!categoryName) return null;
    const lower = categoryName.toLowerCase();
    const match = this.categoryCache.find((c) => c.name.toLowerCase() === lower)
      ?? this.categoryCache.find((c) => c.name.toLowerCase().includes(lower))
      ?? this.categoryCache.find((c) => lower.includes(c.name.toLowerCase()));
    return match?.id ?? null;
  }

  private findBrandId(brandName: string): string | null {
    if (!brandName) return null;
    const lower = brandName.toLowerCase();
    const match = this.brandCache.find((b) => b.name.toLowerCase() === lower)
      ?? this.brandCache.find((b) => b.name.toLowerCase().includes(lower))
      ?? this.brandCache.find((b) => lower.includes(b.name.toLowerCase()));
    return match?.id ?? null;
  }

  override async testConnection(): Promise<AdapterConnectionResult> {
    const missing = this.missingKeys();
    if (missing.length) return this.missing(missing);

    try {
      const token = await this.getToken();
      if (!token) {
        return { ok: false, status: 'MISSING_CREDENTIALS', message: 'Trendrum: client_id/client_secret ile token alınamadı.' };
      }
      const res = await fetch(`${TRENDRUM_API}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
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

    const headers = await this.bearerHeaders();
    if (!headers) return [];

    try {
      // Doğru parametreler: status=new, page=1, limit=50
      const res = await fetch(`${TRENDRUM_API}/orders?status=new&page=1&limit=50`, {
        headers,
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return [];

      const data = await res.json() as { data?: unknown[]; content?: unknown[]; orders?: unknown[] };
      const items = data.data ?? data.content ?? data.orders ?? [];
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
      const res = await fetch(`${TRENDRUM_API}/orders/${_externalOrderId}`, {
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
    if (!headers) return { ok: false, status: 'MISSING_CREDENTIALS', message: 'Trendrum: token alınamadı.' };

    const p = payload as Record<string, unknown>;
    const barcode = String(p.barcode ?? p.modelCode ?? '');
    const quantity = Number(p.stockQuantity ?? p.quantity ?? 0);
    const price = Number(p.salePrice ?? p.price ?? 0);
    if (!barcode) return { ok: false, status: 'FAILED', message: 'Trendrum: barcode/modelCode zorunlu.' };

    try {
      // Fiyat + stok birlikte güncelleme: POST /products/bulk-update
      const productEntry: Record<string, unknown> = { barcode, stock: quantity };
      if (price > 0) productEntry.price = price;

      const res = await fetch(`${TRENDRUM_API}/products/bulk-update`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ products: [productEntry] }),
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) return { ok: true, status: 'CONNECTED', message: 'Trendrum fiyat/stok güncellendi.' };
      return {
        ok: false,
        status: res.status === 401 || res.status === 403 ? 'MISSING_CREDENTIALS' : 'FAILED',
        message: `Trendrum güncelleme başarısız. HTTP ${res.status}: ${await res.text().catch(() => '')}`,
      };
    } catch (err: unknown) {
      return {
        ok: false,
        status: 'FAILED',
        message: `Trendrum fiyat/stok güncellenemedi: ${err instanceof Error ? err.message : String(err)}`,
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
    if (!headers) return { ok: false, status: 'MISSING_CREDENTIALS', message: 'Trendrum: token alınamadı.' };

    const p = payload as Record<string, unknown>;

    // Kategori ve marka ID'lerini Trendruum'dan bul
    await this.loadCategories(headers);
    await this.loadBrands(headers);

    const categoryName = String(p.categoryName ?? '');
    const brandName = String(p.brand ?? 'Erhan Flowers');

    const category_id = (p.trendrumCategoryId as string | undefined) ?? this.findCategoryId(categoryName);
    const brand_id = (p.trendrumBrandId as string | undefined) ?? this.findBrandId(brandName);

    if (!category_id) {
      return {
        ok: false,
        status: 'FAILED',
        message: `Trendrum: "${categoryName}" kategorisi bulunamadı. Ürün kaydında Trendrum kategori ID'si (trendrumCategoryId) girilmeli.`,
      };
    }
    if (!brand_id) {
      return {
        ok: false,
        status: 'FAILED',
        message: `Trendrum: "${brandName}" markası bulunamadı. Ürün kaydında Trendrum marka ID'si (trendrumBrandId) girilmeli.`,
      };
    }

    const barcode = String(p.barcode ?? p.modelCode ?? '');
    const model_code = String(p.modelCode ?? p.barcode ?? '');
    const price = Number(p.salePrice ?? 0);
    const stock = Number(p.stockQuantity ?? 0);
    const images = Array.isArray(p.imageUrls) ? (p.imageUrls as string[]) : [];

    const body = {
      name: String(p.productName ?? ''),
      model_code,
      category_id,
      brand_id,
      description: String(p.description ?? p.productName ?? ''),
      children_products: [
        {
          barcode,
          stock_code: model_code,
          price,
          stock,
          tax: 20,
          images,
        },
      ],
    };

    try {
      const res = await fetch(`${TRENDRUM_API}/products`, {
        method: 'POST',
        headers,
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

    const headers = await this.bearerHeaders();
    if (!headers) return { ok: false, status: 'MISSING_CREDENTIALS', message: 'Trendrum: token alınamadı.' };

    const p = payload as Record<string, unknown>;
    const orderId = String(p.externalOrderId ?? p.orderId ?? '');
    const status = String(p.status ?? '');
    if (!orderId) return { ok: false, status: 'FAILED', message: 'Trendrum: orderId zorunlu.' };

    try {
      // Doğru URL: status path'de gidiyor, body yok
      const res = await fetch(`${TRENDRUM_API}/orders/${orderId}/status/${status}`, {
        method: 'PUT',
        headers,
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
    // Trendruum sipariş ID alanı: ogid
    const orderId = String(o.ogid ?? o.id ?? o.orderId ?? o.orderNumber ?? '');
    if (!orderId) return null;

    const statusRaw = String(o.status ?? '').toLowerCase();
    const statusMap: Record<string, ExternalOrder['status']> = {
      new: 'CONFIRMED',
      approved: 'CONFIRMED',
      confirmed: 'CONFIRMED',
      preparing: 'PREPARING',
      shipped: 'OUT_FOR_DELIVERY',
      delivered: 'DELIVERED',
      cancelled: 'CANCELLED',
      returned: 'CANCELLED',
    };
    const status = statusMap[statusRaw] ?? 'CONFIRMED';

    // Trendruum teslimat adresi: shipment_address
    const shipAddr = (o.shipment_address ?? o.shippingAddress ?? o.deliveryAddress ?? {}) as Record<string, unknown>;
    const customerName = String(
      o.customerName ??
      shipAddr.fullName ??
      [shipAddr.firstname ?? shipAddr.firstName, shipAddr.lastname ?? shipAddr.lastName].filter(Boolean).join(' ') ??
      ''
    );
    const phone = String(o.customerPhone ?? shipAddr.phone ?? shipAddr.gsm ?? '');
    const city = String(o.city ?? shipAddr.city ?? '');
    const district = String(o.district ?? shipAddr.district ?? '');

    // Trendruum sipariş kalemleri: items[]
    const rawItems = Array.isArray(o.items) ? o.items
      : Array.isArray(o.orderLines) ? o.orderLines
      : Array.isArray(o.lines) ? o.lines
      : [];

    const items = (rawItems as Record<string, unknown>[]).map((item) => ({
      externalLineId: String(item.id ?? item._id ?? item.lineId ?? ''),
      productName: String(item.productName ?? item.name ?? item.title ?? ''),
      sku: String(item.sku ?? item.stock_code ?? item.barcode ?? item.modelCode ?? ''),
      barcode: String(item.barcode ?? item.sku ?? ''),
      quantity: Number(item.quantity ?? item.qty ?? 1),
      unitPrice: Number(item.price ?? item.salePrice ?? item.unitPrice ?? 0),
    }));

    return {
      externalOrderId: orderId,
      platformOrderNumber: String(o.orderNumber ?? o.order_number ?? orderId),
      platform: 'TRENDRUM' as any,
      status,
      externalStatus: statusRaw,
      customerName,
      phone,
      city,
      district,
      addressText: String(shipAddr.address ?? shipAddr.fullAddress ?? shipAddr.addressText ?? ''),
      totalAmount: Number(o.totalAmount ?? o.total_amount ?? o.total ?? 0),
      orderDate: o.orderDate ?? o.created_at ?? o.createdAt
        ? new Date(String(o.orderDate ?? o.created_at ?? o.createdAt))
        : undefined,
      items,
    };
  }
}
