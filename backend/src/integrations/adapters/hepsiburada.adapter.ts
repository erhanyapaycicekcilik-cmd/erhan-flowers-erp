import { Inject, Injectable, Optional } from '@nestjs/common';
import { HttpMarketplaceOrderAdapter } from './http-marketplace-order.adapter';
import { AdapterConnectionResult } from './integration-adapter.interface';

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

  override async pushProduct(payload: unknown): Promise<AdapterConnectionResult> {
    const merchantId = this.env('MERCHANT_ID');
    const username = this.env('USERNAME') || this.env('API_KEY');
    const password = this.env('PASSWORD') || this.env('API_SECRET');
    const userAgent = this.env('USER_AGENT');
    if (!merchantId || !username || !password) return this.missing(['HEPSIBURADA_MERCHANT_ID', 'HEPSIBURADA_USERNAME', 'HEPSIBURADA_PASSWORD']);

    const p = payload as Record<string, any>;
    const images = this.extractImages(p.images);
    const stockCode = p.modelCode || p.barcode || '';
    // Hepsiburada yapay çiçekler: categoryId=60001290, productTypeId=3210 (şablondan)
    const hbCategoryId = this.env('CATEGORY_ID') || p.hepsiburadaCategoryId || '60001290';
    const hbProductTypeId = Number(this.env('PRODUCT_TYPE_ID') || 3210);
    const hbProductPath = this.env('PRODUCT_PATH') || `/product/api/merchant/v1/listings/${encodeURIComponent(merchantId)}`;
    const apiBaseUrl = this.env('PRODUCT_API_URL') || 'https://listing-external.hepsiburada.com';
    const height = this.extractHeight(p.productName, p.description);

    const hbPayload: Record<string, any> = {
      merchantId,
      merchantSku: stockCode,
      VaryantGroupID: p.modelCode || stockCode,
      Barcode: p.barcode || undefined,
      UrunAdi: p.productName || '',
      UrunAciklamasi: p.description || p.productName || '',
      Marka: p.brand || 'Erhan Flowers',
      categoryId: String(hbCategoryId),
      productTypeId: hbProductTypeId,
      Fiyat: Number(p.salePrice || 0),
      Stok: Number(p.stockQuantity ?? 0),
      KDV: Number(p.vatRate ?? 20),
      Desi: Number(p.desi || 1),
      dispatchTime: Number(this.env('PREPARING_DAY') || 2),
      images: images.slice(0, 10),
      attributes: [
        { name: 'Renk', value: p.color || 'Çok Renkli' },
        ...(p.flowerType ? [{ name: 'Çiçek Türü', value: p.flowerType }] : []),
        ...(height ? [{ name: 'Boy', value: height }] : []),
        { name: 'Materyal', value: 'Plastik' },
        { name: 'Menşei', value: p.origin || 'TR' },
      ],
    };

    if (!p.barcode) delete hbPayload.Barcode;

    const url = new URL(hbProductPath.startsWith('/') ? hbProductPath : `/${hbProductPath}`, `${apiBaseUrl.replace(/\/+$/, '')}/`);
    const auth = Buffer.from(`${username}:${password}`).toString('base64');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
          'User-Agent': userAgent || 'ErhanFlowersERP-HB',
        },
        body: JSON.stringify(hbPayload),
      });

      const responseText = await response.text().catch(() => '');
      let responseJson: any;
      try { responseJson = JSON.parse(responseText); } catch { responseJson = { raw: responseText }; }

      if (response.ok || response.status === 201 || response.status === 202) {
        const listingId = responseJson?.listingId || responseJson?.id || null;
        return { ok: true, status: 'CONNECTED', message: `Hepsiburada urun gonderimi tamamlandi.${listingId ? ` Listing ID: ${listingId}` : ''}`, listingUploadId: listingId ?? undefined };
      }

      return {
        ok: false,
        status: response.status === 401 || response.status === 403 ? 'MISSING_CREDENTIALS' : 'FAILED',
        message: `Hepsiburada urun gonderimi basarisiz. HTTP ${response.status}: ${responseText.slice(0, 300)}`,
      };
    } catch (error) {
      return { ok: false, status: 'FAILED', message: `Hepsiburada urun gonderimi basarisiz: ${error instanceof Error ? error.message : String(error)}` };
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
}
