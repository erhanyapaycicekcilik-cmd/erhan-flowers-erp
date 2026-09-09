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
    const n11CategoryId = this.env('CATEGORY_ID') || p.n11CategoryId || null;
    const preparingDay = Number(this.env('PREPARING_DAY') || 2);
    const shipmentTemplate = this.env('DELIVERY_TEMPLATE_NAME') || 'Standart Teslimat';

    const n11Payload: Record<string, any> = {
      productSellerCode: stockCode,
      title: p.productName || '',
      subtitle: (p.shortDescription || p.productName || '').slice(0, 100),
      description: p.description || p.productName || '',
      category: n11CategoryId ? { id: Number(n11CategoryId) } : undefined,
      price: Number(p.salePrice || 0),
      currencyType: 'TL',
      preparingDay,
      shipmentTemplate,
      images: images.map((url: string) => ({ url })),
      stockItems: [
        {
          bundle: false,
          mpn: p.modelCode || stockCode,
          gtin: p.barcode || undefined,
          oem: p.modelCode || stockCode,
          sellerStockCode: stockCode,
          quantity: Number(p.stockQuantity ?? 0),
          attributes: [],
          files: [],
        },
      ],
      attributes: [
        { id: 338, value: p.color || 'Çok Renkli' },
      ],
    };

    // category yoksa alanı çıkar
    if (!n11CategoryId) delete n11Payload.category;

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
        message: `N11 urun gonderimi basarisiz. HTTP ${response.status}: ${responseText.slice(0, 300)}`,
      };
    } catch (error) {
      return { ok: false, status: 'FAILED', message: `N11 urun gonderimi basarisiz: ${error instanceof Error ? error.message : String(error)}` };
    }
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
