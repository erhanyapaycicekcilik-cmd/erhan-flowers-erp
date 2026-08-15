import { Inject, Injectable, Optional } from '@nestjs/common';
import { HttpMarketplaceOrderAdapter } from './http-marketplace-order.adapter';
import { AdapterConnectionResult } from './integration-adapter.interface';

@Injectable()
export class HepsiburadaAdapter extends HttpMarketplaceOrderAdapter {
  constructor(@Optional() @Inject('HEPSIBURADA_RUNTIME_CREDENTIALS') runtimeCredentials?: Record<string, string>) {
    super({
      platform: 'HEPSIBURADA',
      envPrefix: 'HEPSIBURADA',
      defaultApiUrl: 'https://oms-external.hepsiburada.com',
      defaultOrderPath: '/orders/merchantid/{merchantId}',
      defaultProductPath: '',
      runtimeCredentials,
    });
  }

  async testConnection(): Promise<AdapterConnectionResult> {
    const merchantId = this.env('MERCHANT_ID');
    const username = this.env('USERNAME') || this.env('API_KEY');
    const password = this.env('PASSWORD') || this.env('API_SECRET');
    const userAgent = this.env('USER_AGENT');
    const missing = [
      !merchantId ? 'MERCHANT_ID' : '',
      !username ? 'API_KEY' : '',
      !password ? 'API_SECRET' : '',
      !userAgent ? 'USER_AGENT' : '',
    ].filter(Boolean);
    if (missing.length) return this.missing(missing);

    const apiBaseUrl = this.env('API_URL') || 'https://mpop.hepsiburada.com';
    const url = new URL('/product/api/products/products-by-merchant-and-status', `${apiBaseUrl.replace(/\/+$/, '')}/`);
    url.searchParams.set('merchantId', merchantId);
    url.searchParams.set('productStatus', 'WAITING');
    url.searchParams.set('version', '1');
    url.searchParams.set('page', '0');
    url.searchParams.set('size', '1');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
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
