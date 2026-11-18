import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { HttpMarketplaceOrderAdapter } from './http-marketplace-order.adapter';
import { AdapterConnectionResult, ExternalOrder } from './integration-adapter.interface';

const HB_ORDERS_URL = 'https://oms-external.hepsiburada.com';

@Injectable()
export class HepsiburadaAdapter extends HttpMarketplaceOrderAdapter {
  constructor(@Optional() @Inject('HEPSIBURADA_RUNTIME_CREDENTIALS') runtimeCredentials?: Record<string, string>) {
    super({
      platform: 'HEPSIBURADA',
      envPrefix: 'HEPSIBURADA',
      defaultApiUrl: HB_ORDERS_URL,
      defaultOrderPath: '/orders/merchantid/{merchantId}',
      defaultProductPath: '',
      runtimeCredentials,
    });
  }

  // Hepsiburada sipariş API'si tarih filtresi desteklemiyor ve
  // offset/limit kullanıyor — genel adapter'ın startDate/endDate
  // parametreleri HB tarafından reddedildiği için override gerekli.
  /** Son fetchOrders tüm sayfaları hatasız aldı mı? (Eksik listeyle "kargoya verildi" kararı verilmesin) */
  lastFetchComplete = false;
  /** Önceden satır id'siyle (ürünsüz) kaydedilmiş HB siparişleri: satır id → sipariş no (çift kayıt temizliği için) */
  regroupedLineIds = new Map<string, string>();

  private isLineShaped(row: Record<string, unknown>): boolean {
    const hasLineArray = ['orderLineList', 'lines', 'items'].some((k) => Array.isArray(row[k]));
    if (hasLineArray) return false;
    return Boolean(row.merchantSKU ?? row.merchantSku ?? row.productImageUrlFormat ?? ((row.name || row.productName) && row.quantity != null));
  }

  override async fetchOrders(): Promise<ExternalOrder[]> {
    this.lastFetchComplete = false;
    const merchantId = this.env('MERCHANT_ID');
    const username = this.env('USERNAME') || this.env('API_KEY') || merchantId;
    const password = this.env('PASSWORD') || this.env('API_SECRET');
    if (!merchantId || !username || !password) return [];

    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    const userAgent = this.env('USER_AGENT') || 'ErhanFlowersERP-HB';
    const headers = {
      Accept: 'application/json',
      Authorization: `Basic ${auth}`,
      'User-Agent': userAgent,
    };

    const apiBase = (this.env('API_URL') || HB_ORDERS_URL).replace(/\/+$/, '');
    // HB open orders endpoint — aktif siparişleri döndürür
    const basePath = `/orders/merchantid/${encodeURIComponent(merchantId)}/openorders`;

    const allOrders: ExternalOrder[] = [];
    const rawLines: Record<string, unknown>[] = [];
    const pageSize = 50;
    const maxPages = 10;
    let offset = 0;
    let complete = true;
    let reachedEnd = false;

    for (let page = 0; page < maxPages; page++) {
      const url = new URL(basePath, `${apiBase}/`);
      url.searchParams.set('offset', String(offset));
      url.searchParams.set('limit', String(pageSize));

      const response = await fetch(url.toString(), { method: 'GET', headers });
      if (!response.ok) { complete = false; break; }

      const json = await response.json().catch(() => null) as Record<string, unknown> | null;
      if (!json) { complete = false; break; }

      // HB yanıt formatı: { TotalCount, TotalPage, pageSize, pageIndex, data: [...] }
      const items = Array.isArray(json.data) ? json.data as Record<string, unknown>[]
        : Array.isArray(json.items) ? json.items as Record<string, unknown>[]
        : Array.isArray(json.orders) ? json.orders as Record<string, unknown>[]
        : [];

      if (!items.length) { reachedEnd = true; break; }

      // HB OMS listesi sipariş değil ÜRÜN SATIRI döndürür (id = satır, orderNumber, name, merchantSKU,
      // productImageUrlFormat). Satır biçimindekiler sipariş numarasına göre gruplanır.
      const lineShaped = items.filter((it) => this.isLineShaped(it));
      for (const order of items) {
        if (this.isLineShaped(order)) continue;
        const mapped = this.mapHepsiburadaOrder(order);
        if (mapped) allOrders.push(mapped);
      }
      rawLines.push(...lineShaped);

      const totalCount = Number(json.TotalCount ?? json.totalCount ?? 0);
      offset += pageSize;
      if (totalCount > 0 && offset >= totalCount) { reachedEnd = true; break; }
      if (items.length < pageSize) { reachedEnd = true; break; }
    }
    this.lastFetchComplete = complete && reachedEnd;

    // Satır biçimindeki kayıtları sipariş numarasıyla grupla
    this.regroupedLineIds = new Map();
    const groups = new Map<string, Record<string, unknown>[]>();
    for (const line of rawLines) {
      const key = String(line.orderNumber ?? line.orderId ?? line.packageNumber ?? line.id ?? '');
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(line);
      const lineId = String(line.id ?? '');
      if (lineId && lineId !== key) this.regroupedLineIds.set(lineId, key);
    }
    for (const [orderNumber, lines] of groups) {
      const mapped = this.mapHepsiburadaOrder({ ...lines[0], id: orderNumber, orderNumber, orderLineList: lines, totalPrice: undefined, amount: lines.reduce((sum, l) => sum + this.hbPrice(l.totalPrice ?? 0), 0) });
      if (mapped) allOrders.push(mapped);
    }

    // Tekrarlananları kaldır
    const deduped = Array.from(new Map(allOrders.map((o) => [o.externalOrderId, o])).values());

    // Görseli olmayan item'lar için HB listing API'den resim çek
    await this.enrichImagesFromListing(deduped, merchantId, username, password);

    return deduped;
  }

  /**
   * HB iade talepleri (claims): GET oms-external /claims/merchantid/{merchantId}?offset&limit
   * (limit zorunlu). Sipariş API'siyle aynı Basic giriş + User-Agent. Ham kayıt listesi döner.
   */
  async fetchClaims(statuses: string[] = []): Promise<Array<Record<string, unknown>>> {
    const merchantId = this.env('MERCHANT_ID');
    const username = this.env('USERNAME') || this.env('API_KEY') || merchantId;
    const password = this.env('PASSWORD') || this.env('API_SECRET');
    if (!merchantId || !username || !password) throw new Error('Hepsiburada API bilgileri eksik');
    const headers = {
      Accept: 'application/json',
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
      'User-Agent': this.env('USER_AGENT') || 'ErhanFlowersERP-HB',
    };
    const apiBase = (this.env('API_URL') || HB_ORDERS_URL).replace(/\/+$/, '');
    const all: Array<Record<string, unknown>> = [];
    const limit = 100;
    // Durum verilirse /status/{durum} (NewRequest, AwaitingAction, AwaitingPreApproval…) ile sadece o durumdakiler
    for (const status of statuses.length ? statuses : ['']) {
    for (let offset = 0; offset < 2000; offset += limit) {
      const statusPath = status ? `/status/${encodeURIComponent(status)}` : '';
      const url = `${apiBase}/claims/merchantid/${encodeURIComponent(merchantId)}${statusPath}?offset=${offset}&limit=${limit}`;
      const res = await fetch(url, { method: 'GET', headers, signal: AbortSignal.timeout(20000) });
      if (!res.ok) {
        const body = (await res.text().catch(() => '')).slice(0, 160).replace(/\s+/g, ' ');
        throw new Error(`Hepsiburada iade listesi alınamadı. HTTP ${res.status} ${body}`);
      }
      const json = await res.json().catch(() => null) as unknown;
      const obj = (json && typeof json === 'object' ? json : {}) as Record<string, unknown>;
      const list = (Array.isArray(json) ? json
        : Array.isArray(obj.items) ? obj.items
        : Array.isArray(obj.data) ? obj.data
        : Array.isArray(obj.claims) ? obj.claims : []) as Array<Record<string, unknown>>;
      // Durum alanı yoksa sorgulanan durumu yaz (ekranda doğru bölüme düşsün)
      all.push(...list.map((c) => (status && !c.status ? { ...c, status } : c)));
      const total = Number(obj.totalCount ?? obj.TotalCount ?? 0);
      if (list.length < limit || (total > 0 && offset + limit >= total)) break;
    }
    }
    return all;
  }

  // HB katalog (mpop) görsel haritası — merchantSku/barkod/HB SKU → ilk görsel. Mağaza başına 1 saat önbellek.
  private static readonly hbLog = new Logger('HepsiburadaAdapter');
  /** Son görsel eşleştirme denemesinin özeti (personel ekranında "HB Senkronize Et" sonrası gösterilir) */
  static lastImageDiag = '';
  static clearImageCache() { HepsiburadaAdapter.catalogImageCache.clear(); }
  private static catalogImageCache = new Map<string, { at: number; map: Map<string, string> }>();

  private static normalizeImageUrl(raw: unknown): string | null {
    let url = '';
    if (typeof raw === 'string') url = raw;
    else if (raw && typeof raw === 'object') {
      const o = raw as Record<string, unknown>;
      url = String(o.url ?? o.imageUrl ?? o.link ?? o.src ?? o.path ?? '');
    }
    url = url.trim();
    if (!url) return null;
    if (url.startsWith('//')) url = `https:${url}`;
    // HB görsel adresleri boyut yer tutucusuyla gelir: .../s/49/{size}/1100....jpg → tarayıcıda açılmaz
    url = url.replace(/\{size\}/gi, '500');
    return url.startsWith('http') ? url : null;
  }

  private static firstImage(data: Record<string, unknown>): string | null {
    for (const key of ['images', 'imageList', 'productImages', 'imageUrls']) {
      const arr = data[key];
      if (Array.isArray(arr)) {
        for (const img of arr) {
          const url = HepsiburadaAdapter.normalizeImageUrl(img);
          if (url) return url;
        }
      }
    }
    for (const key of ['imageUrl', 'productImageUrl', 'productImageUrlFormat', 'image', 'mainImage', 'thumbnailUrl', 'Image1']) {
      const url = HepsiburadaAdapter.normalizeImageUrl(data[key]);
      if (url) return url;
    }
    const attrs = data.attributes;
    if (attrs && typeof attrs === 'object' && !Array.isArray(attrs)) {
      const url = HepsiburadaAdapter.normalizeImageUrl((attrs as Record<string, unknown>).Image1);
      if (url) return url;
    }
    return null;
  }

  // HB katalog API'sinden mağazanın tüm ürünlerini çekip kod → görsel haritası kurar
  private async loadCatalogImages(merchantId: string, username: string, password: string): Promise<Map<string, string>> {
    const cached = HepsiburadaAdapter.catalogImageCache.get(merchantId);
    if (cached && Date.now() - cached.at < 60 * 60 * 1000) return cached.map;

    const userAgent = this.env('USER_AGENT') || 'ErhanFlowersERP-HB';
    const apiBase = (this.env('PRODUCT_API_URL') || 'https://mpop.hepsiburada.com').replace(/\/+$/, '');
    const secretKey = this.env('SECRET_KEY');
    // mpop bazı mağazalarda merchantId:secretKey, bazılarında kullanıcı:şifre ile çalışıyor
    const authCandidates = Array.from(new Set([
      ...(secretKey ? [`${merchantId}:${secretKey}`] : []),
      `${username}:${password}`,
      `${merchantId}:${password}`,
    ]));

    const map = new Map<string, string>();
    const notes: string[] = [];
    let productCount = 0;
    let sampleKeys = '';
    const add = (code: unknown, url: string) => {
      const key = String(code ?? '').trim().toUpperCase();
      if (key && !map.has(key)) map.set(key, url);
    };

    for (const cred of authCandidates) {
      const headers = { Accept: 'application/json', Authorization: `Basic ${Buffer.from(cred).toString('base64')}`, 'User-Agent': userAgent };
      let ok = false;
      const size = 1000;
      for (let page = 0; page < 30; page++) {
        const url = `${apiBase}/product/api/products/all-products-of-merchant/${encodeURIComponent(merchantId)}?page=${page}&size=${size}`;
        let json: Record<string, unknown> | null = null;
        try {
          const res = await fetch(url, { method: 'GET', headers, signal: AbortSignal.timeout(20000) });
          if (!res.ok) {
            const body = (await res.text().catch(() => '')).slice(0, 120).replace(/\s+/g, ' ');
            notes.push(`giriş${authCandidates.indexOf(cred) + 1}: HTTP ${res.status} ${body}`);
            HepsiburadaAdapter.hbLog.warn(`HB katalog görsel çağrısı ${res.status} döndü (sayfa ${page}) ${body}`);
            break;
          }
          json = await res.json().catch(() => null) as Record<string, unknown> | null;
        } catch (err) { notes.push(`giriş${authCandidates.indexOf(cred) + 1}: ${(err as Error)?.message ?? 'bağlantı hatası'}`); break; }
        if (!json) { notes.push('yanıt JSON değil'); break; }
        ok = true;
        const list = (Array.isArray(json.data) ? json.data
          : Array.isArray(json.content) ? json.content
          : Array.isArray(json.products) ? json.products
          : Array.isArray(json.items) ? json.items
          : Array.isArray(json) ? json : []) as Record<string, unknown>[];
        if (!list.length) { if (page === 0) notes.push(`ürün listesi boş (alanlar: ${Object.keys(json).slice(0, 12).join(',')})`); break; }
        productCount += list.length;
        if (!sampleKeys) sampleKeys = Object.keys(list[0]).slice(0, 25).join(',');
        for (const p of list) {
          const attrs = (p.attributes && typeof p.attributes === 'object' && !Array.isArray(p.attributes)) ? p.attributes as Record<string, unknown> : {};
          const img = HepsiburadaAdapter.firstImage(p);
          if (!img) continue;
          add(p.merchantSku ?? p.merchantSKU ?? attrs.merchantSku, img);
          add(p.barcode ?? attrs.Barcode, img);
          add(p.hbSku ?? p.hepsiburadaSku ?? p.sku, img);
          add(p.stockCode ?? p.productCode, img);
        }
        const totalPages = Number(json.totalPages ?? json.pageCount ?? 0);
        if (json.last === true || list.length < size || (totalPages > 0 && page + 1 >= totalPages)) break;
      }
      if (ok) break;
    }
    // Hata durumunda boş haritayı kısa süreli tut (her senkronda API'ye yüklenmesin)
    HepsiburadaAdapter.lastImageDiag = `HB katalog: ${productCount} ürün, ${map.size} görselli kod`
      + (notes.length ? ` | ${notes.join(' | ')}` : '')
      + (productCount && !map.size ? ` | ürün alanları: ${sampleKeys}` : '');
    HepsiburadaAdapter.hbLog.log(HepsiburadaAdapter.lastImageDiag);
    HepsiburadaAdapter.catalogImageCache.set(merchantId, { at: map.size ? Date.now() : Date.now() - 50 * 60 * 1000, map });
    return map;
  }

  // Sipariş satırlarında görsel gelmiyor: HB katalog API'sinden SKU/barkodla bul
  private async enrichImagesFromListing(
    orders: ExternalOrder[],
    merchantId: string,
    username: string,
    password: string,
  ): Promise<void> {
    const all = orders.flatMap((o) => o.items);
    const missing = all.filter((item) => !item.imageUrl);
    if (!missing.length) {
      HepsiburadaAdapter.lastImageDiag = `${orders.length} açık sipariş, ${all.length} ürün satırı — hepsinin görseli siparişle geldi`;
      return;
    }
    const map = await this.loadCatalogImages(merchantId, username, password).catch(() => new Map<string, string>());
    const unmatched: string[] = [];
    let matched = 0;
    for (const item of missing) {
      let found = false;
      for (const code of [item.sku, item.barcode, item.modelCode, item.externalVariantId]) {
        const url = code ? map.get(String(code).trim().toUpperCase()) : undefined;
        if (url) { item.imageUrl = url; found = true; break; }
      }
      if (found) matched += 1; else unmatched.push(item.sku || item.barcode || '?');
    }
    HepsiburadaAdapter.lastImageDiag = `${HepsiburadaAdapter.lastImageDiag.split(' || ')[0]} || ${orders.length} açık sipariş, ${all.length} ürün satırı, ${missing.length} görselsiz geldi, ${matched} katalogdan bulundu`
      + (unmatched.length ? `, bulunamayan kodlar: ${Array.from(new Set(unmatched)).slice(0, 5).join(', ')}` : '');
  }

  private mapHepsiburadaOrder(order: Record<string, unknown>): ExternalOrder | null {
    // HB sipariş alanları: id, orderNumber, packageNumber, status, customerName,
    // orderLineList: [{ id, productName, merchantSku, quantity, price, barcode? }]
    const orderId = String(order.id ?? order.packageNumber ?? order.orderNumber ?? '');
    const orderNumber = String(order.orderNumber ?? order.id ?? '');
    if (!orderId) return null;

    const statusRaw = String(order.status ?? order.packageStatus ?? '').toUpperCase();
    const status = this.mapHbStatus(statusRaw);

    const shipAddr = (order.shippingAddress ?? order.deliveryAddress ?? {}) as Record<string, unknown>;
    const customerName = String(
      order.customerName ?? order.buyerName ??
      shipAddr.fullName ?? [shipAddr.firstName, shipAddr.lastName].filter(Boolean).join(' ') ?? ''
    );
    const phone = String(order.customerPhone ?? order.phone ?? shipAddr.phone ?? '');

    const lines = Array.isArray(order.orderLineList) ? order.orderLineList as Record<string, unknown>[]
      : Array.isArray(order.lines) ? order.lines as Record<string, unknown>[]
      : Array.isArray(order.items) ? order.items as Record<string, unknown>[]
      : [];

    return {
      externalOrderId: orderId,
      platformOrderNumber: orderNumber || orderId,
      platform: 'HEPSIBURADA',
      status: status.saleStatus,
      invoiceStatus: status.invoiceStatus,
      externalStatus: statusRaw || undefined,
      unknownStatus: status.unknown,
      customerName,
      phone,
      addressText: String(shipAddr.fullAddress ?? shipAddr.address ?? shipAddr.address1 ?? '') || undefined,
      city: String(shipAddr.city ?? '') || undefined,
      district: String(shipAddr.district ?? shipAddr.town ?? '') || undefined,
      totalAmount: this.hbPrice(order.totalPrice ?? order.amount ?? 0),
      paidAmount: this.hbPrice(order.totalPrice ?? order.amount ?? 0),
      deliveryFee: this.hbPrice(order.cargoPrice ?? order.deliveryFee ?? 0),
      paymentStatus: 'PAID',
      cargoProvider: String(order.cargoCompany ?? order.cargoProviderName ?? '') || undefined,
      cargoTrackingNumber: String(order.trackingNumber ?? order.cargoTrackingNumber ?? '') || undefined,
      orderDate: order.orderDate ? new Date(String(order.orderDate)) : undefined,
      deliveryDueAt: order.dueDate ? new Date(String(order.dueDate)) : undefined,
      items: lines.map((line) => {
        const merchantSku = String(line.merchantSku ?? line.merchantSKU ?? line.supplierStockCode ?? line.sku ?? '');
        // merchantSku hem barcode hem modelCode olarak set ediliyor — hangisi eşleşirse stok düşülsün
        return {
          externalLineId: String(line.id ?? line.lineId ?? '') || undefined,
          externalVariantId: String(line.hepsiburadaSku ?? line.listingId ?? merchantSku) || undefined,
          productName: String(line.productName ?? line.name ?? line.productTitle ?? 'Hepsiburada Ürünü'),
          sku: merchantSku || undefined,
          barcode: String(line.barcode ?? line.ean ?? merchantSku) || undefined,
          modelCode: merchantSku || undefined,
          imageUrl: HepsiburadaAdapter.firstImage(line) ?? HepsiburadaAdapter.normalizeImageUrl(line.img) ?? undefined,
          quantity: Number(line.quantity ?? line.qty ?? 1),
          unitPrice: this.hbPrice(line.price ?? line.unitPrice ?? line.salePrice ?? 0),
        };
      }),
    };
  }

  private mapHbStatus(status: string): { saleStatus?: ExternalOrder['status']; invoiceStatus?: ExternalOrder['invoiceStatus']; unknown: boolean } {
    if (['OPEN', 'NEW', 'CREATED', 'WAITING_FOR_APPROVAL', 'APPROVED', 'WAITING_IN_MERCHANT'].includes(status)) return { saleStatus: 'CONFIRMED', unknown: false };
    if (['PACKING', 'PICKING', 'PREPARING', 'INVOICED', 'WAITING_FOR_SHIPMENT'].includes(status)) return { saleStatus: 'PREPARING', unknown: false };
    if (['SHIPPED', 'CARGO', 'IN_TRANSIT', 'ON_THE_WAY'].includes(status)) return { saleStatus: 'OUT_FOR_DELIVERY', unknown: false };
    if (['DELIVERED', 'COMPLETED'].includes(status)) return { saleStatus: 'DELIVERED', unknown: false };
    if (['CANCELLED', 'CANCELED', 'REJECTED'].includes(status)) return { saleStatus: 'CANCELLED', invoiceStatus: 'CANCELLED', unknown: false };
    if (['RETURNED', 'RETURNING'].includes(status)) return { saleStatus: 'COMPLETED', invoiceStatus: 'RETURNED', unknown: false };
    // HB bazen boş status gönderebilir — OPEN kabul et
    if (!status) return { saleStatus: 'CONFIRMED', unknown: false };
    return { unknown: true };
  }

  private hbPrice(value: unknown): number {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>;
      const amount = obj.amount ?? obj.value ?? obj.price;
      if (amount != null) return Number(amount) || 0;
    }
    return Number(value) || 0;
  }

  override async pushProduct(payload: unknown): Promise<AdapterConnectionResult> {
    const merchantId = this.env('MERCHANT_ID');
    const secretKey = this.env('SECRET_KEY') || this.env('PASSWORD') || this.env('API_SECRET');
    const userAgent = this.env('USER_AGENT');
    if (!merchantId || !secretKey) return this.missing(['HEPSIBURADA_MERCHANT_ID', 'HEPSIBURADA_SECRET_KEY']);

    const p = payload as Record<string, any>;
    const images = this.extractImages(p.images);
    const stockCode = (p.modelCode || p.barcode || '').toUpperCase();
    const hbCategoryId = Number(this.env('CATEGORY_ID') || p.hepsiburadaCategoryId || 60001290);
    const hbProductTypeId = Number(this.env('PRODUCT_TYPE_ID') || p.hepsiburadaProductTypeId || 3210);
    const hbProductPath = this.env('PRODUCT_PATH') || '/product/api/products/import';
    const apiBaseUrl = this.env('PRODUCT_API_URL') || 'https://mpop.hepsiburada.com';
    const height = this.extractHeight(p.productName, p.description);

    // HB katalog ürün JSON: düz alan yapısı (array içinde), fiyat Türkçe virgüllü string
    const salePrice = Number(p.salePrice || 0);
    const priceStr = salePrice.toFixed(2).replace('.', ',');

    // HB doğru format: categoryId + merchant üstte, geri kalan her şey attributes içinde
    const hbAttributes: Record<string, any> = {
      merchantSku: stockCode,
      VaryantGroupID: (p.modelCode || stockCode).toUpperCase(),
      UrunAdi: p.productName || '',
      UrunAciklamasi: (p.description || p.productName || '').replace(/\n/g, '\r\n'),
      Marka: p.brand || 'Erhan Flowers',
      GarantiSuresi: 0,
      kg: String(p.desi || 1),
      tax_vat_rate: '10',
      price: priceStr,
      stock: String(Number(p.stockQuantity ?? 0)),
      renk_variant_property: p.color || 'Çok Renkli',
      ...(p.flowerType ? { 'Çiçek Türü': p.flowerType } : {}),
      ...(height ? { Boy: height } : {}),
      ...(p.barcode ? { Barcode: p.barcode } : {}),
    };
    images.slice(0, 10).forEach((url, i) => { hbAttributes[`Image${i + 1}`] = url; });

    const hbProduct: Record<string, any> = {
      categoryId: hbCategoryId,
      merchant: merchantId,
      attributes: hbAttributes,
    };

    const url = new URL(hbProductPath.startsWith('/') ? hbProductPath : `/${hbProductPath}`, `${apiBaseUrl.replace(/\/+$/, '')}/`);
    url.searchParams.set('merchantId', merchantId);
    const auth = Buffer.from(`${merchantId}:${secretKey}`).toString('base64');

    // HB API, ürünleri multipart/form-data ile .json dosyası olarak kabul eder
    const jsonContent = JSON.stringify([hbProduct]);
    const formData = new FormData();
    formData.append('file', new Blob([jsonContent], { type: 'application/json' }), 'products.json');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Basic ${auth}`,
          'User-Agent': userAgent || 'ErhanFlowersERP-HB',
        },
        body: formData,
      });

      const responseText = await response.text().catch(() => '');
      let responseJson: any;
      try { responseJson = JSON.parse(responseText); } catch { responseJson = { raw: responseText }; }

      if (!(response.ok || response.status === 201 || response.status === 202)) {
        return {
          ok: false,
          status: response.status === 401 || response.status === 403 ? 'MISSING_CREDENTIALS' : 'FAILED',
          message: `Hepsiburada urun gonderimi basarisiz. HTTP ${response.status}: ${responseText.slice(0, 500)}`,
        };
      }

      const trackingId: string | null = responseJson?.data?.trackingId || responseJson?.trackingId || null;

      // trackingId ile islem durumunu kontrol et (8 saniye bekle — HB async isleme)
      if (trackingId) {
        await new Promise((r) => setTimeout(r, 8000));
        try {
          const statusUrl = new URL(`/product/api/products/import/${trackingId}`, `${apiBaseUrl.replace(/\/+$/, '')}/`);
          statusUrl.searchParams.set('merchantId', merchantId);
          const statusResp = await fetch(statusUrl, {
            headers: { Accept: 'application/json', Authorization: `Basic ${auth}`, 'User-Agent': userAgent || 'ErhanFlowersERP-HB' },
          });

          // 404 = HB henuz islemiyor, birkaç dakika sonra panelde gorunur
          if (statusResp.status === 404) {
            return { ok: true, status: 'CONNECTED', message: `Hepsiburada dosya kabul edildi ve isleme alindi. TrackingId: ${trackingId} — HB panelinde "Indirme Gecmisi"nden takip edebilirsiniz (1-5 dakika surabilir).` };
          }

          const statusText = await statusResp.text().catch(() => '');
          let statusJson: any;
          try { statusJson = JSON.parse(statusText); } catch { statusJson = null; }

          const statusData = statusJson?.data || statusJson;
          const statusStr: string = String(statusData?.status || statusData?.importStatus || '');
          const errors: string[] = (statusData?.errors ?? statusData?.failedItems ?? []).map?.((e: any) => e?.message || e?.errorMessage || JSON.stringify(e)) || [];
          const failCount: number = Number(statusData?.failedProductCount ?? statusData?.failCount ?? 0);
          const successCount: number = Number(statusData?.successProductCount ?? statusData?.successCount ?? 0);

          if (errors.length > 0 || failCount > 0) {
            return {
              ok: false,
              status: 'FAILED',
              message: `Hepsiburada icerik hatasi (TrackingId: ${trackingId}): Basarili=${successCount}, Basarisiz=${failCount}, Durum=${statusStr} | Hatalar: ${errors.join(' | ') || statusText.slice(0, 400)}`,
            };
          }
          return { ok: true, status: 'CONNECTED', message: `Hepsiburada gonderimi basarili. TrackingId: ${trackingId} | Durum: ${statusStr || 'PROCESSING'} | Basarili urun: ${successCount}` };
        } catch {
          return { ok: true, status: 'CONNECTED', message: `Hepsiburada dosya kabul edildi (TrackingId: ${trackingId}). HB panelinde "Indirme Gecmisi"nden takip edin.` };
        }
      }

      return { ok: true, status: 'CONNECTED', message: `Hepsiburada dosya kabul edildi. Yanit: ${responseText.slice(0, 300)}` };
    } catch (error) {
      return { ok: false, status: 'FAILED', message: `Hepsiburada urun gonderimi basarisiz: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  // Tek ürün için fiyat + stok güncelleme
  override async pushPrice(payload: unknown): Promise<AdapterConnectionResult> {
    const merchantId = this.env('MERCHANT_ID');
    const username = this.env('USERNAME') || this.env('API_KEY') || merchantId;
    const password = this.env('PASSWORD') || this.env('API_SECRET');
    if (!merchantId || !username || !password) return this.missing(['HEPSIBURADA_MERCHANT_ID', 'HEPSIBURADA_SECRET_KEY']);

    const p = payload as Record<string, unknown>;
    const hepsiburadaSku = String(p.hepsiburadaSku ?? p.barcode ?? p.modelCode ?? p.sku ?? '');
    if (!hepsiburadaSku) return { ok: false, status: 'FAILED', message: 'hepsiburadaSku, barcode veya modelCode zorunludur.' };

    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    const userAgent = this.env('USER_AGENT') || 'ErhanFlowersERP-HB';
    const headers = { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Basic ${auth}`, 'User-Agent': userAgent };
    const listingBase = 'https://listing-external.hepsiburada.com';

    const results: string[] = [];

    // Stok güncelleme
    if (p.stockQuantity !== undefined) {
      const stockRes = await fetch(`${listingBase}/listings/merchantid/${merchantId}/inventory-uploads`, {
        method: 'POST',
        headers,
        body: JSON.stringify([{ hepsiburadaSku, availableStock: Math.max(0, Number(p.stockQuantity)) }]),
      });
      results.push(`Stok: HTTP ${stockRes.status}`);
    }

    // Fiyat güncelleme
    if (p.salePrice !== undefined) {
      const price = Number(p.salePrice).toFixed(2);
      const priceRes = await fetch(`${listingBase}/listings/merchantid/${merchantId}/price-uploads`, {
        method: 'POST',
        headers,
        body: JSON.stringify([{ hepsiburadaSku, price }]),
      });
      results.push(`Fiyat: HTTP ${priceRes.status}`);
    }

    return { ok: true, status: 'CONNECTED', message: `Hepsiburada güncellendi. ${results.join(', ')}` };
  }

  private extractHeight(...values: unknown[]): string {
    const text = values.map((v) => String(v ?? '')).join(' ');
    return text.match(/\b\d{2,3}\s*cm\b/i)?.[0] ?? '';
  }

  private extractImages(images: unknown): string[] {
    if (!Array.isArray(images)) return [];
    return images.map((img) => {
      if (typeof img === 'string') return img;
      if (img && typeof img === 'object') return String((img as any).url ?? (img as any).filePath ?? '');
      return '';
    }).filter((url) => /^https?:\/\//i.test(url));
  }

  async testConnection(): Promise<AdapterConnectionResult> {
    const merchantId = this.env('MERCHANT_ID');
    const username = this.env('USERNAME') || this.env('API_KEY');
    const password = this.env('PASSWORD') || this.env('API_SECRET');
    const userAgent = this.env('USER_AGENT');
    const missing = [
      !merchantId ? 'MERCHANT_ID' : '',
      !username ? 'USERNAME' : '',
      !password ? 'PASSWORD' : '',
      !userAgent ? 'USER_AGENT' : '',
    ].filter(Boolean);
    if (missing.length) return this.missing(missing);

    const apiBaseUrl = this.env('API_URL') || HB_ORDERS_URL;
    const orderPath = this.env('ORDER_PATH') || `/orders/merchantid/${encodeURIComponent(merchantId)}`;
    const resolvedPath = orderPath.replace('{merchantId}', encodeURIComponent(merchantId));
    const url = new URL(resolvedPath.startsWith('/') ? resolvedPath : `/${resolvedPath}`, `${apiBaseUrl.replace(/\/+$/, '')}/`);
    url.searchParams.set('offset', '0');
    url.searchParams.set('limit', '1');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
        'User-Agent': userAgent,
      },
    });
    if (response.ok) return { ok: true, status: 'CONNECTED', message: 'Hepsiburada API baglantisi dogrulandi.' };
    return {
      ok: false,
      status: response.status === 401 || response.status === 403 ? 'MISSING_CREDENTIALS' : 'FAILED',
      message: `Hepsiburada API testi basarisiz. HTTP ${response.status}: ${await this.safeErrorText(response)}`,
    };
  }

  async deleteListing(sku: string): Promise<AdapterConnectionResult> {
    const merchantId = this.env('MERCHANT_ID');
    const secretKey = this.env('SECRET_KEY') || this.env('PASSWORD') || this.env('API_SECRET');
    if (!merchantId || !secretKey) return this.missing(['HEPSIBURADA_MERCHANT_ID', 'HEPSIBURADA_SECRET_KEY']);
    const auth = Buffer.from(`${merchantId}:${secretKey}`).toString('base64');
    const userAgent = this.env('USER_AGENT') || 'ErhanFlowersERP-HB';
    const listingBase = this.env('LISTING_API_URL') || 'https://listingapi.hepsiburada.com';
    const url = `${listingBase}/listings/merchantid/${encodeURIComponent(merchantId)}/sku/${encodeURIComponent(sku)}`;
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { Accept: 'application/json', Authorization: `Basic ${auth}`, 'User-Agent': userAgent },
      });
      if (response.ok || response.status === 204) return { ok: true, status: 'CONNECTED', message: `Silindi: ${sku}` };
      const txt = await response.text().catch(() => '');
      return { ok: false, status: 'FAILED', message: `HTTP ${response.status}: ${txt.slice(0, 200)}` };
    } catch (e) {
      return { ok: false, status: 'FAILED', message: String(e) };
    }
  }
}
