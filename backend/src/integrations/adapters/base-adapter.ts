import { AdapterConnectionResult, ExternalOrder, IntegrationAdapter, IntegrationPlatform } from './integration-adapter.interface';

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

  async fetchOrderDetail(): Promise<ExternalOrder | null> {
    return null;
  }

  async pushStock(): Promise<AdapterConnectionResult> {
    return this.notImplemented('stok gönderme');
  }

  async pushPrice(): Promise<AdapterConnectionResult> {
    return this.notImplemented('fiyat gönderme');
  }

  async pushProduct(): Promise<AdapterConnectionResult> {
    return this.notImplemented('ürün gönderme');
  }

  async updateOrderStatus(): Promise<AdapterConnectionResult> {
    return this.notImplemented('sipariş durum güncelleme');
  }
}
