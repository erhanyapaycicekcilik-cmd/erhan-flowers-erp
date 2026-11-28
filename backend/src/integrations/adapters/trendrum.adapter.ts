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

  // Trendruum'dan tüm kategorileri çekip cache'e yükler.
  // Yanıt biçimi kesin bilinmediği için esnek: data | data.data | data.categories | items; sayfalıysa
  // (meta.last_page / last_page / links.next / total_pages) tüm sayfalar gezilir; alt kategoriler düzleştirilir.
  private categoryDiag = '';
  private async loadCategories(headers: Record<string, string>): Promise<void> {
    if (this.categoryCache.length > 0) return;
    const flat: Array<{ id: string; name: string }> = [];
    const seen = new Set<string>();
    const walk = (list: unknown, parent = '') => {
      if (!Array.isArray(list)) return;
      for (const raw of list as Record<string, unknown>[]) {
        if (!raw || typeof raw !== 'object') continue;
        const id = String(raw._id ?? raw.id ?? raw.category_id ?? raw.categoryId ?? '');
        const ownName = String(raw.name ?? raw.title ?? raw.category_name ?? raw.categoryName ?? '');
        const path = parent ? `${parent} > ${ownName}` : ownName;
        if (id && ownName && !seen.has(id)) { seen.add(id); flat.push({ id, name: path }); }
        walk(raw.children ?? raw.subcategories ?? raw.sub_categories ?? raw.subCategories ?? raw.childs ?? raw.child_categories, path);
      }
    };
    const listOf = (body: Record<string, any>): unknown[] => {
      const candidates = [body?.data?.data, body?.data?.categories, body?.data?.items, body?.data, body?.categories, body?.items, body?.results, body];
      return (candidates.find((c) => Array.isArray(c)) as unknown[]) ?? [];
    };
    const lastPageOf = (body: Record<string, any>): number => Number(
      body?.meta?.last_page ?? body?.data?.last_page ?? body?.last_page ?? body?.meta?.total_pages ?? body?.data?.meta?.last_page ?? body?.total_pages ?? 1,
    ) || 1;
    try {
      let page = 1;
      let lastPage = 1;
      do {
        const url = page === 1 ? `${TRENDRUM_API}/categories` : `${TRENDRUM_API}/categories?page=${page}`;
        const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
        if (!res.ok) { this.categoryDiag = `kategori isteği HTTP ${res.status}`; break; }
        const body = (await res.json()) as Record<string, any>;
        const items = listOf(body);
        if (page === 1) {
          lastPage = Math.min(lastPageOf(body), 50);
          const first = items[0] as Record<string, unknown> | undefined;
          this.categoryDiag = `yanıt anahtarları: ${Object.keys(body ?? {}).join(',')}; ilk kayıt alanları: ${first ? Object.keys(first).join(',') : '-'}`;
        }
        const before = flat.length;
        walk(items);
        if (flat.length === before) break; // yeni kayıt gelmiyorsa dur
        page += 1;
      } while (page <= lastPage);
      this.categoryCache = flat;
    } catch (error) {
      this.categoryDiag = `kategori listesi alınamadı: ${error instanceof Error ? error.message : String(error)}`;
    }
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

  // Türkçe karakter / büyük-küçük harf duyarsız karşılaştırma ("Yapay Agac" = "Yapay Ağaç")
  private norm(value: string): string {
    return value
      .toLocaleLowerCase('tr-TR')
      .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/i̇/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  // Önce birebir, sonra en derin (son) kategori adı, sonra kelimelerin hepsini içeren en kısa kategori
  private findCategoryId(categoryName: string): string | null {
    const wanted = this.norm(categoryName);
    if (!wanted) return null;
    const leaf = (name: string) => this.norm(name.split('>').pop() ?? name);
    const exact = this.categoryCache.find((c) => this.norm(c.name) === wanted)
      ?? this.categoryCache.find((c) => leaf(c.name) === wanted);
    if (exact) return exact.id;
    const words = wanted.split(' ').filter((w) => w.length >= 3);
    const candidates = this.categoryCache
      .filter((c) => {
        const name = this.norm(c.name);
        return words.length > 0 && words.every((w) => name.includes(w));
      })
      .sort((a, b) => leaf(a.name).length - leaf(b.name).length);
    return candidates[0]?.id ?? null;
  }

  // Kategori bulunamadığında hata mesajında gösterilecek en yakın Trendrum kategorileri
  private nearestCategories(categoryName: string, limit = 5): string[] {
    const words = this.norm(categoryName).split(' ').filter((w) => w.length >= 3);
    return this.categoryCache
      .map((c) => ({ c, score: words.filter((w) => this.norm(c.name).includes(w)).length }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((x) => `${x.c.name} (ID: ${x.c.id})`);
  }

  private findBrandId(brandName: string): string | null {
    const lower = this.norm(brandName);
    if (!lower) return null;
    const match = this.brandCache.find((b) => this.norm(b.name) === lower)
      ?? this.brandCache.find((b) => this.norm(b.name).includes(lower))
      ?? this.brandCache.find((b) => this.norm(b.name) && lower.includes(this.norm(b.name)));
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
        message: this.categoryCache.length === 0
          ? `Trendrum: kategori listesi alınamadı (${this.categoryDiag || 'API'}). "${categoryName}" eşleştirilemedi; biraz sonra tekrar deneyin.`
          : `Trendrum: "${categoryName}" kategorisi Trendrum'da bulunamadı.${this.nearestCategories(categoryName).length ? ` En yakınlar: ${this.nearestCategories(categoryName).join(' · ')}` : ` Trendrum'dan ${this.categoryCache.length} kategori alındı, örnek: ${this.categoryCache.slice(0, 8).map((c) => c.name).join(' · ')} (${this.categoryDiag}).`} Ürünün kanal kategorisi adını Trendrum'daki adla aynı yapın.`,
      };
    }
    if (!brand_id) {
      return {
        ok: false,
        status: 'FAILED',
        message: `Trendrum: "${brandName}" markası Trendrum'da kayıtlı değil. Trendrum satıcı panelinden bu markayı mağazanıza ekletin (marka başvurusu), sonra tekrar gönderin.`,
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
