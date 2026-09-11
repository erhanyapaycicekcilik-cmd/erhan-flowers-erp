import { Injectable, Optional } from '@nestjs/common';
import { BaseIntegrationAdapter } from './base-adapter';
import { AdapterConnectionResult, ExternalOrder, ExternalOrderSummary, IntegrationPlatform } from './integration-adapter.interface';

// "Yapay & Kuru Çiçek" (2995) kategorisinin zorunlu öznitelikleri. Trendyol'un
// GET /product/product-categories/2995/attributes cevabından alınmıştır.
const TRENDYOL_FLOWER_TYPE_ATTRIBUTE_ID = 1095;
const TRENDYOL_COLOR_ATTRIBUTE_ID = 47;
const TRENDYOL_WEB_COLOR_ATTRIBUTE_ID = 348;
const TRENDYOL_ORIGIN_ATTRIBUTE_ID = 1192;

const TRENDYOL_FLOWER_TYPE_VALUES: Record<string, number> = {
  Gül: 10618191,
  Sarmaşık: 1209725,
  Papatya: 1209724,
  Ayçiçeği: 1209723,
  Ağaç: 1209722,
  Lale: 1209721,
  Lavanta: 1209720,
  Manolya: 1209719,
  'Çiçek Buketi': 1209718,
  Buket: 1209718,
  Yaprak: 1209717,
  'Tek Dal': 1209716,
  Saksı: 1209715,
  Demet: 1209714,
  Pamuk: 1209713,
};

const TRENDYOL_WEB_COLOR_VALUES: Record<string, number> = {
  Şeffaf: 10620610,
  'Çok Renkli': 686230,
  Inox: 438536,
  Krem: 420157,
  Haki: 7015,
  Ekru: 7014,
  Bordo: 7013,
  Yeşil: 7012,
  Turuncu: 7011,
  Turkuaz: 7010,
  Siyah: 7009,
  Sarı: 7008,
  Pembe: 7007,
  Mor: 7006,
  Mavi: 7004,
  Lacivert: 7003,
  Kırmızı: 7002,
  Kahverengi: 7001,
  Gümüş: 7000,
  Gri: 6999,
  Beyaz: 6998,
  Bej: 6997,
  Altın: 6996,
};

const TRENDYOL_ORIGIN_TR_VALUE_ID = 10617344;

// "Saksı" (2615) kategorisinin zorunlu öznitelikleri (Renk, Web Color ve Menşei
// yukarıdaki ile aynı attributeId'leri kullanır; Genişlik/Yükseklik bu kategoriye özeldir).
const TRENDYOL_POT_CATEGORY_ID = 2615;
const TRENDYOL_WIDTH_ATTRIBUTE_ID = 146;
const TRENDYOL_HEIGHT_ATTRIBUTE_ID = 286;
const TRENDYOL_POT_WIDTH_NOT_SPECIFIED_ID = 10577004;
const TRENDYOL_POT_HEIGHT_NOT_SPECIFIED_ID = 10577008;

type SizeBucket = { id: number; min: number; max: number };

const TRENDYOL_POT_WIDTH_BUCKETS: SizeBucket[] = [
  { id: 1196936, min: 0, max: 10 },
  { id: 1196944, min: 10, max: 15 },
  { id: 1196937, min: 15, max: 20 },
  { id: 1196938, min: 20, max: 25 },
  { id: 1196941, min: 25, max: 30 },
  { id: 1196942, min: 30, max: 40 },
  { id: 1196945, min: 40, max: 50 },
  { id: 1830, min: 60, max: 75 },
  { id: 1196939, min: 70, max: 80 },
  { id: 1196946, min: 80, max: 90 },
  { id: 1196930, min: 90, max: 100 },
  { id: 1196933, min: 100, max: 120 },
  { id: 1196931, min: 120, max: 150 },
  { id: 1196940, min: 150, max: 175 },
  { id: 1196932, min: 175, max: 200 },
  { id: 1196943, min: 200, max: Infinity },
];

const TRENDYOL_POT_HEIGHT_BUCKETS: SizeBucket[] = [
  { id: 1196898, min: 0, max: 10 },
  { id: 1196893, min: 10, max: 15 },
  { id: 1196900, min: 15, max: 20 },
  { id: 1196897, min: 20, max: 25 },
  { id: 1196902, min: 25, max: 30 },
  { id: 1196896, min: 30, max: 40 },
  { id: 1196901, min: 40, max: 50 },
  { id: 1196904, min: 50, max: 60 },
  { id: 221213, min: 60, max: 90 },
  { id: 1196894, min: 70, max: 80 },
  { id: 221214, min: 90, max: 120 },
  { id: 1196899, min: 100, max: 120 },
  { id: 221215, min: 120, max: 150 },
  { id: 221216, min: 150, max: 180 },
  { id: 1196895, min: 175, max: 200 },
];

@Injectable()
export class TrendyolAdapter extends BaseIntegrationAdapter {
  platform: IntegrationPlatform = 'TRENDYOL';
  private readonly defaultLookbackDays = 3;
  private readonly summaryRetryDelayMs = 800;
  private readonly defaultBrandId = 1354823;

  constructor(@Optional() private readonly runtimeCredentials: Record<string, string> = {}) {
    super();
  }

  async testConnection(): Promise<AdapterConnectionResult> {
    const missing = this.missingKeys();
    if (missing.length) return this.missing(missing);

    const response = await this.requestOrders({ size: 1, page: 0, lookbackDays: this.defaultLookbackDays });
    if (response.ok) {
      return { ok: true, status: 'CONNECTED', message: 'Trendyol API baglantisi dogrulandi.' };
    }

    return {
      ok: false,
      status: response.status === 401 || response.status === 403 ? 'MISSING_CREDENTIALS' : 'FAILED',
      message: `Trendyol API testi basarisiz. HTTP ${response.status}: ${await this.safeErrorText(response)}`,
    };
  }

  async fetchOrders(): Promise<ExternalOrder[]> {
    const missing = this.missingKeys();
    if (missing.length) return [];

    const size = 50;
    const firstPage = await this.fetchOrderPage(0, size);
    const totalPages = Math.min(Math.max(Number(firstPage.totalPages ?? 1), 1), 10);
    const content = [...(firstPage.content ?? [])];
    for (let page = 1; page < totalPages; page += 1) {
      const data = await this.fetchOrderPage(page, size);
      content.push(...(data.content ?? []));
    }

    const orders = content.map((order) => this.mapOrder(order));
    return Array.from(new Map(orders.map((order) => [order.externalOrderId, order])).values());
  }

  async fetchOrderSummary(): Promise<ExternalOrderSummary> {
    const missing = this.missingKeys();
    if (missing.length) throw new Error(`Trendyol API bilgileri eksik: ${missing.join(', ')}`);

    const [
      total,
      created,
      picking,
      invoiced,
      shipped,
      atCollectionPoint,
      delivered,
      repack,
      unsupplied,
      cancelled,
      undelivered,
      returned,
    ] = await this.sequence([
      () => this.fetchOrderCount(),
      () => this.fetchOrderCount('Created'),
      () => this.fetchOrderCount('Picking'),
      () => this.fetchOrderCount('Invoiced'),
      () => this.fetchOrderCount('Shipped'),
      () => this.fetchOrderCount('AtCollectionPoint'),
      () => this.fetchOrderCount('Delivered'),
      () => this.fetchOrderCount('Repack'),
      () => this.fetchOrderCount('UnSupplied'),
      () => this.fetchOrderCount('Cancelled'),
      () => this.fetchOrderCount('UnDelivered'),
      () => this.fetchOrderCount('Returned'),
    ]);

    return {
      total,
      new: created,
      processing: picking + invoiced,
      ready: invoiced,
      transit: shipped + atCollectionPoint,
      delivered,
      reshipment: repack,
      hold: unsupplied,
      cancelled: cancelled + undelivered,
      returned,
      lastUpdatedAt: new Date().toISOString(),
      source: 'LIVE',
    };
  }

  async pushProduct(payload: unknown): Promise<AdapterConnectionResult> {
    const missing = this.missingKeys();
    if (missing.length) return this.missing(missing);

    const contentId = this.text(this.record(payload).contentId);
    const productResponse = contentId ? await this.requestContentUpdate(payload, contentId) : await this.requestProductUpsert(payload);
    if (!productResponse.ok) {
      return {
        ok: false,
        status: productResponse.status === 401 || productResponse.status === 403 ? 'MISSING_CREDENTIALS' : 'FAILED',
        message: `Trendyol urun gonderimi basarisiz. HTTP ${productResponse.status}: ${await this.safeErrorText(productResponse)}`,
      };
    }
    const productBody = await productResponse.json().catch(() => ({} as Record<string, unknown>));
    const batchRequestId = this.text((productBody as Record<string, unknown>).batchRequestId);

    const priceResponse = await this.requestPriceAndInventory(payload);
    if (!priceResponse.ok) {
      return {
        ok: false,
        status: priceResponse.status === 401 || priceResponse.status === 403 ? 'MISSING_CREDENTIALS' : 'FAILED',
        message: `Trendyol stok/fiyat guncellemesi basarisiz. HTTP ${priceResponse.status}: ${await this.safeErrorText(priceResponse)}`,
        batchRequestId,
      };
    }
    const priceBody = await priceResponse.json().catch(() => ({} as Record<string, unknown>));
    const listingUploadId = this.text((priceBody as Record<string, unknown>).batchRequestId);

    return {
      ok: true,
      status: 'CONNECTED',
      message: batchRequestId
        ? `Trendyol urun, stok ve fiyat gonderimi kuyruga alindi (batchRequestId: ${batchRequestId}${listingUploadId ? `, listingUploadId: ${listingUploadId}` : ''}). Trendyol tarafinda asenkron olarak islenir; hemen goruntulenmeyebilir.`
        : 'Trendyol urun, stok ve fiyat gonderimi tamamlandi.',
      batchRequestId,
      listingUploadId,
    };
  }

  // Ürün/fiyat gönderimi asenkron işlendiği için "kuyruğa alındı" cevabı gerçek
  // sonucu göstermez. Bu metod, verilen batchRequestId'nin Trendyol tarafında
  // gerçekten işlenip işlenmediğini ve varsa hata sebebini sorgular.
  async checkBatchStatus(batchRequestId: string): Promise<AdapterConnectionResult & { batchStatus?: string; failedItemCount?: number }> {
    const missing = this.missingKeys();
    if (missing.length) return this.missing(missing);
    if (!batchRequestId) return { ok: false, status: 'FAILED', message: 'batchRequestId zorunludur.' };

    const supplierId = this.env('SUPPLIER_ID');
    const apiBaseUrl = this.env('API_URL').replace(/\/+$/, '');
    const url = `${apiBaseUrl}/product/sellers/${supplierId}/v2/products/batch-requests/${batchRequestId}`;
    const response = await fetch(url, { headers: this.productHeaders(supplierId) });
    if (!response.ok) {
      return {
        ok: false,
        status: response.status === 401 || response.status === 403 ? 'MISSING_CREDENTIALS' : 'FAILED',
        message: `Trendyol batch durumu sorgulanamadi. HTTP ${response.status}: ${await this.safeErrorText(response)}`,
      };
    }
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const batchStatus = this.text(body.status);
    const failedItemCount = Number(body.failedItemCount ?? 0);
    const items = Array.isArray(body.items) ? (body.items as Array<Record<string, unknown>>) : [];
    const failureReasons = items
      .flatMap((item) => (Array.isArray(item.failureReasons) ? (item.failureReasons as string[]) : []))
      .filter(Boolean);

    if (batchStatus !== 'COMPLETED') {
      return { ok: true, status: 'CONNECTED', message: 'Trendyol henüz işlemi tamamlamadı, kuyrukta bekliyor.', batchStatus, failedItemCount };
    }
    if (failedItemCount > 0) {
      return {
        ok: false,
        status: 'FAILED',
        message: failureReasons.length ? failureReasons.join(' ') : 'Trendyol işlemi tamamladı ancak reddetti.',
        batchStatus,
        failedItemCount,
      };
    }
    return { ok: true, status: 'CONNECTED', message: 'Trendyol işlemi başarıyla tamamladı.', batchStatus, failedItemCount };
  }

  // Trendyol API'si onaylı bir üründen görsel SİLMEYİ desteklemiyor (yalnızca
  // ekleme/birleştirme yapıyor). Bu yüzden istenmeyen görseli kaldırmanın tek
  // yolu Trendyol satıcı panelinden elle silmek. Bu metod, barkoda ait ürünün
  // panel düzenleme linkini (platformListingId ile) canlı olarak sorgular.
  async getSellerPanelUrl(barcode: string): Promise<AdapterConnectionResult & { panelUrl?: string }> {
    const missing = this.missingKeys();
    if (missing.length) return this.missing(missing);
    if (!barcode) return { ok: false, status: 'FAILED', message: 'Barkod zorunludur.' };

    const supplierId = this.env('SUPPLIER_ID');
    const apiBaseUrl = this.env('API_URL').replace(/\/+$/, '');
    const url = `${apiBaseUrl}/product/sellers/${supplierId}/v2/products?barcode=${encodeURIComponent(barcode)}`;
    const response = await fetch(url, { headers: this.productHeaders(supplierId) });
    if (!response.ok) {
      return {
        ok: false,
        status: response.status === 401 || response.status === 403 ? 'MISSING_CREDENTIALS' : 'FAILED',
        message: `Trendyol ürün sorgusu başarısız. HTTP ${response.status}: ${await this.safeErrorText(response)}`,
      };
    }
    const body = (await response.json().catch(() => ({}))) as { content?: Array<Record<string, unknown>> };
    const listingId = this.text(body.content?.[0]?.platformListingId);
    if (!listingId) {
      return { ok: false, status: 'FAILED', message: 'Bu barkod için Trendyol üzerinde ürün bulunamadı.' };
    }
    return { ok: true, status: 'CONNECTED', message: 'Panel linki bulundu.', panelUrl: `https://partner.trendyol.com/product-detail/${listingId}?withListingId=true` };
  }

  // Trendyol "paket durumu güncelleme" (siparişi hazırlandı/kargolandı olarak bildirme).
  // payload: { shipmentPackageId, lines: [{ lineId, quantity }], status: 'Picking'|'Invoiced'|'Shipped', trackingNumber?, cargoProviderId? }
  async updateOrderStatus(payload: unknown): Promise<AdapterConnectionResult> {
    const missing = this.missingKeys();
    if (missing.length) return this.missing(missing);

    const data = this.record(payload);
    const shipmentPackageId = this.text(data.shipmentPackageId);
    const status = this.text(data.status);
    if (!shipmentPackageId || !status) {
      return { ok: false, status: 'FAILED', message: 'shipmentPackageId ve status alanlari zorunlu.' };
    }

    const supplierId = this.env('SUPPLIER_ID');
    const apiBaseUrl = this.env('API_URL').replace(/\/+$/, '');
    const url = `${apiBaseUrl}/order/sellers/${supplierId}/shipment-packages/${shipmentPackageId}`;
    const body: Record<string, unknown> = {
      lines: this.array(data.lines).map((line: any) => ({ lineId: line.lineId, quantity: line.quantity })),
      params: {},
      status,
    };
    if (data.trackingNumber) body.trackingNumber = this.text(data.trackingNumber);
    if (data.cargoProviderId) body.cargoProviderId = Number(data.cargoProviderId);

    const response = await fetch(url, {
      method: 'PUT',
      headers: this.productHeaders(supplierId),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return {
        ok: false,
        status: response.status === 401 || response.status === 403 ? 'MISSING_CREDENTIALS' : 'FAILED',
        message: `Trendyol paket durumu guncellemesi basarisiz. HTTP ${response.status}: ${await this.safeErrorText(response)}`,
      };
    }
    return { ok: true, status: 'CONNECTED', message: `Trendyol paketi "${status}" durumuna guncellendi.` };
  }

  // Ürünü yeniden oluşturmadan (kategori/öznitelik göndermeden) sadece fiyat ve
  // stoğu günceller. Maliyet ekranında "Trendyol'a Fiyat Gönder" için kullanılır.
  async pushPrice(payload: unknown): Promise<AdapterConnectionResult> {
    const missing = this.missingKeys();
    if (missing.length) return this.missing(missing);

    const priceResponse = await this.requestPriceAndInventory(payload);
    if (!priceResponse.ok) {
      return {
        ok: false,
        status: priceResponse.status === 401 || priceResponse.status === 403 ? 'MISSING_CREDENTIALS' : 'FAILED',
        message: `Trendyol fiyat/stok guncellemesi basarisiz. HTTP ${priceResponse.status}: ${await this.safeErrorText(priceResponse)}`,
      };
    }
    const priceBody = await priceResponse.json().catch(() => ({} as Record<string, unknown>));
    const listingUploadId = this.text((priceBody as Record<string, unknown>).batchRequestId);

    return {
      ok: true,
      status: 'CONNECTED',
      message: listingUploadId
        ? `Trendyol fiyat/stok guncellemesi kuyruga alindi (listingUploadId: ${listingUploadId}).`
        : 'Trendyol fiyat/stok guncellemesi tamamlandi.',
      listingUploadId,
    };
  }

  private missingKeys() {
    return [
      !this.env('SUPPLIER_ID') ? 'TRENDYOL_SUPPLIER_ID' : '',
      !this.env('API_KEY') ? 'TRENDYOL_API_KEY' : '',
      !this.env('API_SECRET') ? 'TRENDYOL_API_SECRET' : '',
    ].filter(Boolean);
  }

  private async fetchOrderPage(page: number, size: number) {
    const response = await this.requestOrders({ size, page, lookbackDays: this.defaultLookbackDays });
    if (!response.ok) {
      throw new Error(`Trendyol siparis cekme basarisiz. HTTP ${response.status}: ${await this.safeErrorText(response)}`);
    }
    return response.json().catch(() => ({})) as Promise<{ content?: Array<Record<string, any>>; totalPages?: number }>;
  }

  private async fetchOrderCount(status?: string, attempt = 1): Promise<number> {
    const response = await this.requestOrderCount(status);
    if (response.status === 429 && attempt < 4) {
      await this.delay(this.summaryRetryDelayMs * attempt);
      return this.fetchOrderCount(status, attempt + 1);
    }
    if (!response.ok) {
      throw new Error(`Trendyol siparis sayaci alinamadi. HTTP ${response.status}: ${await this.safeErrorText(response)}`);
    }
    const data = await response.json().catch(() => ({})) as { totalElements?: number };
    return Number(data.totalElements ?? 0);
  }

  private requestOrderCount(status?: string) {
    const supplierId = this.env('SUPPLIER_ID');
    const apiBaseUrl = this.env('API_URL').replace(/\/+$/, '');
    const url = new URL(`${apiBaseUrl}/order/sellers/${supplierId}/v2/orders`);
    url.searchParams.set('page', '0');
    url.searchParams.set('size', '1');
    url.searchParams.set('orderByField', 'PackageLastModifiedDate');
    url.searchParams.set('orderByDirection', 'DESC');
    url.searchParams.set('sortDirection', 'DESC');
    if (status) url.searchParams.set('status', status);

    return fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.env('API_KEY')}:${this.env('API_SECRET')}`).toString('base64')}`,
        'User-Agent': `${supplierId} - SelfIntegration`,
        Accept: 'application/json',
      },
    });
  }

  private requestOrders(options: { size: number; page: number; lookbackDays: number }) {
    const supplierId = this.env('SUPPLIER_ID');
    const now = Date.now();
    const startDate = now - options.lookbackDays * 24 * 60 * 60 * 1000;
    const apiBaseUrl = this.env('API_URL').replace(/\/+$/, '');
    const url = new URL(`${apiBaseUrl}/order/sellers/${supplierId}/v2/orders`);
    url.searchParams.set('startDate', String(startDate));
    url.searchParams.set('endDate', String(now));
    url.searchParams.set('orderByField', 'PackageLastModifiedDate');
    url.searchParams.set('orderByDirection', 'DESC');
    url.searchParams.set('sortDirection', 'DESC');
    url.searchParams.set('page', String(options.page));
    url.searchParams.set('size', String(options.size));

    return fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.env('API_KEY')}:${this.env('API_SECRET')}`).toString('base64')}`,
        'User-Agent': `${supplierId} - SelfIntegration`,
        Accept: 'application/json',
      },
    });
  }

  private requestProductUpsert(payload: unknown) {
    const supplierId = this.env('SUPPLIER_ID');
    const apiBaseUrl = this.env('API_URL').replace(/\/+$/, '');
    const url = `${apiBaseUrl}/product/sellers/${supplierId}/v2/products`;
    return fetch(url, {
      method: 'POST',
      headers: this.productHeaders(supplierId),
      body: JSON.stringify({ items: [this.productPayload(payload)] }),
    });
  }

  // Trendyol'da zaten onaylı/canlı bir ürünü (barkod/kategori/marka değişmeden)
  // başlık, açıklama, görsel ve özniteliklerini günceller. "Yeni ürün oluştur"
  // uç noktasından farklıdır; onaylı ürünlerde o uç nokta "aynı barkodlu ürün
  // var" hatasıyla reddediyor.
  private requestContentUpdate(payload: unknown, contentId: string) {
    const supplierId = this.env('SUPPLIER_ID');
    const apiBaseUrl = this.env('API_URL').replace(/\/+$/, '');
    const url = `${apiBaseUrl}/product/sellers/${supplierId}/v2/products/content-bulk-update`;
    const data = this.record(payload);
    return fetch(url, {
      method: 'POST',
      headers: this.productHeaders(supplierId),
      body: JSON.stringify({
        items: [{
          contentId: Number(contentId),
          title: this.text(data.productName),
          description: this.text(data.description),
          images: this.array(data.images).map((imageUrl) => ({ url: String(imageUrl) })),
          // Trendyol, onaylı bir üründe varyant tanımlayan özniteliği ("Renk")
          // değiştirmeye izin vermiyor ve HTTP 400 ile reddediyor. Bu yüzden
          // içerik güncellemesinde renk alanlarını hiç göndermiyoruz.
          attributes: this.buildAttributes(data).filter(
            (attribute) => attribute.attributeId !== TRENDYOL_COLOR_ATTRIBUTE_ID && attribute.attributeId !== TRENDYOL_WEB_COLOR_ATTRIBUTE_ID,
          ),
        }],
      }),
    });
  }

  private requestPriceAndInventory(payload: unknown) {
    const supplierId = this.env('SUPPLIER_ID');
    const apiBaseUrl = this.env('API_URL').replace(/\/+$/, '');
    const url = `${apiBaseUrl}/inventory/sellers/${supplierId}/products/price-and-inventory`;
    const data = this.record(payload);
    return fetch(url, {
      method: 'POST',
      headers: this.productHeaders(supplierId),
      body: JSON.stringify({
        items: [{
          barcode: this.text(data.barcode),
          quantity: Number(data.stockQuantity ?? 0),
          salePrice: Number(data.salePrice ?? data.marketPrice ?? 0),
          listPrice: Number(data.listPrice ?? data.salePrice ?? data.marketPrice ?? 0),
        }],
      }),
    });
  }

  private productHeaders(supplierId: string) {
    const headers: Record<string, string> = {
      Authorization: `Basic ${Buffer.from(`${this.env('API_KEY')}:${this.env('API_SECRET')}`).toString('base64')}`,
      'User-Agent': `${supplierId} - SelfIntegration`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    const storeFrontCode = this.env('STOREFRONT_CODE');
    if (storeFrontCode) headers.storeFrontCode = storeFrontCode;
    return headers;
  }

  private env(key: string) {
    const val = String(this.runtimeCredentials[key] ?? process.env[`TRENDYOL_${key}`] ?? '').trim();
    if (!val && key === 'API_URL') return 'https://api.trendyol.com/sapigw';
    return val;
  }

  private buildAttributes(data: Record<string, any>) {
    const attributes: Array<{ attributeId: number; attributeValueId?: number; customAttributeValue?: string }> = [];
    const categoryId = Number(data.categoryId ?? 0);

    const color = this.text(data.color) || 'Çok Renkli';
    attributes.push({ attributeId: TRENDYOL_COLOR_ATTRIBUTE_ID, customAttributeValue: color });
    const webColorValueId = TRENDYOL_WEB_COLOR_VALUES[color] ?? TRENDYOL_WEB_COLOR_VALUES['Çok Renkli'];
    attributes.push({ attributeId: TRENDYOL_WEB_COLOR_ATTRIBUTE_ID, attributeValueId: webColorValueId });
    attributes.push({ attributeId: TRENDYOL_ORIGIN_ATTRIBUTE_ID, attributeValueId: TRENDYOL_ORIGIN_TR_VALUE_ID });

    if (categoryId === TRENDYOL_POT_CATEGORY_ID) {
      const dimensions = this.extractDimensionsCm(`${this.text(data.productName)} ${this.text(data.description)}`);
      attributes.push({
        attributeId: TRENDYOL_WIDTH_ATTRIBUTE_ID,
        attributeValueId: this.matchSizeBucket(dimensions.width, TRENDYOL_POT_WIDTH_BUCKETS) ?? TRENDYOL_POT_WIDTH_NOT_SPECIFIED_ID,
      });
      attributes.push({
        attributeId: TRENDYOL_HEIGHT_ATTRIBUTE_ID,
        attributeValueId: this.matchSizeBucket(dimensions.height, TRENDYOL_POT_HEIGHT_BUCKETS) ?? TRENDYOL_POT_HEIGHT_NOT_SPECIFIED_ID,
      });
    } else {
      const flowerType = this.text(data.flowerType);
      const flowerTypeValueId = TRENDYOL_FLOWER_TYPE_VALUES[flowerType] ?? TRENDYOL_FLOWER_TYPE_VALUES['Ağaç'];
      attributes.push({ attributeId: TRENDYOL_FLOWER_TYPE_ATTRIBUTE_ID, attributeValueId: flowerTypeValueId });
    }

    return attributes;
  }

  // "19x15x19 cm" gibi WxDxH kalıplarından en büyük değeri yükseklik, ikinci en büyüğü genişlik olarak alır.
  private extractDimensionsCm(text: string): { width: number | null; height: number | null } {
    const match = text.match(/(\d{1,3})\s*[xX]\s*(\d{1,3})(?:\s*[xX]\s*(\d{1,3}))?\s*cm/);
    if (!match) return { width: null, height: null };
    const numbers = [match[1], match[2], match[3]].filter(Boolean).map(Number).sort((a, b) => b - a);
    return { height: numbers[0] ?? null, width: numbers[1] ?? numbers[0] ?? null };
  }

  private matchSizeBucket(value: number | null, buckets: SizeBucket[]): number | null {
    if (value === null || !Number.isFinite(value)) return null;
    const exact = buckets.find((bucket) => value >= bucket.min && value <= bucket.max);
    if (exact) return exact.id;
    const nearest = [...buckets].sort((a, b) => {
      const distanceA = Math.min(Math.abs(value - a.min), Math.abs(value - a.max));
      const distanceB = Math.min(Math.abs(value - b.min), Math.abs(value - b.max));
      return distanceA - distanceB;
    })[0];
    return nearest?.id ?? null;
  }

  private productPayload(payload: unknown) {
    const data = this.record(payload);
    return {
      barcode: this.text(data.barcode),
      title: this.text(data.productName),
      productMainId: this.text(data.modelCode),
      brandId: Number(data.brandId ?? 0) || this.defaultBrandId,
      categoryId: Number(data.categoryId ?? 0) || undefined,
      quantity: Number(data.stockQuantity ?? 0),
      stockCode: this.text(data.modelCode),
      dimensionalWeight: Number(data.desi ?? 1),
      description: this.text(data.description),
      currencyType: 'TRY',
      vatRate: Number(data.vatRate ?? 20),
      listPrice: Number(data.listPrice ?? data.salePrice ?? 0),
      salePrice: Number(data.salePrice ?? 0),
      images: this.array(data.images).map((url) => ({ url: String(url) })),
      attributes: this.buildAttributes(data),
    };
  }

  private record(value: unknown): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
  }

  private array(value: unknown): any[] {
    return Array.isArray(value) ? value : [];
  }

  private async safeErrorText(response: Response) {
    const text = await response.text().catch(() => '');
    return text.slice(0, 1000) || response.statusText || 'Yanit okunamadi';
  }

  private mapOrder(order: Record<string, any>): ExternalOrder {
    const shipmentAddress = order.shipmentAddress ?? {};
    const invoiceAddress = order.invoiceAddress ?? {};
    const lines = Array.isArray(order.lines) ? order.lines : [];
    const customerName = [shipmentAddress.firstName, shipmentAddress.lastName].filter(Boolean).join(' ') || shipmentAddress.fullName || invoiceAddress.fullName || '';
    const phone = shipmentAddress.phone || invoiceAddress.phone || '';
    const packageId = this.text(order.shipmentPackageId ?? order.packageId ?? order.id);
    const orderNumber = this.text(order.orderNumber ?? order.id);
    const status = this.mapStatus(order.status);

    return {
      externalOrderId: packageId || orderNumber,
      platformOrderNumber: orderNumber || packageId,
      platform: 'TRENDYOL',
      status: status.saleStatus,
      invoiceStatus: status.invoiceStatus,
      externalStatus: this.text(order.status) || undefined,
      unknownStatus: status.unknown,
      customerName,
      phone,
      addressText: shipmentAddress.fullAddress || shipmentAddress.address1 || invoiceAddress.fullAddress,
      city: shipmentAddress.city,
      district: shipmentAddress.district,
      totalAmount: Number(order.totalPrice ?? order.grossAmount ?? 0),
      paidAmount: Number(order.totalPrice ?? order.grossAmount ?? 0),
      deliveryFee: Number(order.cargoPrice ?? order.shipmentPrice ?? order.deliveryFee ?? 0),
      paymentStatus: 'PAID',
      cargoProvider: order.cargoProviderName,
      cargoTrackingNumber: order.cargoTrackingNumber ? String(order.cargoTrackingNumber) : undefined,
      orderDate: this.date(order.orderDate ?? order.createdDate),
      items: lines.map((line: Record<string, any>) => ({
        externalLineId: String(line.id ?? line.lineItemId ?? ''),
        externalVariantId: line.merchantSku ? String(line.merchantSku) : undefined,
        productName: this.text(line.productName ?? line.name),
        variationText: [line.productColor, line.size].filter(Boolean).join(' / ') || undefined,
        sku: line.merchantSku ? String(line.merchantSku) : undefined,
        barcode: line.barcode ? String(line.barcode) : undefined,
        modelCode: line.merchantSku ? String(line.merchantSku) : undefined,
        imageUrl: line.images?.[0]?.url ? String(line.images[0].url) : (line.images?.[0] && typeof line.images[0] === 'string' ? line.images[0] : undefined),
        quantity: Number(line.quantity ?? 1),
        unitPrice: Number(line.price ?? line.amount ?? 0),
      })),
    };
  }

  private mapStatus(value: unknown): { saleStatus?: ExternalOrder['status']; invoiceStatus?: ExternalOrder['invoiceStatus']; unknown: boolean } {
    const status = this.text(value).toUpperCase();
    if (!status) return { saleStatus: undefined, invoiceStatus: undefined, unknown: true };
    if (['CREATED', 'AWAITING', 'UNSUPPLIED', 'SUPPLIED'].includes(status)) return { saleStatus: 'CONFIRMED', unknown: false };
    if (['PICKING', 'INVOICED'].includes(status)) return { saleStatus: 'PREPARING', unknown: false };
    if (['SHIPPED', 'AT_COLLECTION_POINT'].includes(status)) return { saleStatus: 'OUT_FOR_DELIVERY', unknown: false };
    if (status === 'DELIVERED') return { saleStatus: 'DELIVERED', unknown: false };
    if (['CANCELLED', 'CANCELLED_BY_SUPPLIER', 'UNDELIVERED'].includes(status)) return { saleStatus: 'CANCELLED', invoiceStatus: 'CANCELLED', unknown: false };
    if (['RETURNED', 'RETURNING'].includes(status)) return { saleStatus: 'COMPLETED', invoiceStatus: 'RETURNED', unknown: false };
    return { unknown: true };
  }

  private date(value: unknown) {
    const text = this.text(value);
    if (!text) return undefined;
    const parsed = /^\d+$/.test(text) ? new Date(Number(text)) : new Date(text);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private text(value: unknown) {
    return String(value ?? '').trim();
  }

  private async sequence(tasks: Array<() => Promise<number>>) {
    const results: number[] = [];
    for (const task of tasks) {
      results.push(await task());
      await this.delay(120);
    }
    return results;
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
