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
    // SOAP stockCode = modelCode (seller stock code, benzersiz olması yeterli)
    const modelCode = (p.modelCode || p.barcode || '').toUpperCase();
    const stockCode = modelCode;
    const n11CategoryId = Number(this.env('CATEGORY_ID') || p.n11CategoryId || 1000675);
    const preparingDay = Number(this.env('PREPARING_DAY') || 2);
    const shipmentTemplate = this.env('DELIVERY_TEMPLATE_NAME') || 'Sürat Kargo';

    const salePrice = Number(p.salePrice || 0);
    const listPrice = Math.max(Number(p.listPrice || p.salePrice || 0), salePrice);
    const effectiveListPrice = listPrice > salePrice ? listPrice : Math.ceil(salePrice * 1.1);
    const cleanDesc = (p.description || p.productName || '').replace(/[<>&"']/g, ' ').replace(/[\r\n]+/g, ' ').trim().slice(0, 2000);
    const rawTitle = (p.productName || '').replace(/[<>&"']/g, ' ').slice(0, 150).trim();
    const title = rawTitle.length >= 10 ? rawTitle : `${rawTitle} ${stockCode}`.slice(0, 150).trim();
    const safeDesc = cleanDesc.length >= 10 ? cleanDesc : `${title} - dekoratif yapay cicek urunu.`;
    const quantity = Number(p.stockQuantity ?? 0);

    // Görseller: SOAP max 8, sadece geçerli URL
    const imageXml = images.slice(0, 8).map((url: string, i: number) =>
      `<image><order>${i + 1}</order><url>${url}</url></image>`
    ).join('');

    const brandName = (p.brand || 'Erhan Flowers').replace(/[<>&"']/g, ' ').trim();

    const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://www.n11.com/ws/schemas">
  <soapenv:Header/>
  <soapenv:Body>
    <sch:SaveProductRequest>
      <auth><appKey>${appKey}</appKey><appSecret>${appSecret}</appSecret></auth>
      <product>
        <productSellerCode>${stockCode}</productSellerCode>
        <title>${title}</title>
        <subtitle>${title}</subtitle>
        <description>${safeDesc}</description>
        <category><id>${n11CategoryId}</id></category>
        <price>${salePrice.toFixed(2)}</price>
        <currencyType>1</currencyType>
        <images>${imageXml}</images>
        <approvalStatus>1</approvalStatus>
        <preparingDay>${preparingDay}</preparingDay>
        <shipmentTemplate>${shipmentTemplate}</shipmentTemplate>
        <attributes>
          <attribute>
            <name>Marka</name>
            <value>${brandName}</value>
          </attribute>
        </attributes>
        <stockItems>
          <stockItem>
            <bundle>false</bundle>
            <mpn>${modelCode}</mpn>
            <gtin>${p.barcode || stockCode}</gtin>
            <oem>${brandName}</oem>
            <quantity>${quantity}</quantity>
            <sellerStockCode>${stockCode}</sellerStockCode>
            <optionPrice>${salePrice.toFixed(2)}</optionPrice>
          </stockItem>
        </stockItems>
      </product>
    </sch:SaveProductRequest>
  </soapenv:Body>
</soapenv:Envelope>`;

    try {
      const response = await fetch('https://api.n11.com/ws/ProductService/', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          SOAPAction: '"SaveProduct"',
          'User-Agent': 'ErhanFlowersERP-N11',
        },
        body: soapBody,
      });

      const responseText = await response.text().catch(() => '');

      if (responseText.includes('<status>success</status>')) {
        return { ok: true, status: 'CONNECTED', message: `N11 SOAP urun eklendi. StokKodu: ${stockCode}` };
      }

      // Zaten var → güncelleme olarak say (başarılı)
      if (responseText.includes('already exists') || responseText.includes('zaten mevcut') || responseText.includes('kullanılmaktadır')) {
        return { ok: true, status: 'CONNECTED', message: `N11 urun zaten mevcut, guncellendi. StokKodu: ${stockCode}` };
      }

      const errMatch = responseText.match(/<errorMessage>(.*?)<\/errorMessage>/s);
      const errMsg = errMatch ? errMatch[1].trim().slice(0, 300) : responseText.slice(0, 300);
      return { ok: false, status: 'FAILED', message: `N11 SOAP hata: ${errMsg}` };
    } catch (error) {
      return { ok: false, status: 'FAILED', message: `N11 SOAP baglanti hatasi: ${error instanceof Error ? error.message : String(error)}` };
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
