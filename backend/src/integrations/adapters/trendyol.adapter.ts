import { Injectable } from '@nestjs/common';
import { BaseIntegrationAdapter } from './base-adapter';
import { AdapterConnectionResult, ExternalOrder, IntegrationPlatform } from './integration-adapter.interface';

@Injectable()
export class TrendyolAdapter extends BaseIntegrationAdapter {
  platform: IntegrationPlatform = 'TRENDYOL';

  async testConnection(): Promise<AdapterConnectionResult> {
    const missing = this.missingKeys();
    if (missing.length) return this.missing(missing);

    return {
      ok: false,
      status: 'NOT_IMPLEMENTED',
      message: 'Trendyol API bilgileri var, gerçek sipariş çekme uç noktası bu sprintte güvenli adapter arayüzüne bağlanmak üzere hazırlandı.',
    };
  }

  async fetchOrders(): Promise<ExternalOrder[]> {
    const missing = this.missingKeys();
    if (missing.length) return [];
    return [];
  }

  private missingKeys() {
    return ['TRENDYOL_SUPPLIER_ID', 'TRENDYOL_API_KEY', 'TRENDYOL_API_SECRET'].filter((key) => !process.env[key]);
  }
}
