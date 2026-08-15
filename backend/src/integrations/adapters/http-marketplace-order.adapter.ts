import { BaseIntegrationAdapter } from './base-adapter';
import { AdapterConnectionResult, ExternalOrder, IntegrationPlatform } from './integration-adapter.interface';

type AdapterConfig = {
  platform: IntegrationPlatform;
  envPrefix: string;
  defaultApiUrl: string;
  defaultOrderPath: string;
  defaultProductPath?: string;
  runtimeCredentials?: Record<string, string>;
};

export abstract class HttpMarketplaceOrderAdapter extends BaseIntegrationAdapter {
  platform: IntegrationPlatform;

  protected constructor(private readonly config: AdapterConfig) {
    super();
    this.platform = config.platform;
  }

  async testConnection(): Promise<AdapterConnectionResult> {
    const missing = this.missingKeys();
    if (missing.length) return this.missing(missing);

    const response = await this.requestOrders({ page: 0, size: 1 });
    if (response.ok) {
      return { ok: true, status: 'CONNECTED', message: `${this.platform} API baglantisi dogrulandi.` };
    }

    return {
      ok: false,
      status: response.status === 401 || response.status === 403 ? 'MISSING_CREDENTIALS' : 'FAILED',
      message: `${this.platform} API testi basarisiz. HTTP ${response.status}: ${await this.safeErrorText(response)}`,
    };
  }

  async fetchOrders(): Promise<ExternalOrder[]> {
    const missing = this.missingKeys();
    if (missing.length) return [];

    const size = this.numberEnv('ORDER_PAGE_SIZE', 50);
    const maxPages = this.numberEnv('ORDER_MAX_PAGES', 5);
    const firstPage = await this.fetchOrderPage(0, size);
    const totalPages = Math.min(Math.max(Number(firstPage.totalPages ?? 1), 1), maxPages);
    const content = [...firstPage.content];

    for (let page = 1; page < totalPages; page += 1) {
      const data = await this.fetchOrderPage(page, size);
      content.push(...data.content);
    }

    const orders = content.map((order) => this.mapGenericOrder(order)).filter((order) => order.externalOrderId && order.platformOrderNumber);
    return Array.from(new Map(orders.map((order) => [order.externalOrderId, order])).values());
  }

  async pushProduct(payload: unknown): Promise<AdapterConnectionResult> {
    const missing = this.missingKeys();
    if (missing.length) return this.missing(missing);
    const path = this.env('PRODUCT_PATH') || this.config.defaultProductPath;
    if (!path) return this.missing([`${this.config.envPrefix}_PRODUCT_PATH`]);
    const apiBaseUrl = this.env('API_URL') || this.config.defaultApiUrl;
    const url = new URL(this.path(path), `${apiBaseUrl.replace(/\/+$/, '')}/`);
    const response = await fetch(url, {
      method: this.env('PRODUCT_METHOD') || 'POST',
      headers: { ...this.headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (response.ok) return { ok: true, status: 'CONNECTED', message: `${this.platform} urun gonderimi tamamlandi.` };
    return {
      ok: false,
      status: response.status === 401 || response.status === 403 ? 'MISSING_CREDENTIALS' : 'FAILED',
      message: `${this.platform} urun gonderimi basarisiz. HTTP ${response.status}: ${await this.safeErrorText(response)}`,
    };
  }

  private async fetchOrderPage(page: number, size: number) {
    const response = await this.requestOrders({ page, size });
    if (!response.ok) {
      throw new Error(`${this.platform} siparis cekme basarisiz. HTTP ${response.status}: ${await this.safeErrorText(response)}`);
    }
    const json = await response.json().catch(() => ({}));
    return this.normalizeResponse(json);
  }

  private requestOrders(options: { page: number; size: number }) {
    const url = this.orderUrl(options);
    return fetch(url, { method: 'GET', headers: this.headers() });
  }

  private orderUrl(options: { page: number; size: number }) {
    const apiBaseUrl = this.env('API_URL') || this.config.defaultApiUrl;
    const orderPath = this.env('ORDER_PATH') || this.config.defaultOrderPath;
    const url = new URL(this.path(orderPath), `${apiBaseUrl.replace(/\/+$/, '')}/`);
    url.searchParams.set(this.env('PAGE_PARAM') || 'page', String(options.page));
    url.searchParams.set(this.env('SIZE_PARAM') || 'size', String(options.size));

    const lookbackDays = this.numberEnv('ORDER_LOOKBACK_DAYS', 3);
    const now = Date.now();
    const start = now - lookbackDays * 24 * 60 * 60 * 1000;
    if (this.booleanEnv('USE_EPOCH_MS_DATES', true)) {
      url.searchParams.set(this.env('START_DATE_PARAM') || 'startDate', String(start));
      url.searchParams.set(this.env('END_DATE_PARAM') || 'endDate', String(now));
    }
    const merchantId = this.env('MERCHANT_ID');
    if (merchantId && this.env('MERCHANT_ID_PARAM')) url.searchParams.set(this.env('MERCHANT_ID_PARAM'), merchantId);
    return url;
  }

  private headers() {
    const headers: Record<string, string> = { Accept: 'application/json' };
    const username = this.env('USERNAME') || this.env('API_KEY');
    const password = this.env('PASSWORD') || this.env('API_SECRET');
    const token = this.env('TOKEN');
    const merchantId = this.env('MERCHANT_ID');
    const userAgent = this.env('USER_AGENT');

    if (this.platform === 'N11') {
      if (username) headers.appkey = username;
      if (password) headers.appsecret = password;
    } else if (token) headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    else if (username && password) headers.Authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    else if (username) headers.Authorization = username;

    if (merchantId) headers['X-Merchant-Id'] = merchantId;
    headers['User-Agent'] = userAgent || `ErhanFlowersERP-${this.platform}`;
    return headers;
  }

  private path(value: string) {
    const merchantId = this.env('MERCHANT_ID');
    return value
      .replace(/\{merchantId\}/g, encodeURIComponent(merchantId))
      .replace(/\{MERCHANT_ID\}/g, encodeURIComponent(merchantId));
  }

  private missingKeys() {
    const hasToken = Boolean(this.env('TOKEN'));
    const hasBasic = Boolean((this.env('USERNAME') || this.env('API_KEY')) && (this.env('PASSWORD') || this.env('API_SECRET')));
    const keys = [`${this.config.envPrefix}_API_URL`];
    if (!hasToken && !hasBasic) keys.push(`${this.config.envPrefix}_TOKEN or ${this.config.envPrefix}_USERNAME/${this.config.envPrefix}_PASSWORD`);
    return keys.filter((key) => key.endsWith('_API_URL') ? !this.env('API_URL') && !this.config.defaultApiUrl : true);
  }

  private normalizeResponse(value: unknown): { content: Array<Record<string, any>>; totalPages?: number } {
    const root = this.record(value);
    const content =
      this.array(root.content) ||
      this.array(root.items) ||
      this.array(root.orders) ||
      this.array(root.data) ||
      this.array(root.list) ||
      this.array(root.result) ||
      [];
    return { content, totalPages: Number(root.totalPages ?? root.totalPage ?? root.pageCount ?? 1) };
  }

  private mapGenericOrder(order: Record<string, any>): ExternalOrder {
    const shipment = this.record(order.shipmentAddress ?? order.shippingAddress ?? order.deliveryAddress ?? order.address);
    const invoice = this.record(order.invoiceAddress ?? order.billingAddress);
    const lines = this.array(order.lines) || this.array(order.items) || this.array(order.orderItems) || this.array(order.products) || [];
    const customer = this.record(order.customer ?? order.buyer ?? order.recipient);
    const customerName = this.firstText(
      order.customerName,
      order.buyerName,
      customer.fullName,
      [customer.firstName, customer.lastName].filter(Boolean).join(' '),
      shipment.fullName,
      [shipment.firstName, shipment.lastName].filter(Boolean).join(' '),
      invoice.fullName,
    );
    const phone = this.firstText(order.phone, order.customerPhone, customer.phone, shipment.phone, invoice.phone);
    const packageId = this.firstText(order.packageNumber, order.packageId, order.shipmentPackageId, order.id);
    const orderNumber = this.firstText(order.orderNumber, order.orderNo, order.orderId, order.id);
    const status = this.mapStatus(order.status ?? order.orderStatus ?? order.packageStatus);

    return {
      externalOrderId: packageId || orderNumber,
      platformOrderNumber: orderNumber || packageId,
      platform: this.platform,
      status: status.saleStatus,
      invoiceStatus: status.invoiceStatus,
      externalStatus: this.text(order.status ?? order.orderStatus ?? order.packageStatus) || undefined,
      unknownStatus: status.unknown,
      customerName,
      phone,
      addressText: this.firstText(shipment.fullAddress, shipment.address, shipment.address1, invoice.fullAddress),
      city: this.firstText(shipment.city, invoice.city) || undefined,
      district: this.firstText(shipment.district, invoice.district) || undefined,
      totalAmount: Number(order.totalPrice ?? order.totalAmount ?? order.grossAmount ?? order.amount ?? 0),
      paidAmount: Number(order.paidAmount ?? order.totalPrice ?? order.totalAmount ?? order.grossAmount ?? 0),
      deliveryFee: Number(order.cargoPrice ?? order.shippingPrice ?? order.deliveryFee ?? 0),
      paymentStatus: 'PAID',
      cargoProvider: this.firstText(order.cargoProviderName, order.cargoCompany, order.shippingCompany) || undefined,
      cargoTrackingNumber: this.firstText(order.cargoTrackingNumber, order.trackingNumber, order.cargoCode) || undefined,
      orderDate: this.date(order.orderDate ?? order.createdDate ?? order.createdAt),
      deliveryDueAt: this.date(order.deliveryDate ?? order.dueDate ?? order.estimatedDeliveryDate),
      items: lines.map((line: Record<string, any>) => {
        const sku = this.firstText(line.merchantSku, line.sellerSku, line.sku, line.stockCode, line.supplierStockCode);
        return {
          externalLineId: this.firstText(line.id, line.lineId, line.lineItemId) || undefined,
          externalVariantId: this.firstText(line.variantId, line.productId, line.listingId, sku) || undefined,
          productName: this.firstText(line.productName, line.name, line.title),
          variationText: [line.productColor, line.color, line.size, line.variantName].filter(Boolean).join(' / ') || undefined,
          sku: sku || undefined,
          barcode: this.firstText(line.barcode, line.ean) || undefined,
          modelCode: sku || this.firstText(line.modelCode, line.productCode) || undefined,
          quantity: Number(line.quantity ?? line.qty ?? line.count ?? 1),
          unitPrice: Number(line.price ?? line.unitPrice ?? line.amount ?? line.salePrice ?? 0),
        };
      }),
    };
  }

  private mapStatus(value: unknown): { saleStatus?: ExternalOrder['status']; invoiceStatus?: ExternalOrder['invoiceStatus']; unknown: boolean } {
    const status = this.text(value).toUpperCase();
    if (!status) return { saleStatus: undefined, invoiceStatus: undefined, unknown: true };
    if (['NEW', 'CREATED', 'OPEN', 'READY_TO_SHIP', 'APPROVED', 'CONFIRMED', 'PAYMENT_COMPLETED'].includes(status)) return { saleStatus: 'CONFIRMED', unknown: false };
    if (['PACKING', 'PICKING', 'PREPARING', 'INVOICED'].includes(status)) return { saleStatus: 'PREPARING', unknown: false };
    if (['SHIPPED', 'CARGO', 'IN_TRANSIT'].includes(status)) return { saleStatus: 'OUT_FOR_DELIVERY', unknown: false };
    if (['DELIVERED', 'COMPLETED'].includes(status)) return { saleStatus: 'DELIVERED', unknown: false };
    if (['CANCELLED', 'CANCELED', 'REJECTED'].includes(status)) return { saleStatus: 'CANCELLED', invoiceStatus: 'CANCELLED', unknown: false };
    if (['RETURNED', 'RETURNING'].includes(status)) return { saleStatus: 'COMPLETED', invoiceStatus: 'RETURNED', unknown: false };
    return { unknown: true };
  }

  protected async safeErrorText(response: Response) {
    const text = await response.text().catch(() => '');
    return text.slice(0, 300) || response.statusText || 'Yanit okunamadi';
  }

  protected env(key: string) {
    const runtimeValue = this.config.runtimeCredentials?.[key];
    if (runtimeValue) return String(runtimeValue).trim();
    return String(process.env[`${this.config.envPrefix}_${key}`] ?? '').trim();
  }

  private numberEnv(key: string, fallback: number) {
    const value = Number(this.env(key));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  private booleanEnv(key: string, fallback: boolean) {
    const value = this.env(key).toLowerCase();
    if (!value) return fallback;
    return ['1', 'true', 'yes', 'on'].includes(value);
  }

  private record(value: unknown): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
  }

  private array(value: unknown): Array<Record<string, any>> | null {
    return Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') as Array<Record<string, any>> : null;
  }

  private date(value: unknown) {
    const text = this.text(value);
    if (!text) return undefined;
    const parsed = /^\d+$/.test(text) ? new Date(Number(text)) : new Date(text);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private firstText(...values: unknown[]) {
    for (const value of values) {
      const text = this.text(value);
      if (text) return text;
    }
    return '';
  }

  private text(value: unknown) {
    return String(value ?? '').trim();
  }
}
