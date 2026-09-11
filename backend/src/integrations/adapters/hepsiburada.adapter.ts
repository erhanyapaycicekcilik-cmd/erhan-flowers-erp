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
    const secretKey = this.env('SECRET_KEY') || this.env('PASSWORD') || this.env('API_SECRET');
    const userAgent = this.env('USER_AGENT');
    if (!merchantId || !secretKey) return this.missing(['HEPSIBURADA_MERCHANT_ID', 'HEPSIBURADA_SECRET_KEY']);

    const p = payload as Record<string, any>;
    const images = this.extractImages(p.images);
    const stockCode = (p.modelCode || p.barcode || '').toUpperCase();
    const hbCategoryId = Number(this.env('CATEGORY_ID') || p.hepsiburadaCategoryId || 60001290);
    const hbProductPath = this.env('PRODUCT_PATH') || '/product/api/products/import';
    const apiBaseUrl = this.env('PRODUCT_API_URL') || 'https://mpop.hepsiburada.com';
    const height = this.extractHeight(p.productName, p.description);

    // HB katalog ürün JSON: düz alan yapısı (array içinde), fiyat Türkçe virgüllü string
    const salePrice = Number(p.salePrice || 0);
    const priceStr = salePrice.toFixed(2).replace('.', ',');
    const hbProduct: Record<string, any> = {
      categoryId: hbCategoryId,
      merchant: merchantId,
      merchantSku: stockCode,
      VaryantGroupID: (p.modelCode || stockCode).toUpperCase(),
      UrunAdi: p.productName || '',
      UrunAciklamasi: p.description || p.productName || '',
      Marka: p.brand || 'Erhan Flowers',
      GarantiSuresi: '0',
      kg: String(p.desi || 1),
      price: priceStr,
      stock: String(Number(p.stockQuantity ?? 0)),
      Renk: p.color || 'Çok Renkli',
      ...(p.flowerType ? { 'Çiçek Türü': p.flowerType } : {}),
      ...(height ? { Boy: height } : {}),
      ...(p.barcode ? { Barcode: p.barcode } : {}),
    };
    // Görseller: Image1, Image2, ... şeklinde düz alanlar (HB katalog formatı)
    images.slice(0, 8).forEach((url, i) => { hbProduct[`Image${i + 1}`] = url; });

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
