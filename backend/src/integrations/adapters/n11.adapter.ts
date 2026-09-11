import { Inject, Injectable, Optional } from '@nestjs/common';
import { AdapterConnectionResult } from './integration-adapter.interface';
import { HttpMarketplaceOrderAdapter } from './http-marketplace-order.adapter';

@Injectable()
export class N11Adapter extends HttpMarketplaceOrderAdapter {
  constructor(@Optional() @Inject('N11_RUNTIME_CREDENTIALS') runtimeCredentials?: Record<string, string>) {
    super({
      platform: 'N11',
      envPrefix: 'N11',
      defaultApiUrl: 'https://api.n11.com',
      defaultOrderPath: '/rest/delivery/v1/shipmentPackages',
      defaultProductPath: '/ms/product/tasks/product-create',
      runtimeCredentials,
    });
  }

  override async pushProduct(payload: unknown): Promise<AdapterConnectionResult> {
    const appKey = this.env('API_KEY') || this.env('USERNAME');
    const appSecret = this.env('API_SECRET') || this.env('PASSWORD');
    if (!appKey || !appSecret) return this.missing(['N11_API_KEY', 'N11_API_SECRET']);

    const p = payload as Record<string, any>;
    const images = this.extractImages(p.images);
    const stockCode = p.modelCode || p.barcode || '';
    // N11 yapay çiçek kategorisi: 1000675 (şablondan alındı)
    const n11CategoryId = Number(this.env('CATEGORY_ID') || p.n11CategoryId || 1000675);
    const preparingDay = Number(this.env('PREPARING_DAY') || 2);
    const shipmentTemplate = this.env('DELIVERY_TEMPLATE_NAME') || 'Sürat Kargo';
    const height = this.extractHeight(p.productName, p.description);

    const salePrice = Number(p.salePrice || 0);
    const listPrice = Math.max(Number(p.listPrice || p.salePrice || 0), salePrice);
    const cleanDesc = (p.description || p.productName || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 2000);
    const effectiveListPrice = listPrice > salePrice ? listPrice : Math.ceil(salePrice * 1.1);
    // N11 baslik: min 10, max 150 karakter; kisa ise stok kodu ile doldur
    const rawTitle = (p.productName || '').slice(0, 150).trim();
    const title = rawTitle.length >= 10 ? rawTitle : `${rawTitle} ${stockCode}`.slice(0, 150).trim();
    const safeDesc = cleanDesc.length >= 10 ? cleanDesc : `${title} - dekoratif yapay çiçek ürünü.`;

    // N11 yeni REST API: payload.skus wrapper, currencyType string, categoryId sayı, attributes id/customValue
    // Kategori 1000675 attribute ID'leri: 429=Renk, 1275=Çiçek Türü, 1=Marka (hepsi customValue=true)
    const n11Sku: Record<string, any> = {
      title,
      description: safeDesc,
      categoryId: n11CategoryId,
      currencyType: 'TL',
      productMainId: (p.modelCode || stockCode).toUpperCase(),
      preparingDay,
      shipmentTemplate,
      stockCode,
      quantity: Number(p.stockQuantity ?? 0),
      salePrice,
      listPrice: effectiveListPrice,
      vatRate: 10,
      images: images.slice(0, 8).map((url: string, i: number) => ({ url, order: i + 1 })),
      attributes: [
        { id: 429, customValue: p.color || 'Çok Renkli' },
        { id: 1275, customValue: p.flowerType || 'Yapay Çiçek' },
        { id: 1, customValue: p.brand || 'Erhan Flowers' },
      ],
      ...(p.barcode ? { barcode: p.barcode } : {}),
    };
    const n11Payload = {
      payload: {
        integrator: 'Erhan Flowers ERP',
        skus: [n11Sku],
      },
    };

    const apiUrl = this.env('API_URL') || 'https://api.n11.com';
    const url = new URL('/ms/product/tasks/product-create', apiUrl);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          appkey: appKey,
          appsecret: appSecret,
          'User-Agent': 'ErhanFlowersERP-N11',
        },
        body: JSON.stringify(n11Payload),
      });

      const responseText = await response.text().catch(() => '');
      let responseJson: any;
      try { responseJson = JSON.parse(responseText); } catch { responseJson = { raw: responseText }; }

      if (response.ok || response.status === 201 || response.status === 202) {
        const taskId = responseJson?.taskId || responseJson?.id || responseJson?.batchRequestId || null;
        return { ok: true, status: 'CONNECTED', message: `N11 urun gonderimi tamamlandi.${taskId ? ` Task ID: ${taskId}` : ''}`, batchRequestId: taskId ?? undefined };
      }

      return {
        ok: false,
        status: response.status === 401 || response.status === 403 ? 'MISSING_CREDENTIALS' : 'FAILED',
        message: `N11 urun gonderimi basarisiz. HTTP ${response.status}: ${responseText.slice(0, 800)} | PAYLOAD: ${JSON.stringify(n11Payload).slice(0, 400)}`,
      };
    } catch (error) {
      return { ok: false, status: 'FAILED', message: `N11 urun gonderimi basarisiz: ${error instanceof Error ? error.message : String(error)}` };
    }
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
    const appKey = this.env('API_KEY') || this.env('USERNAME');
    const appSecret = this.env('API_SECRET') || this.env('PASSWORD');
    if (!appKey || !appSecret) return this.missing(['N11_API_KEY', 'N11_API_SECRET']);

    const apiUrl = this.env('API_URL') || 'https://api.n11.com';
    const url = new URL('/rest/delivery/v1/shipmentPackages', apiUrl);
    url.searchParams.set('page', '0');
    url.searchParams.set('size', '1');

    // N11 REST API: sadece appkey/appsecret header yeterli, Basic Auth gönderme
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        appkey: appKey,
        appsecret: appSecret,
        'User-Agent': 'ErhanFlowersERP-N11',
      },
    });

    if (response.ok || response.status === 200) {
      return { ok: true, status: 'CONNECTED', message: 'N11 API baglantisi dogrulandi.' };
    }
    const body = await response.text().then((t) => t.slice(0, 300)).catch(() => response.statusText);
    return {
      ok: false,
      status: response.status === 401 || response.status === 403 ? 'MISSING_CREDENTIALS' : 'FAILED',
      message: `N11 API testi basarisiz. HTTP ${response.status}: ${body}`,
    };
  }
}
