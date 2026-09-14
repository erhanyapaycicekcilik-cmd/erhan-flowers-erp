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

    // modelCode: tüm platformlarda aynı (SD-XXXX, YC-XXXX)
    // productMainId = modelCode → katalog eşleştirme olmaz (gerçek barkod değil)
    const modelCode = (p.modelCode || p.barcode || '').toUpperCase();
    const n11CategoryId = Number(this.env('CATEGORY_ID') || p.n11CategoryId || 1000675);
    const preparingDay = Number(this.env('PREPARING_DAY') || 2);

    const salePrice = Number(p.salePrice || 0);
    const listPrice = Math.max(Number(p.listPrice || p.salePrice || 0), salePrice);
    const effectiveListPrice = listPrice > salePrice ? listPrice : Math.ceil(salePrice * 1.1);

    const rawTitle = (p.productName || '').slice(0, 150).trim();
    const title = rawTitle.length >= 10 ? rawTitle : `${rawTitle} ${modelCode}`.slice(0, 150).trim();
    const cleanDesc = (p.description || p.productName || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 3000);
    const safeDesc = cleanDesc.length >= 10 ? cleanDesc : `${title} - dekoratif yapay cicek urunu.`;
    const quantity = Number(p.stockQuantity ?? 0);
    const brand = (p.brand || 'Erhan Flowers').slice(0, 100).trim();

    const imageList = images.slice(0, 8).map((url: string, i: number) => ({
      order: i + 1,
      url,
    }));

    const body = {
      productSellerCode: modelCode,
      title,
      subtitle: title,
      description: safeDesc,
      category: { id: n11CategoryId },
      price: salePrice,
      listingPrice: effectiveListPrice,
      currencyType: 'TL',
      images: imageList,
      approvalStatus: 'WaitingForApproval',
      preparingDay,
      attributes: [{ name: 'Marka', value: brand }],
      skuList: [
        {
          sellerStockCode: modelCode,
          quantity,
          salePrice: salePrice,
          listPrice: effectiveListPrice,
          // productMainId = modelCode → N11 REST katalogla eşleştirme yapmaz
          productMainId: modelCode,
          images: imageList,
        },
      ],
    };

    try {
      const apiUrl = this.env('API_URL') || 'https://api.n11.com';
      const response = await fetch(`${apiUrl}/ms/product/tasks/product-create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          appkey: appKey,
          appsecret: appSecret,
          'User-Agent': 'ErhanFlowersERP-N11',
        },
        body: JSON.stringify(body),
      });

      const responseText = await response.text().catch(() => '');
      let json: any = null;
      try { json = JSON.parse(responseText); } catch { /* ignore */ }

      // Başarı: HTTP 200/201 ve taskId var
      if ((response.ok || response.status === 201) && (json?.taskId || json?.data?.taskId)) {
        const taskId = json?.taskId || json?.data?.taskId;
        return { ok: true, status: 'CONNECTED', message: `N11 urun goreve alindi. TaskId: ${taskId} StokKodu: ${modelCode}` };
      }

      // Zaten var
      if (responseText.includes('zaten mevcut') || responseText.includes('already exists') || responseText.includes('kullanılmaktadır')) {
        return { ok: true, status: 'CONNECTED', message: `N11 urun zaten mevcut. StokKodu: ${modelCode}` };
      }

      const errMsg = json?.message || json?.error || responseText.slice(0, 400);
      return { ok: false, status: 'FAILED', message: `N11 REST hata (${response.status}): ${errMsg}` };
    } catch (error) {
      return { ok: false, status: 'FAILED', message: `N11 baglanti hatasi: ${error instanceof Error ? error.message : String(error)}` };
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
