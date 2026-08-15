import { AdapterConnectionResult, ExternalOrder, ExternalOrderSummary, IntegrationAdapter, IntegrationPlatform } from './integration-adapter.interface';

export abstract class BaseIntegrationAdapter implements IntegrationAdapter {
  abstract platform: IntegrationPlatform;

  protected notImplemented(action: string): AdapterConnectionResult {
    return {
      ok: false,
      status: 'NOT_IMPLEMENTED',
      message: `${this.platform} ${action} bağlantısı henüz aktif değil.`,
    };
  }

  protected missing(keys: string[]): AdapterConnectionResult {
    return {
      ok: false,
      status: 'MISSING_CREDENTIALS',
      message: `${this.platform} API bilgileri eksik: ${keys.join(', ')}`,
      missingKeys: keys,
    };
  }

  async testConnection(): Promise<AdapterConnectionResult> {
    return this.notImplemented('test');
  }

  async fetchOrders(): Promise<ExternalOrder[]> {
    return [];
  }

  async fetchOrderSummary(): Promise<ExternalOrderSummary> {
    return {
      total: 0,
      new: 0,
      processing: 0,
      ready: 0,
      transit: 0,
      delivered: 0,
      reshipment: 0,
      hold: 0,
      cancelled: 0,
      returned: 0,
      lastUpdatedAt: new Date().toISOString(),
      source: 'LOCAL',
    };
  }

  async fetchOrderDetail(): Promise<ExternalOrder | null> {
    return null;
  }

  async pushStock(_payload?: unknown): Promise<AdapterConnectionResult> {
    return this.notImplemented('stok gönderme');
  }

  async pushPrice(_payload?: unknown): Promise<AdapterConnectionResult> {
    return this.notImplemented('fiyat gönderme');
  }

  async pushProduct(_payload?: unknown): Promise<AdapterConnectionResult> {
    return this.notImplemented('ürün gönderme');
  }

  async updateOrderStatus(_payload?: unknown): Promise<AdapterConnectionResult> {
    return this.notImplemented('sipariş durum güncelleme');
  }
}
